import { supabase, databaseConfigured } from "../supabase";
import type {
  OfferLayout,
  ProgramComputedStatus,
  ProgramPersistedStatus,
  ProgramRecurrence,
  ProgramSchedule,
  ProgramScreen,
  ProgramStatus,
  ScreenKind,
  TvProgram,
} from "../offers/programs";
import {
  deleteCachedProgram,
  getCachedPrograms,
  getSyncRecord,
  setCachedPrograms,
  setSyncRecord,
  upsertCachedProgram,
} from "./programCache";

// =============================================================================
// 1. TIPOS DA CAMADA DE BANCO (Postgres Row)
// =============================================================================

export type SolTvProgramRow = {
  catalog_id?: string | null;
  starts_at?: string | null;
  ends_at?: string | null;
  id: string;
  store: string;
  sector: string;
  scope_key: string;
  name: string;
  editorial_status: "draft" | "published" | "disabled";
  recurrence: "always" | "weekly" | "date_range" | "flash_offer";
  priority: number;
  schedule: Record<string, unknown>;
  screens: Record<string, unknown>[];
  version: number;
  published_at: string | null;
  disabled_at: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
};

export type ProgramSyncState = "online" | "syncing" | "stale_offline" | "error";

export class OptimisticConcurrencyError extends Error {
  public readonly code = "PROGRAM_VERSION_CONFLICT";
  public readonly programId: string;
  public readonly expectedVersion?: number;
  public readonly currentVersion?: number;

  constructor(programId: string, expectedVersion?: number, currentVersion?: number) {
    const versionMsg =
      expectedVersion !== undefined && currentVersion !== undefined
        ? ` (esperava v${expectedVersion}, mas o banco já está na v${currentVersion})`
        : "";
    super(
      `Conflito de edição detectado para a programação "${programId}"${versionMsg}. Outro operador salvou uma versão mais recente.`,
    );
    this.name = "OptimisticConcurrencyError";
    this.programId = programId;
    this.expectedVersion = expectedVersion;
    this.currentVersion = currentVersion;
    Object.setPrototypeOf(this, OptimisticConcurrencyError.prototype);
  }
}

// =============================================================================
// 2. FUNÇÕES AUXILIARES DE ESCOPO E DECISÃO DETERMINÍSTICA
// =============================================================================

export function getScopeKey(store: string, sector: string): string {
  return `${store.trim().toLowerCase()}:${sector.trim().toLowerCase()}`;
}

/**
 * Função pura para decidir se um payload recebido deve sobrescrever o estado em memória.
 * Regra:
 * 1. incoming.version > current.version -> ACEITA
 * 2. incoming.version < current.version -> DESCARTA
 * 3. Mesma version: updated_at mais recente -> ACEITA
 */
export function shouldApplyProgramUpdate(
  current: TvProgram | undefined,
  incoming: TvProgram,
): boolean {
  if (!current) return true;

  const currentVersion = current.version ?? 1;
  const incomingVersion = incoming.version ?? 1;

  if (incomingVersion > currentVersion) return true;
  if (incomingVersion < currentVersion) return false;

  const currentTs = new Date(current.updatedAt).getTime();
  const incomingTs = new Date(incoming.updatedAt).getTime();

  if (Number.isNaN(incomingTs)) return false;
  if (Number.isNaN(currentTs)) return true;

  return incomingTs > currentTs;
}

// =============================================================================
// 3. SERIALIZAÇÃO E DESSERIALIZAÇÃO SEGURA
// =============================================================================

/**
 * Converte um TvProgram da aplicação para o formato da linha do banco Postgres.
 */
export function serializeProgram(
  program: TvProgram,
): Omit<SolTvProgramRow, "scope_key" | "created_at" | "updated_at"> {
  const editorialStatus: "draft" | "published" | "disabled" =
    program.status === "published" || program.status === "disabled"
      ? program.status
      : "draft";

  return {
    ...(program.catalogId !== undefined ? { catalog_id: program.catalogId, starts_at: program.startsAt, ends_at: program.endsAt } : {}),
    id: program.id,
    store: program.store || "Loja 01",
    sector: program.sector || "acougue",
    name: program.name.trim() || "Programação Sem Nome",
    editorial_status: editorialStatus,
    recurrence: program.schedule.recurrence || "always",
    priority: Math.min(100, Math.max(1, program.priority ?? 50)),
    schedule: {
      recurrence: program.schedule.recurrence || "always",
      weekdays: Array.isArray(program.schedule.weekdays) ? program.schedule.weekdays : undefined,
      startDate: program.schedule.startDate || undefined,
      endDate: program.schedule.endDate || undefined,
      startTime: program.schedule.startTime || undefined,
      endTime: program.schedule.endTime || undefined,
      overrideMode: program.schedule.overrideMode || undefined,
      interleaveFrequency: program.schedule.interleaveFrequency || undefined,
    },
    screens: program.catalogId ? [] : Array.isArray(program.screens)
      ? program.screens.map((scr, idx) => ({
          id: scr.id || `scr-${idx + 1}`,
          kind: scr.kind || "layout",
          position: typeof scr.position === "number" ? scr.position : idx,
          duration: Math.max(1, typeof scr.duration === "number" ? scr.duration : 8),
          active: scr.active !== false,
          layout: scr.layout || undefined,
          offerIds: Array.isArray(scr.offerIds) ? scr.offerIds : undefined,
          mediaId: scr.mediaId || undefined,
          mediaUrl: scr.mediaUrl || undefined,
          title: scr.title || undefined,
          offers: Array.isArray(scr.offers) ? scr.offers : undefined,
        }))
      : [],
    version: program.version ?? 1,
    published_at: program.publishedAt || null,
    disabled_at: program.disabledAt || null,
    created_by: program.createdBy || null,
    updated_by: program.updatedBy || null,
  };
}

/**
 * Valida rigorosamente e converte uma linha do Postgres para o TvProgram tipado.
 * Retorna null se os dados essenciais estiverem irremediavelmente corrompidos.
 */
export function deserializeProgram(row: unknown): TvProgram | null {
  if (!row || typeof row !== "object") return null;

  const r = row as Record<string, unknown>;

  if (typeof r.id !== "string" || !r.id.trim()) {
    console.warn("[deserializeProgram] Ignorando linha sem ID válido:", row);
    return null;
  }

  const id = r.id;
  const store = typeof r.store === "string" && r.store.trim() ? r.store : "Loja 01";
  const sector = typeof r.sector === "string" && r.sector.trim() ? r.sector : "acougue";
  const name = typeof r.name === "string" && r.name.trim() ? r.name : "Programação Sem Nome";

  // Status editorial
  let status: ProgramStatus = "draft";
  if (r.editorial_status === "published") status = "published";
  else if (r.editorial_status === "disabled") status = "disabled";

  // Prioridade
  let priority = 50;
  if (typeof r.priority === "number" && Number.isFinite(r.priority)) {
    priority = Math.min(100, Math.max(1, r.priority));
  }

  // Recorrência
  let recurrence: ProgramRecurrence = "always";
  if (
    r.recurrence === "weekly" ||
    r.recurrence === "date_range" ||
    r.recurrence === "flash_offer" ||
    r.recurrence === "always"
  ) {
    recurrence = r.recurrence;
  }

  // Schedule JSONB
  const rawSched = (r.schedule && typeof r.schedule === "object" ? r.schedule : {}) as Record<
    string,
    unknown
  >;

  const schedule: ProgramSchedule = {
    recurrence: (rawSched.recurrence as ProgramRecurrence) || recurrence,
    weekdays: Array.isArray(rawSched.weekdays)
      ? rawSched.weekdays.filter((w): w is number => typeof w === "number" && w >= 0 && w <= 6)
      : undefined,
    startDate: typeof rawSched.startDate === "string" ? rawSched.startDate : undefined,
    endDate: typeof rawSched.endDate === "string" ? rawSched.endDate : undefined,
    startTime: typeof rawSched.startTime === "string" ? rawSched.startTime : undefined,
    endTime: typeof rawSched.endTime === "string" ? rawSched.endTime : undefined,
    overrideMode:
      rawSched.overrideMode === "takeover" || rawSched.overrideMode === "interleave"
        ? rawSched.overrideMode
        : undefined,
    interleaveFrequency:
      typeof rawSched.interleaveFrequency === "number" ? rawSched.interleaveFrequency : undefined,
  };

  // Screens JSONB
  const screens: ProgramScreen[] = [];
  if (Array.isArray(r.screens)) {
    r.screens.forEach((rawScr, idx) => {
      if (!rawScr || typeof rawScr !== "object") return;
      const s = rawScr as Record<string, unknown>;

      const screenKind: ScreenKind =
        s.kind === "image" || s.kind === "video" || s.kind === "layout" ? s.kind : "layout";

      screens.push({
        id: typeof s.id === "string" && s.id ? s.id : `screen-${idx + 1}`,
        kind: screenKind,
        position: typeof s.position === "number" ? s.position : idx,
        duration: typeof s.duration === "number" && s.duration > 0 ? s.duration : 8,
        active: s.active !== false,
        layout: (s.layout as OfferLayout) || (screenKind === "layout" ? "single" : undefined),
        offerIds: Array.isArray(s.offerIds)
          ? s.offerIds.filter((id): id is string => typeof id === "string" && Boolean(id))
          : undefined,
        offers: Array.isArray(s.offers) ? s.offers : undefined,
        mediaId: typeof s.mediaId === "string" ? s.mediaId : undefined,
        mediaUrl: typeof s.mediaUrl === "string" ? s.mediaUrl : undefined,
        title: typeof s.title === "string" ? s.title : undefined,
      });
    });
  }

  const version = typeof r.version === "number" && r.version >= 1 ? r.version : 1;
  const createdAt = typeof r.created_at === "string" ? r.created_at : new Date().toISOString();
  const updatedAt = typeof r.updated_at === "string" ? r.updated_at : createdAt;
  const publishedAt = typeof r.published_at === "string" ? r.published_at : null;
  const disabledAt = typeof r.disabled_at === "string" ? r.disabled_at : null;
  const createdBy = typeof r.created_by === "string" ? r.created_by : null;
  const updatedBy = typeof r.updated_by === "string" ? r.updated_by : null;
  const scopeKey =
    typeof r.scope_key === "string" ? r.scope_key : getScopeKey(store, sector);

  return {
    catalogId: typeof r.catalog_id === "string" ? r.catalog_id : undefined,
    startsAt: typeof r.starts_at === "string" ? r.starts_at : undefined,
    endsAt: typeof r.ends_at === "string" ? r.ends_at : undefined,
    id,
    store,
    sector,
    name,
    status,
    priority,
    schedule,
    screens,
    version,
    scopeKey,
    publishedAt,
    disabledAt,
    createdBy,
    updatedBy,
    createdAt,
    updatedAt,
  };
}

// =============================================================================
// 4. CAMADA DE SERVIÇO (CRUD + CONCORRÊNCIA OTIMISTA)
// =============================================================================

/**
 * Busca todas as programações compartilhadas no Supabase para a loja e setor.
 * Atualiza automaticamente o cache local IndexedDB e os registros de sincronização.
 */
export async function fetchPrograms(store = "Loja 01", sector = "acougue"): Promise<TvProgram[]> {
  const scopeKey = getScopeKey(store, sector);

  if (!databaseConfigured || !supabase) {
    console.warn("[programService] Supabase não configurado. Retornando cache IndexedDB.");
    return getCachedPrograms(store, sector);
  }

  try {
    const { data, error } = await supabase
      .from("sol_tv_programs")
      .select("*")
      .eq("scope_key", scopeKey)
      .order("updated_at", { ascending: false });

    if (error) {
      console.error("[programService] Erro ao buscar programações no Supabase:", error);
      void setSyncRecord(store, sector, { status: "error" });
      // Fallback gracioso para o cache IndexedDB
      return getCachedPrograms(store, sector);
    }

    const programs: TvProgram[] = [];
    if (Array.isArray(data)) {
      for (const row of data) {
        const prog = deserializeProgram(row);
        if (prog) programs.push(prog);
      }
    }

    // Atualiza cache estruturado IndexedDB
    await setCachedPrograms(store, sector, programs);
    await setSyncRecord(store, sector, {
      status: "online",
      lastSuccessfulSyncAt: new Date().toISOString(),
      programsCount: programs.length,
    });

    return programs;
  } catch (err) {
    console.error("[programService] Exceção inesperada no fetchPrograms:", err);
    void setSyncRecord(store, sector, { status: "stale_offline" });
    return getCachedPrograms(store, sector);
  }
}

/**
 * Cria uma nova programação compartilhada no Supabase.
 */
export async function createProgram(
  program: Omit<TvProgram, "id" | "createdAt" | "updatedAt" | "version"> & {
    id?: string;
    version?: number;
    createdAt?: string;
    updatedAt?: string;
  },
): Promise<TvProgram> {
  const isUUID =
    typeof program.id === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(program.id);
  const finalId = isUUID ? (program.id as string) : crypto.randomUUID();

  const fullProgram: TvProgram = {
    ...program,
    id: finalId,
    version: program.version || 1,
    createdAt: program.createdAt || new Date().toISOString(),
    updatedAt: program.updatedAt || new Date().toISOString(),
  };

  if (!databaseConfigured || !supabase) {
    await upsertCachedProgram(fullProgram);
    return fullProgram;
  }

  const payload = serializeProgram(fullProgram);

  const { data, error } = await supabase
    .from("sol_tv_programs")
    .insert(payload)
    .select("*")
    .single();

  if (error || !data) {
    console.error("[programService] Erro ao criar programação:", error);
    throw error || new Error("Falha ao criar programação no Supabase.");
  }

  const created = deserializeProgram(data);
  if (!created) {
    throw new Error("Erro ao desserializar programação criada pelo Supabase.");
  }

  await upsertCachedProgram(created);
  return created;
}

/**
 * Atualiza uma programação existente aplicando verificação de concorrência otimista.
 * Se expectedVersion for fornecido e o registro no banco já estiver em uma versão superior,
 * lança OptimisticConcurrencyError.
 */
export async function updateProgram(
  program: TvProgram,
  expectedVersion?: number,
): Promise<TvProgram> {
  const versionToCheck = expectedVersion !== undefined ? expectedVersion : program.version;

  if (!databaseConfigured || !supabase) {
    const localUpdated: TvProgram = {
      ...program,
      version: (program.version ?? 1) + 1,
      updatedAt: new Date().toISOString(),
    };
    await upsertCachedProgram(localUpdated);
    return localUpdated;
  }

  const payload = serializeProgram(program);

  // Consulta de UPDATE com controle de versão
  let query = supabase.from("sol_tv_programs").update(payload).eq("id", program.id);

  if (typeof versionToCheck === "number") {
    query = query.eq("version", versionToCheck);
  }

  const { data, error } = await query.select("*");

  if (error) {
    console.error("[programService] Erro no updateProgram:", error);
    throw error;
  }

  // Se nenhuma linha foi atualizada, detectamos conflito de versão
  if (!data || data.length === 0) {
    // Busca a versão atual no banco para enriquecer o erro
    const { data: currRow } = await supabase
      .from("sol_tv_programs")
      .select("version")
      .eq("id", program.id)
      .single();

    const currentVer = (currRow as { version?: number })?.version;
    throw new OptimisticConcurrencyError(program.id, versionToCheck, currentVer);
  }

  const updated = deserializeProgram(data[0]);
  if (!updated) {
    throw new Error("Erro ao desserializar dados atualizados do Supabase.");
  }

  await upsertCachedProgram(updated);
  return updated;
}

/**
 * Desativa uma programação (soft-disable: editorial_status = 'disabled') de forma segura.
 */
export async function disableProgram(
  program: TvProgram,
  expectedVersion?: number,
): Promise<TvProgram> {
  return updateProgram({ ...program, status: "disabled" }, expectedVersion);
}

/**
 * Remove uma programação do Supabase e do cache.
 */
export async function deleteProgram(id: string): Promise<void> {
  await deleteCachedProgram(id);

  if (!databaseConfigured || !supabase) return;

  const { error } = await supabase.from("sol_tv_programs").delete().eq("id", id);
  if (error) {
    console.error("[programService] Erro ao deletar programação:", error);
    throw error;
  }
}

// =============================================================================
// 5. SUBSCRIÇÃO REALTIME INCREMENTAL COM FILTRO SCOPE_KEY
// =============================================================================

export type ProgramSubscriptionCallbacks = {
  onInsert?: (program: TvProgram) => void;
  onUpdate?: (program: TvProgram) => void;
  onUpsert?: (program: TvProgram) => void;
  onDelete?: (id: string) => void;
  onStatusChange?: (status: ProgramSyncState) => void;
};

/**
 * Inscreve-se nas alterações em tempo real de programações para um determinado escopo (store:sector).
 * Atualiza incrementalmente o cache IndexedDB e notifica os callbacks.
 */
export function subscribeToPrograms(
  store: string,
  sector: string,
  callbacks: ProgramSubscriptionCallbacks,
): () => void {
  if (!databaseConfigured || !supabase) {
    callbacks.onStatusChange?.("stale_offline");
    return () => {};
  }

  const scopeKey = getScopeKey(store, sector);
  const channelName = `sol-programs-feed:${scopeKey}:${Math.random().toString(36).slice(2, 9)}`;

  callbacks.onStatusChange?.("syncing");

  const channel = supabase
    .channel(channelName)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "sol_tv_programs",
        // scope_key is generated and may be absent from logical replication.
      },
      (payload) => {
        try {
          if (payload.eventType !== 'DELETE') {
            const incoming = payload.new as { id?: string; store?: string; sector?: string };
            if (getScopeKey(incoming.store || '', incoming.sector || '') !== scopeKey) {
              if (incoming.id) callbacks.onDelete?.(incoming.id);
              return;
            }
          }
          if (payload.eventType === "INSERT") {
            const prog = deserializeProgram(payload.new);
            if (prog) {
              void upsertCachedProgram(prog);
              callbacks.onInsert?.(prog);
              callbacks.onUpsert?.(prog);
            }
          } else if (payload.eventType === "UPDATE") {
            const prog = deserializeProgram(payload.new);
            if (prog) {
              void upsertCachedProgram(prog);
              callbacks.onUpdate?.(prog);
              callbacks.onUpsert?.(prog);
            }
          } else if (payload.eventType === "DELETE") {
            const oldId = (payload.old as { id?: string })?.id;
            if (oldId) {
              void deleteCachedProgram(oldId);
              callbacks.onDelete?.(oldId);
            }
          }
        } catch (err) {
          console.error("[programService Realtime] Erro ao processar evento:", err);
        }
      },
    )
    .subscribe((status) => {
      if (status === "SUBSCRIBED") {
        callbacks.onStatusChange?.("online");
        void setSyncRecord(store, sector, { status: "online" });
      } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        callbacks.onStatusChange?.("stale_offline");
        void setSyncRecord(store, sector, { status: "stale_offline" });
      }
    });

  return () => {
    if (supabase) {
      void supabase.removeChannel(channel);
    }
  };
}

// =============================================================================
// 6. BOOTSTRAP DETERMINÍSTICO SEGURO (ZERO RACE CONDITION)
// =============================================================================

/**
 * Executa o ciclo seguro de inicialização:
 * 1. Emite imediatamente os dados cacheados do IndexedDB (0ms tela preta).
 * 2. Inicia a subscrição Realtime com buffer de eventos.
 * 3. Dispara o fetch inicial no Supabase.
 * 4. Faz o merge determinístico aplicando apenas versões mais recentes.
 */
export async function bootstrapPrograms(
  store: string,
  sector: string,
  onStateUpdate: (programs: TvProgram[], syncState: ProgramSyncState) => void,
): Promise<() => void> {
  const currentProgramsMap = new Map<string, TvProgram>();
  let isFetching = true;
  const eventBuffer: TvProgram[] = [];

  // 1. Carrega IndexedDB imediatamente
  const cached = await getCachedPrograms(store, sector);
  for (const p of cached) {
    currentProgramsMap.set(p.id, p);
  }
  onStateUpdate(Array.from(currentProgramsMap.values()), "syncing");

  // 2. Abre Realtime com buffer
  const unsubscribe = subscribeToPrograms(store, sector, {
    onUpsert: (incomingProg) => {
      if (isFetching) {
        eventBuffer.push(incomingProg);
      } else {
        const current = currentProgramsMap.get(incomingProg.id);
        if (shouldApplyProgramUpdate(current, incomingProg)) {
          currentProgramsMap.set(incomingProg.id, incomingProg);
          onStateUpdate(Array.from(currentProgramsMap.values()), "online");
        }
      }
    },
    onDelete: (id) => {
      currentProgramsMap.delete(id);
      onStateUpdate(Array.from(currentProgramsMap.values()), "online");
    },
    onStatusChange: (status) => {
      onStateUpdate(Array.from(currentProgramsMap.values()), status);
    },
  });

  // 3. Executa fetch inicial no Supabase
  try {
    const remotePrograms = await fetchPrograms(store, sector);

    // Merge dos programas remotos
    for (const remote of remotePrograms) {
      const current = currentProgramsMap.get(remote.id);
      if (shouldApplyProgramUpdate(current, remote)) {
        currentProgramsMap.set(remote.id, remote);
      }
    }

    // 4. Aplica eventos bufferizados que chegaram durante o fetch
    for (const buffered of eventBuffer) {
      const current = currentProgramsMap.get(buffered.id);
      if (shouldApplyProgramUpdate(current, buffered)) {
        currentProgramsMap.set(buffered.id, buffered);
      }
    }
  } catch (err) {
    console.warn("[bootstrapPrograms] Falha no fetch inicial, mantendo cache:", err);
  } finally {
    isFetching = false;
    eventBuffer.length = 0;
    onStateUpdate(Array.from(currentProgramsMap.values()), databaseConfigured ? "online" : "stale_offline");
  }

  return unsubscribe;
}
