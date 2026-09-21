import React, { useMemo, useState } from "react";
import {
  AlertTriangle,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  Edit2,
  Flame,
  Info,
  Layers,
  Palette,
  Play,
  Plus,
  RefreshCw,
  Sparkles,
  Trash2,
  Tv,
  X,
  Zap,
} from "lucide-react";
import type { Offer, SolTvMedia } from "../../../types";
import type {
  OverrideMode,
  ProgramPersistedStatus,
  ProgramRecurrence,
  ProgramScreen,
  TvProgram,
} from "../../../offers/programs";
import {
  calculateProgramStatus,
  formatProgramSchedulePeriod,
  getProgramCounters,
  getRecurrenceTier,
  parseTimeToMinutes,
  WEEKDAY_NAMES,
} from "../../../offers/programs";
import { SECTORS, formatDate } from "../../../data";
import { ProgramStatusChip } from "./ProgramStatusChip";

export type ProgramEditorProps = {
  initialProgram: TvProgram;
  existingPrograms?: TvProgram[];
  availableOffers: readonly Offer[];
  availableMedia?: readonly SolTvMedia[];
  concurrencyConflict?: string | null;
  onReloadLatest?: () => void;
  onSave: (program: TvProgram) => void | Promise<void>;
  onCancel: () => void;
  onTest: (program: TvProgram) => void;
  onOpenSimulatorWithProgram?: (program: TvProgram, targetDate?: string, targetTime?: string) => void;
};

type ConflictDiagnostic = {
  otherProgramId: string;
  otherProgramName: string;
  type: "winner" | "overridden" | "tied";
  message: string;
};

/**
 * Analisa e detecta conflitos ou sobreposições entre a programação em edição e as já existentes.
 */
function computeProgramConflicts(
  program: TvProgram,
  existingPrograms: TvProgram[] = [],
): ConflictDiagnostic[] {
  const sector = program.sector;
  const currentTier = getRecurrenceTier(program.schedule.recurrence);
  const currentPrio = program.priority ?? 50;

  const relevant = existingPrograms.filter(
    (p) => p.id !== program.id && p.sector === sector && p.status !== "draft" && p.status !== "disabled",
  );

  const results: ConflictDiagnostic[] = [];

  for (const other of relevant) {
    const otherTier = getRecurrenceTier(other.schedule.recurrence);
    const otherPrio = other.priority ?? 50;

    // 1. Hora Extra (Tier 4)
    if (program.schedule.recurrence === "flash_offer") {
      if (other.schedule.recurrence === "flash_offer") {
        if (currentPrio > otherPrio) {
          results.push({
            otherProgramId: other.id,
            otherProgramName: other.name,
            type: "winner",
            message: `Conflito direto com Hora Extra "${other.name}": esta programação vencerá pela maior prioridade (${currentPrio} > ${otherPrio}).`,
          });
        } else {
          results.push({
            otherProgramId: other.id,
            otherProgramName: other.name,
            type: "overridden",
            message: `Conflito com Hora Extra "${other.name}": "${other.name}" vencerá pela prioridade (${otherPrio} >= ${currentPrio}).`,
          });
        }
      } else {
        results.push({
          otherProgramId: other.id,
          otherProgramName: other.name,
          type: "winner",
          message: `Hora Extra ativa: sobreporá a programação "${other.name}" durante o horário configurado.`,
        });
      }
    }
    // 2. Campanha por Período (Tier 3)
    else if (program.schedule.recurrence === "date_range") {
      if (other.schedule.recurrence === "flash_offer") {
        results.push({
          otherProgramId: other.id,
          otherProgramName: other.name,
          type: "overridden",
          message: `Hora Extra "${other.name}" assumirá a TV durante o horário em que estiver ativa.`,
        });
      } else if (other.schedule.recurrence === "date_range") {
        if (currentPrio > otherPrio) {
          results.push({
            otherProgramId: other.id,
            otherProgramName: other.name,
            type: "winner",
            message: `Sobreposição de datas com "${other.name}": esta campanha vencerá pela prioridade (${currentPrio} > ${otherPrio}).`,
          });
        } else {
          results.push({
            otherProgramId: other.id,
            otherProgramName: other.name,
            type: "overridden",
            message: `Sobreposição de datas com "${other.name}": "${other.name}" vencerá pela prioridade (${otherPrio} >= ${currentPrio}).`,
          });
        }
      } else {
        results.push({
          otherProgramId: other.id,
          otherProgramName: other.name,
          type: "winner",
          message: `Durante as datas desta campanha, a programação "${other.name}" será sobreposta.`,
        });
      }
    }
    // 3. Semanal Recorrente (Tier 2)
    else if (program.schedule.recurrence === "weekly") {
      if (other.schedule.recurrence === "date_range") {
        results.push({
          otherProgramId: other.id,
          otherProgramName: other.name,
          type: "overridden",
          message: `A Campanha "${other.name}" sobreporá esta programação semanal durante os dias de vigência.`,
        });
      } else if (other.schedule.recurrence === "weekly") {
        const myDays = program.schedule.weekdays || [];
        const otherDays = other.schedule.weekdays || [];
        const commonDays = myDays.filter((d) => otherDays.includes(d));

        if (commonDays.length > 0) {
          const daysStr = commonDays.map((d) => WEEKDAY_NAMES[d]?.short || String(d)).join(", ");
          if (currentPrio > otherPrio) {
            results.push({
              otherProgramId: other.id,
              otherProgramName: other.name,
              type: "winner",
              message: `Conflito nos dias (${daysStr}) com "${other.name}": esta programação vencerá pela prioridade (${currentPrio} > ${otherPrio}).`,
            });
          } else {
            results.push({
              otherProgramId: other.id,
              otherProgramName: other.name,
              type: "overridden",
              message: `Conflito nos dias (${daysStr}) com "${other.name}": "${other.name}" vencerá pela prioridade (${otherPrio} >= ${currentPrio}).`,
            });
          }
        }
      } else if (other.schedule.recurrence === "always") {
        results.push({
          otherProgramId: other.id,
          otherProgramName: other.name,
          type: "winner",
          message: `Nos dias configurados, esta programação semanal sobreporá a programação contínua "${other.name}".`,
        });
      }
    }
    // 4. Sempre Ativa (Tier 1)
    else if (program.schedule.recurrence === "always") {
      results.push({
        otherProgramId: other.id,
        otherProgramName: other.name,
        type: "overridden",
        message: `Programação contínua de base: cederá espaço sempre que "${other.name}" estiver no horário ativo.`,
      });
    }
  }

  return results;
}

export function ProgramEditor({
  initialProgram,
  existingPrograms = [],
  availableOffers,
  availableMedia = [],
  concurrencyConflict,
  onReloadLatest,
  onSave,
  onCancel,
  onTest,
  onOpenSimulatorWithProgram,
}: ProgramEditorProps) {
  const [program, setProgram] = useState<TvProgram>(() => {
    const defaultPriority =
      initialProgram.priority ??
      (initialProgram.schedule.recurrence === "flash_offer"
        ? 95
        : initialProgram.schedule.recurrence === "date_range"
          ? 75
          : initialProgram.schedule.recurrence === "weekly"
            ? 50
            : 50);

    return {
      ...initialProgram,
      priority: defaultPriority,
      status: initialProgram.status === "scheduled" || initialProgram.status === "live" ? "published" : initialProgram.status,
      screens: [...initialProgram.screens],
    };
  });

  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [isCustomPriorityMode, setIsCustomPriorityMode] = useState<boolean>(() => {
    const p = initialProgram.priority ?? 50;
    return p !== 25 && p !== 50 && p !== 75 && p !== 95;
  });

  // Atualizações de campo
  const updateField = <K extends keyof TvProgram>(key: K, value: TvProgram[K]) => {
    setProgram((prev) => ({ ...prev, [key]: value, updatedAt: new Date().toISOString() }));
  };

  const updateSchedule = (key: keyof TvProgram["schedule"], value: any) => {
    setProgram((prev) => ({
      ...prev,
      schedule: { ...prev.schedule, [key]: value },
      updatedAt: new Date().toISOString(),
    }));
  };

  // Mudança do tipo de recorrência
  const handleChangeRecurrence = (newRecurrence: ProgramRecurrence) => {
    const todayStr = formatDate(new Date());
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    const nextWeekStr = formatDate(nextWeek);

    let defaultPriority = 50;
    let defaultOverrideMode: OverrideMode | undefined;

    if (newRecurrence === "flash_offer") {
      defaultPriority = 95;
      defaultOverrideMode = "takeover";
    } else if (newRecurrence === "date_range") {
      defaultPriority = 75;
    } else if (newRecurrence === "weekly") {
      defaultPriority = 50;
    }

    setProgram((prev) => ({
      ...prev,
      priority: defaultPriority,
      schedule: {
        ...prev.schedule,
        recurrence: newRecurrence,
        startDate: prev.schedule.startDate || todayStr,
        endDate: newRecurrence === "date_range" ? (prev.schedule.endDate || nextWeekStr) : todayStr,
        startTime: prev.schedule.startTime || (newRecurrence === "flash_offer" ? "17:00" : "07:00"),
        endTime: prev.schedule.endTime || (newRecurrence === "flash_offer" ? "19:00" : "22:00"),
        overrideMode: defaultOverrideMode,
        weekdays: prev.schedule.weekdays && prev.schedule.weekdays.length > 0 ? prev.schedule.weekdays : [1, 2, 3, 4, 5],
      },
      updatedAt: new Date().toISOString(),
    }));
  };

  // Toggle de dia da semana
  const toggleWeekday = (day: number) => {
    const current = program.schedule.weekdays || [];
    const next = current.includes(day)
      ? current.filter((d) => d !== day)
      : [...current, day].sort();
    updateSchedule("weekdays", next);
  };

  // Conflitos em tempo real
  const conflicts = useMemo(() => {
    return computeProgramConflicts(program, existingPrograms);
  }, [program, existingPrograms]);

  // Setor atual formatado
  const currentSectorObj = SECTORS.find((s) => s.id === program.sector);
  const sectorLabel = currentSectorObj?.label || program.sector.toUpperCase();

  // Contadores
  const counters = getProgramCounters(program);
  const periodText = formatProgramSchedulePeriod(program);

  // Status calculado em tempo real para feedback visual
  const computedNow = useMemo(() => {
    return calculateProgramStatus(program, new Date());
  }, [program]);

  // Validação formal
  function validateProgram(): string[] {
    const errs: string[] = [];
    if (!program.name.trim()) {
      errs.push("Informe o nome da programação.");
    }
    if (program.schedule.recurrence === "weekly") {
      if (!program.schedule.weekdays || program.schedule.weekdays.length === 0) {
        errs.push("Selecione pelo menos 1 dia da semana para a programação semanal.");
      }
    }
    if (program.schedule.recurrence === "date_range") {
      if (!program.schedule.startDate || !program.schedule.endDate) {
        errs.push("Informe a data inicial e a data final da campanha.");
      } else if (program.schedule.endDate < program.schedule.startDate) {
        errs.push("A data final da campanha não pode ser anterior à data inicial.");
      }
    }
    if (program.schedule.recurrence === "flash_offer") {
      if (!program.schedule.startTime || !program.schedule.endTime) {
        errs.push("Informe o horário de início e término da Hora Extra.");
      }
    }
    if (program.screens.length === 0) {
      errs.push("Adicione pelo menos 1 tela à programação antes de salvar.");
    }
    return errs;
  }

  // Submissão
  const handleSaveWithStatus = (status: ProgramPersistedStatus) => {
    const errs = validateProgram();
    if (errs.length > 0) {
      setValidationErrors(errs);
      return;
    }
    setValidationErrors([]);
    const updated: TvProgram = {
      ...program,
      status,
      priority: Math.max(1, Math.min(100, Number(program.priority) || 50)),
      updatedAt: new Date().toISOString(),
    };
    onSave(updated);
  };

  const isFlash = program.schedule.recurrence === "flash_offer";
  const priorityValue = program.priority ?? 50;

  return (
    <div className="admin-program-drawer-overlay" onClick={onCancel}>
      <div
        className="admin-program-drawer"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="program-drawer-title"
      >
        {/* Drawer Header */}
        <header className="admin-drawer-header">
          <div className="admin-drawer-header-info">
            <div className="admin-drawer-header-badges">
              <span className={`admin-recurrence-pill ${isFlash ? "badge-flash" : "badge-always"}`}>
                {isFlash ? <Flame size={12} /> : <Tv size={12} />}
                <span>{isFlash ? "Hora Extra" : "Programação de TV"}</span>
              </span>
              <ProgramStatusChip status={computedNow} isFlashOffer={isFlash} size="sm" />
            </div>
            <h2 id="program-drawer-title" className="admin-drawer-title">
              {program.name || "Nova Programação"}
            </h2>
          </div>

          <div className="admin-drawer-header-actions">
            {onOpenSimulatorWithProgram && (
              <button
                type="button"
                className="admin-btn-secondary admin-btn-sm"
                onClick={() => {
                  const targetTime = program.schedule.startTime || "17:30";
                  const targetDate = program.schedule.startDate || formatDate(new Date());
                  onOpenSimulatorWithProgram(program, targetDate, targetTime);
                }}
                title="Abrir no Simulador de Grade"
              >
                <Sparkles size={14} />
                <span>Simulador</span>
              </button>
            )}

            <button
              type="button"
              className="admin-btn-secondary admin-btn-sm"
              onClick={() => onTest(program)}
              title="Testar Prévia"
            >
              <Play size={14} />
              <span>Prévia</span>
            </button>

            <button
              type="button"
              className="admin-icon-btn"
              onClick={onCancel}
              title="Fechar editor"
              aria-label="Fechar"
            >
              <X size={18} />
            </button>
          </div>
        </header>

        {/* Concurrency Conflict Alert Banner */}
        {concurrencyConflict && (
          <div className="admin-concurrency-alert">
            <div className="admin-concurrency-text">
              <AlertTriangle size={18} className="concurrency-icon" />
              <div>
                <strong>Conflito de Concorrência Detectado</strong>
                <p>{concurrencyConflict}</p>
              </div>
            </div>
            {onReloadLatest && (
              <button
                type="button"
                className="admin-danger-button"
                onClick={onReloadLatest}
              >
                <RefreshCw size={13} />
                <span>Recarregar Versão Recente</span>
              </button>
            )}
          </div>
        )}

        {/* Validation Errors Box */}
        {validationErrors.length > 0 && (
          <div className="admin-validation-box">
            <AlertTriangle size={18} className="val-icon" />
            <div>
              <strong>Ajustes necessários antes de salvar:</strong>
              <ul>
                {validationErrors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Drawer Body Scrollable */}
        <div className="admin-drawer-scroll-body">
          {/* BLOCO 1: IDENTIFICAÇÃO */}
          <section className="admin-editor-block">
            <div className="admin-block-header">
              <span className="admin-block-num">1</span>
              <div>
                <h3 className="admin-block-title">IDENTIFICAÇÃO</h3>
                <p className="admin-block-subtitle">Nome e localização da programação</p>
              </div>
            </div>

            <div className="admin-block-content">
              <div className="admin-form-group">
                <label htmlFor="prog-name-input" className="admin-label">
                  Nome da Programação
                </label>
                <input
                  id="prog-name-input"
                  type="text"
                  value={program.name}
                  onChange={(e) => updateField("name", e.target.value)}
                  placeholder="Ex.: Ofertas do Açougue ou Segunda da Carne"
                  className="admin-input-text"
                />
              </div>

              <div className="admin-form-row-2">
                <div className="admin-form-group">
                  <label className="admin-label">Setor da TV</label>
                  <div className="admin-readonly-pill">
                    <span className="pill-dot" />
                    <strong>{sectorLabel}</strong>
                  </div>
                </div>

                <div className="admin-form-group">
                  <label className="admin-label">Loja / Ponto</label>
                  <div className="admin-readonly-pill">
                    <span>{program.store || "Loja 01"}</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* BLOCO 2: CONTEÚDO */}
          <section className="admin-editor-block">
            <div className="admin-block-header">
              <span className="admin-block-num">2</span>
              <div>
                <h3 className="admin-block-title">CONTEÚDO</h3>
                <p className="admin-block-subtitle">Catálogo atual associado ao setor</p>
              </div>
            </div>

            <div className="admin-block-content">
              <div className="admin-info-card-highlight">
                <div className="info-card-left">
                  <div className="info-card-icon-box purple">
                    <Layers size={20} />
                  </div>
                  <div>
                    <h4 className="info-card-title">OFERTAS DO {sectorLabel.toUpperCase()}</h4>
                    <p className="info-card-desc">
                      <strong>{counters.screensCount}</strong> {counters.screensCount === 1 ? "tela" : "telas"} configuradas •{" "}
                      <strong>{counters.productsCount}</strong> {counters.productsCount === 1 ? "produto" : "produtos"} vinculados
                    </p>
                  </div>
                </div>

                <div className="info-card-right">
                  <span className="admin-badge-neutral">Catálogo Ativo</span>
                </div>
              </div>
            </div>
          </section>

          {/* BLOCO 3: APARÊNCIA */}
          <section className="admin-editor-block">
            <div className="admin-block-header">
              <span className="admin-block-num">3</span>
              <div>
                <h3 className="admin-block-title">APARÊNCIA</h3>
                <p className="admin-block-subtitle">Identidade visual e motion do setor</p>
              </div>
            </div>

            <div className="admin-block-content">
              <div className="admin-info-card-highlight">
                <div className="info-card-left">
                  <div className="info-card-icon-box amber">
                    <Palette size={20} />
                  </div>
                  <div>
                    <h4 className="info-card-title">Tema Atual do Setor</h4>
                    <p className="info-card-desc">Sol Premium / Normal • Calibrado no Motion Studio</p>
                  </div>
                </div>

                <div className="info-card-right">
                  <span className="admin-badge-neutral">Padrão do Setor</span>
                </div>
              </div>
            </div>
          </section>

          {/* BLOCO 4: QUANDO EXIBIR */}
          <section className="admin-editor-block">
            <div className="admin-block-header">
              <span className="admin-block-num">4</span>
              <div>
                <h3 className="admin-block-title">QUANDO EXIBIR</h3>
                <p className="admin-block-subtitle">Defina o regime e horários de veiculação</p>
              </div>
            </div>

            <div className="admin-block-content">
              {/* Recurrence Mode Switcher */}
              <div className="admin-recurrence-switcher" role="radiogroup" aria-label="Tipo de agendamento">
                <button
                  type="button"
                  className={`admin-switcher-btn ${program.schedule.recurrence === "always" ? "active" : ""}`}
                  onClick={() => handleChangeRecurrence("always")}
                  role="radio"
                  aria-checked={program.schedule.recurrence === "always"}
                >
                  <Tv size={14} />
                  <span>Sempre</span>
                </button>

                <button
                  type="button"
                  className={`admin-switcher-btn ${program.schedule.recurrence === "weekly" ? "active" : ""}`}
                  onClick={() => handleChangeRecurrence("weekly")}
                  role="radio"
                  aria-checked={program.schedule.recurrence === "weekly"}
                >
                  <Calendar size={14} />
                  <span>Semanal</span>
                </button>

                <button
                  type="button"
                  className={`admin-switcher-btn ${program.schedule.recurrence === "date_range" ? "active" : ""}`}
                  onClick={() => handleChangeRecurrence("date_range")}
                  role="radio"
                  aria-checked={program.schedule.recurrence === "date_range"}
                >
                  <Clock size={14} />
                  <span>Período</span>
                </button>

                <button
                  type="button"
                  className={`admin-switcher-btn btn-flash ${program.schedule.recurrence === "flash_offer" ? "active" : ""}`}
                  onClick={() => handleChangeRecurrence("flash_offer")}
                  role="radio"
                  aria-checked={program.schedule.recurrence === "flash_offer"}
                >
                  <Flame size={14} />
                  <span>Hora Extra</span>
                </button>
              </div>

              {/* Sempre Ativo */}
              {program.schedule.recurrence === "always" && (
                <div className="admin-recurrence-subform">
                  <div className="admin-always-active-card">
                    <div className="always-active-dot" />
                    <div>
                      <strong>Sempre Ativo na TV</strong>
                      <p>
                        Esta programação será exibida continuamente sempre que não houver nenhuma
                        outra campanha semanal ou de Hora Extra com maior prioridade ativa.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Semanal */}
              {program.schedule.recurrence === "weekly" && (
                <div className="admin-recurrence-subform">
                  <div className="admin-form-group">
                    <label className="admin-label">Dias da Semana</label>
                    <div className="admin-weekdays-selector">
                      {[1, 2, 3, 4, 5, 6, 0].map((d) => {
                        const isSelected = (program.schedule.weekdays || []).includes(d);
                        const weekdayInfo = WEEKDAY_NAMES[d];
                        return (
                          <button
                            key={d}
                            type="button"
                            className={`admin-weekday-btn ${isSelected ? "selected" : ""}`}
                            onClick={() => toggleWeekday(d)}
                            aria-pressed={isSelected}
                          >
                            <span>{weekdayInfo?.short || String(d)}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="admin-form-row-2">
                    <div className="admin-form-group">
                      <label htmlFor="sched-start-time" className="admin-label">Horário de Início</label>
                      <input
                        id="sched-start-time"
                        type="time"
                        value={program.schedule.startTime || "07:00"}
                        onChange={(e) => updateSchedule("startTime", e.target.value)}
                        className="admin-input-time"
                      />
                    </div>
                    <div className="admin-form-group">
                      <label htmlFor="sched-end-time" className="admin-label">Horário de Término</label>
                      <input
                        id="sched-end-time"
                        type="time"
                        value={program.schedule.endTime || "22:00"}
                        onChange={(e) => updateSchedule("endTime", e.target.value)}
                        className="admin-input-time"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Período / Campanha */}
              {program.schedule.recurrence === "date_range" && (
                <div className="admin-recurrence-subform">
                  <div className="admin-form-row-2">
                    <div className="admin-form-group">
                      <label htmlFor="sched-start-date" className="admin-label">Data Inicial</label>
                      <input
                        id="sched-start-date"
                        type="date"
                        value={program.schedule.startDate || formatDate(new Date())}
                        onChange={(e) => updateSchedule("startDate", e.target.value)}
                        className="admin-input-text"
                      />
                    </div>
                    <div className="admin-form-group">
                      <label htmlFor="sched-end-date" className="admin-label">Data Final</label>
                      <input
                        id="sched-end-date"
                        type="date"
                        value={program.schedule.endDate || formatDate(new Date())}
                        onChange={(e) => updateSchedule("endDate", e.target.value)}
                        className="admin-input-text"
                      />
                    </div>
                  </div>

                  <div className="admin-form-row-2">
                    <div className="admin-form-group">
                      <label htmlFor="sched-range-start-time" className="admin-label">Hora Inicial</label>
                      <input
                        id="sched-range-start-time"
                        type="time"
                        value={program.schedule.startTime || "07:00"}
                        onChange={(e) => updateSchedule("startTime", e.target.value)}
                        className="admin-input-time"
                      />
                    </div>
                    <div className="admin-form-group">
                      <label htmlFor="sched-range-end-time" className="admin-label">Hora Final</label>
                      <input
                        id="sched-range-end-time"
                        type="time"
                        value={program.schedule.endTime || "22:00"}
                        onChange={(e) => updateSchedule("endTime", e.target.value)}
                        className="admin-input-time"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Hora Extra (Flash Offer) */}
              {isFlash && (
                <div className="admin-recurrence-subform is-flash-subform">
                  <div className="admin-flash-intro-card">
                    <Flame size={20} className="flash-intro-icon" />
                    <div>
                      <strong>⚡ HORA EXTRA / OFERTA RELÂMPAGO</strong>
                      <p>Substitua ou intercale temporariamente a programação normal da TV.</p>
                    </div>
                  </div>

                  <div className="admin-form-group">
                    <label htmlFor="flash-date-input" className="admin-label">Data da Hora Extra</label>
                    <input
                      id="flash-date-input"
                      type="date"
                      value={program.schedule.startDate || formatDate(new Date())}
                      onChange={(e) => {
                        updateSchedule("startDate", e.target.value);
                        updateSchedule("endDate", e.target.value);
                      }}
                      className="admin-input-text"
                    />
                  </div>

                  <div className="admin-form-row-2">
                    <div className="admin-form-group">
                      <label htmlFor="flash-start-time" className="admin-label">Início</label>
                      <input
                        id="flash-start-time"
                        type="time"
                        value={program.schedule.startTime || "17:00"}
                        onChange={(e) => updateSchedule("startTime", e.target.value)}
                        className="admin-input-time"
                      />
                    </div>
                    <div className="admin-form-group">
                      <label htmlFor="flash-end-time" className="admin-label">Fim</label>
                      <input
                        id="flash-end-time"
                        type="time"
                        value={program.schedule.endTime || "19:00"}
                        onChange={(e) => updateSchedule("endTime", e.target.value)}
                        className="admin-input-time"
                      />
                    </div>
                  </div>

                  <div className="admin-form-group">
                    <label className="admin-label">Modo de Exibição na TV</label>
                    <div className="admin-override-mode-grid">
                      <button
                        type="button"
                        className={`admin-override-card ${program.schedule.overrideMode !== "interleave" ? "selected" : ""}`}
                        onClick={() => updateSchedule("overrideMode", "takeover")}
                      >
                        <div className="card-radio-dot" />
                        <div>
                          <strong>Substituir Programação (100%)</strong>
                          <p>Ocupa todas as telas da TV durante a janela configurada.</p>
                        </div>
                      </button>

                      <button
                        type="button"
                        className={`admin-override-card ${program.schedule.overrideMode === "interleave" ? "selected" : ""}`}
                        onClick={() => updateSchedule("overrideMode", "interleave")}
                      >
                        <div className="card-radio-dot" />
                        <div>
                          <strong>Intercalar Telas</strong>
                          <p>Insere as telas de Hora Extra intercaladas com a grade normal.</p>
                        </div>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* BLOCO 5: PRIORIDADE */}
          <section className="admin-editor-block">
            <div className="admin-block-header">
              <span className="admin-block-num">5</span>
              <div>
                <h3 className="admin-block-title">PRIORIDADE</h3>
                <p className="admin-block-subtitle">Define qual programação vence em caso de sobreposição</p>
              </div>
            </div>

            <div className="admin-block-content">
              <div className="admin-priority-presets-grid">
                <button
                  type="button"
                  className={`admin-priority-card ${priorityValue === 25 && !isCustomPriorityMode ? "selected" : ""}`}
                  onClick={() => {
                    setIsCustomPriorityMode(false);
                    updateField("priority", 25);
                  }}
                >
                  <span className="prio-tag">Baixa</span>
                  <strong className="prio-val">25</strong>
                  <span className="prio-desc">Fundo contínuo</span>
                </button>

                <button
                  type="button"
                  className={`admin-priority-card ${priorityValue === 50 && !isCustomPriorityMode ? "selected" : ""}`}
                  onClick={() => {
                    setIsCustomPriorityMode(false);
                    updateField("priority", 50);
                  }}
                >
                  <span className="prio-tag">Normal</span>
                  <strong className="prio-val">50</strong>
                  <span className="prio-desc">Grade padrão</span>
                </button>

                <button
                  type="button"
                  className={`admin-priority-card ${priorityValue === 75 && !isCustomPriorityMode ? "selected" : ""}`}
                  onClick={() => {
                    setIsCustomPriorityMode(false);
                    updateField("priority", 75);
                  }}
                >
                  <span className="prio-tag">Alta</span>
                  <strong className="prio-val">75</strong>
                  <span className="prio-desc">Campanhas especiais</span>
                </button>

                <button
                  type="button"
                  className={`admin-priority-card card-flash ${priorityValue === 95 && !isCustomPriorityMode ? "selected" : ""}`}
                  onClick={() => {
                    setIsCustomPriorityMode(false);
                    updateField("priority", 95);
                  }}
                >
                  <span className="prio-tag">Hora Extra</span>
                  <strong className="prio-val">95</strong>
                  <span className="prio-desc">Urgente / Relâmpago</span>
                </button>

                {/* Opção Personalizada Preservada */}
                <button
                  type="button"
                  className={`admin-priority-card ${isCustomPriorityMode ? "selected" : ""}`}
                  onClick={() => setIsCustomPriorityMode(true)}
                >
                  <span className="prio-tag">Personalizada</span>
                  <strong className="prio-val">{priorityValue}</strong>
                  <span className="prio-desc">Valor numérico</span>
                </button>
              </div>

              {isCustomPriorityMode && (
                <div className="admin-custom-priority-row">
                  <label htmlFor="custom-prio-input" className="admin-label">
                    Nível de Prioridade (1 a 100):
                  </label>
                  <div className="custom-prio-controls">
                    <input
                      id="custom-prio-input"
                      type="range"
                      min={1}
                      max={100}
                      value={priorityValue}
                      onChange={(e) => updateField("priority", Number(e.target.value))}
                      className="admin-range-slider"
                    />
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={priorityValue}
                      onChange={(e) => updateField("priority", Number(e.target.value))}
                      className="admin-input-number"
                    />
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* BLOCO 6: DETECTOR DE CONFLITOS */}
          {conflicts.length > 0 && (
            <section className="admin-editor-block block-conflicts">
              <div className="admin-block-header">
                <AlertTriangle size={18} className="conflict-header-icon" />
                <div>
                  <h3 className="admin-block-title">DETECTOR DE SOBREPOSIÇÕES</h3>
                  <p className="admin-block-subtitle">Avaliação temporal com outras programações do setor</p>
                </div>
              </div>

              <div className="admin-block-content">
                <div className="admin-conflicts-list">
                  {conflicts.map((c, idx) => (
                    <div
                      key={idx}
                      className={`admin-conflict-item ${
                        c.type === "winner" ? "is-winner" : "is-overridden"
                      }`}
                    >
                      <div className="conflict-badge">
                        {c.type === "winner" ? (
                          <span className="badge-win">VENCE NA TV</span>
                        ) : (
                          <span className="badge-loss">SOBREPOSTA</span>
                        )}
                      </div>
                      <p className="conflict-msg">{c.message}</p>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* BLOCO 7: RESUMO ANTES DE SALVAR */}
          <section className="admin-editor-block block-summary">
            <div className="admin-block-header">
              <span className="admin-block-num">6</span>
              <div>
                <h3 className="admin-block-title">RESUMO DO AGENDAMENTO</h3>
                <p className="admin-block-subtitle">Confira os detalhes antes de publicar</p>
              </div>
            </div>

            <div className="admin-block-content">
              <div className="admin-summary-card">
                <div className="summary-line">
                  <span className="summary-label">Programação:</span>
                  <strong className="summary-value">{program.name || "Sem título"}</strong>
                </div>
                <div className="summary-line">
                  <span className="summary-label">Recorrência:</span>
                  <span className="summary-value">{periodText}</span>
                </div>
                <div className="summary-line">
                  <span className="summary-label">Conteúdo:</span>
                  <span className="summary-value">
                    {counters.screensCount} {counters.screensCount === 1 ? "tela" : "telas"} • {counters.productsCount} produtos
                  </span>
                </div>
                <div className="summary-line">
                  <span className="summary-label">Prioridade:</span>
                  <span className="summary-value">
                    {priorityValue} (
                    {priorityValue >= 90
                      ? "Hora Extra"
                      : priorityValue >= 75
                        ? "Alta"
                        : priorityValue >= 50
                          ? "Normal"
                          : "Baixa"}
                    )
                  </span>
                </div>
                <div className="summary-line">
                  <span className="summary-label">Status pretendido:</span>
                  <span className="summary-value">
                    <strong>{program.status === "draft" ? "Rascunho" : "Publicada"}</strong>
                  </span>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Drawer Footer Actions */}
        <footer className="admin-drawer-footer">
          <button
            type="button"
            className="admin-btn-secondary"
            onClick={onCancel}
          >
            Cancelar
          </button>

          <div className="admin-drawer-footer-right">
            <button
              type="button"
              className="admin-btn-secondary"
              onClick={() => handleSaveWithStatus("draft")}
            >
              Salvar como Rascunho
            </button>

            <button
              type="button"
              className="admin-primary-button"
              onClick={() => handleSaveWithStatus("published")}
            >
              <Check size={16} />
              <span>Salvar e Publicar</span>
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
