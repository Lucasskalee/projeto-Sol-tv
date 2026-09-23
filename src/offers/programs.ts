import type { Offer, SolTvMedia, TvContent, TvPlaylistItem } from "../types";
import {
  type OfferComposition,
  buildCompositionPlaylist,
  duplicateComposition,
  newComposition,
} from "./compositions";
import type { OfferLayout } from "./layouts";
export type { OfferLayout } from "./layouts";
import { formatDate } from "../data";

export type ProgramPersistedStatus = "draft" | "published" | "disabled";

export type ProgramComputedStatus = "live" | "scheduled" | "ended" | "inactive" | "draft";

// Suporte retrocompatível para componentes legados e novos
export type ProgramStatus = "live" | "scheduled" | "draft" | "ended" | "published" | "disabled";

export type ProgramFilter = "all" | "live" | "scheduled" | "draft" | "ended" | "published" | "disabled";

export type ProgramRecurrence = "weekly" | "date_range" | "always" | "flash_offer";

export type OverrideMode = "takeover" | "interleave";

export type ProgramSchedule = {
  recurrence: ProgramRecurrence;
  weekdays?: number[]; // 0 = Dom, 1 = Seg, 2 = Ter, 3 = Qua, 4 = Qui, 5 = Sex, 6 = Sáb
  startDate?: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD
  startTime?: string; // HH:mm
  endTime?: string; // HH:mm
  overrideMode?: OverrideMode; // "takeover" (100% tela) ou "interleave" (intercalado), usado em flash_offer
  interleaveFrequency?: number; // Frequência de intercalação (ex: 2 = 1 slide de hora extra a cada 2 normais)
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
  offers?: Offer[]; // Snapshot de ofertas
  offerIds?: string[]; // IDs para resolução desacoplada em sol_tv_offers
  // Quando kind === "image" ou "video"
  title?: string;
  mediaUrl?: string;
  mediaId?: string;
};

export type TvProgram = {
  catalogId?: string | null;
  startsAt?: string | null;
  endsAt?: string | null;
  id: string;
  name: string;
  store: string;
  sector: string;
  status: ProgramStatus;
  priority?: number; // 1 a 100 (padrão: 50)
  schedule: ProgramSchedule;
  screens: ProgramScreen[];
  version?: number;
  scopeKey?: string;
  publishedAt?: string | null;
  disabledAt?: string | null;
  createdBy?: string | null;
  updatedBy?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type EvaluatedProgramDiagnostic = {
  programId: string;
  name: string;
  recurrence: ProgramRecurrence;
  priority: number;
  status: ProgramStatus;
  computedStatus: ProgramComputedStatus;
  tier: number;
  eligible: boolean;
  activeNow: boolean;
  rejectionReason?: string;
  scheduleDescription: string;
  isWinnerBase?: boolean;
  isWinnerOverride?: boolean;
  isOverridden?: boolean;
  overrideReason?: string;
};

export type ResolveActiveProgramOptions = {
  sector?: string;
  offersMap?: Map<string, Offer> | Record<string, Offer>;
  defaultFallback?: TvContent;
  skipTransitionCalc?: boolean;
};

export type ActiveProgramResolution = {
  baseProgram: TvProgram | null;
  activeOverride: TvProgram | null;
  computedStatus: ProgramComputedStatus;
  effectiveContent: TvContent;
  effectivePlaylist: TvPlaylistItem[];
  nextTransitionTimestamp: number | null;
  diagnostics: {
    evaluatedAt: string;
    evaluatedCount: number;
    activeProgramsCount: number;
    ruleMatched: string;
    priorityTier: number;
    reasons: string[];
    evaluatedPrograms: EvaluatedProgramDiagnostic[];
    competingBasePrograms: TvProgram[];
    competingOverridePrograms: TvProgram[];
    nextTransitionDescription?: string;
  };
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
 * Converte string de data YYYY-MM-DD para formato legível DD/MM.
 */
function formatDateBR(dateStr?: string): string {
  if (!dateStr) return "";
  const parts = dateStr.split("-");
  if (parts.length < 3) return dateStr;
  return `${parts[2]}/${parts[1]}`;
}

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
 * Regra temporal estrita: [startTime, endTime)
 * O minuto de início (startTime) é INCLUSIVO.
 * O minuto de término (endTime) é EXCLUSIVO (ex: 19:00:00 já é considerado encerrado).
 * Suporta janelas normais (07:00 a 22:00) e janelas noturnas que cruzam a meia-noite (22:00 a 06:00).
 */
export function isMinuteInWindow(
  currentMinutes: number,
  startMin?: number | null,
  endMin?: number | null,
): boolean {
  if (startMin == null && endMin == null) return true;
  const start = startMin ?? 0;
  const end = endMin ?? 1440; // 1440 = 24:00 (fim do dia)

  if (start < end) {
    // Janela diurna normal: [start, end)
    return currentMinutes >= start && currentMinutes < end;
  } else if (start === end) {
    // Se início e fim forem exatamente iguais (ex: 00:00 a 00:00), considera 24h contínuo
    return true;
  } else {
    // Janela noturna que cruza a meia-noite (ex: 22:00 às 06:00 -> start=1320, end=360)
    // 22:00 até 23:59: currentMinutes >= 1320
    // 00:00 até 05:59: currentMinutes < 360
    // Às 06:00: encerra imediatamente
    return currentMinutes >= start || currentMinutes < end;
  }
}

/**
 * Calcula o status real/temporal de uma programação com base na data/hora de referência.
 * Retorna: "draft" | "inactive" | "scheduled" | "live" | "ended"
 */
export function calculateProgramStatus(
  program: TvProgram,
  referenceDate: Date = new Date(),
): ProgramComputedStatus {
  // 1. Estados editoriais explícitos
  if (program.status === "draft") {
    return "draft";
  }
  if (program.status === "disabled") {
    return "inactive";
  }

  if (program.catalogId) {
    const now = referenceDate.getTime();
    const start = Date.parse(program.startsAt || '');
    const end = Date.parse(program.endsAt || '');
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return 'inactive';
    return now < start ? 'scheduled' : now >= end ? 'ended' : 'live';
  }
  const currentDateStr = formatDate(referenceDate);
  const currentDay = referenceDate.getDay();
  const currentMinutes = referenceDate.getHours() * 60 + referenceDate.getMinutes();

  const { recurrence, startDate, endDate, startTime, endTime, weekdays } = program.schedule;

  const startMin = parseTimeToMinutes(startTime);
  const endMin = parseTimeToMinutes(endTime);

  // 2. Sempre ativa (Always)
  if (recurrence === "always") {
    if (startMin != null || endMin != null) {
      return isMinuteInWindow(currentMinutes, startMin, endMin) ? "live" : "scheduled";
    }
    return "live";
  }

  // 3. Hora Extra / Oferta Urgente (Flash Offer)
  if (recurrence === "flash_offer") {
    if (endDate && currentDateStr > endDate) {
      return "ended";
    }
    if (startDate && currentDateStr < startDate) {
      return "scheduled";
    }

    if (isMinuteInWindow(currentMinutes, startMin, endMin)) {
      return "live";
    }

    if (endDate && currentDateStr === endDate && endMin != null && currentMinutes >= endMin) {
      return "ended";
    }

    return "scheduled";
  }

  // 4. Intervalo de Datas (Date Range)
  if (recurrence === "date_range") {
    if (endDate && currentDateStr > endDate) {
      return "ended";
    }
    if (startDate && currentDateStr < startDate) {
      return "scheduled";
    }

    if (isMinuteInWindow(currentMinutes, startMin, endMin)) {
      return "live";
    }

    if (endDate && currentDateStr === endDate && endMin != null && currentMinutes >= endMin) {
      return "ended";
    }

    return "scheduled";
  }

  // 5. Semanal Recorrente (Weekly)
  if (recurrence === "weekly") {
    const activeDays = weekdays && weekdays.length > 0 ? weekdays : [1];
    const isToday = activeDays.includes(currentDay);

    if (!isToday) {
      return "scheduled";
    }

    if (isMinuteInWindow(currentMinutes, startMin, endMin)) {
      return "live";
    }
    return "scheduled";
  }

  return "scheduled";
}

/**
 * Função de comparação determinística para desempate dentro do mesmo nível de prioridade.
 * 1. Prioridade numérica (priority, 1-100, maior vence, padrão 50)
 * 2. Data de atualização mais recente (updatedAt desc)
 * 3. ID determinístico (id asc)
 */
function compareProgramsTieBreak(a: TvProgram, b: TvProgram): number {
  const prioA = a.priority ?? 50;
  const prioB = b.priority ?? 50;
  if (prioB !== prioA) {
    return prioB - prioA;
  }
  const timeA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
  const timeB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
  if (timeB !== timeA) {
    return timeB - timeA;
  }
  return a.id.localeCompare(b.id);
}

/**
 * Intercala itens de uma playlist de Hora Extra (override) dentro da playlist base.
 * @param basePlaylist Playlist da programação base.
 * @param overridePlaylist Playlist das telas de Hora Extra.
 * @param frequency Frequência de intercalação (ex: 2 = insere 1 item override após cada 2 itens base).
 */
export function mergeInterleavedPlaylist(
  basePlaylist: TvPlaylistItem[],
  overridePlaylist: TvPlaylistItem[],
  frequency = 2,
): TvPlaylistItem[] {
  if (basePlaylist.length === 0) {
    return overridePlaylist.map((item, idx) => ({ ...item, position: idx }));
  }
  if (overridePlaylist.length === 0) {
    return basePlaylist.map((item, idx) => ({ ...item, position: idx }));
  }

  const freq = Math.max(1, Math.floor(frequency));
  const result: TvPlaylistItem[] = [];
  let overrideIdx = 0;
  let baseCount = 0;

  for (let i = 0; i < basePlaylist.length; i++) {
    result.push({
      ...basePlaylist[i],
      position: result.length,
    });
    baseCount++;

    if (baseCount % freq === 0 && overridePlaylist.length > 0) {
      const sourceOverride = overridePlaylist[overrideIdx % overridePlaylist.length];
      result.push({
        ...sourceOverride,
        id: `${sourceOverride.id}-interleave-${result.length}`,
        position: result.length,
      });
      overrideIdx++;
    }
  }

  return result;
}

/**
 * Calcula o próximo timestamp Unix (em milissegundos) em que haverá uma transição de estado da programação.
 * Retorna `null` se nenhuma transição futura for encontrada (ex: apenas programação 24/7).
 */
export function calculateNextTransitionTimestamp(
  programs: TvProgram[],
  referenceDate: Date = new Date(),
): number | null {
  const refMs = referenceDate.getTime();
  const horizonDays = 7;
  const candidates: number[] = [];

  for (let d = 0; d <= horizonDays; d++) {
    const dayDate = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate() + d);
    const dayStr = formatDate(dayDate);
    const dayWeekday = dayDate.getDay();

    // Transição de virada de meia-noite (00:00:00 do dia seguinte)
    const midnight = new Date(dayDate.getFullYear(), dayDate.getMonth(), dayDate.getDate() + 1, 0, 0, 0, 0).getTime();
    if (midnight > refMs) {
      candidates.push(midnight);
    }

    const timeAtMinutes = (mins: number) => {
      const h = Math.floor(mins / 60);
      const m = mins % 60;
      return new Date(dayDate.getFullYear(), dayDate.getMonth(), dayDate.getDate(), h, m, 0, 0).getTime();
    };

    for (const p of programs) {
      if (p.status === "draft" || p.status === "disabled") continue;

      const { recurrence, weekdays, startDate, endDate, startTime, endTime } = p.schedule;
      const startMin = parseTimeToMinutes(startTime);
      const endMin = parseTimeToMinutes(endTime);

      if (recurrence === "always") {
        if (startMin != null) candidates.push(timeAtMinutes(startMin));
        if (endMin != null) candidates.push(timeAtMinutes(endMin));
      } else if (recurrence === "weekly") {
        const activeDays = weekdays && weekdays.length > 0 ? weekdays : [1];
        if (activeDays.includes(dayWeekday)) {
          if (startMin != null) candidates.push(timeAtMinutes(startMin));
          if (endMin != null) candidates.push(timeAtMinutes(endMin));
        }
      } else if (recurrence === "date_range" || recurrence === "flash_offer") {
        const isInRange = (!startDate || dayStr >= startDate) && (!endDate || dayStr <= endDate);
        if (isInRange) {
          if (startMin != null) candidates.push(timeAtMinutes(startMin));
          if (endMin != null) candidates.push(timeAtMinutes(endMin));
        }
        if (startDate && dayStr === startDate && startMin != null) {
          candidates.push(timeAtMinutes(startMin));
        }
        if (endDate && dayStr === endDate && endMin != null) {
          candidates.push(timeAtMinutes(endMin));
        }
      }
    }
  }

  const future = candidates.filter((ts) => ts > refMs);
  if (future.length === 0) return null;
  return Math.min(...future);
}

/**
 * Retorna o Tier numérico para o tipo de recorrência.
 */
export function getRecurrenceTier(recurrence: ProgramRecurrence): number {
  switch (recurrence) {
    case "flash_offer":
      return 4;
    case "date_range":
      return 3;
    case "weekly":
      return 2;
    case "always":
      return 1;
    default:
      return 0;
  }
}

/**
 * MOTOR DE RESOLUÇÃO CENTRAL (Etapa 1 e 2).
 * Avalia todas as programações disponíveis e resolve deterministicamente o que deve ser exibido.
 * Hierarquia de Prioridades:
 *  Tier 4: flash_offer (Hora Extra / Oferta Urgente)
 *  Tier 3: date_range (Campanhas temporárias com data de início e fim)
 *  Tier 2: weekly (Campanhas semanais recorrentes)
 *  Tier 1: always (Programação institucional contínua)
 *  Tier 0: fallback (Fallback do sistema)
 */
export function resolveActiveProgram(
  programs: TvProgram[],
  referenceDate: Date = new Date(),
  options: ResolveActiveProgramOptions = {},
): ActiveProgramResolution {
  const sector = options.sector || "acougue";
  const reasons: string[] = [];
  const evaluatedPrograms: EvaluatedProgramDiagnostic[] = [];

  const currentDateStr = formatDate(referenceDate);
  const currentDay = referenceDate.getDay();
  const currentMinutes = referenceDate.getHours() * 60 + referenceDate.getMinutes();

  // 1. Avalia detalhadamente cada programa da lista
  for (const prog of programs) {
    const tier = getRecurrenceTier(prog.schedule.recurrence);
    const priority = prog.priority ?? 50;
    const computedStatus = calculateProgramStatus(prog, referenceDate);
    const scheduleDescription = formatProgramSchedulePeriod(prog);

    let eligible = true;
    let activeNow = false;
    let rejectionReason: string | undefined;

    if (options.sector && prog.sector && prog.sector !== options.sector) {
      eligible = false;
      rejectionReason = `Setor divergente ("${prog.sector}" ≠ "${options.sector}")`;
    } else if (prog.status === "draft") {
      eligible = false;
      rejectionReason = "Programa configurado como Rascunho (ignorado pelo motor)";
    } else if (prog.status === "disabled") {
      eligible = false;
      rejectionReason = "Programa desativado manualmente";
    } else {
      // Elegível: avalia horário/data
      const { recurrence, startDate, endDate, startTime, endTime, weekdays } = prog.schedule;
      const startMin = parseTimeToMinutes(startTime);
      const endMin = parseTimeToMinutes(endTime);

      if (recurrence === "weekly") {
        const activeDays = weekdays && weekdays.length > 0 ? weekdays : [1];
        if (!activeDays.includes(currentDay)) {
          const expectedDays = activeDays.map((d) => WEEKDAY_NAMES[d]?.short || String(d)).join(", ");
          rejectionReason = `Hoje (${WEEKDAY_NAMES[currentDay]?.short || currentDay}) não é dia de exibição (Dias ativos: ${expectedDays})`;
        } else if (!isMinuteInWindow(currentMinutes, startMin, endMin)) {
          rejectionReason = `Fora do horário de exibição (${startTime || "00:00"} às ${endTime || "24:00"})`;
        } else {
          activeNow = true;
        }
      } else if (recurrence === "date_range") {
        if (startDate && currentDateStr < startDate) {
          rejectionReason = `Campanha inicia em ${formatDateBR(startDate)} (Data simulada: ${formatDateBR(currentDateStr)})`;
        } else if (endDate && currentDateStr > endDate) {
          rejectionReason = `Campanha encerrada em ${formatDateBR(endDate)}`;
        } else if (!isMinuteInWindow(currentMinutes, startMin, endMin)) {
          rejectionReason = `Fora do horário diário (${startTime || "00:00"} às ${endTime || "24:00"})`;
        } else {
          activeNow = true;
        }
      } else if (recurrence === "flash_offer") {
        if (startDate && currentDateStr < startDate) {
          rejectionReason = `Hora Extra programada para ${formatDateBR(startDate)}`;
        } else if (endDate && currentDateStr > endDate) {
          rejectionReason = `Hora Extra expirada em ${formatDateBR(endDate)}`;
        } else if (!isMinuteInWindow(currentMinutes, startMin, endMin)) {
          if (startMin != null && endMin != null && startMin < endMin && currentMinutes < startMin) {
            rejectionReason = `Hora Extra agendada para iniciar às ${startTime}`;
          } else {
            rejectionReason = `Hora Extra encerrada às ${endTime}`;
          }
        } else {
          activeNow = true;
        }
      } else if (recurrence === "always") {
        if (!isMinuteInWindow(currentMinutes, startMin, endMin)) {
          rejectionReason = `Fora do horário diário (${startTime || "00:00"} às ${endTime || "24:00"})`;
        } else {
          activeNow = true;
        }
      }
    }

    evaluatedPrograms.push({
      programId: prog.id,
      name: prog.name,
      recurrence: prog.schedule.recurrence,
      priority,
      status: prog.status,
      computedStatus,
      tier,
      eligible,
      activeNow,
      rejectionReason,
      scheduleDescription,
    });
  }

  // 2. Separa os programas ativos por nível de prioridade (Tiers)
  const activeEvaluations = evaluatedPrograms.filter((ep) => ep.activeNow);
  const activePrograms = activeEvaluations.map((ep) => programs.find((p) => p.id === ep.programId)!);

  const flashOffers = activePrograms
    .filter((p) => p.schedule.recurrence === "flash_offer")
    .sort(compareProgramsTieBreak);

  const dateRanges = activePrograms
    .filter((p) => p.schedule.recurrence === "date_range")
    .sort(compareProgramsTieBreak);

  const weeklies = activePrograms
    .filter((p) => p.schedule.recurrence === "weekly")
    .sort(compareProgramsTieBreak);

  const alwaysList = activePrograms
    .filter((p) => p.schedule.recurrence === "always")
    .sort(compareProgramsTieBreak);

  // 3. Determina a Programação Base (date_range > weekly > always)
  let baseProgram: TvProgram | null = null;
  let baseTier = 0;
  const competingBasePrograms: TvProgram[] = [];

  if (dateRanges.length > 0) {
    baseProgram = dateRanges[0];
    baseTier = 3;
    reasons.push(`Programa base selecionado por Campanha de Período (Tier 3 date_range): "${baseProgram.name}"`);
    competingBasePrograms.push(...dateRanges.slice(1), ...weeklies, ...alwaysList);
  } else if (weeklies.length > 0) {
    baseProgram = weeklies[0];
    baseTier = 2;
    reasons.push(`Programa base selecionado por Programação Semanal (Tier 2 weekly): "${baseProgram.name}"`);
    competingBasePrograms.push(...weeklies.slice(1), ...alwaysList);
  } else if (alwaysList.length > 0) {
    baseProgram = alwaysList[0];
    baseTier = 1;
    reasons.push(`Programa base selecionado por Programação Contínua (Tier 1 always): "${baseProgram.name}"`);
    competingBasePrograms.push(...alwaysList.slice(1));
  }

  // 4. Determina se há Hora Extra / Oferta Urgente ativa (Tier 4)
  const activeOverride: TvProgram | null = flashOffers.length > 0 ? flashOffers[0] : null;
  const competingOverridePrograms: TvProgram[] = flashOffers.length > 1 ? flashOffers.slice(1) : [];

  if (activeOverride) {
    reasons.push(`Hora Extra / Oferta Urgente ativa (Tier 4 flash_offer): "${activeOverride.name}"`);
  }

  // 5. Marca status de vencedor/sobreposto nos diagnósticos
  for (const ep of evaluatedPrograms) {
    if (activeOverride && ep.programId === activeOverride.id) {
      ep.isWinnerOverride = true;
    } else if (baseProgram && ep.programId === baseProgram.id) {
      ep.isWinnerBase = true;
    } else if (ep.activeNow) {
      ep.isOverridden = true;
      if (ep.tier === 4 && activeOverride) {
        ep.overrideReason = `Sobreposto por outra Hora Extra de maior prioridade/data recente ("${activeOverride.name}")`;
      } else if (baseProgram) {
        ep.overrideReason = `Sobreposto pelo programa base vencedor ("${baseProgram.name}") por hierarquia de Tier (${ep.tier} < ${baseTier}) ou prioridade`;
      }
    }
  }

  // 6. Constrói o conteúdo efetivo
  let effectiveContent: TvContent;
  let effectivePlaylist: TvPlaylistItem[];
  let computedStatus: ProgramComputedStatus = "inactive";
  let ruleMatched = "fallback";
  let priorityTier = 0;

  if (activeOverride) {
    const overrideMode = activeOverride.schedule.overrideMode || "takeover";
    const overrideContent = programToTvContent(activeOverride, sector, options.offersMap);

    if (overrideMode === "interleave" && baseProgram) {
      // Modo Intercalado: une a playlist base com os slides da Hora Extra
      const baseContent = programToTvContent(baseProgram, sector, options.offersMap);
      const freq = activeOverride.schedule.interleaveFrequency || 2;
      effectivePlaylist = mergeInterleavedPlaylist(baseContent.playlist, overrideContent.playlist, freq);

      effectiveContent = {
        sector: baseProgram.sector || sector,
        offers: [...baseContent.offers, ...overrideContent.offers],
        media: [...baseContent.media, ...overrideContent.media],
        compositions: [...baseContent.compositions, ...overrideContent.compositions],
        playlist: effectivePlaylist,
        publishedAt: referenceDate.toISOString(),
      };

      computedStatus = "live";
      priorityTier = 4;
      ruleMatched = `Hora Extra / Oferta Urgente (Intercalada 1:${freq}): "${activeOverride.name}" sobre "${baseProgram.name}"`;
      reasons.push(`Modo intercalado ativado (frequência 1 a cada ${freq} slides).`);
    } else {
      // Modo Takeover (100% da tela) ou Hora Extra sem base
      effectiveContent = overrideContent;
      effectivePlaylist = overrideContent.playlist;
      computedStatus = "live";
      priorityTier = 4;
      ruleMatched = `Hora Extra / Oferta Urgente (Takeover 100%): "${activeOverride.name}"`;
      reasons.push("Modo takeover ativado (100% da tela ocupada pela Hora Extra).");
    }
  } else if (baseProgram) {
    effectiveContent = programToTvContent(baseProgram, sector, options.offersMap);
    effectivePlaylist = effectiveContent.playlist;
    computedStatus = "live";
    priorityTier = baseTier;
    ruleMatched = `Programação Ativa (${baseProgram.schedule.recurrence}): "${baseProgram.name}"`;
  } else {
    effectiveContent = options.defaultFallback || {
      sector,
      offers: [],
      media: [],
      compositions: [],
      playlist: [],
      publishedAt: referenceDate.toISOString(),
    };
    effectivePlaylist = effectiveContent.playlist;
    computedStatus = "inactive";
    priorityTier = 0;
    ruleMatched = "Fallback (Nenhuma programação ativa no momento)";
    reasons.push("Nenhuma programação agendada ou contínua encontrada para o horário atual.");
  }

  // 7. Calcula próximo timestamp de transição inteligente e sua descrição
  let nextTransitionTimestamp: number | null = null;
  let nextTransitionDescription: string | undefined;

  if (!options.skipTransitionCalc) {
    const eligibleList = programs.filter((p) => p.status !== "draft" && p.status !== "disabled");
    nextTransitionTimestamp = calculateNextTransitionTimestamp(eligibleList, referenceDate);

    if (nextTransitionTimestamp != null) {
      const nextDate = new Date(nextTransitionTimestamp);
      const nextRes = resolveActiveProgram(programs, nextDate, {
        sector: options.sector,
        offersMap: options.offersMap,
        skipTransitionCalc: true,
      });

      const nextTimeStr = `${String(nextDate.getHours()).padStart(2, "0")}:${String(nextDate.getMinutes()).padStart(2, "0")}`;

      if (activeOverride && !nextRes.activeOverride && nextRes.baseProgram) {
        nextTransitionDescription = `${nextTimeStr} → Hora Extra "${activeOverride.name}" encerra e retorna para "${nextRes.baseProgram.name}"`;
      } else if (activeOverride && !nextRes.activeOverride && !nextRes.baseProgram) {
        nextTransitionDescription = `${nextTimeStr} → Hora Extra "${activeOverride.name}" encerra e tela vai para Fallback`;
      } else if (nextRes.activeOverride && (!activeOverride || activeOverride.id !== nextRes.activeOverride.id)) {
        nextTransitionDescription = `${nextTimeStr} → Inicia Hora Extra "${nextRes.activeOverride.name}"`;
      } else if (nextRes.baseProgram && (!baseProgram || baseProgram.id !== nextRes.baseProgram.id)) {
        nextTransitionDescription = `${nextTimeStr} → Inicia programação "${nextRes.baseProgram.name}"`;
      } else if (computedStatus === "live" && nextRes.computedStatus === "inactive") {
        nextTransitionDescription = `${nextTimeStr} → Encerramento do horário de exibição (Transição para Fallback)`;
      } else {
        nextTransitionDescription = `${nextTimeStr} → Transição de grade para "${nextRes.baseProgram?.name || "Fallback"}"`;
      }
    }
  }

  return {
    baseProgram,
    activeOverride,
    computedStatus,
    effectiveContent,
    effectivePlaylist,
    nextTransitionTimestamp,
    diagnostics: {
      evaluatedAt: referenceDate.toISOString(),
      evaluatedCount: evaluatedPrograms.length,
      activeProgramsCount: activePrograms.length,
      ruleMatched,
      priorityTier,
      reasons,
      evaluatedPrograms,
      competingBasePrograms,
      competingOverridePrograms,
      nextTransitionDescription,
    },
  };
}

/**
 * Cria uma nova programação em branco pronta para edição.
 */
export function createNewProgram(
  sector = "acougue",
  store = "Loja 01",
  recurrence: ProgramRecurrence = "weekly",
): TvProgram {
  const now = new Date();
  const todayStr = formatDate(now);
  const nextWeek = new Date(now);
  nextWeek.setDate(nextWeek.getDate() + 7);
  const nextWeekStr = formatDate(nextWeek);

  return {
    id: crypto.randomUUID(),
    name: recurrence === "flash_offer" ? "Hora Extra / Oferta Urgente" : "Nova Programação",
    store,
    sector,
    status: "draft",
    priority: recurrence === "flash_offer" ? 90 : 50,
    schedule: {
      recurrence,
      weekdays: [now.getDay()],
      startTime: recurrence === "flash_offer" ? "16:00" : "07:00",
      endTime: recurrence === "flash_offer" ? "19:00" : "22:00",
      startDate: todayStr,
      endDate: recurrence === "date_range" ? nextWeekStr : todayStr,
      overrideMode: recurrence === "flash_offer" ? "takeover" : undefined,
      interleaveFrequency: 2,
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

  // Clona as telas preservando objetos de produtos e IDs desacoplados
  const clonedScreens: ProgramScreen[] = original.screens.map((screen, idx) => ({
    ...screen,
    id: crypto.randomUUID(),
    position: idx,
    offers: screen.offers ? screen.offers.map((o) => ({ ...o, id: crypto.randomUUID() })) : undefined,
    offerIds: screen.offerIds ? [...screen.offerIds] : undefined,
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
 * Suporta resolução desacoplada de ofertas via `offersMap`.
 */
export function programToTvContent(
  program: TvProgram,
  sector = "acougue",
  offersMap?: Map<string, Offer> | Record<string, Offer>,
): TvContent {
  const offersList: Offer[] = [];
  const mediaList: SolTvMedia[] = [];
  const compositionsList: OfferComposition[] = [];
  const playlistItems: TvPlaylistItem[] = [];

  const resolveOffer = (o: Offer): Offer => {
    if (!offersMap) return o;
    if (offersMap instanceof Map) {
      return offersMap.get(o.id) || o;
    }
    return offersMap[o.id] || o;
  };

  const resolveOfferById = (id: string): Offer | null => {
    if (!offersMap) return null;
    if (offersMap instanceof Map) {
      return offersMap.get(id) || null;
    }
    return offersMap[id] || null;
  };

  program.screens
    .filter((s) => s.active)
    .sort((a, b) => a.position - b.position)
    .forEach((screen, index) => {
      if (screen.kind === "layout") {
        let screenOffers: Offer[] = [];

        if (screen.offerIds && screen.offerIds.length > 0) {
          screenOffers = screen.offerIds
            .map((id) => resolveOfferById(id) || screen.offers?.find((o) => o.id === id))
            .filter((o): o is Offer => Boolean(o));
        } else if (screen.offers && screen.offers.length > 0) {
          screenOffers = screen.offers.map((o) => resolveOffer(o));
        }

        if (screenOffers.length > 0) {
          const layout =
            screen.layout ||
            (screenOffers.length === 1 ? "hero" : screenOffers.length === 2 ? "duo" : "grid4");

          const comp: OfferComposition = {
            id: screen.id,
            sector: program.sector || sector,
            layout,
            duration: screen.duration || 8,
            position: index,
            active: true,
            offers: Object.freeze([...screenOffers]),
            createdAt: program.createdAt,
            updatedAt: program.updatedAt,
          };

          compositionsList.push(comp);
          offersList.push(...screenOffers);

          playlistItems.push({
            id: comp.id,
            kind: "composition",
            composition: comp,
            duration: comp.duration,
            position: index,
            active: true,
          });
        }
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
  if (program.catalogId) return { screensCount: 0, productsCount: 0, videosCount: 0, imagesCount: 0, summaryText: "Conteúdo do catálogo vinculado" };
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
  if (program.catalogId && program.startsAt && program.endsAt) return `${new Date(program.startsAt).toLocaleString("pt-BR")} até ${new Date(program.endsAt).toLocaleString("pt-BR")}`;
  const { recurrence, weekdays, startTime, endTime, startDate, endDate, overrideMode } = program.schedule;

  const startT = startTime || "07:00";
  const endT = endTime || "22:00";

  if (recurrence === "flash_offer") {
    const modeLabel = overrideMode === "interleave" ? "Intercalada" : "Urgente (Takeover)";
    return `Hora Extra • ${startT} às ${endT} • ${modeLabel}`;
  }

  if (recurrence === "always") {
    if (startTime || endTime) {
      return `Diário • ${startT} às ${endT}`;
    }
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

  // 1. OFERTAS DE SEXTA
  const fridayProgram: TvProgram = {
    id: "prog-friday-001",
    name: "OFERTAS DE SEXTA",
    store: "Loja 03",
    sector,
    status: "published",
    priority: 50,
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
    status: "published",
    priority: 50,
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
    status: "published",
    priority: 60,
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
    priority: 50,
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

  // 5. INSTITUCIONAL CONTÍNUO (ALWAYS)
  const alwaysProgram: TvProgram = {
    id: "prog-always-005",
    name: "AÇOUGUE INSTITUCIONAL 24H",
    store: "Loja 03",
    sector,
    status: "published",
    priority: 50,
    schedule: {
      recurrence: "always",
    },
    screens: [
      {
        id: "s-al-1",
        kind: "layout",
        position: 0,
        layout: "hero",
        duration: 8,
        active: true,
        offers: [o1],
      },
      {
        id: "s-al-2",
        kind: "image",
        position: 1,
        title: bannerMedia.title,
        mediaUrl: bannerMedia.mediaUrl,
        duration: 6,
        active: true,
      },
    ],
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  return [fridayProgram, mondayProgram, weekendProgram, draftProgram, alwaysProgram];
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
