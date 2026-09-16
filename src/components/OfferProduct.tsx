import { useEffect, useRef, useState } from "react";
import type { Offer } from "../types";

export function ProductImage({
  src,
  name,
  className = "",
}: {
  src: string;
  name: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);

  return src && !failed ? (
    <img
      className={className}
      src={src}
      alt={name}
      onError={() => setFailed(true)}
    />
  ) : (
    <div className={`media-fallback ${className}`}>
      <span>
        ☼<small>{name || "SOL TV"}</small>
      </span>
    </div>
  );
}

export function VideoPlayer({
  src,
  paused,
}: {
  src: string;
  paused: boolean;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (paused) {
      ref.current?.pause();
    } else {
      ref.current?.play().catch(() => setFailed(true));
    }
  }, [paused, src]);

  return failed ? (
    <div className="media-fallback">Vídeo indisponível</div>
  ) : (
    <video
      ref={ref}
      src={src}
      autoPlay
      muted
      loop
      playsInline
      onError={() => setFailed(true)}
      className="product-media offer-product-image"
    />
  );
}

export function OfferPrice({ offer }: { offer: Offer }) {
  return (
    <div className="price">
      <span className="currency">R$</span>
      <span className="value">{offer.promotionalPrice}</span>
      <span className="unit">/{offer.unit}</span>
    </div>
  );
}

import type { BadgePosition } from "../motion/types";

export function OfferProduct({
  offer,
  paused,
  badgeLabel,
  badgeType = "text",
  badgeImage,
  badgeSize,
  badgePosition = "top-right",
  badgeOffsetX = 0,
  badgeOffsetY = 0,
  cardStyle = "transparent",
  animationDelay,
}: {
  offer: Offer;
  paused: boolean;
  badgeLabel: string;
  badgeType?: "text" | "image";
  badgeImage?: string;
  badgeSize?: number;
  badgePosition?: BadgePosition;
  badgeOffsetX?: number;
  badgeOffsetY?: number;
  cardStyle?: "transparent" | "card" | "glass" | "bordered";
  animationDelay: string;
}) {
  const baseTranslateX =
    badgePosition === "top-center"
      ? `calc(-50% + ${badgeOffsetX}px)`
      : `${badgeOffsetX}px`;
  const badgeTransform = `translate(${baseTranslateX}, ${badgeOffsetY}px) rotate(var(--lab-badge-rotation, 3.5deg))`;

  return (
    <article
      className={`slide active offer-product card-style-${cardStyle}`}
      style={{ animationDelay }}
    >
      <div className="slide-copy">
        <div className="eyebrow offer-secondary">Oferta especial</div>
        <h3 className="product-name">{offer.name}</h3>
        {offer.regularPrice && (
          <div className="old-price offer-secondary">
            De <span>R$ {offer.regularPrice}</span>
          </div>
        )}
        <OfferPrice offer={offer} />
      </div>
      <div className="media-wrap">
        {offer.video ? (
          <VideoPlayer src={offer.video} paused={paused} />
        ) : (
          <ProductImage
            src={offer.image}
            name={offer.name}
            className="product-media offer-product-image floating"
          />
        )}
        {badgeType === "image" && badgeImage ? (
          <img
            src={badgeImage}
            alt={badgeLabel || "Selo da Oferta"}
            className={`badge-image-tag badge-pos-${badgePosition}`}
            style={{
              width: badgeSize ? `${badgeSize}px` : undefined,
              transform: badgeTransform,
            }}
          />
        ) : badgeLabel === "BLACK FRIDAY" ? (
          <div
            className={`badge offer-secondary badge-pos-${badgePosition} badge-bf-cartaz`}
            style={{
              transform: badgeTransform,
            }}
          >
            <span className="bf-badge-word-black">BLACK</span>
            <span className="bf-badge-word-friday">FRIDAY</span>
          </div>
        ) : (
          <div
            className={`badge offer-secondary badge-pos-${badgePosition}`}
            style={{
              transform: badgeTransform,
            }}
          >
            {badgeLabel}
          </div>
        )}
      </div>
    </article>
  );
}
