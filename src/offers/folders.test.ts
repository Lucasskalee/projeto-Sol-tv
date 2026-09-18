import { describe, expect, it } from "vitest";
import {
  duplicateFolder,
  formatScheduleSummary,
  getFolderStatus,
  getSeedFolders,
  isFolderActiveAt,
  isTimeInRange,
  newOfferFolder,
  resolveActiveFolder,
  timeToMinutes,
  type OfferFolder,
} from "./folders";

describe("folders scheduling and management", () => {
  describe("timeToMinutes", () => {
    it("converts HH:mm to minutes correctly", () => {
      expect(timeToMinutes("00:00")).toBe(0);
      expect(timeToMinutes("07:30")).toBe(450);
      expect(timeToMinutes("22:00")).toBe(1320);
      expect(timeToMinutes("23:59")).toBe(1439);
    });

    it("handles invalid or empty inputs gracefully", () => {
      expect(timeToMinutes(undefined)).toBeNull();
      expect(timeToMinutes("")).toBeNull();
      expect(timeToMinutes("invalid")).toBeNull();
    });
  });

  describe("isTimeInRange", () => {
    it("checks daytime time windows", () => {
      const start = 7 * 60; // 07:00 (420)
      const end = 22 * 60; // 22:00 (1320)

      expect(isTimeInRange(420, start, end)).toBe(true); // 07:00
      expect(isTimeInRange(720, start, end)).toBe(true); // 12:00
      expect(isTimeInRange(1320, start, end)).toBe(true); // 22:00
      expect(isTimeInRange(419, start, end)).toBe(false); // 06:59
      expect(isTimeInRange(1321, start, end)).toBe(false); // 22:01
    });

    it("checks overnight time windows crossing midnight", () => {
      const start = 22 * 60; // 22:00 (1320)
      const end = 2 * 60; // 02:00 (120)

      expect(isTimeInRange(1350, start, end)).toBe(true); // 22:30
      expect(isTimeInRange(30, start, end)).toBe(true); // 00:30
      expect(isTimeInRange(120, start, end)).toBe(true); // 02:00
      expect(isTimeInRange(300, start, end)).toBe(false); // 05:00
    });
  });

  describe("isFolderActiveAt", () => {
    it("identifies active weekly scheduled folder on matching day and time", () => {
      const folder: OfferFolder = {
        id: "f1",
        sector: "acougue",
        name: "Ofertas de Segunda",
        scheduleType: "weekly",
        weekdays: [1], // Segunda
        startTime: "07:00",
        endTime: "22:00",
        active: true,
        offers: [],
        compositions: [],
      };

      // Segunda-feira 2026-09-21 às 10:00 (dia 1)
      const monday10am = new Date("2026-09-21T10:00:00");
      expect(isFolderActiveAt(folder, monday10am)).toBe(true);

      // Segunda-feira 2026-09-21 às 06:30 (fora do horário)
      const monday6am = new Date("2026-09-21T06:30:00");
      expect(isFolderActiveAt(folder, monday6am)).toBe(false);

      // Terça-feira 2026-09-22 às 10:00 (dia errado)
      const tuesday10am = new Date("2026-09-22T10:00:00");
      expect(isFolderActiveAt(folder, tuesday10am)).toBe(false);
    });

    it("returns false if folder is inactive", () => {
      const folder: OfferFolder = {
        id: "f1",
        sector: "acougue",
        name: "Ofertas de Segunda",
        scheduleType: "weekly",
        weekdays: [1],
        startTime: "07:00",
        endTime: "22:00",
        active: false,
        offers: [],
        compositions: [],
      };

      const monday10am = new Date("2026-09-21T10:00:00");
      expect(isFolderActiveAt(folder, monday10am)).toBe(false);
    });

    it("supports weekend schedules (Friday, Saturday, Sunday)", () => {
      const weekendFolder: OfferFolder = {
        id: "f-wknd",
        sector: "acougue",
        name: "Ofertas de Fim de Semana",
        scheduleType: "weekly",
        weekdays: [5, 6, 0], // Sex, Sáb, Dom
        startTime: "07:00",
        endTime: "22:00",
        active: true,
        offers: [],
        compositions: [],
      };

      // Sexta 2026-09-18 às 15h (dia 5)
      expect(isFolderActiveAt(weekendFolder, new Date("2026-09-18T15:00:00"))).toBe(true);
      // Sábado 2026-09-19 às 11h (dia 6)
      expect(isFolderActiveAt(weekendFolder, new Date("2026-09-19T11:00:00"))).toBe(true);
      // Domingo 2026-09-20 às 18h (dia 0)
      expect(isFolderActiveAt(weekendFolder, new Date("2026-09-20T18:00:00"))).toBe(true);
      // Quarta 2026-09-23 às 15h (dia 3)
      expect(isFolderActiveAt(weekendFolder, new Date("2026-09-23T15:00:00"))).toBe(false);
    });

    it("supports date range schedules", () => {
      const rangeFolder: OfferFolder = {
        id: "f-range",
        sector: "acougue",
        name: "Festival de Carnes",
        scheduleType: "date_range",
        startDate: "2026-09-20",
        endDate: "2026-09-25",
        startTime: "08:00",
        endTime: "20:00",
        active: true,
        offers: [],
        compositions: [],
      };

      // 2026-09-22 às 14:00 (dentro da faixa)
      expect(isFolderActiveAt(rangeFolder, new Date("2026-09-22T14:00:00"))).toBe(true);
      // 2026-09-19 às 14:00 (antes do início)
      expect(isFolderActiveAt(rangeFolder, new Date("2026-09-19T14:00:00"))).toBe(false);
      // 2026-09-26 às 14:00 (após o fim)
      expect(isFolderActiveAt(rangeFolder, new Date("2026-09-26T14:00:00"))).toBe(false);
    });

    it("supports 'always' schedule type", () => {
      const alwaysFolder: OfferFolder = {
        id: "f-always",
        sector: "acougue",
        name: "Sempre Ativa",
        scheduleType: "always",
        active: true,
        offers: [],
        compositions: [],
      };

      expect(isFolderActiveAt(alwaysFolder, new Date())).toBe(true);
    });
  });

  describe("resolveActiveFolder", () => {
    it("resolves the matching scheduled folder for the given timestamp", () => {
      const seed = getSeedFolders("acougue");

      // Segunda-feira 2026-09-21 às 14:00
      const monday = new Date("2026-09-21T14:00:00");
      const activeMonday = resolveActiveFolder(seed, monday);
      expect(activeMonday?.name).toBe("Ofertas de Segunda");

      // Terça-feira 2026-09-22 às 14:00
      const tuesday = new Date("2026-09-22T14:00:00");
      const activeTuesday = resolveActiveFolder(seed, tuesday);
      expect(activeTuesday?.name).toBe("Ofertas de Terça");

      // Sábado 2026-09-19 às 14:00
      const saturday = new Date("2026-09-19T14:00:00");
      const activeWeekend = resolveActiveFolder(seed, saturday);
      expect(activeWeekend?.name).toBe("Ofertas do Fim de Semana");
    });

    it("returns fallback default folder when no schedule matches", () => {
      const defaultFolder: OfferFolder = {
        id: "def",
        sector: "acougue",
        name: "Padrão",
        scheduleType: "weekly",
        weekdays: [1], // Seg
        active: true,
        isDefault: true,
        offers: [],
        compositions: [],
      };

      // Quarta-feira (dia 3)
      const wednesday = new Date("2026-09-23T14:00:00");
      const resolved = resolveActiveFolder([defaultFolder], wednesday);
      expect(resolved?.id).toBe("def");
    });
  });

  describe("duplicateFolder", () => {
    it("deeply duplicates a folder with new IDs for products and composition slots", () => {
      const seed = getSeedFolders("acougue");
      const original = seed[0]; // Ofertas de Segunda

      const clone = duplicateFolder(original, "Ofertas de Segunda - Próxima Semana");

      expect(clone.id).not.toBe(original.id);
      expect(clone.name).toBe("Ofertas de Segunda - Próxima Semana");
      expect(clone.offers.length).toBe(original.offers.length);
      expect(clone.compositions.length).toBe(original.compositions.length);

      // IDs dos produtos clonados devem ser novos
      expect(clone.offers[0].id).not.toBe(original.offers[0].id);

      // Os slots das composições clonadas devem apontar para os novos IDs dos produtos
      const originalSlotOfferId = original.compositions[0].offers[0].id;
      const cloneSlotOfferId = clone.compositions[0].offers[0].id;
      expect(cloneSlotOfferId).not.toBe(originalSlotOfferId);
      expect(cloneSlotOfferId).toBe(clone.offers[0].id);

      // Mantém fotos, preços e formatos intactos
      expect(clone.compositions[0].layout).toBe(original.compositions[0].layout);
      expect(clone.offers[0].promotionalPrice).toBe(original.offers[0].promotionalPrice);
    });
  });

  describe("getFolderStatus", () => {
    it("reports 'EXIBINDO NA TV AGORA' when current date matches", () => {
      const folder = newOfferFolder("acougue", "Teste");
      folder.scheduleType = "always";
      const status = getFolderStatus(folder, new Date());
      expect(status.type).toBe("active_now");
      expect(status.label).toContain("EXIBINDO");
    });

    it("reports 'PAUSADA' when active is false", () => {
      const folder = newOfferFolder("acougue", "Teste");
      folder.active = false;
      const status = getFolderStatus(folder, new Date());
      expect(status.type).toBe("inactive");
      expect(status.label).toBe("PAUSADA");
    });
  });

  describe("formatScheduleSummary", () => {
    it("formats summary clearly", () => {
      const folder: OfferFolder = {
        id: "f1",
        sector: "acougue",
        name: "Ofertas de Segunda",
        scheduleType: "weekly",
        weekdays: [1],
        startTime: "07:00",
        endTime: "22:00",
        active: true,
        offers: [],
        compositions: [],
      };

      const summary = formatScheduleSummary(folder);
      expect(summary).toBe("Seg, das 07:00 às 22:00");
    });
  });
});
