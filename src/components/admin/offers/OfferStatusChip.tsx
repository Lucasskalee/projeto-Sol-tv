import React from "react";
import type { Offer } from "../../../types";
import { isEligible, formatDate } from "../../../data";

export interface OfferStatusChipProps {
  offer: Offer;
}

export type OfferComputedState = "active" | "future" | "expired" | "inactive";

export function getOfferState(offer: Offer): { state: OfferComputedState; label: string } {
  if (!offer.active) {
    return { state: "inactive", label: "Inativa" };
  }

  const today = formatDate(new Date());
  if (isEligible(offer, today)) {
    return { state: "active", label: "Ativa" };
  }

  if (offer.startsAt && offer.startsAt > today) {
    return { state: "future", label: "Futura" };
  }

  return { state: "expired", label: "Expirada" };
}

export const OfferStatusChip: React.FC<OfferStatusChipProps> = ({ offer }) => {
  const { state, label } = getOfferState(offer);

  return (
    <span className={`admin-status-chip ${state}`}>
      <span className="admin-status-chip-dot" />
      <span>{label}</span>
    </span>
  );
};

