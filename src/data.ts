import type { Offer, PlaylistItem, SolTvMedia, TvContent, TvPlaylistItem } from "./types";
import {
  buildCompositionPlaylist,
  synthesizeCompositionsFromOffers,
  type OfferComposition,
} from "./offers/compositions";

const today = new Date();
export const formatDate = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const plusDays = (days: number) => {
  const date = new Date(today);
  date.setDate(date.getDate() + days);
  return formatDate(date);
};

export const SECTORS = [
  { id: "acougue", label: "Açougue" },
  { id: "padaria", label: "Padaria" },
  { id: "caixas", label: "Frente de Caixas" },
  { id: "geral", label: "Geral / Institucional" },
] as const;

export const seedOffers: Offer[] = [
  {
    id: "11111111-1111-4111-8111-111111111111",
    sector: "acougue",
    name: "Picanha bovina",
    image:
      "https://images.unsplash.com/photo-1600891964092-4316c288032e?auto=format&fit=crop&w=1200&q=85",
    regularPrice: "59,90",
    promotionalPrice: "44,99",
    unit: "kg",
    startsAt: formatDate(today),
    endsAt: plusDays(7),
    duration: 8,
    active: true,
    displayOrder: 0,
    layout: "single",
  },
  {
    id: "22222222-2222-4222-8222-222222222222",
    sector: "acougue",
    name: "Fraldinha especial",
    image:
      "https://images.unsplash.com/photo-1558030006-450675393462?auto=format&fit=crop&w=1200&q=85",
    regularPrice: "49,90",
    promotionalPrice: "36,90",
    unit: "kg",
    startsAt: formatDate(today),
    endsAt: plusDays(5),
    duration: 7,
    active: true,
    displayOrder: 1,
    layout: "pair",
  },
  {
    id: "33333333-3333-4333-8333-333333333333",
    sector: "acougue",
    name: "Linguiça toscana",
    image:
      "https://images.unsplash.com/photo-1585325701956-60dd9c8553bc?auto=format&fit=crop&w=1200&q=85",
    regularPrice: "24,90",
    promotionalPrice: "18,90",
    unit: "kg",
    startsAt: formatDate(today),
    endsAt: plusDays(10),
    duration: 7,
    active: true,
    displayOrder: 2,
    layout: "grid",
  },
  {
    id: "44444444-4444-4444-8444-444444444444",
    sector: "acougue",
    name: "Coxinha da asa",
    image:
      "https://images.unsplash.com/photo-1604503468506-a8da13d82791?auto=format&fit=crop&w=1200&q=85",
    regularPrice: "19,90",
    promotionalPrice: "14,99",
    unit: "kg",
    startsAt: formatDate(today),
    endsAt: plusDays(3),
    duration: 7,
    active: true,
    displayOrder: 3,
    layout: "single",
  },
];

export const seedMedia: SolTvMedia[] = [
  {
    id: "55555555-5555-4555-8555-555555555555",
    title: "Cortes Selecionados SOL",
    type: "image",
    mediaUrl:
      "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=1920&q=85",
    sector: "acougue",
    duration: 10,
    position: 4,
    active: true,
    startsAt: formatDate(today),
    endsAt: plusDays(30),
  },
  {
    id: "66666666-6666-4666-8666-666666666666",
    title: "O melhor do açougue está no Sol",
    type: "video",
    mediaUrl: "https://cdn.coverr.co/videos/coverr-a-chef-preparing-meat-1577/1080p.mp4",
    sector: "acougue",
    duration: 12,
    position: 5,
    active: true,
    startsAt: formatDate(today),
    endsAt: plusDays(30),
  },
];

export const seedPlaylist: PlaylistItem[] = [
  { id: "opening", type: "opening", duration: 5, active: true },
  {
    id: "feature",
    type: "offer",
    offerId: "11111111-1111-4111-8111-111111111111",
    layout: "single",
    duration: 8,
    active: true,
  },
  {
    id: "pair",
    type: "offer",
    offerId: "22222222-2222-4222-8222-222222222222",
    layout: "pair",
    duration: 8,
    active: true,
  },
];

export function isEligible(offer: Offer, date = formatDate(new Date())) {
  const current = date.includes("T") ? new Date(date) : new Date(`${date}T12:00:00`);
  const starts = offer.startsAt ? new Date(offer.startsAt) : null;
  const ends = offer.endsAt ? new Date(offer.endsAt) : null;
  return (
    offer.active &&
    (!starts || starts <= current) &&
    (!ends || ends >= current)
  );
}

export function isMediaEligible(media: SolTvMedia, date = formatDate(new Date())) {
  const current = date.includes("T") ? new Date(date) : new Date(`${date}T12:00:00`);
  const starts = media.startsAt ? new Date(media.startsAt) : null;
  const ends = media.endsAt ? new Date(media.endsAt) : null;
  return (
    media.active &&
    (!starts || starts <= current) &&
    (!ends || ends >= current)
  );
}

export function buildUnifiedPlaylist(
  offers: Offer[],
  media: SolTvMedia[] = [],
): TvPlaylistItem[] {
  const offerItems: TvPlaylistItem[] = offers.map((offer) => ({
    id: offer.id,
    kind: "offer",
    offer,
    duration: offer.duration,
    position: offer.displayOrder,
    active: offer.active,
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

  return [...offerItems, ...mediaItems].sort(
    (a, b) => a.position - b.position || a.id.localeCompare(b.id),
  );
}

export function contentFromData(params: {
  sector?: string;
  offers?: Offer[];
  media?: SolTvMedia[];
  compositions?: OfferComposition[];
}): TvContent {
  const sector = params.sector || "acougue";
  const offers = params.offers || [];
  const media = params.media || [];

  const hasExplicitCompositions = Boolean(
    params.compositions && params.compositions.length > 0,
  );

  const compositions = hasExplicitCompositions
    ? params.compositions!
    : synthesizeCompositionsFromOffers(offers);

  const playlist =
    hasExplicitCompositions || compositions.length > 0
      ? buildCompositionPlaylist(compositions, media)
      : buildUnifiedPlaylist(offers.filter((o) => o.active), media);

  return {
    sector,
    offers,
    media,
    compositions,
    playlist,
    publishedAt: new Date().toISOString(),
  };
}

export function contentFromOffers(
  offers: Offer[],
  media: SolTvMedia[] = [],
  compositions: OfferComposition[] = [],
): TvContent {
  const sector = offers[0]?.sector || media[0]?.sector || compositions[0]?.sector || "acougue";
  return contentFromData({ sector, offers, media, compositions });
}

export function demoContent(sector = "acougue"): TvContent {
  return contentFromData({
    sector,
    offers: seedOffers.filter((o) => o.sector === sector || sector === "acougue").map((o) => ({ ...o })),
    media: seedMedia.filter((m) => m.sector === sector || sector === "acougue").map((m) => ({ ...m })),
  });
}

export function newOffer(sector = "acougue"): Offer {
  const end = new Date();
  end.setDate(end.getDate() + 7);
  return {
    id: crypto.randomUUID(),
    sector,
    name: "",
    image: "",
    promotionalPrice: "",
    unit: "kg",
    startsAt: formatDate(new Date()),
    endsAt: formatDate(end),
    duration: 8,
    active: true,
    displayOrder: 0,
    layout: "single",
    imageScale: 1,
  };
}

export function newMedia(sector = "acougue"): SolTvMedia {
  const end = new Date();
  end.setDate(end.getDate() + 15);
  return {
    id: crypto.randomUUID(),
    title: "",
    type: "image",
    mediaUrl: "",
    sector,
    duration: 10,
    position: 0,
    active: true,
    startsAt: formatDate(new Date()),
    endsAt: formatDate(end),
  };
}
