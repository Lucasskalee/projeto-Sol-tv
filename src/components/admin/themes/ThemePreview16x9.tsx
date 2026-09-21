import React from "react";
import type { ThemeDefinition } from "../../../themes/types";
import { toThemeStyle } from "../../../themes/toThemeStyle";

export interface ThemePreview16x9Props {
  theme: ThemeDefinition;
  interactive?: boolean;
  onClick?: () => void;
  height?: string;
  sampleProduct?: {
    brand?: string;
    name?: string;
    price?: string;
    unit?: string;
    badgeText?: string;
  };
}

export const ThemePreview16x9: React.FC<ThemePreview16x9Props> = ({
  theme,
  interactive = false,
  onClick,
  sampleProduct,
}) => {
  const isBlackFriday = theme.slug === "black-friday";
  const { tokens } = theme;
  const themeStyle = toThemeStyle(theme);

  const brand = sampleProduct?.brand || (isBlackFriday ? "BLACK FRIDAY" : "SUPERMERCADO SOL");
  const name = sampleProduct?.name || "CONTRA FILÉ";
  const price = sampleProduct?.price || (isBlackFriday ? "29,90" : "39,90");
  const unit = sampleProduct?.unit || "KG";
  const badgeText = sampleProduct?.badgeText || tokens.badge.label || "OFERTA";

  return (
    <div
      onClick={interactive ? onClick : undefined}
      style={{
        ...themeStyle,
        position: "relative",
        width: "100%",
        aspectRatio: "16 / 9",
        borderRadius: "10px",
        overflow: "hidden",
        boxShadow: "0 8px 24px rgba(0, 0, 0, 0.4)",
        border: "1px solid rgba(255, 255, 255, 0.1)",
        cursor: interactive ? "pointer" : "default",
        userSelect: "none",
        background: tokens.background.screen,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "5% 6%",
        boxSizing: "border-box",
        fontFamily: tokens.typography.fontFamily,
      }}
    >
      {/* Background radial/gradient atmosphere */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: tokens.background.screen,
          zIndex: 0,
          pointerEvents: "none",
        }}
      />

      {/* Top Header / Brand Bar */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          width: "100%",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <div
            style={{
              padding: "3px 8px",
              borderRadius: "4px",
              background: isBlackFriday ? "#111111" : "rgba(242, 201, 76, 0.15)",
              border: isBlackFriday ? "1px solid #333333" : "1px solid rgba(242, 201, 76, 0.3)",
              color: isBlackFriday ? "#FFBE00" : "#f2c94c",
              fontSize: "clamp(9px, 1.2vw, 13px)",
              fontWeight: 900,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}
          >
            {brand}
          </div>
        </div>

        {/* Badge */}
        <div
          style={{
            padding: "3px 10px",
            borderRadius: "6px",
            background: tokens.badge.background,
            color: tokens.badge.color,
            fontSize: "clamp(8px, 1.1vw, 12px)",
            fontWeight: 900,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
          }}
        >
          {badgeText}
        </div>
      </div>

      {/* Main Promo Card Simulator */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          width: "100%",
          background: tokens.colors.panel,
          borderRadius: tokens.cardStyle.borderRadius,
          border: `1.5px solid ${tokens.cardStyle.borderColor}`,
          boxShadow: tokens.cardStyle.shadow,
          padding: "4% 6%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          boxSizing: "border-box",
          margin: "auto 0",
        }}
      >
        {/* Left: Product Title */}
        <div style={{ flex: 1, minWidth: 0, paddingRight: "4%" }}>
          <span
            style={{
              display: "block",
              fontSize: "clamp(7px, 0.9vw, 10px)",
              fontWeight: 700,
              color: tokens.colors.muted,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              marginBottom: "2px",
            }}
          >
            Setor Açougue
          </span>
          <h4
            style={{
              margin: 0,
              fontSize: "clamp(12px, 1.8vw, 20px)",
              fontWeight: 900,
              color: tokens.colors.text,
              textTransform: tokens.typography.headingTransform === "uppercase" ? "uppercase" : "none",
              letterSpacing: "-0.02em",
              lineHeight: 1.1,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {name}
          </h4>
        </div>

        {/* Right: Promotional Price */}
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            gap: "3px",
            flexShrink: 0,
          }}
        >
          <span
            style={{
              fontSize: "clamp(9px, 1.2vw, 13px)",
              fontWeight: 700,
              color: tokens.priceStyle.color,
            }}
          >
            R$
          </span>
          <span
            style={{
              fontSize: "clamp(18px, 3.2vw, 36px)",
              fontWeight: tokens.priceStyle.fontWeight,
              color: tokens.priceStyle.color,
              textShadow: tokens.priceStyle.textShadow,
              lineHeight: 1,
              letterSpacing: "-0.04em",
            }}
          >
            {price}
          </span>
          <span
            style={{
              fontSize: "clamp(8px, 1vw, 11px)",
              fontWeight: 800,
              color: tokens.colors.muted,
              textTransform: "uppercase",
              marginLeft: "2px",
            }}
          >
            /{unit}
          </span>
        </div>
      </div>

      {/* Bottom Footer Info */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontSize: "clamp(7px, 0.8vw, 10px)",
          color: tokens.colors.muted,
          fontWeight: 600,
        }}
      >
        <span>Oferta válida enquanto durarem os estoques</span>
        <span
          style={{
            color: tokens.colors.accent,
            fontWeight: 700,
          }}
        >
          16:9 Full HD
        </span>
      </div>
    </div>
  );
};

