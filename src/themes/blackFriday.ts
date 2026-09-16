import { DEFAULT_TRANSITION_PRESET } from "../transitions";
import type { ThemeDefinition } from "./types";

export const blackFridayTheme: ThemeDefinition = Object.freeze({
  id: "black-friday",
  slug: "black-friday",
  name: "Black Friday — Cartaz Digital",
  category: "special",
  tokens: Object.freeze({
    colors: Object.freeze({
      background: "#F7F6F2",
      panel: "#FFFFFF",
      text: "#111111",
      muted: "#444444",
      accent: "#FFBE00",
      danger: "#F2381E",
    }),
    background: Object.freeze({
      shell: "#F7F6F2",
      screen:
        "radial-gradient(ellipse at 50% 30%, #FFFFFF 0%, #F7F6F2 85%, #EFECE6 100%)",
    }),
    typography: Object.freeze({
      fontFamily:
        'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      headingTransform: "uppercase",
    }),
    cardStyle: Object.freeze({
      borderRadius: "20px",
      borderColor: "rgba(0, 0, 0, 0.08)",
      shadow: "0 18px 40px rgba(0, 0, 0, 0.06)",
    }),
    priceStyle: Object.freeze({
      color: "#F2381E",
      textShadow: "none",
      fontWeight: 1000,
    }),
    badge: Object.freeze({
      label: "BLACK FRIDAY",
      background: "#111111",
      color: "#FFFFFF",
    }),
    animationIntensity: "normal",
    transitionPreset: DEFAULT_TRANSITION_PRESET,
  }),
});
