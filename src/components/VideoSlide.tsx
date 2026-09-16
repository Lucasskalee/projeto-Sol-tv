import { useEffect, useRef, useState } from "react";

export function VideoSlide({
  src,
  title,
  paused = false,
  onEnded,
  onError,
}: {
  src: string;
  title?: string;
  paused?: boolean;
  onEnded?: () => void;
  onError?: () => void;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;

    if (paused) {
      video.pause();
    } else {
      video.play().catch((err) => {
        console.warn("Autoplay bloqueado ou falha na reprodução:", err);
      });
    }

    return () => {
      video.pause();
    };
  }, [paused, src]);

  function handleError() {
    console.error("Falha ao carregar ou reproduzir vídeo:", src);
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
        src={src}
        autoPlay
        muted
        playsInline
        preload="auto"
        onEnded={handleEnded}
        onError={handleError}
        className="full-media-video"
      />
      {title && (
        <div className="media-caption video-caption">
          <h3>{title}</h3>
        </div>
      )}
    </div>
  );
}

