import { useEffect, useRef, useState } from "react";
import type { Offer } from "../types";
import type { BadgePosition } from "../motion/types";
import { useCachedMedia } from "../mediaCache";

export function ProductImage({
  src,
  name,
  className = "",
  style,
  scale = 1,
}: {
  src: string;
  name: string;
  className?: string;
  style?: React.CSSProperties;
  scale?: number;
}) {
  const [failed, setFailed] = useState(false);
  const { url: cachedSrc } = useCachedMedia(src);
  const effectiveSrc = cachedSrc || src;

  useEffect(() => {
    setFailed(false);
  }, [effectiveSrc]);

  const effectiveScale = typeof scale === "number" && scale > 0 ? scale : 1;

  return effectiveSrc && !failed ? (
    <div
      className="product-image-scaler"
      style={{
        transform: `scale(calc(${effectiveScale} * var(--layout-img-scale, 1))) translate(var(--layout-img-x, 0px), var(--layout-img-y, 0px))`,
      }}
    >
      <img
        className={className}
        src={effectiveSrc}
        alt={name}
        style={style}
        onError={() => setFailed(true)}
      />
    </div>
  ) : (
    <div className={`media-fallback ${className}`} style={style}>
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
  const { url: cachedSrc } = useCachedMedia(src);
  const effectiveSrc = cachedSrc || src;

  useEffect(() => {
    setFailed(false);
  }, [effectiveSrc]);

  useEffect(() => {
    if (paused) {
      ref.current?.pause();
    } else {
      ref.current?.play().catch(() => setFailed(true));
    }
  }, [paused, effectiveSrc]);

  return failed ? (
    <div className="media-fallback">Vídeo indisponível</div>
  ) : (
    <video
      ref={ref}
      src={effectiveSrc}
      autoPlay
      muted
      loop
      playsInline
      onError={() => setFailed(true)}
      className="product-media offer-product-image"
    />
  );
}

export function OfferPrice({
  offer,
  showUnit = true,
}: {
  offer: Offer;
  showUnit?: boolean;
}) {
  const priceStr = String(offer.promotionalPrice || "").trim();
  let integerPart = priceStr;
  let centsPart = "";

  if (priceStr.includes(",")) {
    const parts = priceStr.split(",");
    integerPart = parts[0] || "";
    centsPart = parts[1] || "";
  } else if (priceStr.includes(".")) {
    const parts = priceStr.split(".");
    integerPart = parts[0] || "";
    centsPart = parts[1] || "";
  }

  return (
    <div className="price">
      <span className="currency">R$</span>
      <span className="value">
        <span className="price-integer">{integerPart}</span>
        {centsPart ? (
          <>
            <span className="price-comma">,</span>
            <span className="price-cents">{centsPart}</span>
          </>
        ) : null}
      </span>
      {showUnit && offer.unit ? <span className="unit">/{offer.unit}</span> : null}
    </div>
  );
}

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
  badgeVisible = true,
  showProductName = true,
  showProductPrice = true,
  showOldPrice = true,
  showUnit = true,
  showBadge = true,
  showProductImage = true,
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
  badgeVisible?: boolean;
  showProductName?: boolean;
  showProductPrice?: boolean;
  showOldPrice?: boolean;
  showUnit?: boolean;
  showBadge?: boolean;
  showProductImage?: boolean;
  cardStyle?: "transparent" | "card" | "glass" | "bordered";
  animationDelay: string;
}) {
  const { url: cachedBadgeImage } = useCachedMedia(badgeImage);
  const effectiveBadgeImage = cachedBadgeImage || badgeImage;

  const baseTranslateX =
    badgePosition === "top-center"
      ? `calc(-50% + ${badgeOffsetX}px)`
      : `${badgeOffsetX}px`;
  const badgeScale =
    typeof badgeSize === "number" && badgeSize > 0 ? Number((badgeSize / 70).toFixed(2)) : 1;
  const badgeTransform = `translate(${baseTranslateX}, ${badgeOffsetY}px) rotate(var(--lab-badge-rotation, 3.5deg)) scale(${badgeScale})`;

  const customScale =
    typeof offer.imageScale === "number" && offer.imageScale > 0
      ? offer.imageScale
      : 1;

  const imageCustomStyle = {
    "--product-image-scale": customScale,
  } as React.CSSProperties;

  const isBadgeAllowed = badgeVisible !== false && showBadge !== false;

  return (
    <article
      className={`slide active offer-product card-style-${cardStyle}`}
      style={{ animationDelay, ...imageCustomStyle }}
    >
      <div className="slide-copy">
        {showProductName && <h3 className="product-name">{offer.name}</h3>}
        {showOldPrice && offer.regularPrice ? (
          <div className="old-price offer-secondary">
            De <span>R$ {offer.regularPrice}</span>
          </div>
        ) : null}
        {showProductPrice && <OfferPrice offer={offer} showUnit={showUnit} />}
      </div>
      <div className="media-wrap" style={imageCustomStyle}>
        {showProductImage && (
          offer.video ? (
            <VideoPlayer src={offer.video} paused={paused} />
          ) : (
            <ProductImage
              src={offer.image}
              name={offer.name}
              className="product-media offer-product-image floating"
              scale={customScale}
              style={imageCustomStyle}
            />
          )
        )}
        {isBadgeAllowed && (
          badgeType === "image" && effectiveBadgeImage ? (
            <img
              src={effectiveBadgeImage}
              alt={badgeLabel || "Selo da Oferta"}
              className={`badge-image-tag badge-pos-${badgePosition}`}
              style={{
                width: badgeSize ? `${badgeSize}px` : "70px",
                transform: `translate(${baseTranslateX}, ${badgeOffsetY}px) rotate(var(--lab-badge-rotation, 3.5deg))`,
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
          )
        )}
      </div>
    </article>
  );
}
