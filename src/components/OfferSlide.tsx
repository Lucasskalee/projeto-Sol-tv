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
      className="product-media"
    />
  );
}

export function OpeningSlide({ sector = "AÇOUGUE" }: { sector?: string }) {
  return (
    <div className="opening-slide">
      <span>☼</span>
      <p>SUPERMERCADO</p>
      <h1>SOL</h1>
      <h2>OFERTAS DO {sector.toUpperCase()}</h2>
      <p>Qualidade que cabe no seu dia</p>
    </div>
  );
}

export function OfferSlide({
  offer,
  offers = [],
  layout,
  paused = false,
}: {
  offer: Offer;
  offers?: Offer[];
  layout?: "single" | "pair" | "grid";
  paused?: boolean;
}) {
  const activeLayout = layout || offer.layout || "single";
  const allOffers = offers.length > 0 ? offers : [offer];
  const start = allOffers.findIndex((o) => o.id === offer.id);
  const safeStart = start >= 0 ? start : 0;
  const count = Math.min(
    allOffers.length,
    activeLayout === "grid" ? 4 : activeLayout === "pair" ? 2 : 1,
  );
  const selected = Array.from(
    { length: count },
    (_, i) => allOffers[(safeStart + i) % allOffers.length],
  );

  return (
    <div className={`slides layout-${activeLayout}`}>
      {selected.map((o) => (
        <article className="slide active" key={o.id}>
          <div className="slide-copy">
            <div className="eyebrow">Oferta especial</div>
            <h3 className="product-name">{o.name}</h3>
            {o.regularPrice && (
              <div className="old-price">
                De <span>R$ {o.regularPrice}</span>
              </div>
            )}
            <div className="price">
              <span className="currency">R$</span>
              <span className="value">{o.promotionalPrice}</span>
              <span className="unit">/{o.unit}</span>
            </div>
          </div>
          <div className="media-wrap">
            {o.video ? (
              <VideoPlayer src={o.video} paused={paused} />
            ) : (
              <ProductImage
                src={o.image}
                name={o.name}
                className="product-media"
              />
            )}
            <div className="badge">OFERTA</div>
          </div>
        </article>
      ))}
    </div>
  );
}
