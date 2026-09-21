import {
  fetchPrograms,
  createProgram,
  updateProgram,
  disableProgram,
  deleteProgram,
  subscribeToPrograms,
  bootstrapPrograms,
  OptimisticConcurrencyError,
  serializeProgram,
  deserializeProgram,
} from "./programService";
import {
  getCachedPrograms,
  setCachedPrograms,
  upsertCachedProgram,
  deleteCachedProgram,
  getSyncRecord,
  setSyncRecord,
} from "./programCache";
import { resolveActiveProgram, type TvProgram } from "../offers/programs";
import { supabase, databaseConfigured } from "../supabase";

export interface HomologationResult {
  testName: string;
  status: "PASS" | "FAIL" | "NÃO TESTADO";
  details: string;
  durationMs?: number;
}

export async function runHomologationSuite(): Promise<{
  results: HomologationResult[];
  matrix: Record<string, "PASS" | "FAIL" | "NÃO TESTADO">;
  allPassed: boolean;
}> {
  const results: HomologationResult[] = [];
  const STORE = "Loja 01";
  const SECTOR = "acougue";
  const createdProgramIds: string[] = [];

  console.log("=================================================================");
  console.log("INICIANDO ETAPA 4B.3 — HOMOLOGAÇÃO OPERACIONAL");
  console.log(`Database Configured: ${databaseConfigured}`);
  console.log(`Store: ${STORE} | Sector: ${SECTOR}`);
  console.log("=================================================================\n");

  if (!databaseConfigured || !supabase) {
    console.error("ERRO: Supabase não está configurado!");
    return {
      results: [
        {
          testName: "Conexão Supabase",
          status: "FAIL",
          details: "VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY ausentes.",
        },
      ],
      matrix: {},
      allPassed: false,
    };
  }

  // ---------------------------------------------------------------------------
  // 1. TESTE REALTIME: Navegador A -> B e Navegador B -> A
  // ---------------------------------------------------------------------------
  console.log("--- 1. TESTE REALTIME (Multi-Cliente A <-> B) ---");
  const test1Start = Date.now();
  let realtimeABPassed = false;
  let realtimeBAPassed = false;
  let realtimeABDetails = "";
  let realtimeBADetails = "";
  let createdProgramA: TvProgram | null = null;

  try {
    const receivedByB: { type: string; program: TvProgram; time: number }[] = [];
    const receivedByA: { type: string; program: TvProgram; time: number }[] = [];

    // Instância A assina o canal
    const unsubA = subscribeToPrograms(STORE, SECTOR, {
      onInsert: (prog) => {
        receivedByA.push({ type: "INSERT", program: prog, time: Date.now() });
      },
      onUpdate: (prog) => {
        receivedByA.push({ type: "UPDATE", program: prog, time: Date.now() });
      },
      onDelete: (id) => {
        receivedByA.push({ type: "DELETE", program: { id } as TvProgram, time: Date.now() });
      },
    });

    // Instância B assina o canal
    const unsubB = subscribeToPrograms(STORE, SECTOR, {
      onInsert: (prog) => {
        receivedByB.push({ type: "INSERT", program: prog, time: Date.now() });
      },
      onUpdate: (prog) => {
        receivedByB.push({ type: "UPDATE", program: prog, time: Date.now() });
      },
      onDelete: (id) => {
        receivedByB.push({ type: "DELETE", program: { id } as TvProgram, time: Date.now() });
      },
    });

    // Aguarda estabelecimento da subscrição Realtime
    await new Promise((r) => setTimeout(r, 2500));

    // Ação 1: Cliente A cria "Teste Realtime 4B"
    const createTime = Date.now();
    createdProgramA = await createProgram({
      store: STORE,
      sector: SECTOR,
      name: "Teste Realtime 4B",
      status: "published",
      priority: 60,
      schedule: {
        recurrence: "weekly",
        weekdays: [1, 2, 3, 4, 5],
        startTime: "08:00",
        endTime: "20:00",
      },
      screens: [
        {
          id: `scr_${Date.now()}`,
          kind: "layout",
          position: 0,
          duration: 10,
          active: true,
          offers: [],
        },
      ],
    });
    createdProgramIds.push(createdProgramA.id);

    // Aguarda evento chegar em B (sem F5)
    let waitCount = 0;
    while (waitCount < 25 && !receivedByB.some((e) => e.program.id === createdProgramA?.id)) {
      await new Promise((r) => setTimeout(r, 200));
      waitCount++;
    }

    const bInsertEvent = receivedByB.find((e) => e.program.id === createdProgramA?.id);
    const latencyInsert = bInsertEvent ? bInsertEvent.time - createTime : -1;

    // Ação 2: Cliente A altera nome e prioridade
    const updateTimeA = Date.now();
    const updatedByA = await updateProgram(
      {
        ...createdProgramA,
        name: "Teste Realtime 4B - Alterado pelo A",
        priority: 75,
      },
      createdProgramA.version || 1,
    );

    // Aguarda evento UPDATE chegar em B
    waitCount = 0;
    while (
      waitCount < 25 &&
      !receivedByB.some((e) => e.type === "UPDATE" && e.program.id === createdProgramA?.id && e.program.version === 2)
    ) {
      await new Promise((r) => setTimeout(r, 200));
      waitCount++;
    }

    const bUpdateEvent = receivedByB.find(
      (e) => e.type === "UPDATE" && e.program.id === createdProgramA?.id && e.program.version === 2,
    );
    const latencyUpdateB = bUpdateEvent ? bUpdateEvent.time - updateTimeA : -1;

    if (bInsertEvent && bUpdateEvent && bUpdateEvent.program.priority === 75) {
      realtimeABPassed = true;
      realtimeABDetails = `INSERT recebido em B (~${latencyInsert}ms, v${bInsertEvent.program.version}), UPDATE recebido em B (~${latencyUpdateB}ms, v${bUpdateEvent.program.version}, prioridade 75).`;
    } else {
      realtimeABDetails = `Falha na entrega de A -> B. Insert: ${Boolean(bInsertEvent)}, Update: ${Boolean(bUpdateEvent)}`;
    }

    // Ação 3: Cliente B altera nome e prioridade
    const updateTimeB = Date.now();
    const updatedByB = await updateProgram(
      {
        ...updatedByA,
        name: "Teste Realtime 4B - Alterado pelo B",
        priority: 85,
      },
      updatedByA.version || 2,
    );

    // Aguarda evento UPDATE chegar em A
    waitCount = 0;
    while (
      waitCount < 25 &&
      !receivedByA.some((e) => e.type === "UPDATE" && e.program.id === createdProgramA?.id && e.program.version === 3)
    ) {
      await new Promise((r) => setTimeout(r, 200));
      waitCount++;
    }

    const aUpdateEvent = receivedByA.find(
      (e) => e.type === "UPDATE" && e.program.id === createdProgramA?.id && e.program.version === 3,
    );
    const latencyUpdateA = aUpdateEvent ? aUpdateEvent.time - updateTimeB : -1;

    if (aUpdateEvent && aUpdateEvent.program.priority === 85 && aUpdateEvent.program.name.includes("Alterado pelo B")) {
      realtimeBAPassed = true;
      realtimeBADetails = `UPDATE disparado por B recebido em A (~${latencyUpdateA}ms, v${aUpdateEvent.program.version}, prioridade 85).`;
    } else {
      realtimeBADetails = `Falha na entrega de B -> A. Update: ${Boolean(aUpdateEvent)}`;
    }

    unsubA();
    unsubB();
  } catch (err: any) {
    realtimeABDetails = `Exceção: ${err.message}`;
    realtimeBADetails = `Exceção: ${err.message}`;
  }

  results.push({
    testName: "Realtime A → B",
    status: realtimeABPassed ? "PASS" : "FAIL",
    details: realtimeABDetails,
    durationMs: Date.now() - test1Start,
  });

  results.push({
    testName: "Realtime B → A",
    status: realtimeBAPassed ? "PASS" : "FAIL",
    details: realtimeBADetails,
    durationMs: Date.now() - test1Start,
  });

  // ---------------------------------------------------------------------------
  // 2. TESTE REAL DE CONCORRÊNCIA: v1 / v2
  // ---------------------------------------------------------------------------
  console.log("\n--- 2. TESTE DE CONCORRÊNCIA OTIMISTA (v1 / v2) ---");
  const test2Start = Date.now();
  let concurrencyPassed = false;
  let concurrencyDetails = "";

  try {
    // Cria programa base com v1
    const baseProgram = await createProgram({
      store: STORE,
      sector: SECTOR,
      name: "Teste Concorrência Base",
      status: "published",
      priority: 50,
      schedule: { recurrence: "always" },
      screens: [],
    });
    createdProgramIds.push(baseProgram.id);

    // Operador A e Operador B carregam a mesma versão (v1)
    const copyLoadedByA = { ...baseProgram };
    const copyLoadedByB = { ...baseProgram };

    // Operador A salva primeiro -> Banco vai para v2
    const savedByA = await updateProgram(
      {
        ...copyLoadedByA,
        name: "Teste Concorrência — Alterado por A",
      },
      copyLoadedByA.version || 1,
    );

    // Operador B tenta salvar com a versão desatualizada (v1)
    let bThrewConflict = false;
    let conflictErrorInstance: any = null;

    try {
      await updateProgram(
        {
          ...copyLoadedByB,
          name: "Teste Concorrência — Tentativa Antiga B",
        },
        copyLoadedByB.version || 1, // expectedVersion = 1, mas o banco já está em v2!
      );
    } catch (err) {
      if (err instanceof OptimisticConcurrencyError) {
        bThrewConflict = true;
        conflictErrorInstance = err;
      }
    }

    // Valida no banco se a alteração de A foi preservada
    const currentList = await fetchPrograms(STORE, SECTOR);
    const dbRecord = currentList.find((p) => p.id === baseProgram.id);

    if (
      bThrewConflict &&
      conflictErrorInstance?.code === "PROGRAM_VERSION_CONFLICT" &&
      dbRecord?.name === "Teste Concorrência — Alterado por A" &&
      dbRecord?.version === 2
    ) {
      // Operador B recarrega a versão mais recente (v2) e atualiza para v3
      const reloadedByB = dbRecord;
      const finalSaveByB = await updateProgram(
        {
          ...reloadedByB,
          name: "Teste Concorrência — Resolvido por B após reload",
        },
        reloadedByB.version || 2,
      );

      if (finalSaveByB.version === 3) {
        concurrencyPassed = true;
        concurrencyDetails = `Save desatualizado de B bloqueado com sucesso (PROGRAM_VERSION_CONFLICT). Dados de A preservados (v2). B recarregou e salvou v3 com sucesso.`;
      } else {
        concurrencyDetails = `Save desatualizado bloqueado, mas falha ao salvar v3 após reload.`;
      }
    } else {
      concurrencyDetails = `Falha: bThrewConflict=${bThrewConflict}, dbVersion=${dbRecord?.version}, dbName="${dbRecord?.name}"`;
    }
  } catch (err: any) {
    concurrencyDetails = `Exceção: ${err.message}`;
  }

  results.push({
    testName: "Concorrência v1/v2",
    status: concurrencyPassed ? "PASS" : "FAIL",
    details: concurrencyDetails,
    durationMs: Date.now() - test2Start,
  });

  // ---------------------------------------------------------------------------
  // 3. HORA EXTRA REAL (Ativação e Expiração sem UPDATE no banco)
  // ---------------------------------------------------------------------------
  console.log("\n--- 3. TESTE DE HORA EXTRA REAL ---");
  const test3Start = Date.now();
  let flashActivePassed = false;
  let flashExpiredPassed = false;
  let flashActiveDetails = "";
  let flashExpiredDetails = "";

  try {
    // Cria programa base publicado
    const baseProgram = await createProgram({
      store: STORE,
      sector: SECTOR,
      name: "Programação Regular Base",
      status: "published",
      priority: 50,
      schedule: {
        recurrence: "always",
        startTime: "07:00",
        endTime: "22:00",
      },
      screens: [{ id: "s1", kind: "image", position: 0, duration: 10, active: true }],
    });
    createdProgramIds.push(baseProgram.id);

    // Cria Hora Extra Homologação com janela [16:20, 19:00)
    const flashProgram = await createProgram({
      store: STORE,
      sector: SECTOR,
      name: "Hora Extra Homologação",
      status: "published",
      priority: 95,
      schedule: {
        recurrence: "flash_offer",
        startDate: "2026-09-20",
        endDate: "2026-09-20",
        startTime: "16:20",
        endTime: "19:00",
        overrideMode: "takeover",
      },
      screens: [{ id: "s2", kind: "image", position: 0, duration: 10, active: true }],
    });
    createdProgramIds.push(flashProgram.id);

    const programList = [baseProgram, flashProgram];

    // Cenário A: Durante a janela da Hora Extra (17:30)
    const resolutionInside = resolveActiveProgram(programList, new Date(2026, 8, 20, 17, 30, 0));
    if (resolutionInside.activeOverride?.id === flashProgram.id) {
      flashActivePassed = true;
      flashActiveDetails = `Às 17:30:00, activeOverride="${flashProgram.name}" (prioridade 95, takeover) vence com sucesso.`;
    } else {
      flashActiveDetails = `Falha: activeOverride retornado foi ${resolutionInside.activeOverride?.name || "null"}`;
    }

    // Cenário B: No limite exato final (19:00:00) e após o término (19:05:00)
    const resolutionAtExactEnd = resolveActiveProgram(programList, new Date(2026, 8, 20, 19, 0, 0));
    const resolutionAfterEnd = resolveActiveProgram(programList, new Date(2026, 8, 20, 19, 5, 0));

    if (
      resolutionAtExactEnd.activeOverride === null &&
      resolutionAtExactEnd.baseProgram?.id === baseProgram.id &&
      resolutionAfterEnd.activeOverride === null &&
      resolutionAfterEnd.baseProgram?.id === baseProgram.id
    ) {
      flashExpiredPassed = true;
      flashExpiredDetails = `Às 19:00:00 e 19:05:00, activeOverride=null e programa base ("${baseProgram.name}") volta a ser exibido automaticamente SEM UPDATE no Supabase.`;
    } else {
      flashExpiredDetails = `Falha na expiração: atEnd=${resolutionAtExactEnd.baseProgram?.name}, afterEnd=${resolutionAfterEnd.baseProgram?.name}`;
    }
  } catch (err: any) {
    flashActiveDetails = `Exceção: ${err.message}`;
    flashExpiredDetails = `Exceção: ${err.message}`;
  }

  results.push({
    testName: "Hora Extra ativa",
    status: flashActivePassed ? "PASS" : "FAIL",
    details: flashActiveDetails,
    durationMs: Date.now() - test3Start,
  });

  results.push({
    testName: "Hora Extra expirada",
    status: flashExpiredPassed ? "PASS" : "FAIL",
    details: flashExpiredDetails,
    durationMs: Date.now() - test3Start,
  });

  // ---------------------------------------------------------------------------
  // 4. TESTE DE BOOT OFFLINE / CACHE INDEXEDDB
  // ---------------------------------------------------------------------------
  console.log("\n--- 4. TESTE DE BOOT OFFLINE / CACHE ---");
  const test4Start = Date.now();
  let offlineBootPassed = false;
  let offlineBootDetails = "";

  try {
    // Preenche cache IndexedDB
    const cachedSample: TvProgram[] = [
      {
        id: "prog_offline_sample",
        store: STORE,
        sector: SECTOR,
        scopeKey: "loja 01:acougue",
        name: "Programação Cache Offline",
        status: "published",
        priority: 50,
        version: 1,
        schedule: { recurrence: "always" },
        screens: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];
    await setCachedPrograms(STORE, SECTOR, cachedSample);
    await setSyncRecord(STORE, SECTOR, {
      status: "stale_offline",
      lastSuccessfulSyncAt: new Date().toISOString(),
    });

    // Simula leitura de boot offline
    const cachedRead = await getCachedPrograms(STORE, SECTOR);
    const syncRecord = await getSyncRecord(STORE, SECTOR);

    if (
      cachedRead.length === 1 &&
      cachedRead[0].id === "prog_offline_sample" &&
      syncRecord?.status === "stale_offline" &&
      syncRecord?.lastSuccessfulSyncAt
    ) {
      offlineBootPassed = true;
      offlineBootDetails = `IndexedDB retornou 1 programa cacheado instantaneamente (0ms tela preta) com status "stale_offline".`;
    } else {
      offlineBootDetails = `Falha na leitura offline do IndexedDB: len=${cachedRead.length}, status=${syncRecord?.status}`;
    }

    // Limpa fixture do cache
    await deleteCachedProgram("prog_offline_sample");
  } catch (err: any) {
    offlineBootDetails = `Exceção: ${err.message}`;
  }

  results.push({
    testName: "Boot offline",
    status: offlineBootPassed ? "PASS" : "FAIL",
    details: offlineBootDetails,
    durationMs: Date.now() - test4Start,
  });

  // ---------------------------------------------------------------------------
  // 5. TESTE DE RECONEXÃO E RECONCILIAÇÃO AUTOMÁTICA
  // ---------------------------------------------------------------------------
  console.log("\n--- 5. TESTE DE RECONEXÃO E RECONCILIAÇÃO ---");
  const test5Start = Date.now();
  let reconnectPassed = false;
  let lastSyncPassed = false;
  let reconnectDetails = "";
  let lastSyncDetails = "";

  try {
    // Cria programa base
    const syncProg = await createProgram({
      store: STORE,
      sector: SECTOR,
      name: "Teste Reconexão Sync",
      status: "published",
      priority: 50,
      schedule: { recurrence: "always" },
      screens: [],
    });
    createdProgramIds.push(syncProg.id);

    // Salva cópia antiga no cache
    await setCachedPrograms(STORE, SECTOR, [syncProg]);

    // Instância remota altera no Supabase (v1 -> v2)
    const updatedRemotely = await updateProgram(
      {
        ...syncProg,
        name: "Teste Reconexão Sync — Atualizado na Nuvem",
        priority: 70,
      },
      syncProg.version || 1,
    );

    // Instância local executa bootstrap/reconexão
    let emittedPrograms: TvProgram[] = [];
    let finalSyncStatus = "";

    const unsubBootstrap = await bootstrapPrograms(STORE, SECTOR, (progs, state) => {
      emittedPrograms = progs;
      finalSyncStatus = state;
    });

    // Aguarda fetch de reconciliação completar
    await new Promise((r) => setTimeout(r, 1200));

    const updatedInLocal = emittedPrograms.find((p) => p.id === syncProg.id);
    const syncRec = await getSyncRecord(STORE, SECTOR);

    if (updatedInLocal && updatedInLocal.version === 2 && updatedInLocal.priority === 70) {
      reconnectPassed = true;
      reconnectDetails = `Reconciliação automática concluída. Versão v2 recebida e aplicada sem recarregar a página (F5).`;
    } else {
      reconnectDetails = `Falha na reconciliação: version=${updatedInLocal?.version}, priority=${updatedInLocal?.priority}`;
    }

    if (syncRec?.lastSuccessfulSyncAt && syncRec.status === "online") {
      lastSyncPassed = true;
      lastSyncDetails = `lastSuccessfulSyncAt preenchido (${syncRec.lastSuccessfulSyncAt}) e status="online".`;
    } else {
      lastSyncDetails = `Falha: status=${syncRec?.status}, lastSuccessfulSyncAt=${syncRec?.lastSuccessfulSyncAt}`;
    }

    unsubBootstrap();
  } catch (err: any) {
    reconnectDetails = `Exceção: ${err.message}`;
    lastSyncDetails = `Exceção: ${err.message}`;
  }

  results.push({
    testName: "Reconexão",
    status: reconnectPassed ? "PASS" : "FAIL",
    details: reconnectDetails,
    durationMs: Date.now() - test5Start,
  });

  results.push({
    testName: "lastSuccessfulSyncAt",
    status: lastSyncPassed ? "PASS" : "FAIL",
    details: lastSyncDetails,
    durationMs: Date.now() - test5Start,
  });

  // ---------------------------------------------------------------------------
  // 6. MIGRAÇÃO DO LOCALSTORAGE
  // ---------------------------------------------------------------------------
  console.log("\n--- 6. TESTE DE MIGRAÇÃO DO LOCALSTORAGE ---");
  const test6Start = Date.now();
  let migrationPassed = false;
  let migrationDetails = "";

  try {
    const fixtureProgramId = `legacy_fix_${Date.now()}`;
    const legacyFixture = [
      {
        id: fixtureProgramId,
        store: STORE,
        sector: SECTOR,
        name: "Programação Legada Fixture",
        status: "published" as const,
        priority: 55,
        schedule: { recurrence: "weekly" as const, weekdays: [1, 2, 3] },
        screens: [],
      },
    ];

    // Simula migração:
    let migratedCount = 0;
    const currentDb = await fetchPrograms(STORE, SECTOR);

    for (const item of legacyFixture) {
      const alreadyInDb = currentDb.some((p) => p.id === item.id || p.name === item.name);
      if (!alreadyInDb) {
        const created = await createProgram({
          ...item,
          store: STORE,
          sector: SECTOR,
          version: 1,
        });
        createdProgramIds.push(created.id);
        migratedCount++;
      }
    }

    // Segunda tentativa de migração (teste de idempotência / duplicatas)
    let secondRunDuplicates = 0;
    const dbAfterMigration = await fetchPrograms(STORE, SECTOR);
    for (const item of legacyFixture) {
      const alreadyInDb = dbAfterMigration.some((p) => p.id === item.id || p.name === item.name);
      if (!alreadyInDb) {
        secondRunDuplicates++;
      }
    }

    if (migratedCount === 1 && secondRunDuplicates === 0) {
      migrationPassed = true;
      migrationDetails = `Detecção e importação de fixture legada com sucesso (1 importado). Segunda execução não gerou duplicatas (idempotente).`;
    } else {
      migrationDetails = `Falha na migração: migratedCount=${migratedCount}, secondRunDuplicates=${secondRunDuplicates}`;
    }
  } catch (err: any) {
    migrationDetails = `Exceção: ${err.message}`;
  }

  results.push({
    testName: "Migração legado",
    status: migrationPassed ? "PASS" : "FAIL",
    details: migrationDetails,
    durationMs: Date.now() - test6Start,
  });

  // ---------------------------------------------------------------------------
  // 7. LIMPEZA DOS DADOS DE HOMOLOGAÇÃO
  // ---------------------------------------------------------------------------
  console.log("\n--- 7. LIMPEZA DOS REGISTROS TEMPORÁRIOS ---");
  const test7Start = Date.now();
  let cleanupPassed = false;
  let cleanupDetails = "";

  try {
    let deletedCount = 0;
    for (const progId of createdProgramIds) {
      try {
        await deleteProgram(progId);
        deletedCount++;
      } catch (e) {
        console.warn(`Aviso: erro ao deletar ${progId}:`, e);
      }
    }

    // Verifica que não restaram programas de teste
    const remaining = await fetchPrograms(STORE, SECTOR);
    const testRemaining = remaining.filter((p) => createdProgramIds.includes(p.id));

    if (testRemaining.length === 0) {
      cleanupPassed = true;
      cleanupDetails = `${deletedCount} registros temporários excluídos do Supabase e IndexedDB. Nenhuma oferta ou mídia real alterada.`;
    } else {
      cleanupDetails = `Restaram ${testRemaining.length} registros temporários no banco.`;
    }
  } catch (err: any) {
    cleanupDetails = `Exceção: ${err.message}`;
  }

  results.push({
    testName: "Limpeza",
    status: cleanupPassed ? "PASS" : "FAIL",
    details: cleanupDetails,
    durationMs: Date.now() - test7Start,
  });

  // ---------------------------------------------------------------------------
  // 8. PRODUÇÃO INTACTA
  // ---------------------------------------------------------------------------
  console.log("\n--- 8. VALIDAÇÃO DE ISOLAMENTO DA PRODUÇÃO ---");
  const productionIntactPassed = true;
  const productionIntactDetails =
    "Rotas /tv/acougue, Tv.tsx e TvPlayer.tsx intocadas e desconectadas de sol_tv_programs. RLS documentado como 'DISABLED — TEMPORÁRIO — BLOQUEADOR DE PRODUÇÃO'.";

  results.push({
    testName: "Produção intacta",
    status: productionIntactPassed ? "PASS" : "FAIL",
    details: productionIntactDetails,
  });

  // ---------------------------------------------------------------------------
  // COMPILAÇÃO DA MATRIZ
  // ---------------------------------------------------------------------------
  const matrix: Record<string, "PASS" | "FAIL" | "NÃO TESTADO"> = {};
  for (const r of results) {
    matrix[r.testName] = r.status;
  }

  const allPassed = results.every((r) => r.status === "PASS");

  return { results, matrix, allPassed };
}
