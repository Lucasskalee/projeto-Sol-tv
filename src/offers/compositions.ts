import {
  getOfferLayoutCapacity,
  normalizeOfferLayout,
  type OfferLayout,
} from "./layouts";
import type { Offer, SolTvMedia, TvPlaylistItem } from "../types";

export type OfferComposition = {
  readonly id: string;
  readonly sector: string;
  readonly layout: OfferLayout;
  readonly duration: number;
  readonly position: number;
  readonly active: boolean;
  readonly offers: readonly Offer[];
  readonly createdAt?: string;
  readonly updatedAt?: string;
};

export function newComposition(
  sector = "acougue",
  layout: OfferLayout = "hero",
  position = 0,
): OfferComposition {
  const timestamp = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    sector,
    layout,
    duration: 8,
    position,
    active: true,
    offers: Object.freeze([]),
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function isCompositionComplete(composition: OfferComposition): boolean {
  const capacity = getOfferLayoutCapacity(composition.layout);
  return composition.offers.length === capacity;
}

export function isCompositionValid(composition: OfferComposition): boolean {
  const capacity = getOfferLayoutCapacity(composition.layout);
  return (
    composition.offers.length > 0 &&
    composition.offers.length <= capacity &&
    composition.duration >= 3 &&
    composition.duration <= 60
  );
}

export type CompositionProductStatus = {
  readonly hasInactive: boolean;
  readonly inactiveCount: number;
  readonly hasMissing: boolean;
  readonly missingCount: number;
  readonly validOffers: readonly Offer[];
};

export function checkCompositionProductStatus(
  composition: OfferComposition,
  catalogOffers: readonly Offer[],
): CompositionProductStatus {
  const catalogMap = new Map(catalogOffers.map((o) => [o.id, o]));
  let inactiveCount = 0;
  let missingCount = 0;
  const validOffers: Offer[] = [];

  for (const item of composition.offers) {
    const catalogItem = catalogMap.get(item.id);
    if (!catalogItem) {
      missingCount += 1;
    } else if (!catalogItem.active) {
      inactiveCount += 1;
      validOffers.push(catalogItem);
    } else {
      validOffers.push(catalogItem);
    }
  }

  return {
    hasInactive: inactiveCount > 0,
    inactiveCount,
    hasMissing: missingCount > 0,
    missingCount,
    validOffers: Object.freeze(validOffers),
  };
}

export function duplicateComposition(
  composition: OfferComposition,
  newPosition?: number,
): OfferComposition {
  const timestamp = new Date().toISOString();
  return {
    ...composition,
    id: crypto.randomUUID(),
    position: typeof newPosition === "number" ? newPosition : composition.position + 1,
    createdAt: timestamp,
    updatedAt: timestamp,
    offers: Object.freeze([...composition.offers]),
  };
}

/**
 * Legacy Adapter: Transforms legacy flat offers into discrete OfferCompositions.
 *
 * Deterministic Strategy:
 * 1. Takes all active offers sorted by displayOrder.
 * 2. Consumes products sequentially according to their declared layout capacity.
 * 3. Never produces overlapping cyclic duplicates (each product appears exactly once).
 * 4. Safely adjusts final leftover products to the closest fitting layout without inventing fake offers.
 */
export function synthesizeCompositionsFromOffers(offers: Offer[]): OfferComposition[] {
  const activeOffers = [...offers]
    .filter((o) => o.active)
    .sort((a, b) => a.displayOrder - b.displayOrder || a.id.localeCompare(b.id));

  if (activeOffers.length === 0) return [];

  const compositions: OfferComposition[] = [];
  let index = 0;
  let compPosition = 0;

  while (index < activeOffers.length) {
    const currentOffer = activeOffers[index];
    const targetCapacity = getOfferLayoutCapacity(currentOffer.layout);
    const available = activeOffers.slice(index, index + targetCapacity);

    // Resolve layout based on actual products available in this slice
    let resolvedLayout: OfferLayout;
    if (available.length >= 8 && targetCapacity === 8) {
      resolvedLayout = "grid8";
    } else if (available.length >= 4 && targetCapacity >= 4) {
      resolvedLayout = "grid4";
    } else if (available.length >= 2 && targetCapacity >= 2) {
      resolvedLayout = "duo";
    } else {
      resolvedLayout = available.length === 1 ? "hero" : normalizeOfferLayout(currentOffer.layout);
    }

    compositions.push({
      id: crypto.randomUUID(),
      sector: currentOffer.sector || "acougue",
      layout: resolvedLayout,
      duration: Math.max(3, Math.min(60, currentOffer.duration || 8)),
      position: compPosition,
      active: true,
      offers: Object.freeze(available),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    index += available.length;
    compPosition += 1;
  }

  return compositions;
}

export function buildCompositionPlaylist(
  compositions: OfferComposition[],
  media: SolTvMedia[] = [],
): TvPlaylistItem[] {
  const compositionItems: TvPlaylistItem[] = compositions
    .filter((c) => c.active && c.offers.length > 0)
    .map((comp) => ({
      id: comp.id,
      kind: "composition" as const,
      composition: comp,
      duration: comp.duration,
      position: comp.position,
      active: comp.active,
    }));

  const mediaItems: TvPlaylistItem[] = media.map((item) => ({
    id: item.id,
    kind: item.type,
    title: item.title,
    src: item.mediaUrl,
    duration: item.duration,
    position: item.position,
    active: item.active,
  }));

  return [...compositionItems, ...mediaItems].sort(
    (a, b) => a.position - b.position || a.id.localeCompare(b.id),
  );
}

