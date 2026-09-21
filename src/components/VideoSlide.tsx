import { useEffect, useRef, useState } from "react";
import { useCachedMedia } from "../mediaCache";

export function VideoSlide({
  src,
  title,
  paused = false,
  mode = "tv",
  onEnded,
  onError,
}: {
  src: string;
  title?: string;
  paused?: boolean;
  mode?: "tv" | "preview";
  onEnded?: () => void;
  onError?: () => void;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const [failed, setFailed] = useState(false);
  const [previewManualPlay, setPreviewManualPlay] = useState(false);
  const { url: cachedSrc } = useCachedMedia(src);
  const effectiveSrc = cachedSrc || src;

  // Em modo preview no Admin, não auto-reproduz continuamente a menos que o operador clique
  const isEffectivelyPaused = paused || (mode === "preview" && !previewManualPlay);

  useEffect(() => {
    setFailed(false);
  }, [effectiveSrc]);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;

    if (isEffectivelyPaused) {
      video.pause();
    } else {
      video.play().catch((err) => {
        console.warn("Autoplay bloqueado ou falha na reprodução:", err);
      });
    }

    return () => {
      video.pause();
    };
  }, [isEffectivelyPaused, effectiveSrc]);

  function handleError() {
    console.error("Falha ao carregar ou reproduzir vídeo:", effectiveSrc);
    setFailed(true);
    if (onError) onError();
  }

  function handleEnded() {
    if (onEnded) onEnded();
  }

  if (failed) {
    return (
      <div className="media-slide media-fallback">
        <span>☼</span>
        <small>{title || "Vídeo indisponível"}</small>
      </div>
    );
  }

  return (
    <div className="media-slide video-slide">
      <video
        ref={ref}
        src={effectiveSrc}
        autoPlay={!isEffectivelyPaused}
        muted
        playsInline
        preload={mode === "preview" ? "metadata" : "auto"}
        onEnded={handleEnded}
        onError={handleError}
        className="full-media-video"
      />
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
      {title && (
        <div className="media-caption video-caption">
          <h3>{title}</h3>
        </div>
      )}
    </div>
  );
}
