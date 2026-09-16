import type { CSSProperties } from "react";
import type { ThemeDefinition } from "./types";

type ThemeCustomProperties = {
  "--theme-shell-background": string;
  "--theme-screen-background": string;
  "--theme-text": string;
  "--theme-muted": string;
  "--theme-accent": string;
  "--theme-danger": string;
  "--theme-font-family": string;
  "--theme-heading-transform": "none" | "uppercase";
  "--theme-card-radius": string;
  "--theme-card-border": string;
  "--theme-card-shadow": string;
  "--theme-price-color": string;
  "--theme-price-shadow": string;
  "--theme-price-weight": number;
  "--theme-badge-background": string;
  "--theme-badge-color": string;
};

export type ThemeStyle = CSSProperties & ThemeCustomProperties;

export function toThemeStyle(theme: ThemeDefinition): ThemeStyle {
  const { tokens } = theme;
  return {
    "--theme-shell-background": tokens.background.shell,
    "--theme-screen-background": tokens.background.screen,
    "--theme-text": tokens.colors.text,
    "--theme-muted": tokens.colors.muted,
    "--theme-accent": tokens.colors.accent,
    "--theme-danger": tokens.colors.danger,
    "--theme-font-family": tokens.typography.fontFamily,
    "--theme-heading-transform": tokens.typography.headingTransform,
    "--theme-card-radius": tokens.cardStyle.borderRadius,
    "--theme-card-border": tokens.cardStyle.borderColor,
    "--theme-card-shadow": tokens.cardStyle.shadow,
    "--theme-price-color": tokens.priceStyle.color,
    "--theme-price-shadow": tokens.priceStyle.textShadow,
    "--theme-price-weight": tokens.priceStyle.fontWeight,
    "--theme-badge-background": tokens.badge.background,
    "--theme-badge-color": tokens.badge.color,
  };
}
