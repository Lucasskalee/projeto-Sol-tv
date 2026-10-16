import { useEffect, useRef, useState } from "react";
import { useCachedMedia } from "../mediaCache";

// 1x1 transparent GIF data URI to prevent Smart TV WebViews from rendering their default gray Play icon poster
export const TRANSPARENT_VIDEO_POSTER =
  "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";

const VIDEO_READY_TIMEOUT_MS = 12000;

export type VideoFailureReason = "autoplay-blocked" | "network-or-decode-error" | "timeout";

export function VideoSlide({
  src,
  title,
  paused = false,
  mode = "tv",
  loop = false,
  onReady,
  onEnded,
  onError,
}: {
  src: string;
  title?: string;
  paused?: boolean;
  mode?: "tv" | "preview";
  loop?: boolean;
  onReady?: () => void;
  onEnded?: () => void;
  onError?: (reason?: VideoFailureReason) => void;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const [failed, setFailed] = useState(false);
  const [failureReason, setFailureReason] = useState<VideoFailureReason | null>(null);
  const [isVideoReady, setIsVideoReady] = useState(false);
  const [previewManualPlay, setPreviewManualPlay] = useState(false);
  const readySignaledRef = useRef(false);
  const errorSignaledRef = useRef(false);

  const { url: cachedSrc, isReady: isCacheResolved } = useCachedMedia(src);
  // Wait for cache resolution on cacheable URLs to prevent changing <video src> mid-load (which causes AbortError and native play icon flash)
  const effectiveSrc = isCacheResolved ? cachedSrc || src : "";

  // Em modo preview no Admin, não auto-reproduz continuamente a menos que o operador clique
  const isEffectivelyPaused = paused || (mode === "preview" && !previewManualPlay);

  const markVideoReady = () => {
    if (readySignaledRef.current) return;
    readySignaledRef.current = true;
    setIsVideoReady(true);
    onReady?.();
  };

  const triggerFailure = (reason: VideoFailureReason, detail?: unknown) => {
    if (errorSignaledRef.current) return;
    errorSignaledRef.current = true;
    console.error(`[SKALEE TV VideoSlide] Falha no vídeo (${reason}):`, effectiveSrc || src, detail || "");
    setFailureReason(reason);
    setFailed(true);
    onError?.(reason);
  };

  useEffect(() => {
    setFailed(false);
    setFailureReason(null);
    setIsVideoReady(false);
    readySignaledRef.current = false;
    errorSignaledRef.current = false;
  }, [effectiveSrc]);

  // Sincroniza propriedades imperativas no elemento DOM para WebViews de Smart TV (Tizen / WebOS / Android TV)
  useEffect(() => {
    const video = ref.current;
    if (!video || !effectiveSrc) return;

    video.muted = true;
    video.defaultMuted = true;
    video.playsInline = true;
    video.controls = false;
    video.setAttribute("muted", "");
    video.setAttribute("playsinline", "");
    video.setAttribute("webkit-playsinline", "");
    video.setAttribute("x5-playsinline", "");
    video.setAttribute("disablePictureInPicture", "");
    video.setAttribute("disableremoteplayback", "");
    video.removeAttribute("controls");
  }, [effectiveSrc]);

  // Controle de reprodução, prontidão do primeiro quadro e timeout de segurança
  useEffect(() => {
    const video = ref.current;
    if (!video || !effectiveSrc || failed) return;

    let isCancelled = false;
    let readyTimeoutId: number | null = null;

    const checkAndConfirmReady = () => {
      if (isCancelled) return;
      // Confirma que há quadro decodificado disponível (HAVE_CURRENT_DATA = 2)
      if (video.readyState >= 2 && (!video.paused || isEffectivelyPaused)) {
        markVideoReady();
      }
    };

    const handleLoadedData = () => {
      if (isCancelled) return;
      if (isEffectivelyPaused) {
        markVideoReady();
      } else if (!video.paused) {
        markVideoReady();
      }
    };

    const handleCanPlay = () => {
      if (isCancelled) return;
      if (isEffectivelyPaused) {
        markVideoReady();
      } else if (video.paused) {
        const playPromise = video.play();
        if (playPromise && typeof playPromise.then === "function") {
          playPromise
            .then(() => {
              if (!isCancelled && video.readyState >= 2) {
                markVideoReady();
              }
            })
            .catch((err: unknown) => {
              if (isCancelled) return;
              const errName = err instanceof Error ? err.name : String(err);
              if (errName === "AbortError") return;
              if (errName === "NotAllowedError") {
                triggerFailure("autoplay-blocked", err);
              } else {
                triggerFailure("network-or-decode-error", err);
              }
            });
        }
      } else {
        markVideoReady();
      }
    };

    const handlePlaying = () => {
      if (isCancelled) return;
      if (video.readyState >= 2) {
        markVideoReady();
      }
    };

    const handleTimeUpdate = () => {
      if (isCancelled) return;
      if (video.currentTime > 0 || video.readyState >= 2) {
        markVideoReady();
      }
    };

    video.addEventListener("loadeddata", handleLoadedData);
    video.addEventListener("canplay", handleCanPlay);
    video.addEventListener("playing", handlePlaying);
    video.addEventListener("timeupdate", handleTimeUpdate);

    if (isEffectivelyPaused) {
      video.pause();
      if (video.readyState >= 2) {
        markVideoReady();
      }
    } else {
      // Timeout de segurança para conexões muito lentas ou decoder travado
      readyTimeoutId = window.setTimeout(() => {
        if (!isCancelled && !readySignaledRef.current) {
          triggerFailure("timeout", "Tempo limite excedido aguardando o primeiro quadro do vídeo");
        }
      }, VIDEO_READY_TIMEOUT_MS);

      const playPromise = video.play();
      if (playPromise && typeof playPromise.then === "function") {
        playPromise
          .then(() => {
            if (!isCancelled) {
              checkAndConfirmReady();
            }
          })
          .catch((err: unknown) => {
            if (isCancelled) return;
            const errName = err instanceof Error ? err.name : String(err);
            // AbortError pode ocorrer se o navegador ainda estiver carregando os dados; canplay tratará em seguida
            if (errName === "AbortError") return;
            if (errName === "NotAllowedError") {
              triggerFailure("autoplay-blocked", err);
            } else if (video.error) {
              triggerFailure("network-or-decode-error", err);
            }
          });
      }
    }

    return () => {
      isCancelled = true;
      if (readyTimeoutId !== null) {
        window.clearTimeout(readyTimeoutId);
      }
      video.removeEventListener("loadeddata", handleLoadedData);
      video.removeEventListener("canplay", handleCanPlay);
      video.removeEventListener("playing", handlePlaying);
      video.removeEventListener("timeupdate", handleTimeUpdate);
      video.pause();
    };
  }, [isEffectivelyPaused, effectiveSrc, failed]);

  function handleError() {
    triggerFailure("network-or-decode-error", ref.current?.error);
  }

  function handleEnded() {
    if (loop && ref.current) {
      ref.current.currentTime = 0;
      void ref.current.play().catch((err: unknown) => {
        triggerFailure("autoplay-blocked", err);
      });
      return;
    }
    if (onEnded) onEnded();
  }

  if (failed) {
    return (
      <div className="media-slide media-fallback" data-failure-reason={failureReason || "error"}>
        <span>☼</span>
        <small>
          {failureReason === "autoplay-blocked"
            ? `${title || "Vídeo"} (Reprodução automática bloqueada pelo navegador)`
            : title || "Vídeo indisponível"}
        </small>
      </div>
    );
  }

  const showVideoElement = isVideoReady || (mode === "preview" && isEffectivelyPaused);

  return (
    <div
      className={`media-slide video-slide ${showVideoElement ? "is-video-ready" : "is-video-preparing"}`}
      data-video-ready={showVideoElement ? "true" : "false"}
    >
      {effectiveSrc && (
        <video
          ref={ref}
          src={effectiveSrc}
          poster={TRANSPARENT_VIDEO_POSTER}
          autoPlay={!isEffectivelyPaused}
          muted
          playsInline
          controls={false}
          disablePictureInPicture
          disableRemotePlayback
          preload={mode === "preview" ? "metadata" : "auto"}
          onEnded={handleEnded}
          onError={handleError}
          className={`full-media-video tv-clean-video ${showVideoElement ? "video-frame-ready" : "video-frame-preparing"}`}
          style={{
            opacity: showVideoElement ? 1 : 0,
            pointerEvents: "none",
          }}
        />
      )}
      {mode === "preview" && isEffectivelyPaused && (
        <button
          type="button"
          className="preview-play-overlay-btn"
          onClick={() => setPreviewManualPlay(true)}
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            background: "rgba(0, 0, 0, 0.45)",
            border: "none",
            color: "#ffffff",
            cursor: "pointer",
            zIndex: 10,
          }}
          title="Clique para reproduzir o vídeo no preview"
        >
          <span style={{ fontSize: "36px" }}>▶</span>
          <span style={{ fontSize: "12px", background: "rgba(0,0,0,0.6)", padding: "4px 10px", borderRadius: "4px" }}>
            Preview de Vídeo Pausado (Clique para testar)
          </span>
        </button>
      )}
      {title && showVideoElement && (
        <div className="media-caption video-caption">
          <h3>{title}</h3>
        </div>
      )}
    </div>
  );
}

