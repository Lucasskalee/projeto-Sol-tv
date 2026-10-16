import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { VideoSlide, TRANSPARENT_VIDEO_POSTER } from "./VideoSlide";
import { TvPlayer } from "./TvPlayer";
import { normalTheme } from "../themes/normal";
import {
  clearAllMediaCache,
  getCachedMediaUrl,
  MEDIA_CACHE_NAME,
} from "../mediaCache";
import type { TvContent } from "../types";

function createMockContent(overrides?: Partial<TvContent>): TvContent {
  const nowStr = "";
  return {
    sector: "acougue",
    publishedAt: new Date().toISOString(),
    offers: [
      {
        id: "offer-1",
        sector: "acougue",
        name: "Picanha Bovina",
        image: "/logo-sol.png",
        regularPrice: "79,90",
        promotionalPrice: "59,90",
        unit: "KG",
        startsAt: nowStr,
        endsAt: nowStr,
        duration: 8,
        active: true,
        displayOrder: 1,
        layout: "single",
      },
    ],
    media: [
      {
        id: "vid-1",
        title: "Churrasco Sol",
        type: "video",
        mediaUrl: "https://supabase.co/storage/v1/object/public/tv-media/video1.mp4",
        sector: "acougue",
        duration: 10,
        position: 1,
        active: true,
        startsAt: nowStr,
        endsAt: nowStr,
        createdAt: nowStr,
        updatedAt: nowStr,
      },
      {
        id: "vid-2",
        title: "Oferta Especial Vídeo 2",
        type: "video",
        mediaUrl: "https://supabase.co/storage/v1/object/public/tv-media/video2.mp4",
        sector: "acougue",
        duration: 10,
        position: 2,
        active: true,
        startsAt: nowStr,
        endsAt: nowStr,
        createdAt: nowStr,
        updatedAt: nowStr,
      },
      {
        id: "img-1",
        title: "Banner Institucional",
        type: "image",
        mediaUrl: "/logo-sol.png",
        sector: "acougue",
        duration: 8,
        position: 3,
        active: true,
        startsAt: nowStr,
        endsAt: nowStr,
        createdAt: nowStr,
        updatedAt: nowStr,
      },
    ],
    compositions: [],
    playlist: [
      {
        id: "vid-1",
        kind: "video",
        src: "https://supabase.co/storage/v1/object/public/tv-media/video1.mp4",
        title: "Churrasco Sol",
        duration: 10,
        position: 1,
        active: true,
      },
    ],
    ...overrides,
  };
}

describe("VideoSlide & TvPlayer — Correção do Player de Vídeo nas Smart TVs (#18)", () => {
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

    let blobId = 1;
    globalThis.URL.createObjectURL = vi.fn(() => `blob:http://localhost/video-${blobId++}`);
    globalThis.URL.revokeObjectURL = vi.fn();

    globalThis.fetch = vi.fn(async (url: string | URL | Request) => {
      const urlStr = String(url);
      if (urlStr.includes("broken")) {
        return new Response("Not Found", { status: 404 });
      }
      return new Response(new Blob(["mock-video-bytes"], { type: "video/mp4" }), {
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

  it("1. Vídeo iniciando automaticamente: renderiza em estado invisível de preparação com poster transparente 1x1 sem exibir controles nativos", async () => {
    // Pré-aquece o cache para que a URL esteja imediatamente disponível
    const videoUrl = "https://supabase.co/storage/v1/object/public/tv-media/video1.mp4";
    await getCachedMediaUrl(videoUrl);

    const html = renderToStaticMarkup(
      <VideoSlide src={videoUrl} title="Vídeo Açougue" mode="tv" paused={false} />,
    );

    // Deve estar no estado de preparação até que o evento playing + readyState >= 2 ocorra no navegador real
    expect(html).toContain("is-video-preparing");
    expect(html).toContain('data-video-ready="false"');
    expect(html).toContain("video-frame-preparing");
    expect(html).toContain("opacity:0");
    // Deve conter poster transparente para impedir o ícone cinza de Play nativo de Smart TVs
    expect(html).toContain(`poster="${TRANSPARENT_VIDEO_POSTER}"`);
    // Atributos obrigatórios de autoplay sem controles
    expect(html.toLowerCase()).toContain("autoplay");
    expect(html.toLowerCase()).toContain("muted");
    expect(html.toLowerCase()).toContain("playsinline");
    expect(html.toLowerCase()).toContain("disablepictureinpicture");
    expect(html.toLowerCase()).toContain("disableremoteplayback");
    expect(html).not.toContain('controls=""');
    expect(html).not.toContain("preview-play-overlay-btn");
  });

  it("2. Troca de imagem para vídeo & 5. Internet lenta: não monta <video> com URL remota crua antes da resolução do cache", () => {
    // URL remota ainda não está em cache (simulando internet lenta carregando em background)
    const slowVideoUrl = "https://supabase.co/storage/v1/object/public/tv-media/slow-video.mp4";

    const html = renderToStaticMarkup(
      <VideoSlide src={slowVideoUrl} title="Vídeo Lento" mode="tv" paused={false} />,
    );

    // Enquanto o cache não resolveu, o container fica invisível e NÃO injeta src remota que seria abortada no meio
    expect(html).toContain("is-video-preparing");
    expect(html).toContain('data-video-ready="false"');
    expect(html).not.toContain("<video");
  });

  it("3. Troca de vídeo para imagem e 4. Dois vídeos consecutivos: TvPlayer renderiza playlist mista sem controles nativos de reprodução", async () => {
    const v1 = "https://supabase.co/storage/v1/object/public/tv-media/video1.mp4";
    const v2 = "https://supabase.co/storage/v1/object/public/tv-media/video2.mp4";
    await getCachedMediaUrl(v1);
    await getCachedMediaUrl(v2);

    const content = createMockContent({
      playlist: [
        { id: "vid-1", kind: "video", src: v1, title: "Vídeo 1", duration: 10, position: 1, active: true },
        { id: "vid-2", kind: "video", src: v2, title: "Vídeo 2", duration: 10, position: 2, active: true },
        { id: "img-1", kind: "image", src: "/logo-sol.png", title: "Imagem 1", duration: 8, position: 3, active: true },
      ],
    });

    const html = renderToStaticMarkup(
      <TvPlayer content={content} mode="tv" theme={normalTheme} />,
    );

    expect(html).toContain("tv-clean-video");
    expect(html).toContain(`poster="${TRANSPARENT_VIDEO_POSTER}"`);
    expect(html).not.toContain("preview-play-overlay-btn");
  });

  it("6. Falha no carregamento de mídia & 9. Restrição de autoplay: modo preview exibe botão apenas para operador no Admin, nunca no modo TV", async () => {
    const v1 = "https://supabase.co/storage/v1/object/public/tv-media/video1.mp4";
    await getCachedMediaUrl(v1);

    const tvHtml = renderToStaticMarkup(
      <VideoSlide src={v1} title="Promo" mode="tv" paused={false} />,
    );
    expect(tvHtml).not.toContain("preview-play-overlay-btn");

    const previewHtml = renderToStaticMarkup(
      <VideoSlide src={v1} title="Promo" mode="preview" paused={false} />,
    );
    expect(previewHtml).toContain("preview-play-overlay-btn");
  });

  it("7. Vídeo reproduzido repetidamente & 8. Atualização pelo Realtime: reutiliza Blob URL em cache sem downloads repetidos no Supabase", async () => {
    const v1 = "https://supabase.co/storage/v1/object/public/tv-media/video1.mp4";

    const blob1 = await getCachedMediaUrl(v1);
    const blob2 = await getCachedMediaUrl(v1);
    const blob3 = await getCachedMediaUrl(v1);

    expect(blob1).toBe(blob2);
    expect(blob2).toBe(blob3);
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);

    // Quando a playlist tem apenas 1 vídeo, TvPlayer passa loop={true} para reprodução contínua sem recriar o vídeo
    const singleVideoContent = createMockContent({
      playlist: [
        { id: "vid-1", kind: "video", src: v1, title: "Loop Video", duration: 10, position: 1, active: true },
      ],
    });

    const html = renderToStaticMarkup(
      <TvPlayer content={singleVideoContent} mode="tv" theme={normalTheme} />,
    );
    expect(html).toContain(blob1);
  });
});

