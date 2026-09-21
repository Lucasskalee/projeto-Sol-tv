import React from "react";
import {
  Layers,
  Clock,
  Zap,
  Edit3,
  Play,
  Flame,
  Radio,
  Sparkles,
} from "lucide-react";
import type { TvProgram } from "../../../offers/programs";
import { formatProgramSchedulePeriod, getProgramCounters } from "../../../offers/programs";
import { ProgramStatusChip } from "./ProgramStatusChip";
import { ProgramActionsMenu } from "./ProgramActionsMenu";

export type ProgramLiveHeroCardProps = {
  program: TvProgram;
  sectorLabel: string;
  isInterleaved?: boolean;
  onEdit: (program: TvProgram) => void;
  onDuplicate: (program: TvProgram) => void;
  onToggleStatus?: (program: TvProgram) => void;
  onTest?: (program: TvProgram) => void;
  onOpenSimulator?: (program: TvProgram) => void;
  onDelete: (id: string) => void;
};

export function ProgramLiveHeroCard({
  program,
  sectorLabel,
  isInterleaved = false,
  onEdit,
  onDuplicate,
  onToggleStatus,
  onTest,
  onOpenSimulator,
  onDelete,
}: ProgramLiveHeroCardProps) {
  const isFlashOffer = program.schedule.recurrence === "flash_offer";
  const counters = getProgramCounters(program);
  const periodText = formatProgramSchedulePeriod(program);
  const priority = program.priority ?? 50;

  // Formata o texto de recorrência de forma amigável
  let recurrenceLabel = "Sempre no ar";
  if (program.schedule.recurrence === "weekly") {
    recurrenceLabel = "Semanal";
  } else if (program.schedule.recurrence === "date_range") {
    recurrenceLabel = "Campanha por Período";
  } else if (isFlashOffer) {
    recurrenceLabel = isInterleaved ? "Hora Extra (Intercalada)" : "Hora Extra (Takeover 100%)";
  }

  return (
    <div className={`admin-programs-hero-card ${isFlashOffer ? "is-flash-hero" : ""}`}>
      {/* Glow Backdrop */}
      <div className="admin-hero-glow-layer" aria-hidden="true" />

      <div className="admin-hero-card-content">
        {/* Top Meta Line */}
        <div className="admin-hero-top-row">
          <div className="admin-hero-badge-group">
            <ProgramStatusChip status="live" isFlashOffer={isFlashOffer} size="md" />
            <span className="admin-hero-sector-tag">
              {sectorLabel} • {program.store || "Loja 01"}
            </span>
          </div>

          <div className="admin-hero-actions-top">
            <ProgramActionsMenu
              program={program}
              onEdit={onEdit}
              onDuplicate={onDuplicate}
              onToggleStatus={onToggleStatus}
              onTest={onTest}
              onOpenSimulator={onOpenSimulator}
              onDelete={onDelete}
            />
          </div>
        </div>

        {/* Hero Title */}
        <div className="admin-hero-title-row">
          <h3 className="admin-hero-title" title={program.name}>
            {program.name}
          </h3>
        </div>

        {/* Metadata Chips Grid */}
        <div className="admin-hero-meta-grid">
          <div className="admin-hero-meta-chip">
            <Layers size={14} className="meta-icon icon-purple" />
            <span>
              <strong>{counters.screensCount}</strong> {counters.screensCount === 1 ? "tela" : "telas"}
              {counters.productsCount > 0 && (
                <> • <strong>{counters.productsCount}</strong> {counters.productsCount === 1 ? "produto" : "produtos"}</>
              )}
            </span>
          </div>

          <div className="admin-hero-meta-chip">
            <Clock size={14} className="meta-icon icon-blue" />
            <span>{recurrenceLabel} • {periodText}</span>
          </div>

          <div className="admin-hero-meta-chip">
            {isFlashOffer ? (
              <Flame size={14} className="meta-icon icon-orange" />
            ) : (
              <Zap size={14} className="meta-icon icon-amber" />
            )}
            <span>Prioridade <strong>{priority}</strong></span>
          </div>
        </div>

        {/* Footer info & primary quick actions */}
        <div className="admin-hero-footer-row">
          <div className="admin-hero-status-note">
            <Radio size={13} className="note-pulse-icon" />
            <span>Em exibição contínua na TV do setor {sectorLabel.toLowerCase()}</span>
          </div>

          <div className="admin-hero-btn-group">
            {onTest && (
              <button
                type="button"
                className="admin-btn-secondary admin-btn-sm"
                onClick={() => onTest(program)}
                title="Visualizar reprodução rápida na TV"
              >
                <Play size={13} />
                <span>Prévia</span>
              </button>
            )}

            <button
              type="button"
              className="admin-primary-button admin-btn-sm"
              onClick={() => onEdit(program)}
              title="Editar configurações desta programação"
            >
              <Edit3 size={13} />
              <span>Editar</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

