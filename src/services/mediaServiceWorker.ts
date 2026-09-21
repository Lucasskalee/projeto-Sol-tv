/**
 * SKALEE TV & SOL TV — Ponte Cliente do Service Worker de Mídia
 *
 * Responsabilidades:
 * - Registro e ativação do Service Worker dedicado (/sw-media.js).
 * - Monitoramento de status (service-worker vs fallback).
 * - Telemetria local de hits, misses, downloads e bytes economizados.
 * - Interface para pré-carregamento controlado e limpeza de cache de testes.
 */

export interface MediaTelemetry {
  hits: number;
  misses: number;
  downloads: number;
  bytesDownloaded: number;
  rangeHits: number;
}

// Telemetria local em memória para fallback ou ambiente de teste
const localTelemetry: MediaTelemetry = {
  hits: 0,
  misses: 0,
  downloads: 0,
  bytesDownloaded: 0,
  rangeHits: 0,
};

let registrationPromise: Promise<ServiceWorkerRegistration | null> | null = null;

/**
 * Registra o Service Worker dedicado de mídia no navegador.
 */
export async function registerMediaServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    console.info("[Media Cache Engine] Service Worker não suportado neste ambiente (usando fallback).");
    return null;
  }

  if (registrationPromise) {
    return registrationPromise;
  }

  registrationPromise = (async () => {
    try {
      const reg = await navigator.serviceWorker.register("/sw-media.js", {
        scope: "/",
        updateViaCache: "none",
      });

      console.log(`%c[Media Cache Engine] Service Worker ativo (Escopo: ${reg.scope})`, "color: #10b981; font-weight: bold;");

      // Força atualização se houver nova versão
      void reg.update();

      return reg;
    } catch (err) {
      console.warn("[Media Cache Engine] Falha ao registrar Service Worker (usando fallback local):", err);
      return null;
    }
  })();

  return registrationPromise;
}

/**
 * Retorna o status atual do mecanismo de cache de mídia.
 */
export function getMediaCacheEngineStatus(): "service-worker" | "fallback" {
  if (typeof window !== "undefined" && "serviceWorker" in navigator && navigator.serviceWorker.controller) {
    return "service-worker";
  }
  return "fallback";
}

/**
 * Obtém a telemetria atual de cache e downloads.
 */
export async function getMediaTelemetry(): Promise<MediaTelemetry> {
  if (typeof window !== "undefined" && navigator.serviceWorker?.controller) {
    return new Promise((resolve) => {
      const channel = new MessageChannel();
      channel.port1.onmessage = (event) => {
        if (event.data?.telemetry) {
          resolve(event.data.telemetry);
        } else {
          resolve({ ...localTelemetry });
        }
      };

      navigator.serviceWorker.controller?.postMessage(
        { type: "GET_TELEMETRY" },
        [channel.port2],
      );

      // Timeout de segurança para não travar
      setTimeout(() => resolve({ ...localTelemetry }), 1000);
    });
  }

  return { ...localTelemetry };
}

/**
 * Notifica o Service Worker para pré-carregar URLs específicas com concorrência limitada.
 */
export async function preloadViaServiceWorker(urls: string[]): Promise<void> {
  if (typeof window !== "undefined" && navigator.serviceWorker?.controller) {
    return new Promise((resolve) => {
      const channel = new MessageChannel();
      channel.port1.onmessage = () => resolve();

      navigator.serviceWorker.controller?.postMessage(
        { type: "PRELOAD_URLS", urls },
        [channel.port2],
      );

      setTimeout(resolve, 5000);
    });
  }
}

/**
 * Limpa o cache persistente de mídia (usado em testes ou redefinições).
 */
export async function clearPersistentMediaCache(): Promise<void> {
  if (typeof window !== "undefined" && "caches" in window) {
    await window.caches.delete("skalee-tv-media-v1");
  }

  if (typeof window !== "undefined" && navigator.serviceWorker?.controller) {
    const channel = new MessageChannel();
    navigator.serviceWorker.controller.postMessage({ type: "CLEAR_MEDIA_CACHE" }, [channel.port2]);
  }

  localTelemetry.hits = 0;
  localTelemetry.misses = 0;
  localTelemetry.downloads = 0;
  localTelemetry.bytesDownloaded = 0;
  localTelemetry.rangeHits = 0;
}

/**
 * Incrementa telemetria local quando o Service Worker não estiver no controle direto.
 */
export function recordLocalTelemetry(type: keyof MediaTelemetry, value = 1) {
  localTelemetry[type] += value;
}

