import type { Offer } from "../types";
import { OFFER_LAYOUTS, normalizeOfferLayout, type LegacyOfferLayout, type OfferLayout } from "../offers/layouts";
import { OFFER_LAYOUT_COMPONENTS } from "./OfferLayouts";
import { OfferProduct } from "./OfferProduct";

export { ProductImage, VideoPlayer } from "./OfferProduct";

export function OpeningSlide({ sector = "AÇOUGUE" }: { sector?: string }) {
  return (
    <div className="opening-slide">
      <img src="/logo-sol.png" alt="Supermercado Sol - O Supermercado da Família" className="opening-logo" />
      <h2>OFERTAS DO {sector.toUpperCase()}</h2>
      <p>Qualidade que cabe no seu dia</p>
    </div>
  );
}

import type { BadgePosition } from "../motion/types";

export function OfferSlide({
  offer,
  offers,
  layout,
  paused = false,
  badgeLabel = "OFERTA",
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
}: {
  offer?: Offer;
  offers?: readonly Offer[];
  layout?: OfferLayout | LegacyOfferLayout;
  paused?: boolean;
  badgeLabel?: string;
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
}) {
  const fallbackOffer = offer || offers?.[0];
  if (!fallbackOffer && (!offers || offers.length === 0)) {
    return null;
  }

  const activeLayout = normalizeOfferLayout(layout || fallbackOffer?.layout);
  const layoutDefinition = OFFER_LAYOUTS[activeLayout];
  const LayoutComponent = OFFER_LAYOUT_COMPONENTS[activeLayout];

  let selected: readonly Offer[];

  if (offers && offers.length > 0 && !offer) {
    // Direct composition mode: render the exact offers passed
    selected = offers.slice(0, layoutDefinition.productCount);
  } else {
    // Legacy circular slice mode
    const allOffers = offers && offers.length > 0 ? offers : fallbackOffer ? [fallbackOffer] : [];
    const start = fallbackOffer ? allOffers.findIndex((o) => o.id === fallbackOffer.id) : 0;
    const safeStart = start >= 0 ? start : 0;
    const count = Math.min(allOffers.length, layoutDefinition.productCount);
    selected = Array.from(
      { length: count },
      (_, i) => allOffers[(safeStart + i) % allOffers.length],
    );
  }

  return (
    <LayoutComponent>
      {selected.map((o, idx) => (
        <OfferProduct
          key={`${o.id}-${idx}`}
          offer={o}
          paused={paused}
          badgeLabel={badgeLabel}
          badgeType={badgeType}
          badgeImage={badgeImage}
          badgeSize={badgeSize}
          badgePosition={badgePosition}
          badgeOffsetX={badgeOffsetX}
          badgeOffsetY={badgeOffsetY}
          badgeVisible={badgeVisible}
          showProductName={showProductName}
          showProductPrice={showProductPrice}
          showOldPrice={showOldPrice}
          showUnit={showUnit}
          showBadge={showBadge}
          showProductImage={showProductImage}
          cardStyle={cardStyle}
          animationDelay={`${idx * 0.1}s`}
        />
      ))}
    </LayoutComponent>
  );
}
