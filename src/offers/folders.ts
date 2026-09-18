import type { Offer, SolTvMedia, TvContent } from "../types";
import {
  buildCompositionPlaylist,
  duplicateComposition,
  type OfferComposition,
} from "./compositions";
import { formatDate, seedMedia, seedOffers } from "../data";

export type ScheduleType = "weekly" | "date_range" | "always";

export type WeekDay = 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0 = Domingo, 1 = Segunda, ..., 6 = Sábado

export const WEEKDAY_LABELS: Record<number, { short: string; full: string }> = {
  0: { short: "Dom", full: "Domingo" },
  1: { short: "Seg", full: "Segunda-feira" },
  2: { short: "Ter", full: "Terça-feira" },
  3: { short: "Qua", full: "Quarta-feira" },
  4: { short: "Qui", full: "Quinta-feira" },
  5: { short: "Sex", full: "Sexta-feira" },
  6: { short: "Sáb", full: "Sábado" },
};

export type FolderScheduleRule = {
  type: ScheduleType;
  /** Dias da semana em que a pasta é exibida (0 = Domingo, 1 = Segunda, ... 6 = Sábado) */
  weekdays?: number[];
  /** Horário de início no formato 'HH:mm' (ex: '07:00') */
  startTime?: string;
  /** Horário de término no formato 'HH:mm' (ex: '22:00') */
  endTime?: string;
  /** Data inicial no formato 'YYYY-MM-DD' (usado quando type === 'date_range') */
  startDate?: string;
  /** Data final no formato 'YYYY-MM-DD' (usado quando type === 'date_range') */
  endDate?: string;
};

export type OfferFolder = {
  id: string;
  sector: string;
  name: string;
  description?: string;
  scheduleType: ScheduleType;
  weekdays?: number[];
  startTime?: string;
  endTime?: string;
  startDate?: string;
  endDate?: string;
  active: boolean;
  isDefault?: boolean;
  priority?: number;
  offers: Offer[];
  compositions: OfferComposition[];
  mediaIds?: string[];
  createdAt?: string;
  updatedAt?: string;
};

export type FolderStatusType = "active_now" | "scheduled" | "expired" | "inactive";

export type FolderStatus = {
  type: FolderStatusType;
  label: string;
  badgeClass: string;
  description: string;
};

/**
 * Cria uma nova pasta de ofertas em branco com agendamento padrão.
 */
export function newOfferFolder(sector = "acougue", name = "Nova Pasta de Ofertas"): OfferFolder {
  const now = new Date();
  const todayStr = formatDate(now);
  const nextWeek = new Date(now);
  nextWeek.setDate(nextWeek.getDate() + 7);
  const nextWeekStr = formatDate(nextWeek);

  return {
    id: crypto.randomUUID(),
    sector,
    name,
    description: "",
    scheduleType: "weekly",
    weekdays: [1], // Padrão: Segunda-feira
    startTime: "07:00",
    endTime: "22:00",
    startDate: todayStr,
    endDate: nextWeekStr,
    active: true,
    isDefault: false,
    priority: 1,
    offers: [],
    compositions: [],
    mediaIds: [],
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };
}

/**
 * Normaliza horário no formato 'HH:mm' para minutos do dia (0 a 1439).
 */
export function timeToMinutes(timeStr?: string): number | null {
  if (!timeStr) return null;
  const parts = timeStr.trim().split(":");
  if (parts.length < 2) return null;
  const hours = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1], 10);
  if (isNaN(hours) || isNaN(minutes)) return null;
  return Math.min(1439, Math.max(0, hours * 60 + minutes));
}

/**
 * Verifica se um determinado horário em minutos está dentro do intervalo [start, end].
 * Suporta janelas normais (ex: 07:00 às 22:00) e janelas noturnas (ex: 20:00 às 02:00).
 */
export function isTimeInRange(currentMinutes: number, startMinutes?: number | null, endMinutes?: number | null): boolean {
  if (startMinutes == null && endMinutes == null) return true;
  const start = startMinutes ?? 0;
  const end = endMinutes ?? 1439;

  if (start <= end) {
    return currentMinutes >= start && currentMinutes <= end;
  } else {
    // Janela que cruza a meia-noite (ex: 22:00 às 06:00)
    return currentMinutes >= start || currentMinutes <= end;
  }
}

/**
 * Verifica se a pasta de ofertas está ativa para uma data/hora de referência.
 */
export function isFolderActiveAt(folder: OfferFolder, referenceDate: Date = new Date()): boolean {
  if (!folder.active) return false;

  // Se a pasta for marcada como sempre ativa
  if (folder.scheduleType === "always") return true;

  const currentDay = referenceDate.getDay(); // 0 = Dom, 1 = Seg, ... 6 = Sáb
  const currentMinutes = referenceDate.getHours() * 60 + referenceDate.getMinutes();
  const currentDateStr = formatDate(referenceDate);

  // 1. Agendamento Semanal (ex: Segundas das 07h às 22h)
  if (folder.scheduleType === "weekly") {
    const weekdays = folder.weekdays && folder.weekdays.length > 0 ? folder.weekdays : [1];
    if (!weekdays.includes(currentDay)) {
      return false;
    }

    const startMin = timeToMinutes(folder.startTime);
    const endMin = timeToMinutes(folder.endTime);
    return isTimeInRange(currentMinutes, startMin, endMin);
  }

  // 2. Agendamento por Intervalo de Datas (ex: 20/09/2026 até 25/09/2026)
  if (folder.scheduleType === "date_range") {
    if (folder.startDate && currentDateStr < folder.startDate) {
      return false;
    }
    if (folder.endDate && currentDateStr > folder.endDate) {
      return false;
    }

    // Se tiver restrição de horário dentro do período de datas
    const startMin = timeToMinutes(folder.startTime);
    const endMin = timeToMinutes(folder.endTime);
    if (startMin != null || endMin != null) {
      return isTimeInRange(currentMinutes, startMin, endMin);
    }

    return true;
  }

  return false;
}

/**
 * Avalia a lista de pastas de um setor e retorna a pasta mais relevante para o momento.
 * Caso haja múltiplas pastas ativas simultaneamente, escolhe por prioridade mais alta e data de atualização.
 */
export function resolveActiveFolder(
  folders: readonly OfferFolder[],
  referenceDate: Date = new Date(),
): OfferFolder | null {
  const activeFolders = folders.filter((f) => isFolderActiveAt(f, referenceDate));

  if (activeFolders.length === 0) {
    // Fallback: se houver uma pasta default ativa
    const defaultFolder = folders.find((f) => f.active && f.isDefault);
    return defaultFolder || null;
  }

  // Ordena por prioridade decrescente (maior prioridade vence) e depois por updatedAt mais recente
  return [...activeFolders].sort((a, b) => {
    const priorityDiff = (b.priority || 0) - (a.priority || 0);
    if (priorityDiff !== 0) return priorityDiff;
    const timeA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
    const timeB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
    return timeB - timeA;
  })[0];
}

/**
 * Retorna o status e badge legível da pasta para exibição no painel administrativo.
 */
export function getFolderStatus(folder: OfferFolder, referenceDate: Date = new Date()): FolderStatus {
  if (!folder.active) {
    return {
      type: "inactive",
      label: "PAUSADA",
      badgeClass: "badge-inactive",
      description: "Pasta desativada manualmente.",
    };
  }

  const isCurrentlyActive = isFolderActiveAt(folder, referenceDate);
  if (isCurrentlyActive) {
    return {
      type: "active_now",
      label: "EXIBINDO NA TV AGORA",
      badgeClass: "badge-active-now",
      description: "Esta pasta está no ar na TV neste momento.",
    };
  }

  // Verifica se expirou no caso de date_range
  if (folder.scheduleType === "date_range" && folder.endDate) {
    const currentDateStr = formatDate(referenceDate);
    if (currentDateStr > folder.endDate) {
      return {
        type: "expired",
        label: "EXPIRADA",
        badgeClass: "badge-expired",
        description: `Período encerrado em ${folder.endDate}.`,
      };
    }
  }

  // Caso contrário, é agendada para outro dia/horário
  const scheduleDesc = formatScheduleSummary(folder);
  return {
    type: "scheduled",
    label: "AGENDADA",
    badgeClass: "badge-scheduled",
    description: scheduleDesc,
  };
}

/**
 * Gera texto resumido e amigável da regra de agendamento da pasta.
 */
export function formatScheduleSummary(folder: OfferFolder): string {
  if (folder.scheduleType === "always") {
    return "Sempre ativa (Exibição contínua)";
  }

  const timeRange =
    folder.startTime && folder.endTime
      ? `das ${folder.startTime} às ${folder.endTime}`
      : folder.startTime
        ? `a partir das ${folder.startTime}`
        : folder.endTime
          ? `até às ${folder.endTime}`
          : "o dia todo";

  if (folder.scheduleType === "weekly") {
    const weekdays = folder.weekdays && folder.weekdays.length > 0 ? folder.weekdays : [1];
    const daysStr = weekdays
      .map((d) => WEEKDAY_LABELS[d]?.short || String(d))
      .join(", ");
    return `${daysStr}, ${timeRange}`;
  }

  if (folder.scheduleType === "date_range") {
    const start = folder.startDate || "Início";
    const end = folder.endDate || "Sem fim";
    return `De ${start} a ${end} (${timeRange})`;
  }

  return "Agendamento personalizado";
}

/**
 * Duplica uma pasta existente gerando novos IDs para a pasta, seus produtos e camadas,
 * mantendo integralmente todas as fotos, preços, formatos de layout (1, 2, 4 produtos) e configurações.
 */
export function duplicateFolder(folder: OfferFolder, customName?: string): OfferFolder {
  const timestamp = new Date().toISOString();
  const idMap = new Map<string, string>();

  // 1. Clona produtos com novos IDs e mapeia IDs antigos para novos
  const clonedOffers: Offer[] = folder.offers.map((offer) => {
    const newId = crypto.randomUUID();
    idMap.set(offer.id, newId);
    return {
      ...offer,
      id: newId,
    };
  });

  // 2. Clona camadas de composição atualizando as referências dos produtos
  const clonedCompositions: OfferComposition[] = folder.compositions.map((comp, idx) => {
    const updatedCompOffers = comp.offers.map((compOffer) => {
      const newOfferId = idMap.get(compOffer.id);
      const matchingNewOffer = clonedOffers.find((o) => o.id === newOfferId);
      return matchingNewOffer || { ...compOffer, id: newOfferId || crypto.randomUUID() };
    });

    return {
      ...duplicateComposition(comp, idx),
      offers: Object.freeze(updatedCompOffers),
    };
  });

  const generatedName = customName || `Cópia de ${folder.name}`;

  return {
    ...folder,
    id: crypto.randomUUID(),
    name: generatedName,
    active: true,
    isDefault: false,
    offers: clonedOffers,
    compositions: clonedCompositions,
    mediaIds: folder.mediaIds ? [...folder.mediaIds] : [],
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

/**
 * Converte uma pasta de ofertas em TvContent unificado para reprodução imediata na TV.
 */
export function folderToTvContent(folder: OfferFolder, allSectorMedia: SolTvMedia[] = []): TvContent {
  // Filtra as mídias associadas à pasta (se houver especificação em mediaIds) ou usa todas do setor
  const relevantMedia =
    folder.mediaIds && folder.mediaIds.length > 0
      ? allSectorMedia.filter((m) => folder.mediaIds!.includes(m.id))
      : allSectorMedia;

  const playlist = buildCompositionPlaylist(folder.compositions, relevantMedia);

  return {
    sector: folder.sector,
    offers: folder.offers,
    media: relevantMedia,
    compositions: folder.compositions,
    playlist,
    publishedAt: new Date().toISOString(),
  };
}

/**
 * Seed inicial de pastas de ofertas com os exemplos do supermercado
 * (Ofertas de Segunda, Ofertas de Terça, Ofertas do Fim de Semana).
 */
export function getSeedFolders(sector = "acougue"): OfferFolder[] {
  const timestamp = new Date().toISOString();
  const baseOffers = seedOffers.filter((o) => o.sector === sector || sector === "acougue");
  const baseMedia = seedMedia.filter((m) => m.sector === sector || sector === "acougue");

  // 1. Ofertas de Segunda (1 e 2 produtos)
  const mondayFolderId = "11111111-f001-4111-8111-111111111111";
  const picanha = baseOffers[0] || { ...seedOffers[0]!, id: "o1", name: "Picanha bovina", promotionalPrice: "44,99" };
  const fraldinha = baseOffers[1] || { ...seedOffers[1]!, id: "o2", name: "Fraldinha especial", promotionalPrice: "36,90" };

  const mondayComp1: OfferComposition = {
    id: crypto.randomUUID(),
    sector,
    layout: "hero", // 1 produto
    duration: 8,
    position: 0,
    active: true,
    offers: Object.freeze([picanha]),
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  const mondayComp2: OfferComposition = {
    id: crypto.randomUUID(),
    sector,
    layout: "duo", // 2 produtos
    duration: 10,
    position: 1,
    active: true,
    offers: Object.freeze([picanha, fraldinha]),
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  const mondayFolder: OfferFolder = {
    id: mondayFolderId,
    sector,
    name: "Ofertas de Segunda",
    description: "Cortes selecionados para o início da semana.",
    scheduleType: "weekly",
    weekdays: [1], // Segunda
    startTime: "07:00",
    endTime: "22:00",
    active: true,
    isDefault: false,
    priority: 1,
    offers: [picanha, fraldinha],
    compositions: [mondayComp1, mondayComp2],
    mediaIds: baseMedia.map((m) => m.id),
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  // 2. Ofertas de Terça (Terça das 7h às 22h)
  const tuesdayFolderId = "22222222-f002-4222-8222-222222222222";
  const linguica = baseOffers[2] || { ...seedOffers[2]!, id: "o3", name: "Linguiça toscana", promotionalPrice: "18,90" };
  const coxinha = baseOffers[3] || { ...seedOffers[3]!, id: "o4", name: "Coxinha da asa", promotionalPrice: "14,99" };

  const tuesdayComp1: OfferComposition = {
    id: crypto.randomUUID(),
    sector,
    layout: "hero", // 1 produto
    duration: 8,
    position: 0,
    active: true,
    offers: Object.freeze([linguica]),
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  const tuesdayComp2: OfferComposition = {
    id: crypto.randomUUID(),
    sector,
    layout: "duo", // 2 produtos
    duration: 10,
    position: 1,
    active: true,
    offers: Object.freeze([linguica, coxinha]),
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  const tuesdayFolder: OfferFolder = {
    id: tuesdayFolderId,
    sector,
    name: "Ofertas de Terça",
    description: "Festival de aves e embutidos com preços imperdíveis.",
    scheduleType: "weekly",
    weekdays: [2], // Terça
    startTime: "07:00",
    endTime: "22:00",
    active: true,
    isDefault: false,
    priority: 1,
    offers: [linguica, coxinha],
    compositions: [tuesdayComp1, tuesdayComp2],
    mediaIds: baseMedia.map((m) => m.id),
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  // 3. Ofertas do Fim de Semana (Sexta a Domingo - 4 produtos em Grade)
  const weekendFolderId = "33333333-f003-4333-8333-333333333333";
  const weekendComp1: OfferComposition = {
    id: crypto.randomUUID(),
    sector,
    layout: "hero", // 1 produto destaque
    duration: 8,
    position: 0,
    active: true,
    offers: Object.freeze([picanha]),
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  const weekendComp2: OfferComposition = {
    id: crypto.randomUUID(),
    sector,
    layout: "grid4", // 4 produtos
    duration: 12,
    position: 1,
    active: true,
    offers: Object.freeze([picanha, fraldinha, linguica, coxinha]),
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  const weekendFolder: OfferFolder = {
    id: weekendFolderId,
    sector,
    name: "Ofertas do Fim de Semana",
    description: "Especial Churrasco SOL de Sexta a Domingo.",
    scheduleType: "weekly",
    weekdays: [5, 6, 0], // Sexta (5), Sábado (6), Domingo (0)
    startTime: "07:00",
    endTime: "22:00",
    active: true,
    isDefault: false,
    priority: 2, // Maior prioridade no fim de semana
    offers: [picanha, fraldinha, linguica, coxinha],
    compositions: [weekendComp1, weekendComp2],
    mediaIds: baseMedia.map((m) => m.id),
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  return [mondayFolder, tuesdayFolder, weekendFolder];
}
