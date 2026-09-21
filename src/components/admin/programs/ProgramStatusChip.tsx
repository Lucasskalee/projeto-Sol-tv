import React from "react";
import { Clock4, FileEdit, Flame, Pause, CheckCircle2, Radio } from "lucide-react";
import type { ProgramComputedStatus, ProgramPersistedStatus } from "../../../offers/programs";

export type ProgramStatusChipProps = {
  status: ProgramComputedStatus | ProgramPersistedStatus;
  isFlashOffer?: boolean;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  className?: string;
};

export function ProgramStatusChip({
  status,
  isFlashOffer = false,
  size = "md",
  showLabel = true,
  className = "",
}: ProgramStatusChipProps) {
  let label = "Agendada";
  let variantClass = "status-scheduled";
  let icon: React.ReactNode = <Clock4 size={size === "sm" ? 11 : size === "lg" ? 14 : 12} />;

  if (status === "live") {
    if (isFlashOffer) {
      label = "HORA EXTRA NO AR";
      variantClass = "status-flash-live";
      icon = <Flame size={size === "sm" ? 12 : size === "lg" ? 15 : 13} className="pulse-flash-icon" />;
    } else {
      label = "NO AR AGORA";
      variantClass = "status-live";
      icon = <span className="admin-status-pulsing-dot" aria-hidden="true" />;
    }
  } else if (status === "draft") {
    label = "RASCUNHO";
    variantClass = "status-draft";
    icon = <FileEdit size={size === "sm" ? 11 : size === "lg" ? 14 : 12} />;
  } else if (status === "inactive" || status === "disabled") {
    label = "PAUSADA";
    variantClass = "status-inactive";
    icon = <Pause size={size === "sm" ? 11 : size === "lg" ? 14 : 12} />;
  } else if (status === "ended") {
    label = "ENCERRADA";
    variantClass = "status-ended";
    icon = <CheckCircle2 size={size === "sm" ? 11 : size === "lg" ? 14 : 12} />;
  } else if (status === "scheduled" || status === "published") {
    if (isFlashOffer) {
      label = "HORA EXTRA";
      variantClass = "status-flash-scheduled";
      icon = <Flame size={size === "sm" ? 11 : size === "lg" ? 14 : 12} />;
    } else {
      label = "AGENDADA";
      variantClass = "status-scheduled";
      icon = <Clock4 size={size === "sm" ? 11 : size === "lg" ? 14 : 12} />;
    }
  }

  return (
    <span
      className={`admin-program-status-chip chip-${size} ${variantClass} ${className}`}
      title={`Status: ${label}`}
    >
      {icon}
      {showLabel && <span className="chip-label">{label}</span>}
    </span>
  );
}

