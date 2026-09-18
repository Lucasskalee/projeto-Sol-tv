import type { ComponentType, ReactNode } from "react";
import type { OfferLayout } from "../offers/layouts";

type OfferLayoutProps = {
  children: ReactNode;
};

function OfferLayoutFrame({
  layout,
  children,
}: OfferLayoutProps & { layout: OfferLayout }) {
  return (
    <div className={`slides offer-layout offer-layout-${layout}`} data-layout={layout}>
      {children}
    </div>
  );
}

export function HeroOfferLayout({ children }: OfferLayoutProps) {
  return <OfferLayoutFrame layout="hero">{children}</OfferLayoutFrame>;
}

export function DuoOfferLayout({ children }: OfferLayoutProps) {
  return <OfferLayoutFrame layout="duo">{children}</OfferLayoutFrame>;
}

export function TrioOfferLayout({ children }: OfferLayoutProps) {
  return <OfferLayoutFrame layout="trio">{children}</OfferLayoutFrame>;
}

export function Grid4OfferLayout({ children }: OfferLayoutProps) {
  return <OfferLayoutFrame layout="grid4">{children}</OfferLayoutFrame>;
}

export function Grid8OfferLayout({ children }: OfferLayoutProps) {
  return <OfferLayoutFrame layout="grid8">{children}</OfferLayoutFrame>;
}

export const OFFER_LAYOUT_COMPONENTS: Readonly<
  Record<OfferLayout, ComponentType<OfferLayoutProps>>
> = Object.freeze({
  hero: HeroOfferLayout,
  duo: DuoOfferLayout,
  trio: TrioOfferLayout,
  grid4: Grid4OfferLayout,
  grid8: Grid8OfferLayout,
});
