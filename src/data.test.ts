import { describe, expect, it } from "vitest";
import { buildUnifiedPlaylist, contentFromData } from "./data";
import type { Offer, SolTvMedia } from "./types";

const offer: Offer = {
  id: "offer-1",
  sector: "acougue",
  name: "Picanha",
  image: "https://example.com/picanha.jpg",
  promotionalPrice: "44,99",
  unit: "kg",
  startsAt: "2026-01-01",
  endsAt: "2026-12-31",
  duration: 8,
  active: true,
  displayOrder: 1,
  layout: "single",
};

const media: SolTvMedia[] = [
  {
    id: "image-1",
    type: "image",
    mediaUrl: "https://example.com/banner.jpg",
    sector: "acougue",
    duration: 10,
    position: 0,
    active: true,
  },
  {
    id: "video-1",
    type: "video",
    mediaUrl: "https://example.com/spot.mp4",
    sector: "acougue",
    duration: 12,
    position: 2,
    active: true,
  },
];

describe("buildUnifiedPlaylist baseline", () => {
  it("does not recreate product slides when every configured layer is hidden", () => {
    const content = contentFromData({ offers: [offer], compositions: [{
      id: "hidden", sector: "acougue", layout: "hero", duration: 8,
      position: 0, active: false, offers: [offer],
    }] });
    expect(content.playlist).toEqual([]);
    expect(content.compositions[0].active).toBe(false);
  });
  it("keeps offers, images and videos in the unified position order", () => {
    const playlist = buildUnifiedPlaylist([offer], media);

    expect(playlist.map(({ id, kind, duration, position }) => ({
      id,
      kind,
      duration,
      position,
    }))).toEqual([
      { id: "image-1", kind: "image", duration: 10, position: 0 },
      { id: "offer-1", kind: "offer", duration: 8, position: 1 },
      { id: "video-1", kind: "video", duration: 12, position: 2 },
    ]);
  });
});
