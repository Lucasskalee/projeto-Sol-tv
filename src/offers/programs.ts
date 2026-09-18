import type { Offer, SolTvMedia, TvContent, TvPlaylistItem } from "../types";
import {
  type OfferComposition,
  buildCompositionPlaylist,
  duplicateComposition,
  newComposition,
} from "./compositions";
import type { OfferLayout } from "./layouts";
import { formatDate } from "../data";

export type ProgramStatus = "live" | "scheduled" | "draft" | "ended";

export type ProgramFilter = "all" | "live" | "scheduled" | "draft" | "ended";

export type ProgramRecurrence = "weekly" | "date_range" | "always";

export type ProgramSchedule = {
  recurrence: ProgramRecurrence;
  weekdays?: number[]; // 0 = Dom, 1 = Seg, 2 = Ter, 3 = Qua, 4 = Qui, 5 = Sex, 6 = Sáb
  startDate?: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD
  startTime?: string; // HH:mm
  endTime?: string; // HH:mm
};

export type ScreenKind = "layout" | "image" | "video";

export type ProgramScreen = {
  id: string;
  kind: ScreenKind;
  position: number;
  duration: number; // segundos
  active: boolean;
  // Quando kind === "layout" (1, 2 ou 4 produtos)
  layout?: OfferLayout;
  offers?: Offer[];
  // Quando kind === "image" ou "video"
  title?: string;
  mediaUrl?: string;
  mediaId?: string;
};

export type TvProgram = {
  id: string;
  name: string;
  store: string;
  sector: string;
  status: ProgramStatus;
  schedule: ProgramSchedule;
  screens: ProgramScreen[];
  createdAt: string;
  updatedAt: string;
};

export const WEEKDAY_NAMES: Record<number, { short: string; long: string }> = {
  0: { short: "Dom", long: "Domingo" },
  1: { short: "Seg", long: "Segunda-feira" },
  2: { short: "Ter", long: "Terça-feira" },
  3: { short: "Qua", long: "Quarta-feira" },
  4: { short: "Qui", long: "Quinta-feira" },
  5: { short: "Sex", long: "Sexta-feira" },
  6: { short: "Sáb", long: "Sábado" },
};

/**
 * Converte string de horário 'HH:mm' em minutos do dia (0 a 1439).
 */
export function parseTimeToMinutes(timeStr?: string): number | null {
  if (!timeStr) return null;
  const parts = timeStr.trim().split(":");
  if (parts.length < 2) return null;
  const hours = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1], 10);
  if (isNaN(hours) || isNaN(minutes)) return null;
  return Math.min(1439, Math.max(0, hours * 60 + minutes));
}

/**
 * Verifica se os minutos atuais estão dentro da janela de horário.
 */
export function isMinuteInWindow(
  currentMinutes: number,
  startMin?: number | null,
  endMin?: number | null,
): boolean {
  if (startMin == null && endMin == null) return true;
  const start = startMin ?? 0;
  const end = endMin ?? 1439;

  if (start <= end) {
    return currentMinutes >= start && currentMinutes <= end;
  } else {
    // Janela noturna que cruza a meia-noite
    return currentMinutes >= start || currentMinutes <= end;
  }
}

/**
 * Calcula o status real de uma programação com base na data/hora de referência.
 */
export function calculateProgramStatus(
  program: TvProgram,
  referenceDate: Date = new Date(),
): ProgramStatus {
  // Se explicitamente marcada como rascunho
  if (program.status === "draft") {
    return "draft";
  }

  const currentDateStr = formatDate(referenceDate);
  const currentDay = referenceDate.getDay();
  const currentMinutes = referenceDate.getHours() * 60 + referenceDate.getMinutes();

  const { recurrence, startDate, endDate, startTime, endTime, weekdays } = program.schedule;

  // 1. Sempre ativa
  if (recurrence === "always") {
    return "live";
  }

  // 2. Intervalo de Datas
  if (recurrence === "date_range") {
    if (endDate && currentDateStr > endDate) {
      return "ended";
    }
    if (startDate && currentDateStr < startDate) {
      return "scheduled";
    }

    const startMin = parseTimeToMinutes(startTime);
    const endMin = parseTimeToMinutes(endTime);
    if (isMinuteInWindow(currentMinutes, startMin, endMin)) {
      return "live";
    }
    return "scheduled";
  }

  // 3. Semanal Recorrente
  if (recurrence === "weekly") {
    const activeDays = weekdays && weekdays.length > 0 ? weekdays : [1];
    const isToday = activeDays.includes(currentDay);

    if (!isToday) {
      return "scheduled";
    }

    const startMin = parseTimeToMinutes(startTime);
    const endMin = parseTimeToMinutes(endTime);

    if (isMinuteInWindow(currentMinutes, startMin, endMin)) {
      return "live";
    }
    return "scheduled";
  }

  return "scheduled";
}

/**
 * Cria uma nova programação em branco pronta para edição.
 */
export function createNewProgram(sector = "acougue", store = "Loja 01"): TvProgram {
  const now = new Date();
  const todayStr = formatDate(now);
  const nextWeek = new Date(now);
  nextWeek.setDate(nextWeek.getDate() + 7);
  const nextWeekStr = formatDate(nextWeek);

  return {
    id: crypto.randomUUID(),
    name: "Nova Programação",
    store,
    sector,
    status: "draft",
    schedule: {
      recurrence: "weekly",
      weekdays: [now.getDay()],
      startTime: "07:00",
      endTime: "22:00",
      startDate: todayStr,
      endDate: nextWeekStr,
    },
    screens: [],
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };
}

/**
 * Duplica uma programação existente com todos os produtos, layouts e mídias.
 */
export function duplicateProgram(original: TvProgram, newName?: string): TvProgram {
  const timestamp = new Date().toISOString();

  // Clona as telas preservando objetos de produtos
  const clonedScreens: ProgramScreen[] = original.screens.map((screen, idx) => ({
    ...screen,
    id: crypto.randomUUID(),
    position: idx,
    offers: screen.offers ? screen.offers.map((o) => ({ ...o, id: crypto.randomUUID() })) : undefined,
  }));

  return {
    ...original,
    id: crypto.randomUUID(),
    name: newName || `Cópia de ${original.name}`,
    status: "draft", // Cópias iniciam como rascunho para revisão
    screens: clonedScreens,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

/**
 * Converte as telas de uma programação em `TvContent` que alimenta o `TvPlayer`.
 */
export function programToTvContent(
  program: TvProgram,
  sector = "acougue",
): TvContent {
  const offersList: Offer[] = [];
  const mediaList: SolTvMedia[] = [];
  const compositionsList: OfferComposition[] = [];
  const playlistItems: TvPlaylistItem[] = [];

  program.screens
    .filter((s) => s.active)
    .sort((a, b) => a.position - b.position)
    .forEach((screen, index) => {
      if (screen.kind === "layout" && screen.offers && screen.offers.length > 0) {
        const layout = screen.layout || (screen.offers.length === 1 ? "hero" : screen.offers.length === 2 ? "duo" : "grid4");
        const comp: OfferComposition = {
          id: screen.id,
          sector: program.sector || sector,
          layout,
          duration: screen.duration || 8,
          position: index,
          active: true,
          offers: Object.freeze([...screen.offers]),
          createdAt: program.createdAt,
          updatedAt: program.updatedAt,
        };

        compositionsList.push(comp);
        offersList.push(...screen.offers);

        playlistItems.push({
          id: comp.id,
          kind: "composition",
          composition: comp,
          duration: comp.duration,
          position: index,
          active: true,
        });
      } else if (screen.kind === "image") {
        const media: SolTvMedia = {
          id: screen.id,
          title: screen.title || "Banner Institucional",
          type: "image",
          mediaUrl: screen.mediaUrl || "",
          sector: program.sector || sector,
          duration: screen.duration || 6,
          position: index,
          active: true,
        };

        mediaList.push(media);
        playlistItems.push({
          id: media.id,
          kind: "image",
          title: media.title,
          src: media.mediaUrl,
          duration: media.duration,
          position: index,
          active: true,
        });
      } else if (screen.kind === "video") {
        const media: SolTvMedia = {
          id: screen.id,
          title: screen.title || "Vídeo Promocional",
          type: "video",
          mediaUrl: screen.mediaUrl || "",
          sector: program.sector || sector,
          duration: screen.duration || 10,
          position: index,
          active: true,
        };

        mediaList.push(media);
        playlistItems.push({
          id: media.id,
          kind: "video",
          title: media.title,
          src: media.mediaUrl,
          duration: media.duration,
          position: index,
          active: true,
        });
      }
    });

  return {
    sector: program.sector || sector,
    offers: offersList,
    media: mediaList,
    compositions: compositionsList,
    playlist: playlistItems,
    publishedAt: new Date().toISOString(),
  };
}

/**
 * Resume contadores da programação (Ex: "3 telas • 8 produtos • 1 vídeo").
 */
export function getProgramCounters(program: TvProgram): {
  screensCount: number;
  productsCount: number;
  videosCount: number;
  imagesCount: number;
  summaryText: string;
} {
  let productsCount = 0;
  let videosCount = 0;
  let imagesCount = 0;

  for (const s of program.screens) {
    if (s.kind === "layout" && s.offers) {
      productsCount += s.offers.length;
    } else if (s.kind === "video") {
      videosCount += 1;
    } else if (s.kind === "image") {
      imagesCount += 1;
    }
  }

  const parts: string[] = [];
  parts.push(`${program.screens.length} ${program.screens.length === 1 ? "tela" : "telas"}`);
  if (productsCount > 0) {
    parts.push(`${productsCount} ${productsCount === 1 ? "produto" : "produtos"}`);
  }
  if (videosCount > 0) {
    parts.push(`${videosCount} ${videosCount === 1 ? "vídeo" : "vídeos"}`);
  }
  if (imagesCount > 0 && videosCount === 0) {
    parts.push(`${imagesCount} ${imagesCount === 1 ? "imagem" : "imagens"}`);
  }

  return {
    screensCount: program.screens.length,
    productsCount,
    videosCount,
    imagesCount,
    summaryText: parts.join(" • "),
  };
}

/**
 * Retorna texto formatado de horário e período (Ex: "Sex. 07:00 → Sex. 22:00").
 */
export function formatProgramSchedulePeriod(program: TvProgram): string {
  const { recurrence, weekdays, startTime, endTime, startDate, endDate } = program.schedule;

  const startT = startTime || "07:00";
  const endT = endTime || "22:00";

  if (recurrence === "always") {
    return "Exibição contínua (24 horas)";
  }

  if (recurrence === "weekly") {
    const days = weekdays && weekdays.length > 0 ? weekdays : [1];
    if (days.length === 1) {
      const dayName = WEEKDAY_NAMES[days[0]]?.short || "Dia";
      return `${dayName}. ${startT}  →  ${dayName}. ${endT}`;
    }
    const daysStr = days.map((d) => WEEKDAY_NAMES[d]?.short || String(d)).join(", ");
    return `${daysStr}  •  ${startT} às ${endT}`;
  }

  if (recurrence === "date_range") {
    const startStr = startDate ? startDate.split("-").reverse().slice(0, 2).join("/") : "Início";
    const endStr = endDate ? endDate.split("-").reverse().slice(0, 2).join("/") : "Fim";
    return `${startStr} a ${endStr}  •  ${startT} às ${endT}`;
  }

  return "Horário personalizado";
}

/**
 * Gera programações de demonstração realistas usando as ofertas e mídias existentes.
 */
export function getSeedPrograms(
  sector = "acougue",
  existingOffers: readonly Offer[] = [],
  existingMedia: readonly SolTvMedia[] = [],
): TvProgram[] {
  const now = new Date();
  const timestamp = now.toISOString();

  const o1 = existingOffers[0] || {
    id: "o1",
    name: "Picanha bovina",
    promotionalPrice: "44,99",
    regularPrice: "59,90",
    unit: "kg",
    image: "https://images.unsplash.com/photo-1600891964092-4316c288032e?auto=format&fit=crop&w=1200&q=85",
    active: true,
    startsAt: "",
    endsAt: "",
    duration: 8,
    displayOrder: 0,
    layout: "single" as const,
    sector,
  };

  const o2 = existingOffers[1] || {
    id: "o2",
    name: "Fraldinha especial",
    promotionalPrice: "36,90",
    regularPrice: "49,90",
    unit: "kg",
    image: "https://images.unsplash.com/photo-1558030006-450675393462?auto=format&fit=crop&w=1200&q=85",
    active: true,
    startsAt: "",
    endsAt: "",
    duration: 7,
    displayOrder: 1,
    layout: "pair" as const,
    sector,
  };

  const o3 = existingOffers[2] || {
    id: "o3",
    name: "Linguiça toscana",
    promotionalPrice: "18,90",
    regularPrice: "24,90",
    unit: "kg",
    image: "https://images.unsplash.com/photo-1585325701956-60dd9c8553bc?auto=format&fit=crop&w=1200&q=85",
    active: true,
    startsAt: "",
    endsAt: "",
    duration: 7,
    displayOrder: 2,
    layout: "grid" as const,
    sector,
  };

  const o4 = existingOffers[3] || {
    id: "o4",
    name: "Coxinha da asa",
    promotionalPrice: "14,99",
    regularPrice: "19,90",
    unit: "kg",
    image: "https://images.unsplash.com/photo-1604503468506-a8da13d82791?auto=format&fit=crop&w=1200&q=85",
    active: true,
    startsAt: "",
    endsAt: "",
    duration: 7,
    displayOrder: 3,
    layout: "single" as const,
    sector,
  };

  const bannerMedia = existingMedia.find((m) => m.type === "image") || {
    id: "m-img",
    title: "Cortes Selecionados SOL",
    type: "image" as const,
    mediaUrl: "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=1920&q=85",
    sector,
    duration: 8,
    position: 0,
    active: true,
  };

  const videoMedia = existingMedia.find((m) => m.type === "video") || {
    id: "m-vid",
    title: "O melhor do açougue está no Sol",
    type: "video" as const,
    mediaUrl: "https://cdn.coverr.co/videos/coverr-a-chef-preparing-meat-1577/1080p.mp4",
    sector,
    duration: 12,
    position: 0,
    active: true,
  };

  // 1. OFERTAS DE SEXTA (Agendada / Em exibição dependendo do dia)
  const fridayProgram: TvProgram = {
    id: "prog-friday-001",
    name: "OFERTAS DE SEXTA",
    store: "Loja 03",
    sector,
    status: "scheduled",
    schedule: {
      recurrence: "weekly",
      weekdays: [5], // Sexta
      startTime: "07:00",
      endTime: "22:00",
    },
    screens: [
      {
        id: "s1-grid4",
        kind: "layout",
        position: 0,
        layout: "grid4",
        duration: 8,
        active: true,
        offers: [o1, o2, o3, o4],
      },
      {
        id: "s2-img",
        kind: "image",
        position: 1,
        title: bannerMedia.title || "Campanha Sextou no Sol",
        mediaUrl: bannerMedia.mediaUrl,
        duration: 6,
        active: true,
      },
      {
        id: "s3-duo",
        kind: "layout",
        position: 2,
        layout: "duo",
        duration: 8,
        active: true,
        offers: [o1, o2],
      },
      {
        id: "s4-vid",
        kind: "video",
        position: 3,
        title: videoMedia.title || "Vídeo Institucional",
        mediaUrl: videoMedia.mediaUrl,
        duration: 12,
        active: true,
      },
    ],
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  // 2. OFERTAS DE SEGUNDA
  const mondayProgram: TvProgram = {
    id: "prog-monday-002",
    name: "OFERTAS DE SEGUNDA",
    store: "Loja 03",
    sector,
    status: "scheduled",
    schedule: {
      recurrence: "weekly",
      weekdays: [1], // Segunda
      startTime: "07:00",
      endTime: "22:00",
    },
    screens: [
      {
        id: "s-mon-1",
        kind: "layout",
        position: 0,
        layout: "hero",
        duration: 8,
        active: true,
        offers: [o1],
      },
      {
        id: "s-mon-2",
        kind: "layout",
        position: 1,
        layout: "duo",
        duration: 8,
        active: true,
        offers: [o1, o2],
      },
    ],
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  // 3. ESPECIAL CHURRASCO DO FIM DE SEMANA
  const weekendProgram: TvProgram = {
    id: "prog-weekend-003",
    name: "ESPECIAL CHURRASCO DO FIM DE SEMANA",
    store: "Loja 03",
    sector,
    status: "scheduled",
    schedule: {
      recurrence: "weekly",
      weekdays: [5, 6, 0], // Sex, Sáb, Dom
      startTime: "07:00",
      endTime: "22:00",
    },
    screens: [
      {
        id: "s-wk-1",
        kind: "layout",
        position: 0,
        layout: "grid4",
        duration: 10,
        active: true,
        offers: [o1, o2, o3, o4],
      },
      {
        id: "s-wk-2",
        kind: "video",
        position: 1,
        title: videoMedia.title,
        mediaUrl: videoMedia.mediaUrl,
        duration: 12,
        active: true,
      },
    ],
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  // 4. RASCUNHO — FESTIVAL DE AVES
  const draftProgram: TvProgram = {
    id: "prog-draft-004",
    name: "FESTIVAL DE AVES E EMBUTIDOS",
    store: "Loja 03",
    sector,
    status: "draft",
    schedule: {
      recurrence: "weekly",
      weekdays: [2, 3], // Ter, Qua
      startTime: "07:00",
      endTime: "22:00",
    },
    screens: [
      {
        id: "s-d-1",
        kind: "layout",
        position: 0,
        layout: "duo",
        duration: 8,
        active: true,
        offers: [o3, o4],
      },
    ],
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  return [fridayProgram, mondayProgram, weekendProgram, draftProgram];
}

const PROGRAMS_STORAGE_KEY_PREFIX = "sol_tv_programs_";

export function loadStoredPrograms(
  sector = "acougue",
  offers: readonly Offer[] = [],
  media: readonly SolTvMedia[] = [],
): TvProgram[] {
  try {
    const raw = localStorage.getItem(`${PROGRAMS_STORAGE_KEY_PREFIX}${sector}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn("Erro ao carregar programações do cache local:", err);
  }
  return getSeedPrograms(sector, offers, media);
}

export function saveStoredPrograms(sector: string, programs: TvProgram[]): void {
  try {
    localStorage.setItem(`${PROGRAMS_STORAGE_KEY_PREFIX}${sector}`, JSON.stringify(programs));
  } catch (err) {
    console.warn("Erro ao salvar programações no cache local:", err);
  }
}
