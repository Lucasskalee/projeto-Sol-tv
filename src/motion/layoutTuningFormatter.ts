import type { OfferLayout } from "../offers/layouts";
import type { LayoutTuningMap, PerLayoutTuning } from "./types";

const LAYOUT_CLASS_MAP: Record<OfferLayout, string> = {
  hero: "offer-layout-hero",
  duo: "offer-layout-duo",
  trio: "offer-layout-trio",
  grid4: "offer-layout-grid4",
  grid8: "offer-layout-grid8",
};

const LAYOUT_BASE_SIZES: Record<
  OfferLayout,
  { name: string; price: string; imgScale: number; cols?: string }
> = {
  hero: {
    name: "clamp(56px, 11.5cqmin, 140px)",
    price: "clamp(120px, 23cqmin, 280px)",
    imgScale: 1.3,
    cols: "0.85fr 1.15fr",
  },
  duo: {
    name: "clamp(34px, 6.2cqmin, 76px)",
    price: "clamp(80px, 15cqmin, 185px)",
    imgScale: 1.3,
    cols: "0.88fr 1.12fr",
  },
  trio: {
    name: "clamp(26px, 4.6cqmin, 56px)",
    price: "clamp(60px, 11.5cqmin, 140px)",
    imgScale: 1.25,
  },
  grid4: {
    name: "clamp(22px, 4.2cqmin, 52px)",
    price: "clamp(58px, 12cqmin, 135px)",
    imgScale: 1.36,
    cols: "0.88fr 1.12fr",
  },
  grid8: {
    name: "clamp(14px, 1.65cqw, 27px)",
    price: "clamp(26px, 3.4cqw, 54px)",
    imgScale: 1.15,
  },
};

export function formatLayoutTuningCss(
  layout: OfferLayout,
  tuning?: PerLayoutTuning
): string {
  if (!tuning) return `/* Nenhuma alteração aplicada ao layout ${layout} */`;

  const cls = LAYOUT_CLASS_MAP[layout] || `offer-layout-${layout}`;
  const base = LAYOUT_BASE_SIZES[layout];
  const lines: string[] = [
    `/* ==============================================================================`,
    `   CONFIGURAÇÃO PERSONALIZADA: LAYOUT ${layout.toUpperCase()}`,
    `   ============================================================================== */`,
  ];

  if (tuning.columnRatio !== undefined || tuning.gap !== undefined) {
    lines.push(`.${cls} {`);
    if (tuning.columnRatio !== undefined) {
      const col1 = (1 - tuning.columnRatio).toFixed(2);
      const col2 = tuning.columnRatio.toFixed(2);
      lines.push(`  --layout-cols: ${col1}fr ${col2}fr;`);
    }
    if (tuning.gap !== undefined) {
      lines.push(`  --layout-gap: ${tuning.gap}px;`);
    }
    lines.push(`}`);
  }

  if (tuning.productName) {
    lines.push(`.${cls} .product-name {`);
    if (tuning.productName.fontSizeOffset) {
      const sign = tuning.productName.fontSizeOffset >= 0 ? "+" : "-";
      const absVal = Math.abs(tuning.productName.fontSizeOffset);
      lines.push(
        `  font-size: calc(${base.name} ${sign} ${absVal}px); /* Offset: ${tuning.productName.fontSizeOffset}px */`
      );
    }
    if (tuning.productName.x || tuning.productName.y) {
      lines.push(
        `  transform: translate(${tuning.productName.x || 0}px, ${tuning.productName.y || 0}px);`
      );
    }
    lines.push(`}`);
  }

  if (tuning.promotionalPrice) {
    lines.push(`.${cls} .price .value {`);
    if (tuning.promotionalPrice.fontSizeOffset) {
      const sign = tuning.promotionalPrice.fontSizeOffset >= 0 ? "+" : "-";
      const absVal = Math.abs(tuning.promotionalPrice.fontSizeOffset);
      lines.push(
        `  font-size: calc(${base.price} ${sign} ${absVal}px); /* Offset: ${tuning.promotionalPrice.fontSizeOffset}px */`
      );
    }
    lines.push(`}`);
    if (tuning.promotionalPrice.x || tuning.promotionalPrice.y) {
      lines.push(`.${cls} .price {`);
      lines.push(
        `  transform: translate(${tuning.promotionalPrice.x || 0}px, ${tuning.promotionalPrice.y || 0}px);`
      );
      lines.push(`}`);
    }
  }

  if (tuning.oldPrice) {
    lines.push(`.${cls} .old-price {`);
    if (tuning.oldPrice.fontSizeOffset) {
      lines.push(
        `  font-size: calc(clamp(13px, 2.2cqmin, 26px) + ${tuning.oldPrice.fontSizeOffset}px);`
      );
    }
    if (tuning.oldPrice.x || tuning.oldPrice.y) {
      lines.push(
        `  transform: translate(${tuning.oldPrice.x || 0}px, ${tuning.oldPrice.y || 0}px);`
      );
    }
    lines.push(`}`);
  }

  if (tuning.productImage) {
    lines.push(`.${cls} .offer-product-image {`);
    const totalScale = Number(
      ((base.imgScale || 1.3) * (tuning.productImage.scale || 1)).toFixed(2)
    );
    const transX = tuning.productImage.x || 0;
    const transY = tuning.productImage.y || 0;
    lines.push(
      `  transform: scale(${totalScale}) translate(${transX}px, ${transY}px);`
    );
    lines.push(`}`);
  }

  return lines.join("\n");
}

export function formatCompleteTuningExport(
  layout: OfferLayout,
  tuning?: PerLayoutTuning,
  allTunings?: LayoutTuningMap
): string {
  const css = formatLayoutTuningCss(layout, tuning);
  const json = JSON.stringify(
    {
      layout,
      activeTuning: tuning || {},
      allLayoutTunings: allTunings || {},
    },
    null,
    2
  );

  return `${css}\n\n/* ==================== JSON DE CONFIGURAÇÃO ==================== */\n/*\n${json}\n*/`;
}

