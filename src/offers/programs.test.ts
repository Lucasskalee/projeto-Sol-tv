import { describe, expect, it } from "vitest";
import {
  calculateNextTransitionTimestamp,
  calculateProgramStatus,
  createNewProgram,
  duplicateProgram,
  formatProgramSchedulePeriod,
  getProgramCounters,
  getSeedPrograms,
  isMinuteInWindow,
  mergeInterleavedPlaylist,
  parseTimeToMinutes,
  programToTvContent,
  resolveActiveProgram,
  type TvProgram,
} from "./programs";
import type { Offer, TvPlaylistItem } from "../types";

function getItemSrc(item: TvPlaylistItem): string | undefined {
  if (item.kind === "image" || item.kind === "video") {
    return item.src;
  }
  return undefined;
}

describe("programs module", () => {
  describe("parseTimeToMinutes & isMinuteInWindow (Strict [startTime, endTime) Semantics)", () => {
    it("converts time string to minutes", () => {
      expect(parseTimeToMinutes("07:00")).toBe(420);
      expect(parseTimeToMinutes("22:00")).toBe(1320);
      expect(parseTimeToMinutes("16:20")).toBe(980);
      expect(parseTimeToMinutes("18:59")).toBe(1139);
      expect(parseTimeToMinutes("19:00")).toBe(1140);
      expect(parseTimeToMinutes(undefined)).toBeNull();
      expect(parseTimeToMinutes("invalid")).toBeNull();
    });

    it("evaluates daytime window strictly: [startTime, endTime)", () => {
      // 16:20 (980) às 19:00 (1140)
      expect(isMinuteInWindow(979, 980, 1140)).toBe(false); // 16:19 -> Inativo
      expect(isMinuteInWindow(980, 980, 1140)).toBe(true);  // 16:20 -> Ativo (início inclusive)
      expect(isMinuteInWindow(1000, 980, 1140)).toBe(true); // 16:40 -> Ativo
      expect(isMinuteInWindow(1139, 980, 1140)).toBe(true); // 18:59 -> Ativo (último minuto)
      expect(isMinuteInWindow(1140, 980, 1140)).toBe(false); // 19:00 -> Encerrado (fim exclusivo)
      expect(isMinuteInWindow(1141, 980, 1140)).toBe(false); // 19:01 -> Encerrado

      // 07:00 (420) às 22:00 (1320)
      expect(isMinuteInWindow(419, 420, 1320)).toBe(false); // 06:59
      expect(isMinuteInWindow(420, 420, 1320)).toBe(true);  // 07:00
      expect(isMinuteInWindow(1319, 420, 1320)).toBe(true); // 21:59
      expect(isMinuteInWindow(1320, 420, 1320)).toBe(false); // 22:00 (fim do expediente)
    });

    it("evaluates overnight window that crosses midnight strictly: [22:00, 06:00)", () => {
      // 22:00 (1320) até 06:00 (360)
      expect(isMinuteInWindow(1319, 1320, 360)).toBe(false); // 21:59 -> Inativo
      expect(isMinuteInWindow(1320, 1320, 360)).toBe(true);  // 22:00 -> Ativo (início inclusive)
      expect(isMinuteInWindow(1380, 1320, 360)).toBe(true);  // 23:00 -> Ativo
      expect(isMinuteInWindow(1439, 1320, 360)).toBe(true);  // 23:59 -> Ativo
      expect(isMinuteInWindow(0, 1320, 360)).toBe(true);     // 00:00 -> Ativo (meia-noite)
      expect(isMinuteInWindow(120, 1320, 360)).toBe(true);   // 02:00 -> Ativo
      expect(isMinuteInWindow(359, 1320, 360)).toBe(true);   // 05:59 -> Ativo (último minuto da madrugada)
      expect(isMinuteInWindow(360, 1320, 360)).toBe(false);  // 06:00 -> Encerrado (fim exclusivo)
      expect(isMinuteInWindow(361, 1320, 360)).toBe(false);  // 06:01 -> Inativo
      expect(isMinuteInWindow(720, 1320, 360)).toBe(false);  // 12:00 -> Inativo
    });

    it("returns true if no boundaries are set", () => {
      expect(isMinuteInWindow(500, null, null)).toBe(true);
    });
  });

  describe("calculateProgramStatus", () => {
    it("returns 'draft' if program is marked as draft", () => {
      const prog = createNewProgram("acougue");
      prog.status = "draft";
      expect(calculateProgramStatus(prog, new Date())).toBe("draft");
    });

    it("returns 'inactive' if program is disabled", () => {
      const prog = createNewProgram("acougue");
      prog.status = "disabled";
      expect(calculateProgramStatus(prog, new Date())).toBe("inactive");
    });

    it("returns 'live' for always recurrence", () => {
      const prog: TvProgram = {
        id: "p-always",
        name: "Institucional 24/7",
        store: "Loja 01",
        sector: "acougue",
        status: "published",
        schedule: {
          recurrence: "always",
        },
        screens: [],
        createdAt: "",
        updatedAt: "",
      };
      expect(calculateProgramStatus(prog, new Date())).toBe("live");
    });

    it("returns 'live' when weekly scheduled program matches current weekday and time", () => {
      const prog: TvProgram = {
        id: "p1",
        name: "Ofertas de Sexta",
        store: "Loja 03",
        sector: "acougue",
        status: "published",
        schedule: {
          recurrence: "weekly",
          weekdays: [5], // Sexta
          startTime: "07:00",
          endTime: "22:00",
        },
        screens: [],
        createdAt: "",
        updatedAt: "",
      };

      // Sexta 2026-09-18 às 10:00 (dia 5)
      const friday10am = new Date("2026-09-18T10:00:00");
      expect(calculateProgramStatus(prog, friday10am)).toBe("live");

      // Sexta 2026-09-18 às 06:59 (antes do horário)
      const friday659 = new Date("2026-09-18T06:59:00");
      expect(calculateProgramStatus(prog, friday659)).toBe("scheduled");

      // Sexta 2026-09-18 às 22:00 (exatamente no término)
      const friday2200 = new Date("2026-09-18T22:00:00");
      expect(calculateProgramStatus(prog, friday2200)).toBe("scheduled");

      // Segunda 2026-09-21 às 10:00 (outro dia)
      const monday10am = new Date("2026-09-21T10:00:00");
      expect(calculateProgramStatus(prog, monday10am)).toBe("scheduled");
    });

    it("evaluates flash_offer / Hora Extra status strictly on [16:20, 19:00)", () => {
      const flash: TvProgram = {
        id: "p-flash",
        name: "Picanha Relâmpago",
        store: "Loja 01",
        sector: "acougue",
        status: "published",
        schedule: {
          recurrence: "flash_offer",
          startDate: "2026-09-19",
          endDate: "2026-09-19",
          startTime: "16:20",
          endTime: "19:00",
          overrideMode: "takeover",
        },
        screens: [],
        createdAt: "",
        updatedAt: "",
      };

      // 16:19 -> scheduled (antes)
      expect(calculateProgramStatus(flash, new Date("2026-09-19T16:19:00"))).toBe("scheduled");
      // 16:20 -> live (início inclusive)
      expect(calculateProgramStatus(flash, new Date("2026-09-19T16:20:00"))).toBe("live");
      // 18:59 -> live (último minuto ativo)
      expect(calculateProgramStatus(flash, new Date("2026-09-19T18:59:00"))).toBe("live");
      // 19:00 -> ended (encerramento exato)
      expect(calculateProgramStatus(flash, new Date("2026-09-19T19:00:00"))).toBe("ended");
      // 19:01 -> ended
      expect(calculateProgramStatus(flash, new Date("2026-09-19T19:01:00"))).toBe("ended");
    });
  });

  describe("mergeInterleavedPlaylist", () => {
    const baseItems: TvPlaylistItem[] = [
      { id: "b1", kind: "image", src: "b1.jpg", duration: 5, position: 0, active: true },
      { id: "b2", kind: "image", src: "b2.jpg", duration: 5, position: 1, active: true },
      { id: "b3", kind: "image", src: "b3.jpg", duration: 5, position: 2, active: true },
      { id: "b4", kind: "image", src: "b4.jpg", duration: 5, position: 3, active: true },
    ];

    const overrideItems: TvPlaylistItem[] = [
      { id: "ov1", kind: "image", src: "flash.jpg", duration: 8, position: 0, active: true },
    ];

    it("inserts 1 override slide after every 2 base slides (frequency = 2)", () => {
      const merged = mergeInterleavedPlaylist(baseItems, overrideItems, 2);
      expect(merged.length).toBe(6);
      expect(getItemSrc(merged[0])).toBe("b1.jpg");
      expect(getItemSrc(merged[1])).toBe("b2.jpg");
      expect(getItemSrc(merged[2])).toBe("flash.jpg");
      expect(getItemSrc(merged[3])).toBe("b3.jpg");
      expect(getItemSrc(merged[4])).toBe("b4.jpg");
      expect(getItemSrc(merged[5])).toBe("flash.jpg");

      merged.forEach((item, idx) => {
        expect(item.position).toBe(idx);
      });
    });

    it("handles frequency = 1 (alternates 1 base, 1 override)", () => {
      const merged = mergeInterleavedPlaylist(baseItems.slice(0, 2), overrideItems, 1);
      expect(merged.length).toBe(4);
      expect(getItemSrc(merged[0])).toBe("b1.jpg");
      expect(getItemSrc(merged[1])).toBe("flash.jpg");
      expect(getItemSrc(merged[2])).toBe("b2.jpg");
      expect(getItemSrc(merged[3])).toBe("flash.jpg");
    });

    it("cycles through multiple override items", () => {
      const multiOverrides: TvPlaylistItem[] = [
        { id: "ov1", kind: "image", src: "flash1.jpg", duration: 8, position: 0, active: true },
        { id: "ov2", kind: "image", src: "flash2.jpg", duration: 8, position: 1, active: true },
      ];

      const merged = mergeInterleavedPlaylist(baseItems, multiOverrides, 2);
      expect(merged.length).toBe(6);
      expect(getItemSrc(merged[2])).toBe("flash1.jpg");
      expect(getItemSrc(merged[5])).toBe("flash2.jpg");
    });

    it("returns override playlist when base playlist is empty", () => {
      const merged = mergeInterleavedPlaylist([], overrideItems, 2);
      expect(merged.length).toBe(1);
      expect(getItemSrc(merged[0])).toBe("flash.jpg");
    });

    it("returns base playlist when override playlist is empty", () => {
      const merged = mergeInterleavedPlaylist(baseItems, [], 2);
      expect(merged.length).toBe(4);
      expect(getItemSrc(merged[0])).toBe("b1.jpg");
    });
  });

  describe("calculateNextTransitionTimestamp", () => {
    it("returns exact 16:20:00 for upcoming flash offer and exact 19:00:00 for ending flash offer", () => {
      const prog: TvProgram = {
        id: "p1",
        name: "Hora Extra",
        store: "Loja 01",
        sector: "acougue",
        status: "published",
        schedule: {
          recurrence: "flash_offer",
          startDate: "2026-09-19",
          endDate: "2026-09-19",
          startTime: "16:20",
          endTime: "19:00",
        },
        screens: [],
        createdAt: "",
        updatedAt: "",
      };

      // Às 15:00, próximo evento é 16:20:00
      const ref15 = new Date("2026-09-19T15:00:00");
      const next1 = calculateNextTransitionTimestamp([prog], ref15);
      expect(next1).toBe(new Date("2026-09-19T16:20:00").getTime());

      // Às 17:00, próximo evento é 19:00:00
      const ref17 = new Date("2026-09-19T17:00:00");
      const next2 = calculateNextTransitionTimestamp([prog], ref17);
      expect(next2).toBe(new Date("2026-09-19T19:00:00").getTime());
    });
  });

  describe("resolveActiveProgram (Central Resolution Engine & Diagnostics)", () => {
    const defaultOffer: Offer = {
      id: "off-1",
      sector: "acougue",
      name: "Picanha Friboi",
      image: "https://example.com/picanha.jpg",
      promotionalPrice: "49,90",
      regularPrice: "69,90",
      unit: "kg",
      active: true,
      duration: 8,
      displayOrder: 0,
      layout: "single",
      startsAt: "",
      endsAt: "",
    };

    const makeProg = (
      id: string,
      name: string,
      recurrence: "always" | "weekly" | "date_range" | "flash_offer",
      options: Partial<TvProgram["schedule"]> = {},
      extra: Partial<TvProgram> = {},
    ): TvProgram => ({
      id,
      name,
      store: "Loja 01",
      sector: "acougue",
      status: "published",
      priority: 50,
      schedule: {
        recurrence,
        startTime: "07:00",
        endTime: "22:00",
        ...options,
      },
      screens: [
        {
          id: `scr-${id}`,
          kind: "layout",
          layout: "hero",
          position: 0,
          duration: 8,
          active: true,
          offers: [defaultOffer],
        },
      ],
      createdAt: "2026-09-01T00:00:00Z",
      updatedAt: "2026-09-01T00:00:00Z",
      ...extra,
    });

    it("Scenario 1: Resolves single 'always' program as Tier 1", () => {
      const alwaysProg = makeProg("p-always", "Institucional Padrão", "always");
      const res = resolveActiveProgram([alwaysProg], new Date("2026-09-19T12:00:00"));

      expect(res.computedStatus).toBe("live");
      expect(res.baseProgram?.id).toBe("p-always");
      expect(res.activeOverride).toBeNull();
      expect(res.diagnostics.priorityTier).toBe(1);
      expect(res.effectivePlaylist.length).toBe(1);
    });

    it("Scenario 2: 'weekly' overrides 'always' (Tier 2 > Tier 1)", () => {
      const alwaysProg = makeProg("p-always", "Institucional Padrão", "always");
      const fridayProg = makeProg("p-friday", "Ofertas de Sexta", "weekly", {
        weekdays: [5], // Sexta
      });

      const resFriday = resolveActiveProgram(
        [alwaysProg, fridayProg],
        new Date("2026-09-18T10:00:00"), // Sexta às 10:00
      );

      expect(resFriday.computedStatus).toBe("live");
      expect(resFriday.baseProgram?.id).toBe("p-friday");
      expect(resFriday.activeOverride).toBeNull();
      expect(resFriday.diagnostics.priorityTier).toBe(2);

      // No sábado 2026-09-19, fridayProg não está ativo, então cai para alwaysProg
      const resSaturday = resolveActiveProgram(
        [alwaysProg, fridayProg],
        new Date("2026-09-19T10:00:00"), // Sábado às 10:00
      );

      expect(resSaturday.computedStatus).toBe("live");
      expect(resSaturday.baseProgram?.id).toBe("p-always");
      expect(resSaturday.diagnostics.priorityTier).toBe(1);
    });

    it("Scenario 3: 'date_range' overrides 'weekly' and 'always' (Tier 3 > Tier 2 > Tier 1)", () => {
      const alwaysProg = makeProg("p-always", "Institucional", "always");
      const weeklyProg = makeProg("p-wed", "Quarta da Carne", "weekly", { weekdays: [3] });
      const blackFriday = makeProg("p-bf", "Black Friday Especial", "date_range", {
        startDate: "2026-09-15",
        endDate: "2026-09-20",
      });

      // 2026-09-16 é Quarta-feira (dia 3) e está dentro da Black Friday (15 a 20)
      const res = resolveActiveProgram(
        [alwaysProg, weeklyProg, blackFriday],
        new Date("2026-09-16T14:00:00"),
      );

      expect(res.computedStatus).toBe("live");
      expect(res.baseProgram?.id).toBe("p-bf");
      expect(res.diagnostics.priorityTier).toBe(3);
    });

    it("Scenario 4: 18:59 (Flash Offer Ativa Takeover) → 19:00 (Flash Offer Encerrada, Retorno à Base)", () => {
      const baseProg = makeProg("p-bf", "Black Friday 2026", "date_range", {
        startDate: "2026-09-15",
        endDate: "2026-09-25",
        startTime: "07:00",
        endTime: "22:00",
      }, { priority: 90 });

      const flashProg = makeProg("p-flash", "Picanha R$ 39,90", "flash_offer", {
        startDate: "2026-09-19",
        endDate: "2026-09-19",
        startTime: "16:20",
        endTime: "19:00",
        overrideMode: "takeover",
      }, { priority: 95 });

      // Às 18:59:59 (Flash Offer ATIVA)
      const res1859 = resolveActiveProgram([baseProg, flashProg], new Date("2026-09-19T18:59:00"));
      expect(res1859.computedStatus).toBe("live");
      expect(res1859.activeOverride?.id).toBe("p-flash");
      expect(res1859.baseProgram?.id).toBe("p-bf");
      expect(res1859.diagnostics.priorityTier).toBe(4);
      expect(res1859.diagnostics.nextTransitionDescription).toContain("19:00");
      expect(res1859.diagnostics.nextTransitionDescription).toContain("retorna para \"Black Friday 2026\"");

      // Às 19:00:00 (Flash Offer ENCERRADA -> Base assume 100%)
      const res1900 = resolveActiveProgram([baseProg, flashProg], new Date("2026-09-19T19:00:00"));
      expect(res1900.computedStatus).toBe("live");
      expect(res1900.activeOverride).toBeNull();
      expect(res1900.baseProgram?.id).toBe("p-bf");
      expect(res1900.diagnostics.priorityTier).toBe(3);
    });

    it("Scenario 5: 'flash_offer' with 'interleave' merges slides with base program", () => {
      const baseProg: TvProgram = {
        id: "p-base",
        name: "Base de Sábado",
        store: "Loja 01",
        sector: "acougue",
        status: "published",
        schedule: { recurrence: "always" },
        screens: [
          { id: "s1", kind: "image", mediaUrl: "img1.jpg", duration: 6, position: 0, active: true },
          { id: "s2", kind: "image", mediaUrl: "img2.jpg", duration: 6, position: 1, active: true },
          { id: "s3", kind: "image", mediaUrl: "img3.jpg", duration: 6, position: 2, active: true },
          { id: "s4", kind: "image", mediaUrl: "img4.jpg", duration: 6, position: 3, active: true },
        ],
        createdAt: "",
        updatedAt: "",
      };

      const flashProg: TvProgram = {
        id: "p-flash-interleave",
        name: "Hora Extra Intercalada",
        store: "Loja 01",
        sector: "acougue",
        status: "published",
        schedule: {
          recurrence: "flash_offer",
          startDate: "2026-09-19",
          endDate: "2026-09-19",
          startTime: "16:20",
          endTime: "19:00",
          overrideMode: "interleave",
          interleaveFrequency: 2,
        },
        screens: [
          { id: "s-flash", kind: "image", mediaUrl: "flash.jpg", duration: 8, position: 0, active: true },
        ],
        createdAt: "",
        updatedAt: "",
      };

      const res = resolveActiveProgram(
        [baseProg, flashProg],
        new Date("2026-09-19T17:00:00"),
      );

      expect(res.computedStatus).toBe("live");
      expect(res.activeOverride?.id).toBe("p-flash-interleave");
      expect(res.baseProgram?.id).toBe("p-base");
      expect(res.diagnostics.priorityTier).toBe(4);
      expect(res.diagnostics.ruleMatched).toContain("Intercalada");

      // Playlist intercalada com 6 itens (4 base + 2 inserções do flash a cada 2 slides)
      expect(res.effectivePlaylist.length).toBe(6);
      expect(getItemSrc(res.effectivePlaylist[0])).toBe("img1.jpg");
      expect(getItemSrc(res.effectivePlaylist[1])).toBe("img2.jpg");
      expect(getItemSrc(res.effectivePlaylist[2])).toBe("flash.jpg");
      expect(getItemSrc(res.effectivePlaylist[3])).toBe("img3.jpg");
      expect(getItemSrc(res.effectivePlaylist[4])).toBe("img4.jpg");
      expect(getItemSrc(res.effectivePlaylist[5])).toBe("flash.jpg");
    });

    it("Scenario 6: Midnight crossing (23:59:00 → 00:00:00) and Morning End (05:59 → 06:00)", () => {
      const nightProg = makeProg("p-night", "Turno Noturno Especial", "always", {
        startTime: "22:00",
        endTime: "06:00",
      });

      // 23:59 (Antes da meia-noite) -> Ativo
      const res2359 = resolveActiveProgram([nightProg], new Date("2026-09-19T23:59:00"));
      expect(res2359.computedStatus).toBe("live");
      expect(res2359.baseProgram?.id).toBe("p-night");

      // 00:00 (Meia-noite) -> Permanece Ativo
      const res0000 = resolveActiveProgram([nightProg], new Date("2026-09-20T00:00:00"));
      expect(res0000.computedStatus).toBe("live");
      expect(res0000.baseProgram?.id).toBe("p-night");

      // 05:59 (Último minuto) -> Ativo
      const res0559 = resolveActiveProgram([nightProg], new Date("2026-09-20T05:59:00"));
      expect(res0559.computedStatus).toBe("live");

      // 06:00 (Encerramento do turno noturno) -> Inativo / Fallback
      const res0600 = resolveActiveProgram([nightProg], new Date("2026-09-20T06:00:00"));
      expect(res0600.computedStatus).toBe("inactive");
      expect(res0600.baseProgram).toBeNull();
    });

    it("Scenario 7: Tie-breaking within same tier via priority and updatedAt", () => {
      const progLowPrio = makeProg("p-low", "Oferta Normal", "weekly", { weekdays: [5] }, { priority: 40 });
      const progHighPrio = makeProg("p-high", "Oferta Especial", "weekly", { weekdays: [5] }, { priority: 80 });

      const resPrio = resolveActiveProgram(
        [progLowPrio, progHighPrio],
        new Date("2026-09-18T12:00:00"),
      );
      expect(resPrio.baseProgram?.id).toBe("p-high");

      // Se mesma prioridade, data de atualização mais recente vence
      const progOld = makeProg(
        "p-old",
        "Campanha Antiga",
        "date_range",
        { startDate: "2026-09-01", endDate: "2026-09-30" },
        { priority: 50, updatedAt: "2026-09-01T10:00:00Z" },
      );
      const progRecent = makeProg(
        "p-recent",
        "Campanha Recente",
        "date_range",
        { startDate: "2026-09-01", endDate: "2026-09-30" },
        { priority: 50, updatedAt: "2026-09-10T10:00:00Z" },
      );

      const resRecent = resolveActiveProgram(
        [progOld, progRecent],
        new Date("2026-09-15T12:00:00"),
      );
      expect(resRecent.baseProgram?.id).toBe("p-recent");
    });

    it("Scenario 8: Draft and disabled programs are completely ignored", () => {
      const draftProg = makeProg("p-draft", "Rascunho", "always", {}, { status: "draft" });
      const disabledProg = makeProg("p-disabled", "Desativado", "always", {}, { status: "disabled" });

      const res = resolveActiveProgram(
        [draftProg, disabledProg],
        new Date("2026-09-19T12:00:00"),
      );

      expect(res.computedStatus).toBe("inactive");
      expect(res.baseProgram).toBeNull();
      expect(res.effectivePlaylist.length).toBe(0);
    });

    it("Scenario 9: Sector filtering ignores programs from other sectors", () => {
      const bakeryProg = makeProg("p-padaria", "Pães da Tarde", "always", {}, { sector: "padaria" });
      const butcherProg = makeProg("p-acougue", "Carnes Especiais", "always", {}, { sector: "acougue" });

      const resAcougue = resolveActiveProgram(
        [bakeryProg, butcherProg],
        new Date("2026-09-19T12:00:00"),
        { sector: "acougue" },
      );

      expect(resAcougue.baseProgram?.id).toBe("p-acougue");
    });

    it("Scenario 10: Fallback when no programs are active", () => {
      const emptyRes = resolveActiveProgram([], new Date());
      expect(emptyRes.computedStatus).toBe("inactive");
      expect(emptyRes.baseProgram).toBeNull();
      expect(emptyRes.activeOverride).toBeNull();
      expect(emptyRes.diagnostics.priorityTier).toBe(0);
      expect(emptyRes.diagnostics.ruleMatched).toContain("Fallback");
    });

    it("Scenario 11: Decoupled Offer Resolution uses live offers from offersMap", () => {
      const snapshotOffer: Offer = {
        id: "prod-f7-123",
        sector: "acougue",
        name: "Picanha Congelada Antiga",
        image: "https://example.com/picanha.jpg",
        promotionalPrice: "59,90",
        regularPrice: "69,90",
        unit: "kg",
        active: true,
        duration: 8,
        displayOrder: 0,
        layout: "single",
        startsAt: "",
        endsAt: "",
      };

      const progWithOffers = makeProg("p-decoupled", "Ofertas Desacopladas", "always");
      progWithOffers.screens[0].offers = [snapshotOffer];

      const liveOffersMap = new Map<string, Offer>([
        [
          "prod-f7-123",
          {
            ...snapshotOffer,
            name: "Picanha Nobre Especial",
            promotionalPrice: "39,90",
          },
        ],
      ]);

      const res = resolveActiveProgram(
        [progWithOffers],
        new Date("2026-09-19T12:00:00"),
        { offersMap: liveOffersMap },
      );

      expect(res.effectiveContent.offers.length).toBe(1);
      expect(res.effectiveContent.offers[0].promotionalPrice).toBe("39,90");
      expect(res.effectiveContent.offers[0].name).toBe("Picanha Nobre Especial");
    });

    it("Scenario 12: Detailed Diagnostics Tree with Rejection Reasons and Overrides", () => {
      const alwaysProg = makeProg("p-al", "Institucional Padrão", "always");
      const weeklyProg = makeProg("p-wed", "Quarta da Carne", "weekly", { weekdays: [3] });
      const draftProg = makeProg("p-draft", "Rascunho Festival", "always", {}, { status: "draft" });

      // Avaliação em uma Segunda-feira (dia 1)
      const res = resolveActiveProgram(
        [alwaysProg, weeklyProg, draftProg],
        new Date("2026-09-21T10:00:00"),
      );

      expect(res.diagnostics.evaluatedCount).toBe(3);
      expect(res.diagnostics.activeProgramsCount).toBe(1);

      const diagDraft = res.diagnostics.evaluatedPrograms.find((p) => p.programId === "p-draft");
      expect(diagDraft?.eligible).toBe(false);
      expect(diagDraft?.rejectionReason).toContain("Rascunho");

      const diagWed = res.diagnostics.evaluatedPrograms.find((p) => p.programId === "p-wed");
      expect(diagWed?.eligible).toBe(true);
      expect(diagWed?.activeNow).toBe(false);
      expect(diagWed?.rejectionReason).toContain("não é dia de exibição");

      const diagAlways = res.diagnostics.evaluatedPrograms.find((p) => p.programId === "p-al");
      expect(diagAlways?.activeNow).toBe(true);
      expect(diagAlways?.isWinnerBase).toBe(true);
    });
  });

  describe("getProgramCounters & formatProgramSchedulePeriod", () => {
    it("counts screens, products and media accurately", () => {
      const seeds = getSeedPrograms("acougue");
      const friday = seeds[0];

      const counters = getProgramCounters(friday);
      expect(counters.screensCount).toBe(4);
      expect(counters.productsCount).toBe(6);
      expect(counters.videosCount).toBe(1);
    });

    it("formats weekly and date_range schedules correctly", () => {
      const weeklyProg: TvProgram = {
        id: "p1",
        name: "Ofertas de Sexta",
        store: "Loja 03",
        sector: "acougue",
        status: "published",
        schedule: {
          recurrence: "weekly",
          weekdays: [5],
          startTime: "07:00",
          endTime: "22:00",
        },
        screens: [],
        createdAt: "",
        updatedAt: "",
      };
      expect(formatProgramSchedulePeriod(weeklyProg)).toBe("Sex. 07:00  →  Sex. 22:00");

      const dateRangeProg: TvProgram = {
        id: "p2",
        name: "Black Friday",
        store: "Loja 03",
        sector: "acougue",
        status: "published",
        schedule: {
          recurrence: "date_range",
          startDate: "2026-11-20",
          endDate: "2026-11-30",
          startTime: "07:00",
          endTime: "22:00",
        },
        screens: [],
        createdAt: "",
        updatedAt: "",
      };
      expect(formatProgramSchedulePeriod(dateRangeProg)).toBe("20/11 a 30/11  •  07:00 às 22:00");
    });

    it("formats flash_offer schedule correctly", () => {
      const flash: TvProgram = {
        id: "p-flash",
        name: "Hora Extra",
        store: "Loja 03",
        sector: "acougue",
        status: "published",
        schedule: {
          recurrence: "flash_offer",
          startTime: "16:20",
          endTime: "19:00",
          overrideMode: "interleave",
        },
        screens: [],
        createdAt: "",
        updatedAt: "",
      };

      expect(formatProgramSchedulePeriod(flash)).toBe("Hora Extra • 16:20 às 19:00 • Intercalada");
    });
  });

  describe("programToTvContent", () => {
    it("converts program screens to valid TvContent for TvPlayer", () => {
      const seeds = getSeedPrograms("acougue");
      const friday = seeds[0];

      const content = programToTvContent(friday, "acougue");
      expect(content.sector).toBe("acougue");
      expect(content.playlist.length).toBe(4);
      expect(content.compositions.length).toBe(2);
      expect(content.media.length).toBe(2);
    });
  });

  describe("duplicateProgram & createNewProgram", () => {
    it("creates deep duplicate with draft status", () => {
      const seeds = getSeedPrograms("acougue");
      const copy = duplicateProgram(seeds[0], "Cópia Teste");
      expect(copy.id).not.toBe(seeds[0].id);
      expect(copy.name).toBe("Cópia Teste");
      expect(copy.status).toBe("draft");
    });

    it("creates new draft program", () => {
      const prog = createNewProgram("acougue", "Loja 01", "flash_offer");
      expect(prog.schedule.recurrence).toBe("flash_offer");
      expect(prog.priority).toBe(90);
    });
  });
});
