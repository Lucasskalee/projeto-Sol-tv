import { describe, it, expect, beforeEach } from "vitest";
import {
  deserializeProgram,
  getScopeKey,
  OptimisticConcurrencyError,
  serializeProgram,
  shouldApplyProgramUpdate,
  type SolTvProgramRow,
} from "./programService";
import type { TvProgram } from "../offers/programs";
import {
  clearAllProgramCache,
  getCachedPrograms,
  getSyncRecord,
  setCachedPrograms,
  setSyncRecord,
  upsertCachedProgram,
  deleteCachedProgram,
} from "./programCache";

describe("programService — Serialização e Desserialização", () => {
  it("serializeProgram serializa corretamente um TvProgram completo", () => {
    const program: TvProgram = {
      id: "prog-001",
      name: "Black Friday Especial",
      store: "Loja 01",
      sector: "acougue",
      status: "published",
      priority: 85,
      schedule: {
        recurrence: "flash_offer",
        startDate: "2026-11-27",
        startTime: "16:20",
        endTime: "19:00",
        overrideMode: "takeover",
        interleaveFrequency: 2,
      },
      screens: [
        {
          id: "scr-1",
          kind: "layout",
          position: 0,
          duration: 10,
          active: true,
          layout: "hero",
          offerIds: ["off-1", "off-2"],
        },
      ],
      version: 3,
      publishedAt: "2026-11-27T16:20:00.000Z",
      disabledAt: null,
      createdAt: "2026-11-27T10:00:00.000Z",
      updatedAt: "2026-11-27T16:20:00.000Z",
    };

    const serialized = serializeProgram(program);

    expect(serialized.id).toBe("prog-001");
    expect(serialized.store).toBe("Loja 01");
    expect(serialized.sector).toBe("acougue");
    expect(serialized.name).toBe("Black Friday Especial");
    expect(serialized.editorial_status).toBe("published");
    expect(serialized.recurrence).toBe("flash_offer");
    expect(serialized.priority).toBe(85);
    expect(serialized.version).toBe(3);
    expect(serialized.published_at).toBe("2026-11-27T16:20:00.000Z");
    expect(serialized.disabled_at).toBeNull();
    expect(serialized.schedule).toEqual({
      recurrence: "flash_offer",
      weekdays: undefined,
      startDate: "2026-11-27",
      endDate: undefined,
      startTime: "16:20",
      endTime: "19:00",
      overrideMode: "takeover",
      interleaveFrequency: 2,
    });
    expect(serialized.screens).toHaveLength(1);
    expect(serialized.screens[0].layout).toBe("hero");
    expect(serialized.screens[0].offerIds).toEqual(["off-1", "off-2"]);
  });

  it("serializeProgram normaliza prioridades fora do intervalo 1..100", () => {
    const progLow: TvProgram = {
      id: "p-low",
      name: "Low",
      store: "Loja 01",
      sector: "acougue",
      status: "draft",
      priority: -10,
      schedule: { recurrence: "always" },
      screens: [],
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z",
    };
    expect(serializeProgram(progLow).priority).toBe(1);

    const progHigh: TvProgram = {
      ...progLow,
      priority: 250,
    };
    expect(serializeProgram(progHigh).priority).toBe(100);
  });

  it("deserializeProgram converte uma linha do Postgres com integridade", () => {
    const row: SolTvProgramRow = {
      id: "prog-db-1",
      store: "Loja 02",
      sector: "padaria",
      scope_key: "loja 02:padaria",
      name: "Pão Francês Quentinho",
      editorial_status: "published",
      recurrence: "weekly",
      priority: 60,
      schedule: {
        recurrence: "weekly",
        weekdays: [1, 2, 3, 4, 5],
        startTime: "06:00",
        endTime: "10:00",
      },
      screens: [
        {
          id: "scr-pad-1",
          kind: "layout",
          position: 0,
          duration: 8,
          active: true,
          layout: "single",
          offerIds: ["off-pao-1"],
        },
      ],
      version: 5,
      published_at: "2026-09-20T10:00:00Z",
      disabled_at: null,
      created_at: "2026-09-15T08:00:00Z",
      updated_at: "2026-09-20T10:00:00Z",
      created_by: "usr-1",
      updated_by: "usr-2",
    };

    const prog = deserializeProgram(row);
    expect(prog).not.toBeNull();
    expect(prog!.id).toBe("prog-db-1");
    expect(prog!.store).toBe("Loja 02");
    expect(prog!.sector).toBe("padaria");
    expect(prog!.scopeKey).toBe("loja 02:padaria");
    expect(prog!.name).toBe("Pão Francês Quentinho");
    expect(prog!.status).toBe("published");
    expect(prog!.priority).toBe(60);
    expect(prog!.version).toBe(5);
    expect(prog!.publishedAt).toBe("2026-09-20T10:00:00Z");
    expect(prog!.schedule.weekdays).toEqual([1, 2, 3, 4, 5]);
    expect(prog!.screens).toHaveLength(1);
    expect(prog!.screens[0].layout).toBe("single");
  });

  it("deserializeProgram rejeita com segurança registros irremediavelmente corrompidos", () => {
    expect(deserializeProgram(null)).toBeNull();
    expect(deserializeProgram(undefined)).toBeNull();
    expect(deserializeProgram("string")).toBeNull();
    expect(deserializeProgram({})).toBeNull();
    expect(deserializeProgram({ id: "" })).toBeNull();
  });

  it("deserializeProgram recupera graciosamente campos opcionais ausentes", () => {
    const minimalRow = {
      id: "prog-min-1",
      name: "Minimal",
    };

    const prog = deserializeProgram(minimalRow);
    expect(prog).not.toBeNull();
    expect(prog!.id).toBe("prog-min-1");
    expect(prog!.name).toBe("Minimal");
    expect(prog!.store).toBe("Loja 01");
    expect(prog!.sector).toBe("acougue");
    expect(prog!.status).toBe("draft");
    expect(prog!.priority).toBe(50);
    expect(prog!.version).toBe(1);
    expect(prog!.schedule.recurrence).toBe("always");
    expect(prog!.screens).toEqual([]);
  });
});

describe("programService — Regras de Concorrência e Merge Fora de Ordem", () => {
  it("getScopeKey formata em minúsculas sem espaços extras", () => {
    expect(getScopeKey("  Loja 01  ", " Açougue ")).toBe("loja 01:açougue");
  });

  it("shouldApplyProgramUpdate aceita payload se não houver registro em memória", () => {
    const incoming: TvProgram = {
      id: "p1",
      name: "Novo",
      store: "Loja 01",
      sector: "acougue",
      status: "draft",
      schedule: { recurrence: "always" },
      screens: [],
      version: 1,
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z",
    };

    expect(shouldApplyProgramUpdate(undefined, incoming)).toBe(true);
  });

  it("shouldApplyProgramUpdate aceita versão mais nova (incoming.version > current.version)", () => {
    const current: TvProgram = {
      id: "p1",
      name: "Versão 1",
      store: "Loja 01",
      sector: "acougue",
      status: "draft",
      schedule: { recurrence: "always" },
      screens: [],
      version: 1,
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z",
    };

    const incoming: TvProgram = {
      ...current,
      name: "Versão 2",
      version: 2,
      updatedAt: "2026-01-01T00:05:00Z",
    };

    expect(shouldApplyProgramUpdate(current, incoming)).toBe(true);
  });

  it("shouldApplyProgramUpdate descarta versão defasada (incoming.version < current.version)", () => {
    const current: TvProgram = {
      id: "p1",
      name: "Versão 3",
      store: "Loja 01",
      sector: "acougue",
      status: "draft",
      schedule: { recurrence: "always" },
      screens: [],
      version: 3,
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:10:00Z",
    };

    const staleIncoming: TvProgram = {
      ...current,
      name: "Versão 2 antiga",
      version: 2,
      updatedAt: "2026-01-01T00:05:00Z",
    };

    expect(shouldApplyProgramUpdate(current, staleIncoming)).toBe(false);
  });

  it("shouldApplyProgramUpdate desempata por timestamp em caso de mesma versão", () => {
    const current: TvProgram = {
      id: "p1",
      name: "Original",
      store: "Loja 01",
      sector: "acougue",
      status: "draft",
      schedule: { recurrence: "always" },
      screens: [],
      version: 2,
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T10:00:00Z",
    };

    const newerTimestamp: TvProgram = {
      ...current,
      name: "Mais Recente",
      updatedAt: "2026-01-01T10:05:00Z",
    };

    const olderTimestamp: TvProgram = {
      ...current,
      name: "Mais Antigo",
      updatedAt: "2026-01-01T09:55:00Z",
    };

    expect(shouldApplyProgramUpdate(current, newerTimestamp)).toBe(true);
    expect(shouldApplyProgramUpdate(current, olderTimestamp)).toBe(false);
  });

  it("OptimisticConcurrencyError instancia erro com propriedades tipadas", () => {
    const err = new OptimisticConcurrencyError("prog-abc", 3, 4);
    expect(err.name).toBe("OptimisticConcurrencyError");
    expect(err.programId).toBe("prog-abc");
    expect(err.expectedVersion).toBe(3);
    expect(err.currentVersion).toBe(4);
    expect(err.message).toContain("prog-abc");
    expect(err.message).toContain("esperava v3");
    expect(err.message).toContain("v4");
  });
});

describe("programCache — IndexedDB / In-Memory Cache", () => {
  beforeEach(async () => {
    await clearAllProgramCache();
  });

  it("grava e lê programas do cache por loja e setor", async () => {
    const prog1: TvProgram = {
      id: "prog-cache-1",
      name: "Programa Açougue",
      store: "Loja 01",
      sector: "acougue",
      status: "published",
      priority: 50,
      schedule: { recurrence: "always" },
      screens: [],
      version: 1,
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z",
    };

    const prog2: TvProgram = {
      id: "prog-cache-2",
      name: "Programa Padaria",
      store: "Loja 01",
      sector: "padaria",
      status: "published",
      priority: 50,
      schedule: { recurrence: "always" },
      screens: [],
      version: 1,
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z",
    };

    await setCachedPrograms("Loja 01", "acougue", [prog1]);
    await setCachedPrograms("Loja 01", "padaria", [prog2]);

    const acougueList = await getCachedPrograms("Loja 01", "acougue");
    expect(acougueList).toHaveLength(1);
    expect(acougueList[0].id).toBe("prog-cache-1");

    const padariaList = await getCachedPrograms("Loja 01", "padaria");
    expect(padariaList).toHaveLength(1);
    expect(padariaList[0].id).toBe("prog-cache-2");
  });

  it("upsertCachedProgram atualiza um único programa no cache", async () => {
    const prog: TvProgram = {
      id: "prog-u-1",
      name: "Versão Original",
      store: "Loja 01",
      sector: "acougue",
      status: "draft",
      priority: 50,
      schedule: { recurrence: "always" },
      screens: [],
      version: 1,
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z",
    };

    await upsertCachedProgram(prog);
    let list = await getCachedPrograms("Loja 01", "acougue");
    expect(list).toHaveLength(1);
    expect(list[0].name).toBe("Versão Original");

    await upsertCachedProgram({ ...prog, name: "Versão Modificada", version: 2 });
    list = await getCachedPrograms("Loja 01", "acougue");
    expect(list).toHaveLength(1);
    expect(list[0].name).toBe("Versão Modificada");
    expect(list[0].version).toBe(2);
  });

  it("deleteCachedProgram remove o programa do cache", async () => {
    const prog: TvProgram = {
      id: "prog-del-1",
      name: "Para Deletar",
      store: "Loja 01",
      sector: "acougue",
      status: "draft",
      priority: 50,
      schedule: { recurrence: "always" },
      screens: [],
      version: 1,
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z",
    };

    await upsertCachedProgram(prog);
    expect(await getCachedPrograms("Loja 01", "acougue")).toHaveLength(1);

    await deleteCachedProgram("prog-del-1");
    expect(await getCachedPrograms("Loja 01", "acougue")).toHaveLength(0);
  });

  it("grava e lê metadados de sincronização (SyncRecord)", async () => {
    await setSyncRecord("Loja 01", "acougue", {
      status: "online",
      lastSuccessfulSyncAt: "2026-09-20T14:30:00Z",
      programsCount: 5,
    });

    const record = await getSyncRecord("Loja 01", "acougue");
    expect(record).not.toBeNull();
    expect(record!.status).toBe("online");
    expect(record!.lastSuccessfulSyncAt).toBe("2026-09-20T14:30:00Z");
    expect(record!.programsCount).toBe(5);
  });
});

