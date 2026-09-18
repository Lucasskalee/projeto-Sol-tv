export type MediaType = "image" | "video";
export type { TransitionPreset, ExitPreset } from "./transitions";
import type { LegacyOfferLayout } from "./offers/layouts";

export type Sector = "acougue" | "padaria" | "caixas" | "geral" | string;

export type SolTvMedia = {
  id: string;
  title?: string;
  type: MediaType;
  mediaUrl: string;
  storagePath?: string;
  sector: string;
  duration: number;
  position: number;
  active: boolean;
  startsAt?: string;
  endsAt?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type Offer = {
  id: string;
  sector: string;
  name: string;
  image: string;
  video?: string;
  regularPrice?: string;
  promotionalPrice: string;
  unit: string;
  startsAt: string;
  endsAt: string;
  duration: number;
  active: boolean;
  displayOrder: number;
  layout: LegacyOfferLayout;
  imageScale?: number;
};

import type { OfferComposition } from "./offers/compositions";

export type TvPlaylistItem =
  | {
      id: string;
      kind: "offer";
      offer: Offer;
      duration: number;
      position: number;
      active: boolean;
    }
  | {
      id: string;
      kind: "composition";
      composition: OfferComposition;
      duration: number;
      position: number;
      active: boolean;
    }
  | {
      id: string;
      kind: "image";
      title?: string;
      src: string;
      duration: number;
      position: number;
      active: boolean;
    }
  | {
      id: string;
      kind: "video";
      title?: string;
      src: string;
      duration: number;
      position: number;
      active: boolean;
    }
  | {
      id: string;
      kind: "opening";
      duration: number;
      position: number;
      active: boolean;
    };

export type PlaylistItem =
  | { id: string; type: "opening"; duration: number; active: boolean }
  | {
      id: string;
      type: "offer";
      offerId: string;
      layout: "single" | "pair" | "grid";
      duration: number;
      active: boolean;
    }
  | {
      id: string;
      type: "video";
      title: string;
      src: string;
      duration: number;
      active: boolean;
    };

export type TvContent = {
  sector: string;
  offers: Offer[];
  media: SolTvMedia[];
  compositions: OfferComposition[];
  playlist: TvPlaylistItem[];
  publishedAt: string;
};
