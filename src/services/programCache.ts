import type { TvProgram } from "../offers/programs";

export type SyncRecord = {
  scopeKey: string;
  store: string;
  sector: string;
  lastSuccessfulSyncAt: string; // ISO timestamp
  programsCount: number;
  status: "online" | "syncing" | "stale_offline" | "error";
};

const DB_NAME = "sol_tv_offline_db";
const DB_VERSION = 1;
const STORE_PROGRAMS = "programs";
const STORE_SYNC_RECORDS = "sync_records";

// In-memory fallback para ambientes sem IndexedDB (Node.js, testes, etc.)
const memoryPrograms = new Map<string, TvProgram>();
const memorySyncRecords = new Map<string, SyncRecord>();

function computeScopeKey(store: string, sector: string): string {
  return `${store.trim().toLowerCase()}:${sector.trim().toLowerCase()}`;
}

function isIndexedDbAvailable(): boolean {
  return typeof window !== "undefined" && typeof window.indexedDB !== "undefined";
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!isIndexedDbAvailable()) {
      return reject(new Error("IndexedDB não disponível neste ambiente."));
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      if (!db.objectStoreNames.contains(STORE_PROGRAMS)) {
        const programStore = db.createObjectStore(STORE_PROGRAMS, { keyPath: "id" });
        programStore.createIndex("scopeKey", "scopeKey", { unique: false });
        programStore.createIndex("updatedAt", "updatedAt", { unique: false });
      }

      if (!db.objectStoreNames.contains(STORE_SYNC_RECORDS)) {
        db.createObjectStore(STORE_SYNC_RECORDS, { keyPath: "scopeKey" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("Falha ao abrir IndexedDB."));
  });
}

/**
 * Retorna todas as programações em cache para uma determinada loja e setor.
 */
export async function getCachedPrograms(store: string, sector: string): Promise<TvProgram[]> {
  const scopeKey = computeScopeKey(store, sector);

  if (!isIndexedDbAvailable()) {
    const list = Array.from(memoryPrograms.values()).filter((p) => {
      const pScope = p.scopeKey || computeScopeKey(p.store, p.sector);
      return pScope === scopeKey;
    });
    return list;
  }

  try {
    const db = await openDb();
    return new Promise<TvProgram[]>((resolve, reject) => {
      const tx = db.transaction(STORE_PROGRAMS, "readonly");
      const storeObj = tx.objectStore(STORE_PROGRAMS);
      const index = storeObj.index("scopeKey");
      const request = index.getAll(scopeKey);

      request.onsuccess = () => {
        resolve((request.result as TvProgram[]) || []);
      };
      request.onerror = () => {
        reject(request.error);
      };
    });
  } catch (err) {
    console.warn("[ProgramCache] Falha ao ler IndexedDB, retornando memória:", err);
    return Array.from(memoryPrograms.values()).filter((p) => {
      const pScope = p.scopeKey || computeScopeKey(p.store, p.sector);
      return pScope === scopeKey;
    });
  }
}

/**
 * Grava em lote a lista completa de programações para o escopo, substituindo as antigas daquele escopo.
 */
export async function setCachedPrograms(
  store: string,
  sector: string,
  programs: TvProgram[],
): Promise<void> {
  const scopeKey = computeScopeKey(store, sector);

  // Atualiza cópia em memória
  for (const [id, p] of Array.from(memoryPrograms.entries())) {
    const pScope = p.scopeKey || computeScopeKey(p.store, p.sector);
    if (pScope === scopeKey) {
      memoryPrograms.delete(id);
    }
  }
  for (const p of programs) {
    memoryPrograms.set(p.id, { ...p, scopeKey });
  }

  if (!isIndexedDbAvailable()) return;

  try {
    const db = await openDb();
    return new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_PROGRAMS, "readwrite");
      const storeObj = tx.objectStore(STORE_PROGRAMS);
      const index = storeObj.index("scopeKey");
      const getReq = index.getAll(scopeKey);

      getReq.onsuccess = () => {
        const existing = (getReq.result as TvProgram[]) || [];
        // Remove os que não estão mais na lista nova
        const newIds = new Set(programs.map((p) => p.id));
        for (const oldProg of existing) {
          if (!newIds.has(oldProg.id)) {
            storeObj.delete(oldProg.id);
          }
        }
        // Insere ou atualiza os novos
        for (const prog of programs) {
          storeObj.put({ ...prog, scopeKey });
        }
      };

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn("[ProgramCache] Falha ao salvar no IndexedDB:", err);
  }
}

/**
 * Insere ou atualiza um único programa no cache.
 */
export async function upsertCachedProgram(program: TvProgram): Promise<void> {
  const scopeKey = program.scopeKey || computeScopeKey(program.store, program.sector);
  const progToStore = { ...program, scopeKey };

  memoryPrograms.set(program.id, progToStore);

  if (!isIndexedDbAvailable()) return;

  try {
    const db = await openDb();
    return new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_PROGRAMS, "readwrite");
      const storeObj = tx.objectStore(STORE_PROGRAMS);
      storeObj.put(progToStore);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn("[ProgramCache] Falha no upsertCachedProgram:", err);
  }
}

/**
 * Remove um programa do cache pelo ID.
 */
export async function deleteCachedProgram(id: string): Promise<void> {
  memoryPrograms.delete(id);

  if (!isIndexedDbAvailable()) return;

  try {
    const db = await openDb();
    return new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_PROGRAMS, "readwrite");
      const storeObj = tx.objectStore(STORE_PROGRAMS);
      storeObj.delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn("[ProgramCache] Falha no deleteCachedProgram:", err);
  }
}

/**
 * Retorna o registro de metadados de sincronização do escopo.
 */
export async function getSyncRecord(store: string, sector: string): Promise<SyncRecord | null> {
  const scopeKey = computeScopeKey(store, sector);

  if (!isIndexedDbAvailable()) {
    return memorySyncRecords.get(scopeKey) || null;
  }

  try {
    const db = await openDb();
    return new Promise<SyncRecord | null>((resolve, reject) => {
      const tx = db.transaction(STORE_SYNC_RECORDS, "readonly");
      const storeObj = tx.objectStore(STORE_SYNC_RECORDS);
      const request = storeObj.get(scopeKey);

      request.onsuccess = () => resolve((request.result as SyncRecord) || null);
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn("[ProgramCache] Falha ao ler SyncRecord:", err);
    return memorySyncRecords.get(scopeKey) || null;
  }
}

/**
 * Atualiza o registro de sincronização do escopo.
 */
export async function setSyncRecord(
  store: string,
  sector: string,
  data: Partial<SyncRecord>,
): Promise<void> {
  const scopeKey = computeScopeKey(store, sector);
  const existing = (await getSyncRecord(store, sector)) || {
    scopeKey,
    store,
    sector,
    lastSuccessfulSyncAt: new Date().toISOString(),
    programsCount: 0,
    status: "online" as const,
  };

  const updated: SyncRecord = {
    ...existing,
    ...data,
    scopeKey,
    store,
    sector,
  };

  memorySyncRecords.set(scopeKey, updated);

  if (!isIndexedDbAvailable()) return;

  try {
    const db = await openDb();
    return new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_SYNC_RECORDS, "readwrite");
      const storeObj = tx.objectStore(STORE_SYNC_RECORDS);
      storeObj.put(updated);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn("[ProgramCache] Falha ao salvar SyncRecord:", err);
  }
}

/**
 * Limpa todo o cache (usado principalmente em testes e reset completo).
 */
export async function clearAllProgramCache(): Promise<void> {
  memoryPrograms.clear();
  memorySyncRecords.clear();

  if (!isIndexedDbAvailable()) return;

  try {
    const db = await openDb();
    return new Promise<void>((resolve, reject) => {
      const tx = db.transaction([STORE_PROGRAMS, STORE_SYNC_RECORDS], "readwrite");
      tx.objectStore(STORE_PROGRAMS).clear();
      tx.objectStore(STORE_SYNC_RECORDS).clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn("[ProgramCache] Falha ao limpar cache:", err);
  }
}

