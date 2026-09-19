import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import {
  getCachedMediaUrl,
  isCacheableMediaUrl,
  preloadMediaList,
  invalidateMedia,
  pruneMediaCache,
  clearAllMediaCache,
  MEDIA_CACHE_NAME,
} from "./mediaCache";

describe("mediaCache", () => {
  let mockStorage: Map<string, Response>;

  beforeEach(async () => {
    mockStorage = new Map();

    const mockCache = {
      match: vi.fn(async (url: string) => {
        const res = mockStorage.get(url);
        return res ? res.clone() : undefined;
      }),
      put: vi.fn(async (url: string, res: Response) => {
        mockStorage.set(url, res.clone());
      }),
      delete: vi.fn(async (req: string | { url: string }) => {
        const url = typeof req === "string" ? req : req.url;
        return mockStorage.delete(url);
      }),
      keys: vi.fn(async () => {
        return Array.from(mockStorage.keys()).map((u) => ({ url: u }));
      }),
    };

    // Global caches mock
    Object.defineProperty(globalThis, "caches", {
      value: {
        open: vi.fn(async (name: string) => {
          if (name === MEDIA_CACHE_NAME) return mockCache;
          return mockCache;
        }),
        delete: vi.fn(async () => {
          mockStorage.clear();
          return true;
        }),
      },
      writable: true,
      configurable: true,
    });

    // Global URL.createObjectURL / revokeObjectURL mock
    let blobId = 1;
    globalThis.URL.createObjectURL = vi.fn((_blob: Blob) => `blob:http://localhost/${blobId++}`);
    globalThis.URL.revokeObjectURL = vi.fn();

    // Global fetch mock
    globalThis.fetch = vi.fn(async (url: string | URL | Request) => {
      const urlStr = String(url);
      if (urlStr.includes("error-500")) {
        return new Response("Not found", { status: 500, statusText: "Internal Error" });
      }
      return new Response(new Blob(["mock-video-content-bytes"], { type: "video/mp4" }), {
        status: 200,
        headers: { "Content-Type": "video/mp4" },
      });
    });

    await clearAllMediaCache();
  });

  afterEach(async () => {
    await clearAllMediaCache();
    vi.restoreAllMocks();
  });

  describe("isCacheableMediaUrl", () => {
    it("identifies cacheable external HTTP/HTTPS URLs", () => {
      expect(isCacheableMediaUrl("https://supabase.co/storage/v1/object/public/tv-media/video.mp4")).toBe(true);
      expect(isCacheableMediaUrl("http://example.com/image.jpg")).toBe(true);
    });

    it("rejects local, blob, data or empty URLs", () => {
      expect(isCacheableMediaUrl("/logo-sol.png")).toBe(false);
      expect(isCacheableMediaUrl("blob:http://localhost/123")).toBe(false);
      expect(isCacheableMediaUrl("data:image/png;base64,123")).toBe(false);
      expect(isCacheableMediaUrl("")).toBe(false);
      expect(isCacheableMediaUrl(null)).toBe(false);
      expect(isCacheableMediaUrl(undefined)).toBe(false);
    });
  });

  describe("getCachedMediaUrl", () => {
    it("downloads and caches on MISS, then returns blob URL on subsequent HIT", async () => {
      const mediaUrl = "https://supabase.co/storage/v1/object/public/tv-media/promo.mp4";

      // 1st request -> MISS -> Download -> Cached in Cache Storage and Memory
      const blobUrl1 = await getCachedMediaUrl(mediaUrl);
      expect(blobUrl1).toMatch(/^blob:http:\/\/localhost\//);
      expect(globalThis.fetch).toHaveBeenCalledTimes(1);

      // 2nd request -> HIT (RAM) -> Returns same blob URL without fetch
      const blobUrl2 = await getCachedMediaUrl(mediaUrl);
      expect(blobUrl2).toBe(blobUrl1);
      expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    });

    it("deduplicates concurrent in-flight downloads of the same URL", async () => {
      const mediaUrl = "https://supabase.co/storage/v1/object/public/tv-media/heavy-video.mp4";

      // Trigger multiple requests at the exact same moment
      const [res1, res2, res3] = await Promise.all([
        getCachedMediaUrl(mediaUrl),
        getCachedMediaUrl(mediaUrl),
        getCachedMediaUrl(mediaUrl),
      ]);

      expect(res1).toMatch(/^blob:http:\/\/localhost\//);
      expect(res1).toBe(res2);
      expect(res2).toBe(res3);
      // Fetch should be called exactly once despite 3 concurrent calls
      expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    });

    it("falls back gracefully to original URL if fetch fails", async () => {
      const failingUrl = "https://supabase.co/storage/v1/object/public/tv-media/error-500.mp4";
      const result = await getCachedMediaUrl(failingUrl);
      expect(result).toBe(failingUrl);
    });

    it("returns original URL for non-cacheable items", async () => {
      expect(await getCachedMediaUrl("/logo-sol.png")).toBe("/logo-sol.png");
    });
  });

  describe("preloadMediaList", () => {
    it("preloads multiple URLs into cache", async () => {
      const urls = [
        "https://supabase.co/storage/v1/object/public/tv-media/img1.jpg",
        "https://supabase.co/storage/v1/object/public/tv-media/img2.jpg",
        "/logo-sol.png", // ignored
      ];

      await preloadMediaList(urls);
      expect(globalThis.fetch).toHaveBeenCalledTimes(2);

      // After preload, requesting them should not trigger extra fetches
      await getCachedMediaUrl("https://supabase.co/storage/v1/object/public/tv-media/img1.jpg");
      await getCachedMediaUrl("https://supabase.co/storage/v1/object/public/tv-media/img2.jpg");
      expect(globalThis.fetch).toHaveBeenCalledTimes(2);
    });
  });

  describe("invalidateMedia", () => {
    it("removes specified media from Cache Storage and memory", async () => {
      const mediaUrl = "https://supabase.co/storage/v1/object/public/tv-media/updated.mp4";

      const initialBlob = await getCachedMediaUrl(mediaUrl);
      expect(initialBlob).toMatch(/^blob:http:\/\/localhost\//);
      expect(globalThis.fetch).toHaveBeenCalledTimes(1);

      await invalidateMedia(mediaUrl);
      expect(globalThis.URL.revokeObjectURL).toHaveBeenCalledWith(initialBlob);

      // Subsequent request should trigger a re-download
      await getCachedMediaUrl(mediaUrl);
      expect(globalThis.fetch).toHaveBeenCalledTimes(2);
    });
  });

  describe("pruneMediaCache", () => {
    it("safely cleans up orphan media no longer in active list", async () => {
      const activeUrl = "https://supabase.co/storage/v1/object/public/tv-media/active.mp4";
      const orphanUrl = "https://supabase.co/storage/v1/object/public/tv-media/orphan.mp4";

      await getCachedMediaUrl(activeUrl);
      await getCachedMediaUrl(orphanUrl);
      expect(mockStorage.size).toBe(2);

      const removed = await pruneMediaCache([activeUrl]);
      expect(removed).toBe(1);
      expect(mockStorage.has(activeUrl)).toBe(true);
      expect(mockStorage.has(orphanUrl)).toBe(false);
    });
  });
});

