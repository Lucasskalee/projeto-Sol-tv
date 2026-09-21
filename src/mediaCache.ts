/**
 * SOL TV & SKALEE TV — Camada Centralizada de Cache Persistente de Mídia
 *
 * Objetivo:
 * Eliminar consumo desnecessário de Cached Egress no Supabase Storage.
 * Mídias (vídeos e imagens) são baixadas uma única vez e armazenadas na Cache Storage API
 * do navegador, gerando Blob URLs estáveis para renderização em <img> e <video>.
 *
 * Durante o loop 24/7 da TV, 0 bytes de rede são requisitados para mídias já cacheadas.
 */

import { useEffect, useState } from "react";
import { recordLocalTelemetry } from "./services/mediaServiceWorker";

export const MEDIA_CACHE_NAME = "skalee-tv-media-v1";

// Cache em memória de Blob URLs ativas (urlOriginal -> blobUrl)
const inMemoryBlobUrls = new Map<string, string>();
const inMemoryBlobs = new Map<string, Blob>();
const pendingDownloads = new Map<string, Promise<string>>();

/**
 * Verifica se o ambiente do navegador suporta a Cache Storage API e URL.createObjectURL.
 */
export function isCacheStorageSupported(): boolean {
  return (
    typeof globalThis !== "undefined" &&
    "caches" in globalThis &&
    typeof globalThis.caches !== "undefined" &&
    typeof URL !== "undefined" &&
    typeof URL.createObjectURL === "function"
  );
}

/**
 * Normaliza e valida se a URL é candidata a cache (ignora URLs locais, data URLs e blobs).
 */
export function isCacheableMediaUrl(url: string | null | undefined): url is string {
  if (!url || typeof url !== "string") return false;
  const trimmed = url.trim();
  if (trimmed.length === 0) return false;
  if (trimmed.startsWith("blob:") || trimmed.startsWith("data:")) return false;
  // Permite URLs absolutas HTTP/HTTPS (Supabase Storage, Unsplash, CDNs externos)
  return trimmed.startsWith("http://") || trimmed.startsWith("https://");
}

// Cache de URLs externas que não suportam CORS (para evitar repetição de fetchs bloqueados)
const nonCorsUrls = new Set<string>();

/**
 * Retorna uma Blob URL estável a partir da Cache Storage API ou faz o download único se ausente.
 * Se houver qualquer falha ou ambiente não suportar, retorna a URL original como fallback transparente.
 */
export async function getCachedMediaUrl(originalUrl: string): Promise<string> {
  if (!isCacheableMediaUrl(originalUrl)) {
    return originalUrl;
  }

  const cleanUrl = originalUrl.trim();

  // 1. HIT IMEDIATO EM MEMÓRIA (0ms latency, zero re-renders)
  if (inMemoryBlobUrls.has(cleanUrl)) {
    console.debug(`[MEDIA CACHE] HIT (RAM): ${cleanUrl}`);
    return inMemoryBlobUrls.get(cleanUrl)!;
  }

  // Se já sabemos que o domínio externo não suporta CORS, retorna a URL original diretamente
  if (nonCorsUrls.has(cleanUrl)) {
    return cleanUrl;
  }

  // 2. DEDUPLICAÇÃO DE DOWNLOADS CONCORRENTES
  if (pendingDownloads.has(cleanUrl)) {
    console.debug(`[MEDIA CACHE] DEDUPLICATED: Aguardando download em andamento de ${cleanUrl}`);
    return pendingDownloads.get(cleanUrl)!;
  }

  // Se a Cache Storage API não for suportada (ex: webview muito antigo), fallback gracioso
  if (!isCacheStorageSupported()) {
    console.warn(`[MEDIA CACHE] Cache Storage API indisponível no navegador. Usando URL original.`);
    return cleanUrl;
  }

  // 3. PROCESSO DE RESOLUÇÃO (Cache Storage -> Network Download)
  const downloadPromise = (async (): Promise<string> => {
    try {
      const cache = await globalThis.caches.open(MEDIA_CACHE_NAME);
      const cachedResponse = await cache.match(cleanUrl);

      // 3.1 HIT NO DISCO (Cache Storage)
      if (cachedResponse) {
        const blob = await cachedResponse.blob();
        const blobUrl = URL.createObjectURL(blob);
        inMemoryBlobUrls.set(cleanUrl, blobUrl);
        inMemoryBlobs.set(cleanUrl, blob);
        const sizeMb = (blob.size / (1024 * 1024)).toFixed(2);
        console.log(`%c[MEDIA CACHE] HIT (Disk): ${cleanUrl} (${sizeMb} MB)`, "color: #10b981; font-weight: bold;");
        return blobUrl;
      }

      // 3.2 MISS NO CACHE -> DOWNLOAD ÚNICO
      console.log(`%c[MEDIA CACHE] MISS: ${cleanUrl} — Baixando arquivo...`, "color: #f59e0b; font-weight: bold;");
      console.log(`%c[MEDIA CACHE] DOWNLOAD: Iniciando fetch de ${cleanUrl}`, "color: #3b82f6;");

      const response = await fetch(cleanUrl, {
        mode: "cors",
        credentials: "omit",
      });

      if (!response.ok) {
        console.warn(`[MEDIA CACHE] Falha no download de ${cleanUrl} (Status HTTP ${response.status}). Usando fallback.`);
        return cleanUrl;
      }

      // Salva uma cópia na Cache Storage API
      const responseClone = response.clone();
      await cache.put(cleanUrl, responseClone);

      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      inMemoryBlobUrls.set(cleanUrl, blobUrl);
      inMemoryBlobs.set(cleanUrl, blob);

      const sizeMb = (blob.size / (1024 * 1024)).toFixed(2);
      console.log(`%c[MEDIA CACHE] DOWNLOADED & STORED: ${cleanUrl} (${sizeMb} MB)`, "color: #10b981; font-weight: bold;");

      return blobUrl;
    } catch (err) {
      // Se for bloqueio de CORS ou erro de rede em URL externa, marca para usar fallback nativo
      nonCorsUrls.add(cleanUrl);
      console.warn(`[MEDIA CACHE] Fallback nativo para URL externa sem CORS: ${cleanUrl}`);
      return cleanUrl;
    } finally {
      pendingDownloads.delete(cleanUrl);
    }
  })();

  pendingDownloads.set(cleanUrl, downloadPromise);
  return downloadPromise;
}

/**
 * Retorna a Blob URL síncrona se já estiver pronta em memória, ou a URL original.
 */
export function getImmediateMediaUrl(originalUrl?: string): string | undefined {
  if (!originalUrl) return undefined;
  if (!isCacheableMediaUrl(originalUrl)) return originalUrl;
  return inMemoryBlobUrls.get(originalUrl.trim()) || originalUrl;
}

/**
 * Hook React para obter a URL da mídia com cache persistente.
 * Retorna de imediato se já estiver em cache na RAM, ou atualiza o estado quando resolver.
 */
export function useCachedMedia(src?: string): {
  url: string | undefined;
  isReady: boolean;
  isCached: boolean;
} {
  const [cachedUrl, setCachedUrl] = useState<string | undefined>(() => {
    if (!src) return undefined;
    if (!isCacheableMediaUrl(src)) return src;
    return inMemoryBlobUrls.get(src.trim()) || src;
  });

  const [isCached, setIsCached] = useState<boolean>(() => {
    if (!src || !isCacheableMediaUrl(src)) return false;
    return inMemoryBlobUrls.has(src.trim());
  });

  const [isReady, setIsReady] = useState<boolean>(() => {
    if (!src) return true;
    if (!isCacheableMediaUrl(src)) return true;
    return inMemoryBlobUrls.has(src.trim());
  });

  useEffect(() => {
    if (!src) {
      setCachedUrl(undefined);
      setIsReady(true);
      setIsCached(false);
      return;
    }

    if (!isCacheableMediaUrl(src)) {
      setCachedUrl(src);
      setIsReady(true);
      setIsCached(false);
      return;
    }

    const clean = src.trim();

    // Já está na RAM
    if (inMemoryBlobUrls.has(clean)) {
      setCachedUrl(inMemoryBlobUrls.get(clean));
      setIsReady(true);
      setIsCached(true);
      return;
    }

    let isMounted = true;

    void getCachedMediaUrl(clean).then((resolvedUrl) => {
      if (isMounted) {
        setCachedUrl(resolvedUrl);
        setIsReady(true);
        setIsCached(resolvedUrl.startsWith("blob:"));
      }
    });

    return () => {
      isMounted = false;
    };
  }, [src]);

  return { url: cachedUrl || src, isReady, isCached };
}

/**
 * Precarrega uma lista de URLs de mídia em segundo plano (com limite de concorrência).
 */
export async function preloadMediaList(urls: (string | undefined | null)[]): Promise<void> {
  const validUrls = Array.from(
    new Set(
      urls
        .filter((u): u is string => isCacheableMediaUrl(u))
        .map((u) => u.trim()),
    ),
  );

  if (validUrls.length === 0) return;

  console.log(`[MEDIA CACHE] Preload iniciado para ${validUrls.length} mídias.`);

  // Baixa 1 arquivo por vez de forma previsível e sequencial para Smart TVs
  const concurrency = 1;
  for (let i = 0; i < validUrls.length; i += concurrency) {
    const chunk = validUrls.slice(i, i + concurrency);
    await Promise.allSettled(chunk.map((url) => getCachedMediaUrl(url)));
  }

  console.log(`[MEDIA CACHE] Preload concluído.`);
}

/**
 * Invalida uma mídia específica do cache (quando for alterada ou excluída).
 */
export async function invalidateMedia(originalUrl: string): Promise<void> {
  if (!isCacheableMediaUrl(originalUrl)) return;
  const clean = originalUrl.trim();

  // Revoga Blob URL em memória
  if (inMemoryBlobUrls.has(clean)) {
    try {
      URL.revokeObjectURL(inMemoryBlobUrls.get(clean)!);
    } catch {}
    inMemoryBlobUrls.delete(clean);
    inMemoryBlobs.delete(clean);
  }

  if (isCacheStorageSupported()) {
    try {
      const cache = await globalThis.caches.open(MEDIA_CACHE_NAME);
      await cache.delete(clean);
      console.log(`%c[MEDIA CACHE] INVALIDATED: ${clean}`, "color: #ef4444; font-weight: bold;");
    } catch (err) {
      console.warn(`[MEDIA CACHE] Erro ao invalidar ${clean}:`, err);
    }
  }
}

/**
 * Limpeza segura de arquivos órfãos (arquivos no Cache Storage que não estão mais na playlist ativa).
 * Preserva as mídias atualmente em exibição e remove apenas as antigas descartadas.
 */
export async function pruneMediaCache(activeUrls: (string | undefined | null)[]): Promise<number> {
  if (!isCacheStorageSupported()) return 0;

  try {
    const activeSet = new Set(
      activeUrls
        .filter((u): u is string => isCacheableMediaUrl(u))
        .map((u) => u.trim()),
    );

    const cache = await globalThis.caches.open(MEDIA_CACHE_NAME);
    const requests = await cache.keys();
    let removedCount = 0;

    for (const req of requests) {
      const reqUrl = req.url;
      // Se não estiver no conjunto de mídias ativas, remove
      if (!activeSet.has(reqUrl)) {
        await cache.delete(req);
        if (inMemoryBlobUrls.has(reqUrl)) {
          try {
            URL.revokeObjectURL(inMemoryBlobUrls.get(reqUrl)!);
          } catch {}
          inMemoryBlobUrls.delete(reqUrl);
          inMemoryBlobs.delete(reqUrl);
        }
        removedCount++;
      }
    }

    if (removedCount > 0) {
      console.log(`%c[MEDIA CACHE] CLEANUP: ${removedCount} itens órfãos removidos do cache.`, "color: #8b5cf6;");
    }

    return removedCount;
  } catch (err) {
    console.warn("[MEDIA CACHE] Erro durante pruneMediaCache:", err);
    return 0;
  }
}

/**
 * Limpa o cache em memória (RAM) sem apagar o Cache Storage no disco.
 */
export function clearInMemoryMediaCache(): void {
  for (const [, blobUrl] of inMemoryBlobUrls) {
    try {
      URL.revokeObjectURL(blobUrl);
    } catch {}
  }
  inMemoryBlobUrls.clear();
  inMemoryBlobs.clear();
  pendingDownloads.clear();
  nonCorsUrls.clear();
}

/**
 * Limpa todo o cache de mídia (útil para testes ou reinicialização manual).
 */
export async function clearAllMediaCache(): Promise<void> {
  clearInMemoryMediaCache();

  if (isCacheStorageSupported()) {
    try {
      await globalThis.caches.delete(MEDIA_CACHE_NAME);
      console.log(`[MEDIA CACHE] Cache completo apagado.`);
    } catch {}
  }
}

/**
 * Obtém estatísticas do cache de mídia.
 */
export async function getMediaCacheStats(): Promise<{
  totalItems: number;
  inMemoryItems: number;
  urls: string[];
}> {
  let totalItems = 0;
  let urls: string[] = [];

  if (isCacheStorageSupported()) {
    try {
      const cache = await globalThis.caches.open(MEDIA_CACHE_NAME);
      const requests = await cache.keys();
      totalItems = requests.length;
      urls = requests.map((r) => r.url);
    } catch {}
  }

  return {
    totalItems,
    inMemoryItems: inMemoryBlobUrls.size,
    urls,
  };
}

