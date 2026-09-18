import { describe, expect, it } from "vitest";
import {
  calculateProgramStatus,
  createNewProgram,
  duplicateProgram,
  formatProgramSchedulePeriod,
  getProgramCounters,
  getSeedPrograms,
  isMinuteInWindow,
  parseTimeToMinutes,
  programToTvContent,
  type TvProgram,
} from "./programs";

describe("programs module", () => {
  describe("parseTimeToMinutes & isMinuteInWindow", () => {
    it("converts time string to minutes", () => {
      expect(parseTimeToMinutes("07:00")).toBe(420);
      expect(parseTimeToMinutes("22:00")).toBe(1320);
      expect(parseTimeToMinutes(undefined)).toBeNull();
    });

    it("evaluates daytime window", () => {
      expect(isMinuteInWindow(420, 420, 1320)).toBe(true);
      expect(isMinuteInWindow(700, 420, 1320)).toBe(true);
      expect(isMinuteInWindow(400, 420, 1320)).toBe(false);
      expect(isMinuteInWindow(1325, 420, 1320)).toBe(false);
    });
  });

  describe("calculateProgramStatus", () => {
    it("returns 'draft' if program is set as draft", () => {
      const prog = createNewProgram("acougue");
      prog.status = "draft";
      expect(calculateProgramStatus(prog, new Date())).toBe("draft");
    });

    it("returns 'live' when weekly scheduled program matches current weekday and time", () => {
      const prog: TvProgram = {
        id: "p1",
        name: "Ofertas de Sexta",
        store: "Loja 03",
        sector: "acougue",
        status: "scheduled",
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

      // Sexta 2026-09-18 às 06:00 (antes do horário)
      const friday6am = new Date("2026-09-18T06:00:00");
      expect(calculateProgramStatus(prog, friday6am)).toBe("scheduled");

      // Segunda 2026-09-21 às 10:00 (outro dia)
      const monday10am = new Date("2026-09-21T10:00:00");
      expect(calculateProgramStatus(prog, monday10am)).toBe("scheduled");
    });

    it("returns 'ended' when date_range has passed", () => {
      const prog: TvProgram = {
        id: "p2",
        name: "Festival Passado",
        store: "Loja 01",
        sector: "acougue",
        status: "scheduled",
        schedule: {
          recurrence: "date_range",
          startDate: "2026-09-01",
          endDate: "2026-09-05",
          startTime: "07:00",
          endTime: "22:00",
        },
        screens: [],
        createdAt: "",
        updatedAt: "",
      };

      const dateAfter = new Date("2026-09-10T12:00:00");
      expect(calculateProgramStatus(prog, dateAfter)).toBe("ended");
    });
  });

  describe("getProgramCounters", () => {
    it("counts screens, products and media accurately", () => {
      const seeds = getSeedPrograms("acougue");
      const friday = seeds[0]; // Ofertas de Sexta (4 telas, 8 produtos, 1 vídeo, 1 imagem)

      const counters = getProgramCounters(friday);
      expect(counters.screensCount).toBe(4);
      expect(counters.productsCount).toBe(6); // s1: 4 produtos, s3: 2 produtos
      expect(counters.videosCount).toBe(1);
      expect(counters.summaryText).toContain("4 telas");
      expect(counters.summaryText).toContain("6 produtos");
      expect(counters.summaryText).toContain("1 vídeo");
    });
  });

  describe("formatProgramSchedulePeriod", () => {
    it("formats weekly schedule correctly", () => {
      const prog: TvProgram = {
        id: "p1",
        name: "Ofertas de Sexta",
        store: "Loja 03",
        sector: "acougue",
        status: "scheduled",
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

      expect(formatProgramSchedulePeriod(prog)).toBe("Sex. 07:00  →  Sex. 22:00");
    });
  });

  describe("duplicateProgram", () => {
    it("creates a deep duplicate with new IDs and draft status", () => {
      const seeds = getSeedPrograms("acougue");
      const original = seeds[0];

      const copy = duplicateProgram(original, "Ofertas de Sábado");
      expect(copy.id).not.toBe(original.id);
      expect(copy.name).toBe("Ofertas de Sábado");
      expect(copy.status).toBe("draft");
      expect(copy.screens.length).toBe(original.screens.length);
      expect(copy.screens[0].id).not.toBe(original.screens[0].id);
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
});

