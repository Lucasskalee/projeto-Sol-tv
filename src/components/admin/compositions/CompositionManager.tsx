import React from "react";
import type { Offer, SolTvMedia } from "../../../types";
import type { OfferComposition } from "../../../offers/compositions";
import { CatalogManager } from "../catalogs/CatalogManager";

export type CompositionManagerProps = {
  sector: string;
  sectorLabel?: string;
  offers: readonly Offer[];
  media: readonly SolTvMedia[];
  compositions?: readonly OfferComposition[];
  hidePreview?: boolean;
  onSaveComposition?: (comp: OfferComposition) => Promise<void> | void;
  onDeleteComposition?: (id: string) => Promise<void> | void;
  onReorderCompositions?: (compositions: OfferComposition[]) => Promise<void> | void;
};

export function CompositionManager(props: CompositionManagerProps) {
  return <CatalogManager {...props} />;
}
