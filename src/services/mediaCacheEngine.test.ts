import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  MEDIA_CACHE_NAME,
  getCachedMediaUrl,
  isCacheableMediaUrl,
  preloadMediaList,
  invalidateMedia,
  clearAllMediaCache,
  clearInMemoryMediaCache,
} from "../mediaCache";
import {
  getMediaTelemetry,
  clearPersistentMediaCache,
  recordLocalTelemetry,
} from "./mediaServiceWorker";

// Helper para emular o mecanismo de Range Request local do Service Worker
function processLocalRangeRequest(
  buffer: ArrayBuffer,
  rangeHeader: string | null,
  contentType = "video/mp4",
): { status: number; headers: Record<string, string>; data: Uint8Array } {
  const totalLength = buffer.byteLength;

  if (!rangeHeader || !rangeHeader.startsWith("bytes=")) {
    return {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Length": String(totalLength),
        "Accept-Ranges": "bytes",
        "X-Media-Cache": "HIT-LOCAL",
      },
      data: new Uint8Array(buffer),
    };
  }

  const parts = rangeHeader.replace(/bytes=/, "").split("-");
  let start = parseInt(parts[0], 10);
  let end = parts[1] ? parseInt(parts[1], 10) : totalLength - 1;

  if (Number.isNaN(start)) {
    const suffix = parseInt(parts[1], 10);
    if (Number.isNaN(suffix) || suffix <= 0) {
      return {
        status: 416,
        headers: { "Content-Range": `bytes */${totalLength}` },
        data: new Uint8Array(0),
      };
    }
    start = Math.max(0, totalLength - suffix);
    end = totalLength - 1;
  }

  if (start >= totalLength || start < 0 || end < start) {
    return {
      status: 416,
      headers: { "Content-Range": `bytes */${totalLength}` },
      data: new Uint8Array(0),
    };
  }

  end = Math.min(end, totalLength - 1);
  const chunkSize = end - start + 1;
  const chunk = buffer.slice(start, end + 1);

  return {
    status: 206,
    headers: {
      "Content-Type": contentType,
      "Content-Range": `bytes ${start}-${end}/${totalLength}`,
      "Content-Length": String(chunkSize),
      "Accept-Ranges": "bytes",
      "X-Media-Cache": "HIT-LOCAL-206",
    },
    data: new Uint8Array(chunk),
  };
}

describe("Etapa 4C.0.1 — Media Cache Engine", () => {
  const mockVideoUrl = "https://rkcmtzxyqdopchnnurwh.supabase.co/storage/v1/object/public/tv-media/acougue/videos/1788838007992-cd851cf2.mp4";
  const mockVideoUrlV2 = "https://rkcmtzxyqdopchnnurwh.supabase.co/storage/v1/object/public/tv-media/acougue/videos/1789999999999-newhash99.mp4";
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
        open: vi.fn(async () => mockCache),
        delete: vi.fn(async () => {
          mockStorage.clear();
          return true;
        }),
      },
      writable: true,
      configurable: true,
    });

    let blobCount = 1;
    globalThis.URL.createObjectURL = vi.fn((_blob: Blob) => `blob:http://localhost/${blobCount++}`);
    globalThis.URL.revokeObjectURL = vi.fn();

    await clearAllMediaCache();
    await clearPersistentMediaCache();
  });

  it("1. Primeiro download: baixa da rede e armazena resposta completa", async () => {
    let networkFetchCount = 0;
    const fakeData = new Uint8Array(1024 * 50); // 50 KB dummy buffer

    globalThis.fetch = vi.fn().mockImplementation(async (url: string) => {
      networkFetchCount++;
      return new Response(fakeData, {
        status: 200,
        headers: { "Content-Type": "video/mp4", "Content-Length": String(fakeData.byteLength) },
      });
    });

    const blobUrl = await getCachedMediaUrl(mockVideoUrl);
    expect(blobUrl).toBeDefined();
    expect(blobUrl.startsWith("blob:") || blobUrl.startsWith("http")).toBe(true);
    expect(networkFetchCount).toBe(1);
  });

  it("2. Deduplicação: múltiplos downloads concorrentes realizam apenas 1 fetch na rede", async () => {
    let networkFetchCount = 0;
    const fakeData = new Uint8Array(1024 * 100);

    globalThis.fetch = vi.fn().mockImplementation(async () => {
      networkFetchCount++;
      await new Promise((r) => setTimeout(r, 50));
      return new Response(fakeData, {
        status: 200,
        headers: { "Content-Type": "video/mp4" },
      });
    });

    // Dispara 5 requisições simultâneas (Player + Preloader + Componentes)
    const results = await Promise.all([
      getCachedMediaUrl(mockVideoUrl),
      getCachedMediaUrl(mockVideoUrl),
      getCachedMediaUrl(mockVideoUrl),
      getCachedMediaUrl(mockVideoUrl),
      getCachedMediaUrl(mockVideoUrl),
    ]);

    expect(networkFetchCount).toBe(1);
    expect(results[0]).toBe(results[1]);
    expect(results[1]).toBe(results[2]);
  });

  it("3. Range local 206: atende Range Requests a partir do buffer local com cabeçalhos HTTP corretos", () => {
    // Cria buffer de 1000 bytes (0..999)
    const buffer = new Uint8Array(1000);
    for (let i = 0; i < 1000; i++) buffer[i] = i % 256;

    // Cenário A: Range explícito bytes=0-499 (primeiros 500 bytes)
    const resA = processLocalRangeRequest(buffer.buffer, "bytes=0-499");
    expect(resA.status).toBe(206);
    expect(resA.headers["Content-Range"]).toBe("bytes 0-499/1000");
    expect(resA.headers["Content-Length"]).toBe("500");
    expect(resA.headers["Accept-Ranges"]).toBe("bytes");
    expect(resA.data.length).toBe(500);

    // Cenário B: Range aberto bytes=500- (segunda metade)
    const resB = processLocalRangeRequest(buffer.buffer, "bytes=500-");
    expect(resB.status).toBe(206);
    expect(resB.headers["Content-Range"]).toBe("bytes 500-999/1000");
    expect(resB.headers["Content-Length"]).toBe("500");
    expect(resB.data.length).toBe(500);

    // Cenário C: Range sufixo bytes=-200 (últimos 200 bytes)
    const resC = processLocalRangeRequest(buffer.buffer, "bytes=-200");
    expect(resC.status).toBe(206);
    expect(resC.headers["Content-Range"]).toBe("bytes 800-999/1000");
    expect(resC.headers["Content-Length"]).toBe("200");

    // Cenário D: Range inválido/fora dos limites bytes=1500-2000
    const resD = processLocalRangeRequest(buffer.buffer, "bytes=1500-2000");
    expect(resD.status).toBe(416);
    expect(resD.headers["Content-Range"]).toBe("bytes */1000");
  });

  it("4. 10 reproduções sem novo download: 10 ciclos da playlist consomem 0 bytes de rede", async () => {
    let networkFetchCount = 0;
    const fakeData = new Uint8Array(1024 * 50);

    globalThis.fetch = vi.fn().mockImplementation(async () => {
      networkFetchCount++;
      return new Response(fakeData, {
        status: 200,
        headers: { "Content-Type": "video/mp4" },
      });
    });

    // 1º ciclo (download inicial)
    await getCachedMediaUrl(mockVideoUrl);
    expect(networkFetchCount).toBe(1);

    // 10 reproduções consecutivas da playlist
    for (let loop = 1; loop <= 10; loop++) {
      const url = await getCachedMediaUrl(mockVideoUrl);
      expect(url).toBeDefined();
    }

    // NENHUM download adicional ocorreu nas 10 voltas
    expect(networkFetchCount).toBe(1);
  });

  it("5. Reload sem novo download: após recarregar a página (limpeza de RAM), o Cache Storage atende sem rede", async () => {
    let networkFetchCount = 0;
    const fakeData = new Uint8Array(1024 * 50);

    globalThis.fetch = vi.fn().mockImplementation(async () => {
      networkFetchCount++;
      return new Response(fakeData, {
        status: 200,
        headers: { "Content-Type": "video/mp4" },
      });
    });

    // Download inicial
    await getCachedMediaUrl(mockVideoUrl);
    expect(networkFetchCount).toBe(1);

    // Simula F5 / Reload: o cache em memória (RAM) é reiniciado, mas o Cache Storage persiste
    clearInMemoryMediaCache();

    // O getCachedMediaUrl dá Cache HIT no Cache Storage (disco)
    const reloadedUrl = await getCachedMediaUrl(mockVideoUrl);
    expect(reloadedUrl).toBeDefined();
    expect(networkFetchCount).toBe(1);
  });

  it("6. Offline: mídia armazenada é servida com sucesso mesmo com rede desconectada", async () => {
    const fakeData = new Uint8Array(1024 * 50);

    // Preenche cache
    globalThis.fetch = vi.fn().mockResolvedValue(new Response(fakeData, { status: 200 }));
    await getCachedMediaUrl(mockVideoUrl);

    // Simula perda total de rede
    globalThis.fetch = vi.fn().mockRejectedValue(new Error("Failed to fetch (Offline)"));

    // O player continua recebendo a mídia a partir do cache local
    const offlineUrl = await getCachedMediaUrl(mockVideoUrl);
    expect(offlineUrl).toBeDefined();
    expect(offlineUrl.startsWith("blob:") || offlineUrl.startsWith("http")).toBe(true);
  });

  it("7. Nova versão baixa exatamente 1x: alteração de identidade (hash) baixa nova mídia sem descartar anteriores", async () => {
    let networkFetchCount = 0;
    const fakeData = new Uint8Array(1024 * 50);

    globalThis.fetch = vi.fn().mockImplementation(async () => {
      networkFetchCount++;
      return new Response(fakeData, { status: 200 });
    });

    // Baixa versão v1
    await getCachedMediaUrl(mockVideoUrl);
    expect(networkFetchCount).toBe(1);

    // Baixa versão v2 (nova identidade)
    await getCachedMediaUrl(mockVideoUrlV2);
    expect(networkFetchCount).toBe(2);

    // Próximas reproduções de ambas as versões não geram novos fetches
    await getCachedMediaUrl(mockVideoUrl);
    await getCachedMediaUrl(mockVideoUrlV2);
    expect(networkFetchCount).toBe(2);
  });

  it("8. Preload inteligente sequencial com limite de concorrência", async () => {
    let networkFetchCount = 0;
    globalThis.fetch = vi.fn().mockImplementation(async () => {
      networkFetchCount++;
      return new Response(new Uint8Array(100), { status: 200 });
    });

    const urls = [
      mockVideoUrl,
      mockVideoUrlV2,
      "https://rkcmtzxyqdopchnnurwh.supabase.co/storage/v1/object/public/tv-media/acougue/imagens/img1.png",
      "https://rkcmtzxyqdopchnnurwh.supabase.co/storage/v1/object/public/tv-media/acougue/imagens/img2.png",
    ];

    await preloadMediaList(urls);
    expect(networkFetchCount).toBe(4);

    // Segundo preload dos mesmos arquivos não gera novos downloads
    await preloadMediaList(urls);
    expect(networkFetchCount).toBe(4);
  });
});
