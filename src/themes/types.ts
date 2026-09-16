import type { TransitionPreset } from "../transitions";

export type ThemeCategory = "default" | "special";

export type ThemeAnimationIntensity = "none" | "reduced" | "normal" | "high";

export type ThemeColors = {
  readonly background: string;
  readonly panel: string;
  readonly text: string;
  readonly muted: string;
  readonly accent: string;
  readonly danger: string;
};

export type ThemeBackground = {
  readonly shell: string;
  readonly screen: string;
};

export type ThemeTypography = {
  readonly fontFamily: string;
  readonly headingTransform: "none" | "uppercase";
};

export type ThemeCardStyle = {
  readonly borderRadius: string;
  readonly borderColor: string;
  readonly shadow: string;
};

export type ThemePriceStyle = {
  readonly color: string;
  readonly textShadow: string;
  readonly fontWeight: number;
};

export type ThemeBadgeStyle = {
  readonly label: string;
  readonly background: string;
  readonly color: string;
};

export type ThemeTokens = {
  readonly colors: ThemeColors;
  readonly background: ThemeBackground;
  readonly typography: ThemeTypography;
  readonly cardStyle: ThemeCardStyle;
  readonly priceStyle: ThemePriceStyle;
  readonly badge: ThemeBadgeStyle;
  readonly animationIntensity: ThemeAnimationIntensity;
  readonly transitionPreset: TransitionPreset;
};

export type ThemeDefinition = {
  readonly id: string;
  readonly slug: string;
  readonly name: string;
  readonly category: ThemeCategory;
  readonly tokens: ThemeTokens;
};

export type ThemeRegistry = Readonly<Record<string, ThemeDefinition>>;
