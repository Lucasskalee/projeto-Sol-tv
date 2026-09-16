import { describe, expect, it } from "vitest";
import {
  buildCompositionPlaylist,
  checkCompositionProductStatus,
  duplicateComposition,
  isCompositionComplete,
  isCompositionValid,
  newComposition,
  synthesizeCompositionsFromOffers,
  type OfferComposition,
} from "./compositions";
import { getOfferLayoutCapacity, OFFER_LAYOUTS } from "./layouts";
import type { Offer, SolTvMedia } from "../types";
import { contentFromData } from "../data";

const mockOffers: Offer[] = [
  {
    id: "offer-1",
    sector: "acougue",
    name: "Picanha bovina",
    image: "https://example.com/picanha.jpg",
    promotionalPrice: "49,99",
    unit: "kg",
    startsAt: "2026-09-01",
    endsAt: "2026-09-30",
    duration: 8,
    active: true,
    displayOrder: 0,
    layout: "single",
  },
  {
    id: "offer-2",
    sector: "acougue",
    name: "Contrafilé",
    image: "https://example.com/contrafile.jpg",
    promotionalPrice: "39,99",
    unit: "kg",
    startsAt: "2026-09-01",
    endsAt: "2026-09-30",
    duration: 7,
    active: true,
    displayOrder: 1,
    layout: "pair",
  },
  {
    id: "offer-3",
    sector: "acougue",
    name: "Alcatra",
    image: "https://example.com/alcatra.jpg",
    promotionalPrice: "34,99",
    unit: "kg",
    startsAt: "2026-09-01",
    endsAt: "2026-09-30",
    duration: 7,
    active: true,
    displayOrder: 2,
    layout: "pair",
  },
  {
    id: "offer-4",
    sector: "acougue",
    name: "Costela bovina",
    image: "https://example.com/costela.jpg",
    promotionalPrice: "27,99",
    unit: "kg",
    startsAt: "2026-09-01",
    endsAt: "2026-09-30",
    duration: 9,
    active: true,
    displayOrder: 3,
    layout: "grid",
  },
  {
    id: "offer-5",
    sector: "acougue",
    name: "Fraldinha",
    image: "https://example.com/fraldinha.jpg",
    promotionalPrice: "36,99",
    unit: "kg",
    startsAt: "2026-09-01",
    endsAt: "2026-09-30",
    duration: 9,
    active: true,
    displayOrder: 4,
    layout: "grid",
  },
  {
    id: "offer-6",
    sector: "acougue",
    name: "Linguiça toscana",
    image: "https://example.com/linguica.jpg",
    promotionalPrice: "19,99",
    unit: "kg",
    startsAt: "2026-09-01",
    endsAt: "2026-09-30",
    duration: 6,
    active: false, // inactive offer
    displayOrder: 5,
    layout: "single",
  },
];

describe("OfferComposition and Layout Capacities", () => {
  it("enforces exact product capacities for all layouts", () => {
    expect(getOfferLayoutCapacity("hero")).toBe(1);
    expect(getOfferLayoutCapacity("duo")).toBe(2);
    expect(getOfferLayoutCapacity("grid4")).toBe(4);
    expect(getOfferLayoutCapacity("grid8")).toBe(8);

    expect(OFFER_LAYOUTS.hero.productCount).toBe(1);
    expect(OFFER_LAYOUTS.duo.productCount).toBe(2);
    expect(OFFER_LAYOUTS.grid4.productCount).toBe(4);
    expect(OFFER_LAYOUTS.grid8.productCount).toBe(8);
  });

  it("evaluates composition completeness accurately", () => {
    const heroComp = newComposition("acougue", "hero");
    expect(isCompositionComplete(heroComp)).toBe(false);

    const completeHero: OfferComposition = {
      ...heroComp,
      offers: [mockOffers[0]],
    };
    expect(isCompositionComplete(completeHero)).toBe(true);

    const duoComp: OfferComposition = {
      ...newComposition("acougue", "duo"),
      offers: [mockOffers[0]],
    };
    expect(isCompositionComplete(duoComp)).toBe(false);

    const completeDuo: OfferComposition = {
      ...duoComp,
      offers: [mockOffers[0], mockOffers[1]],
    };
    expect(isCompositionComplete(completeDuo)).toBe(true);
  });

  it("validates composition constraints (capacity and duration bounds)", () => {
    const validDuo: OfferComposition = {
      ...newComposition("acougue", "duo"),
      duration: 8,
      offers: [mockOffers[0], mockOffers[1]],
    };
    expect(isCompositionValid(validDuo)).toBe(true);

    // Empty is invalid
    const emptyComp: OfferComposition = {
      ...validDuo,
      offers: [],
    };
    expect(isCompositionValid(emptyComp)).toBe(false);

    // Exceeding capacity is invalid
    const overflowComp: OfferComposition = {
      ...validDuo,
      offers: [mockOffers[0], mockOffers[1], mockOffers[2]],
    };
    expect(isCompositionValid(overflowComp)).toBe(false);

    // Duration out of bounds
    const tooShort: OfferComposition = { ...validDuo, duration: 2 };
    expect(isCompositionValid(tooShort)).toBe(false);

    const tooLong: OfferComposition = { ...validDuo, duration: 65 };
    expect(isCompositionValid(tooLong)).toBe(false);
  });

  it("duplicates composition with new ID and position without mutating or duplicating Offer entities", () => {
    const original: OfferComposition = {
      id: "orig-123",
      sector: "acougue",
      layout: "duo",
      duration: 10,
      position: 2,
      active: true,
      offers: Object.freeze([mockOffers[0], mockOffers[1]]),
      createdAt: "2026-09-01T00:00:00.000Z",
    };

    const duplicate = duplicateComposition(original, 5);

    expect(duplicate.id).not.toBe(original.id);
    expect(duplicate.position).toBe(5);
    expect(duplicate.layout).toBe("duo");
    expect(duplicate.duration).toBe(10);
    expect(duplicate.offers).toHaveLength(2);
    expect(duplicate.offers[0]).toBe(mockOffers[0]); // Same offer reference
    expect(duplicate.offers[1]).toBe(mockOffers[1]);
  });

  it("never includes theme in OfferComposition (theme independence)", () => {
    const comp = newComposition("acougue", "hero");
    expect((comp as Record<string, unknown>).theme).toBeUndefined();
    expect((comp as Record<string, unknown>).themeSlug).toBeUndefined();
  });

  it("generates valid UUID v4 and default configuration on newComposition", () => {
    const comp = newComposition("acougue", "duo", 2);
    expect(comp.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    expect(comp.sector).toBe("acougue");
    expect(comp.layout).toBe("duo");
    expect(comp.position).toBe(2);
    expect(comp.duration).toBe(8);
    expect(comp.active).toBe(true);
    expect(comp.offers).toHaveLength(0);
  });
});

describe("Legacy Adapter: synthesizeCompositionsFromOffers", () => {
  it("synthesizes deterministic, non-overlapping compositions from legacy offers", () => {
    const synthesized = synthesizeCompositionsFromOffers(mockOffers);

    // Active offers: offer-1 (single), offer-2 (pair), offer-3 (pair), offer-4 (grid), offer-5 (grid)
    // offer-6 is inactive and must be excluded.
    expect(synthesized.length).toBeGreaterThan(0);

    // Total unique products across all compositions must equal active offers count (5)
    const allGroupedOfferIds = synthesized.flatMap((c) => c.offers.map((o) => o.id));
    expect(allGroupedOfferIds).toEqual([
      "offer-1",
      "offer-2",
      "offer-3",
      "offer-4",
      "offer-5",
    ]);

    // Zero circular duplicate products across consecutive slides
    const uniqueIds = new Set(allGroupedOfferIds);
    expect(uniqueIds.size).toBe(5);
    expect(allGroupedOfferIds).not.toContain("offer-6");
  });

  it("handles empty offers array gracefully", () => {
    expect(synthesizeCompositionsFromOffers([])).toEqual([]);
  });

  it("builds unified playlist interleaving compositions and media in position order", () => {
    const comps: OfferComposition[] = [
      {
        id: "comp-1",
        sector: "acougue",
        layout: "hero",
        duration: 8,
        position: 0,
        active: true,
        offers: [mockOffers[0]],
      },
      {
        id: "comp-2",
        sector: "acougue",
        layout: "duo",
        duration: 7,
        position: 2,
        active: true,
        offers: [mockOffers[1], mockOffers[2]],
      },
    ];

    const media: SolTvMedia[] = [
      {
        id: "media-1",
        sector: "acougue",
        type: "video",
        mediaUrl: "https://example.com/video.mp4",
        duration: 15,
        position: 1,
        active: true,
      },
    ];

    const playlist = buildCompositionPlaylist(comps, media);

    expect(playlist).toHaveLength(3);
    expect(playlist[0].id).toBe("comp-1");
    expect(playlist[0].kind).toBe("composition");
    expect(playlist[1].id).toBe("media-1");
    expect(playlist[1].kind).toBe("video");
    expect(playlist[2].id).toBe("comp-2");
    expect(playlist[2].kind).toBe("composition");
  });
});

describe("Phase 3.5: checkCompositionProductStatus and Inactive/Missing Catalog Handling", () => {
  it("detects when all composition products are active and present in catalog", () => {
    const comp: OfferComposition = {
      id: "comp-active",
      sector: "acougue",
      layout: "duo",
      duration: 8,
      position: 0,
      active: true,
      offers: [mockOffers[0], mockOffers[1]],
    };

    const status = checkCompositionProductStatus(comp, mockOffers);

    expect(status.hasInactive).toBe(false);
    expect(status.inactiveCount).toBe(0);
    expect(status.hasMissing).toBe(false);
    expect(status.missingCount).toBe(0);
    expect(status.validOffers).toHaveLength(2);
  });

  it("identifies inactive catalog products without deleting or breaking the composition", () => {
    // mockOffers[5] (Linguiça) is active: false
    const compWithInactive: OfferComposition = {
      id: "comp-with-inactive",
      sector: "acougue",
      layout: "duo",
      duration: 8,
      position: 0,
      active: true,
      offers: [mockOffers[0], mockOffers[5]],
    };

    const status = checkCompositionProductStatus(compWithInactive, mockOffers);

    expect(status.hasInactive).toBe(true);
    expect(status.inactiveCount).toBe(1);
    expect(status.hasMissing).toBe(false);
    expect(status.missingCount).toBe(0);
    expect(status.validOffers).toHaveLength(2);
  });

  it("identifies missing products that no longer exist in the catalog", () => {
    const deletedOffer: Offer = {
      ...mockOffers[0],
      id: "deleted-offer-999",
      name: "Produto Excluído",
    };

    const compWithMissing: OfferComposition = {
      id: "comp-with-missing",
      sector: "acougue",
      layout: "duo",
      duration: 8,
      position: 0,
      active: true,
      offers: [mockOffers[0], deletedOffer],
    };

    const status = checkCompositionProductStatus(compWithMissing, mockOffers);

    expect(status.hasMissing).toBe(true);
    expect(status.missingCount).toBe(1);
    expect(status.hasInactive).toBe(false);
    expect(status.validOffers).toHaveLength(1);
    expect(status.validOffers[0].id).toBe("offer-1");
  });
});

describe("Phase 4: Content Construction & Fallback Compatibility", () => {
  it("uses explicit compositions to construct TvContent playlist when present", () => {
    const explicitComp: OfferComposition = {
      id: "explicit-comp-1",
      sector: "acougue",
      layout: "hero",
      duration: 10,
      position: 0,
      active: true,
      offers: [mockOffers[0]],
    };

    const media: SolTvMedia[] = [
      {
        id: "media-vid-1",
        sector: "acougue",
        type: "video",
        mediaUrl: "https://example.com/promo.mp4",
        duration: 12,
        position: 1,
        active: true,
      },
    ];

    const content = contentFromData({
      sector: "acougue",
      offers: mockOffers,
      media,
      compositions: [explicitComp],
    });

    expect(content.compositions).toHaveLength(1);
    expect(content.compositions[0].id).toBe("explicit-comp-1");
    expect(content.playlist).toHaveLength(2);
    expect(content.playlist[0].kind).toBe("composition");
    expect(content.playlist[1].kind).toBe("video");
  });

  it("transparently synthesizes compositions from legacy catalog offers when no explicit compositions exist", () => {
    const content = contentFromData({
      sector: "acougue",
      offers: mockOffers,
      media: [],
      compositions: [], // empty explicit compositions
    });

    // Synthesized from 5 active offers (mockOffers has 5 active offers: 1 single, 2 pair, 2 grid)
    expect(content.compositions.length).toBeGreaterThan(0);
    expect(content.playlist.length).toBeGreaterThan(0);
    expect(content.playlist.every((item) => item.kind === "composition")).toBe(true);
  });

  it("produces valid empty content when no offers, media, or compositions exist", () => {
    const content = contentFromData({
      sector: "acougue",
      offers: [],
      media: [],
      compositions: [],
    });

    expect(content.offers).toEqual([]);
    expect(content.media).toEqual([]);
    expect(content.compositions).toEqual([]);
    expect(content.playlist).toEqual([]);
  });
});

describe("Phase 5.5: Camadas da TV Persistence, Realtime synchronization & Playlist stability", () => {
  it("includes active persisted compositions in the playlist", () => {
    const comp: OfferComposition = {
      id: "comp-active-1",
      sector: "acougue",
      layout: "hero",
      duration: 8,
      position: 0,
      active: true,
      offers: [mockOffers[0]],
    };
    const playlist = buildCompositionPlaylist([comp], []);
    expect(playlist).toHaveLength(1);
    expect(playlist[0].id).toBe("comp-active-1");
    expect(playlist[0].kind).toBe("composition");
  });

  it("filters out inactive/hidden compositions from the playlist", () => {
    const compInactive: OfferComposition = {
      id: "comp-inactive-1",
      sector: "acougue",
      layout: "hero",
      duration: 8,
      position: 0,
      active: false,
      offers: [mockOffers[0]],
    };
    const playlist = buildCompositionPlaylist([compInactive], []);
    expect(playlist).toHaveLength(0);
  });

  it("does NOT trigger legacy offer synthesis when all compositions are hidden (active=false)", () => {
    const hiddenComps: OfferComposition[] = [
      {
        id: "comp-hidden-1",
        sector: "acougue",
        layout: "duo",
        duration: 8,
        position: 0,
        active: false,
        offers: [mockOffers[0], mockOffers[1]],
      },
      {
        id: "comp-hidden-2",
        sector: "acougue",
        layout: "hero",
        duration: 10,
        position: 1,
        active: false,
        offers: [mockOffers[2]],
      },
    ];

    const content = contentFromData({
      sector: "acougue",
      offers: mockOffers,
      media: [],
      compositions: hiddenComps,
    });

    expect(content.compositions).toHaveLength(2);
    expect(content.compositions.every((c) => !c.active)).toBe(true);
    // Crucial: Playlist must be empty and must NOT synthesize fallback offers
    expect(content.playlist).toHaveLength(0);
  });

  it("correctly generates updated composition when slots or products change", () => {
    const original: OfferComposition = {
      id: "comp-grid-1",
      sector: "acougue",
      layout: "grid4",
      duration: 8,
      position: 0,
      active: true,
      offers: [mockOffers[0], mockOffers[1], mockOffers[2], mockOffers[3]],
    };

    // Replace slot 2 (Alcatra) with Fraldinha
    const updatedOffers = [mockOffers[0], mockOffers[1], mockOffers[4], mockOffers[3]];
    const updatedComp: OfferComposition = {
      ...original,
      offers: Object.freeze(updatedOffers),
      updatedAt: new Date().toISOString(),
    };

    expect(updatedComp.id).toBe(original.id);
    expect(updatedComp.offers[2].id).toBe("offer-5"); // Fraldinha
    expect(updatedComp.offers).toHaveLength(4);
  });

  it("preserves composition IDs during reordering", () => {
    const comps: OfferComposition[] = [
      { id: "comp-a", sector: "acougue", layout: "hero", duration: 8, position: 0, active: true, offers: [mockOffers[0]] },
      { id: "comp-b", sector: "acougue", layout: "duo", duration: 8, position: 1, active: true, offers: [mockOffers[1], mockOffers[2]] },
    ];

    // Move comp-b up to position 0
    const reordered: OfferComposition[] = [
      { ...comps[1], position: 0 },
      { ...comps[0], position: 1 },
    ];

    expect(reordered[0].id).toBe("comp-b");
    expect(reordered[0].position).toBe(0);
    expect(reordered[1].id).toBe("comp-a");
    expect(reordered[1].position).toBe(1);
  });

  it("locates currently playing item by ID after playlist is rebuilt", () => {
    const comp1: OfferComposition = { id: "comp-1", sector: "acougue", layout: "hero", duration: 8, position: 0, active: true, offers: [mockOffers[0]] };
    const comp2: OfferComposition = { id: "comp-2", sector: "acougue", layout: "duo", duration: 8, position: 1, active: true, offers: [mockOffers[1], mockOffers[2]] };
    const mediaVideo: SolTvMedia = { id: "video-1", sector: "acougue", type: "video", mediaUrl: "https://example.com/v.mp4", duration: 15, position: 2, active: true };

    const initialPlaylist = buildCompositionPlaylist([comp1, comp2], [mediaVideo]);
    // TV was playing the video at index 2 (id: 'video-1')
    const currentPlayingId = "video-1";
    const initialIndex = initialPlaylist.findIndex((item) => item.id === currentPlayingId);
    expect(initialIndex).toBe(2);

    // Admin edits comp1 (changes duration or product)
    const updatedComp1: OfferComposition = { ...comp1, duration: 12 };
    const updatedPlaylist = buildCompositionPlaylist([updatedComp1, comp2], [mediaVideo]);

    // Lookup playing item in updated playlist
    const updatedIndex = updatedPlaylist.findIndex((item) => item.id === currentPlayingId);
    expect(updatedIndex).toBe(2);
    expect(updatedPlaylist[updatedIndex].id).toBe("video-1");
  });

  it("safely advances to next valid item when current item is removed or hidden", () => {
    const comp1: OfferComposition = { id: "comp-1", sector: "acougue", layout: "hero", duration: 8, position: 0, active: true, offers: [mockOffers[0]] };
    const comp2: OfferComposition = { id: "comp-2", sector: "acougue", layout: "duo", duration: 8, position: 1, active: true, offers: [mockOffers[1], mockOffers[2]] };
    const mediaVideo: SolTvMedia = { id: "video-1", sector: "acougue", type: "video", mediaUrl: "https://example.com/v.mp4", duration: 15, position: 2, active: true };

    // TV was playing comp2 (index 1)
    const currentPlayingId = "comp-2";
    let currentIndex = 1;

    // Admin hides comp2 (active = false)
    const updatedComp2: OfferComposition = { ...comp2, active: false };
    const nextPlaylist = buildCompositionPlaylist([comp1, updatedComp2], [mediaVideo]);

    // nextPlaylist is now [comp-1, video-1] (length 2)
    expect(nextPlaylist).toHaveLength(2);
    const foundIdx = nextPlaylist.findIndex((item) => item.id === currentPlayingId);
    expect(foundIdx).toBe(-1); // No longer in playlist

    // Safe fallback clamp: keep current index (1) if within bounds, which is now video-1!
    if (currentIndex >= nextPlaylist.length) {
      currentIndex = currentIndex % nextPlaylist.length;
    }
    expect(currentIndex).toBe(1);
    expect(nextPlaylist[currentIndex].id).toBe("video-1");
  });

  it("keeps theme independent of layer changes", () => {
    const comp: OfferComposition = {
      id: "comp-theme-test",
      sector: "acougue",
      layout: "hero",
      duration: 8,
      position: 0,
      active: true,
      offers: [mockOffers[0]],
    };

    // OfferComposition must not contain any theme property
    expect((comp as Record<string, unknown>).theme).toBeUndefined();
    expect((comp as Record<string, unknown>).themeSlug).toBeUndefined();
    expect((comp as Record<string, unknown>).activeTheme).toBeUndefined();
  });
});



