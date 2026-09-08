import { useState } from "react";

export function ImageSlide({
  src,
  title,
  onError,
}: {
  src: string;
  title?: string;
  onError?: () => void;
}) {
  const [failed, setFailed] = useState(false);

  function handleError() {
    console.error("Falha ao carregar imagem:", src);
    setFailed(true);
    if (onError) onError();
  }

  if (failed) {
    return (
      <div className="media-slide media-fallback">
        <span>☼</span>
        <small>{title || "Imagem indisponível"}</small>
      </div>
    );
  }

  return (
    <div className="media-slide image-slide">
      <img
        src={src}
        alt={title || "Conteúdo SOL TV"}
        className="full-media-image"
        onError={handleError}
      />
      {title && (
        <div className="media-caption">
          <h3>{title}</h3>
        </div>
      )}
    </div>
  );
}

