export type OfferLayout = "hero" | "duo" | "trio" | "grid4" | "grid8";

export type LegacyOfferLayout = "single" | "pair" | "grid";

export type OfferLayoutDefinition = {
  readonly id: OfferLayout;
  readonly label: string;
  readonly productCount: 1 | 2 | 3 | 4 | 8;
  readonly density: "spacious" | "comfortable" | "compact" | "dense";
};

export const OFFER_LAYOUTS: Readonly<Record<OfferLayout, OfferLayoutDefinition>> =
  Object.freeze({
    hero: Object.freeze({
      id: "hero",
      label: "1 produto",
      productCount: 1,
      density: "spacious",
    }),
    duo: Object.freeze({
      id: "duo",
      label: "2 produtos",
      productCount: 2,
      density: "comfortable",
    }),
    trio: Object.freeze({
      id: "trio",
      label: "3 produtos",
      productCount: 3,
      density: "comfortable",
    }),
    grid4: Object.freeze({
      id: "grid4",
      label: "4 produtos",
      productCount: 4,
      density: "compact",
    }),
    grid8: Object.freeze({
      id: "grid8",
      label: "8 produtos",
      productCount: 8,
      density: "dense",
    }),
  });

const LEGACY_LAYOUT_MAP: Readonly<Record<LegacyOfferLayout, OfferLayout>> =
  Object.freeze({
    single: "hero",
    pair: "duo",
    grid: "grid4",
  });

export function isOfferLayout(value: string | null | undefined): value is OfferLayout {
  return Boolean(value && value in OFFER_LAYOUTS);
}

export function normalizeOfferLayout(
  layout: OfferLayout | LegacyOfferLayout | null | undefined,
): OfferLayout {
  if (layout && isOfferLayout(layout)) return layout;
  if (layout && layout in LEGACY_LAYOUT_MAP) {
    return LEGACY_LAYOUT_MAP[layout as LegacyOfferLayout];
  }
  return "hero";
}

export function getOfferLayoutCapacity(
  layout: OfferLayout | LegacyOfferLayout | null | undefined,
): number {
  const normalized = normalizeOfferLayout(layout);
  return OFFER_LAYOUTS[normalized].productCount;
}

