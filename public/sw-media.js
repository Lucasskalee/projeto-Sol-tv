/**
 * SKALEE TV & SOL TV — Service Worker Dedicado de Cache de Mídia
 *
 * Escopo: Intercepta EXCLUSIVAMENTE requisições para o bucket tv-media (/storage/v1/object/public/tv-media/*).
 * NÃO intercepta REST, Auth, Realtime, Banco de dados ou APIs do Admin.
 *
 * Recursos:
 * - Cache persistente via Cache Storage API (skalee-tv-media-v1).
 * - Suporte completo a HTTP 206 Range Requests para <video> a partir do arquivo local.
 * - Deduplicação de downloads simultâneos (Player + Preloader).
 * - Telemetria local de hits, misses, downloads e bytes economizados.
 */

const CACHE_NAME = "skalee-tv-media-v1";
const MEDIA_PATH_MARKER = "/storage/v1/object/public/tv-media/";

// Deduplicação de downloads em andamento no Service Worker
const inFlightDownloads = new Map();

// Contadores de telemetria local (global e por URL)
const telemetry = {
  hits: 0,
  misses: 0,
  downloads: 0,
  bytesDownloaded: 0,
  rangeHits: 0,
};

const urlStats = new Map();

function getUrlStat(canonicalUrl) {
  if (!urlStats.has(canonicalUrl)) {
    urlStats.set(canonicalUrl, {
      hits: 0,
      misses: 0,
      downloads: 0,
      bytesDownloaded: 0,
      rangeHits: 0,
    });
  }
  return urlStats.get(canonicalUrl);
}

self.addEventListener("install", (event) => {
  // Ativa imediatamente sem aguardar abas antigas fecharem
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      // Reivindica controle imediato de todas as abas/TVs abertas
      await self.clients.claim();
      // Remove caches legados se houver
      const keys = await caches.keys();
      for (const key of keys) {
        if (key.startsWith("skalee-tv-media-") && key !== CACHE_NAME) {
          await caches.delete(key);
        }
      }
    })(),
  );
});

/**
 * Normaliza URL de mídia removendo parâmetros voláteis transitórios se houver.
 */
function getCanonicalMediaUrl(urlStr) {
  try {
    const url = new URL(urlStr);
    return `${url.origin}${url.pathname}`;
  } catch {
    return urlStr;
  }
}

/**
 * Verifica se a requisição pertence ao escopo de mídia do SOL TV.
 */
function isSolTvMediaRequest(urlStr) {
  return urlStr.includes(MEDIA_PATH_MARKER);
}

/**
 * Obtém a resposta da mídia a partir do Cache Storage ou baixa da rede (com deduplicação atômica síncrona).
 */
function getOrFetchMedia(canonicalUrl) {
  if (inFlightDownloads.has(canonicalUrl)) {
    return inFlightDownloads.get(canonicalUrl).then((res) => res.clone());
  }

  const resolutionPromise = (async () => {
    try {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(canonicalUrl);

      if (cached) {
        telemetry.hits++;
        getUrlStat(canonicalUrl).hits++;
        return cached;
      }

      telemetry.misses++;
      getUrlStat(canonicalUrl).misses++;
      console.log(`[SW MEDIA] DOWNLOAD INICIADO: ${canonicalUrl}`);
      const networkResponse = await fetch(canonicalUrl, {
        mode: "cors",
        credentials: "omit",
      });

      if (!networkResponse.ok) {
        console.warn(`[SW MEDIA] Falha no download de ${canonicalUrl}: HTTP ${networkResponse.status}`);
        return networkResponse;
      }

      // Grava no Cache Storage
      const responseClone = networkResponse.clone();
      await cache.put(canonicalUrl, responseClone);

      const buffer = await networkResponse.clone().arrayBuffer();
      telemetry.downloads++;
      telemetry.bytesDownloaded += buffer.byteLength;
      getUrlStat(canonicalUrl).downloads++;
      getUrlStat(canonicalUrl).bytesDownloaded += buffer.byteLength;
      console.log(`[SW MEDIA] ARMAZENADO NO DISCO: ${canonicalUrl} (${(buffer.byteLength / 1024 / 1024).toFixed(2)} MB)`);

      return networkResponse;
    } catch (err) {
      console.error(`[SW MEDIA] Erro de rede ao baixar ${canonicalUrl}:`, err);
      throw err;
    } finally {
      inFlightDownloads.delete(canonicalUrl);
    }
  })();

  inFlightDownloads.set(canonicalUrl, resolutionPromise);
  return resolutionPromise.then((res) => res.clone());
}

/**
 * Processa requisições com header "Range: bytes=..." servindo HTTP 206 Partial Content a partir do cache local.
 */
async function handleRangeRequest(request, canonicalUrl) {
  const mediaResponse = await getOrFetchMedia(canonicalUrl);
  if (!mediaResponse || !mediaResponse.ok) {
    return fetch(request);
  }

  telemetry.rangeHits++;
  getUrlStat(canonicalUrl).rangeHits++;
  const rangeHeader = request.headers.get("Range");
  const fullBuffer = await mediaResponse.arrayBuffer();
  const totalLength = fullBuffer.byteLength;

  if (!rangeHeader || !rangeHeader.startsWith("bytes=")) {
    // Se não tiver range válido, retorna o arquivo completo com 200 OK
    return new Response(fullBuffer, {
      status: 200,
      statusText: "OK",
      headers: {
        "Content-Type": mediaResponse.headers.get("Content-Type") || "video/mp4",
        "Content-Length": String(totalLength),
        "Accept-Ranges": "bytes",
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Media-Cache": "HIT-LOCAL",
      },
    });
  }

  // Parse do header Range: bytes=START-END ou bytes=START- ou bytes=-SUFFIX
  const parts = rangeHeader.replace(/bytes=/, "").split("-");
  let start = parseInt(parts[0], 10);
  let end = parts[1] ? parseInt(parts[1], 10) : totalLength - 1;

  if (Number.isNaN(start)) {
    // Formato bytes=-SUFFIX
    const suffix = parseInt(parts[1], 10);
    if (Number.isNaN(suffix) || suffix <= 0) {
      return new Response(null, {
        status: 416,
        statusText: "Range Not Satisfiable",
        headers: { "Content-Range": `bytes */${totalLength}` },
      });
    }
    start = Math.max(0, totalLength - suffix);
    end = totalLength - 1;
  }

  // Validação dos limites
  if (start >= totalLength || start < 0 || end < start) {
    return new Response(null, {
      status: 416,
      statusText: "Range Not Satisfiable",
      headers: { "Content-Range": `bytes */${totalLength}` },
    });
  }

  end = Math.min(end, totalLength - 1);
  const chunkSize = end - start + 1;
  const chunkBuffer = fullBuffer.slice(start, end + 1);

  return new Response(chunkBuffer, {
    status: 206,
    statusText: "Partial Content",
    headers: {
      "Content-Type": mediaResponse.headers.get("Content-Type") || "video/mp4",
      "Content-Range": `bytes ${start}-${end}/${totalLength}`,
      "Content-Length": String(chunkSize),
      "Accept-Ranges": "bytes",
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Media-Cache": "HIT-LOCAL-206",
    },
  });
}

/**
 * Processa requisições padrão (sem Range) para imagens e arquivos completos.
 */
async function handleStandardMediaRequest(request, canonicalUrl) {
  const mediaResponse = await getOrFetchMedia(canonicalUrl);
  if (!mediaResponse || !mediaResponse.ok) {
    return fetch(request);
  }

  const headers = new Headers(mediaResponse.headers);
  headers.set("X-Media-Cache", "HIT-LOCAL");
  return new Response(mediaResponse.body, {
    status: mediaResponse.status,
    statusText: mediaResponse.statusText,
    headers,
  });
}

self.addEventListener("fetch", (event) => {
  const url = event.request.url;

  // Intercepta estritamente mídias do bucket tv-media
  if (!isSolTvMediaRequest(url)) {
    return;
  }

  const canonicalUrl = getCanonicalMediaUrl(url);
  const hasRange = event.request.headers.has("Range");

  if (hasRange) {
    event.respondWith(handleRangeRequest(event.request, canonicalUrl));
  } else {
    event.respondWith(handleStandardMediaRequest(event.request, canonicalUrl));
  }
});

// Canal de comunicação com o cliente (mensagens de telemetria e controle)
self.addEventListener("message", async (event) => {
  const data = event.data;
  if (!data || typeof data !== "object") return;

  if (data.type === "GET_TELEMETRY") {
    if (data.url) {
      const canonical = getCanonicalMediaUrl(data.url);
      event.ports[0]?.postMessage({
        type: "TELEMETRY_DATA",
        telemetry: { ...getUrlStat(canonical) },
      });
    } else {
      event.ports[0]?.postMessage({
        type: "TELEMETRY_DATA",
        telemetry: { ...telemetry },
      });
    }
  } else if (data.type === "PRELOAD_URLS" && Array.isArray(data.urls)) {
    const urls = data.urls;
    for (const url of urls) {
      if (isSolTvMediaRequest(url)) {
        const canonical = getCanonicalMediaUrl(url);
        try {
          await getOrFetchMedia(canonical);
        } catch (e) {
          console.warn(`[SW MEDIA] Preload falhou para ${canonical}:`, e);
        }
      }
    }
    event.ports[0]?.postMessage({ type: "PRELOAD_COMPLETE" });
  } else if (data.type === "CLEAR_MEDIA_CACHE") {
    await caches.delete(CACHE_NAME);
    telemetry.hits = 0;
    telemetry.misses = 0;
    telemetry.downloads = 0;
    telemetry.bytesDownloaded = 0;
    telemetry.rangeHits = 0;
    urlStats.clear();
    event.ports[0]?.postMessage({ type: "CACHE_CLEARED" });
  }
});

