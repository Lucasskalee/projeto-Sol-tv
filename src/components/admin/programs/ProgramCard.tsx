import React from "react";
import {
  Clock,
  Layers,
  Zap,
  Flame,
  Calendar,
  Edit3,
  Play,
  Tv,
} from "lucide-react";
import type { ProgramComputedStatus, TvProgram } from "../../../offers/programs";
import { formatProgramSchedulePeriod, getProgramCounters } from "../../../offers/programs";
import { ProgramStatusChip } from "./ProgramStatusChip";
import { ProgramActionsMenu } from "./ProgramActionsMenu";

export type ProgramCardProps = {
  program: TvProgram;
  calculatedStatus: ProgramComputedStatus;
  isLiveWinner?: boolean;
  onEdit: (program: TvProgram) => void;
  onDuplicate: (program: TvProgram) => void;
  onToggleStatus?: (program: TvProgram) => void;
  onTest?: (program: TvProgram) => void;
  onOpenSimulator?: (program: TvProgram) => void;
  onDelete: (id: string) => void;
};

export function ProgramCard({
  program,
  calculatedStatus,
  isLiveWinner = false,
  onEdit,
  onDuplicate,
  onToggleStatus,
  onTest,
  onOpenSimulator,
  onDelete,
}: ProgramCardProps) {
  const isFlashOffer = program.schedule.recurrence === "flash_offer";
  const counters = getProgramCounters(program);
  const periodText = formatProgramSchedulePeriod(program);
  const priority = program.priority ?? 50;

  // Badge do tipo de recorrência
  let recurrenceBadge = {
    label: "Sempre",
    icon: <Tv size={11} />,
    className: "badge-always",
  };

  if (program.schedule.recurrence === "weekly") {
    recurrenceBadge = {
      label: "Semanal",
      icon: <Calendar size={11} />,
      className: "badge-weekly",
    };
  } else if (program.schedule.recurrence === "date_range") {
    recurrenceBadge = {
      label: "Campanha",
      icon: <Clock size={11} />,
      className: "badge-daterange",
    };
  } else if (isFlashOffer) {
    recurrenceBadge = {
      label: "Hora Extra",
      icon: <Flame size={11} />,
      className: "badge-flash",
    };
  }

  return (
    <div
      className={`admin-program-card ${isLiveWinner ? "is-live-card" : ""} ${
        isFlashOffer ? "is-flash-card" : ""
      } ${calculatedStatus === "draft" ? "is-draft-card" : ""}`}
      onClick={() => onEdit(program)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onEdit(program);
        }
      }}
    >
      {/* Top Header with Status and Menu */}
      <div className="admin-program-card-header">
        <div className="admin-program-card-badges">
          <span className={`admin-recurrence-pill ${recurrenceBadge.className}`}>
            {recurrenceBadge.icon}
            <span>{recurrenceBadge.label}</span>
          </span>

          <ProgramStatusChip
            status={calculatedStatus}
            isFlashOffer={isFlashOffer}
            size="sm"
          />
        </div>

        <div
          className="admin-program-card-actions"
          onClick={(e) => e.stopPropagation()}
        >
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

      {/* Program Name */}
      <h4 className="admin-program-card-title" title={program.name}>
        {program.name}
      </h4>

      {/* Schedule Period Summary */}
      <div className="admin-program-card-schedule">
        <Clock size={13} className="schedule-clock-icon" />
        <span className="schedule-text" title={periodText}>
          {periodText}
        </span>
      </div>

      {/* Card Info Footer (Counters + Priority) */}
      <div className="admin-program-card-footer">
        <div className="admin-program-card-counters">
          <span className="counter-tag">
            <Layers size={12} />
            <span>{counters.screensCount} {counters.screensCount === 1 ? "tela" : "telas"}</span>
          </span>
          {counters.productsCount > 0 && (
            <span className="counter-tag">
              <span>{counters.productsCount} {counters.productsCount === 1 ? "prod." : "prods."}</span>
            </span>
          )}
        </div>

        <div className="admin-program-card-priority">
          {isFlashOffer ? (
            <span className="priority-tag flash-priority">
              <Flame size={12} />
              <span>Prio {priority}</span>
            </span>
          ) : (
            <span className="priority-tag">
              <Zap size={12} />
              <span>Prio {priority}</span>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

