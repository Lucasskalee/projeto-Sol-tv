import React from "react";
import type { SolTvMedia } from "../../../types";
import { isMediaEligible, formatDate } from "../../../data";

export type MediaComputedState = "active" | "future" | "expired" | "inactive";

export function getMediaState(media: SolTvMedia): { state: MediaComputedState; label: string } {
  if (!media.active) {
    return { state: "inactive", label: "Inativa" };
  }

  const today = formatDate(new Date());
  if (isMediaEligible(media, today)) {
    return { state: "active", label: "Ativa" };
  }

  if (media.startsAt && media.startsAt > today) {
    return { state: "future", label: "Agendada" };
  }

  return { state: "expired", label: "Expirada" };
}

export interface MediaStatusChipProps {
  media: SolTvMedia;
  size?: "sm" | "md";
}

export const MediaStatusChip: React.FC<MediaStatusChipProps> = ({ media, size = "md" }) => {
  const { state, label } = getMediaState(media);

  return (
    <span className={`admin-status-chip ${state} chip-${size}`} title={`Status: ${label}`}>
      <span className="admin-status-chip-dot" aria-hidden="true" />
      <span>{label}</span>
    </span>
  );
};

