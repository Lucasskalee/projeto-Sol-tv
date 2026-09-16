import { DEFAULT_TRANSITION_PRESET } from "../transitions";
import type { ThemeDefinition } from "./types";

export const normalTheme: ThemeDefinition = Object.freeze({
  id: "normal",
  slug: "normal",
  name: "Tema Normal",
  category: "default",
  tokens: Object.freeze({
    colors: Object.freeze({
      background: "#0b0d10",
      panel: "#15181d",
      text: "#f7f7f7",
      muted: "#9da5b0",
      accent: "#f2c94c",
      danger: "#ff5c5c",
    }),
    background: Object.freeze({
      shell: "#000000",
      screen:
        "radial-gradient(circle at 20% 30%, rgba(242, 201, 76, 0.14), transparent 34%), radial-gradient(circle at 80% 70%, rgba(255, 80, 80, 0.12), transparent 32%), linear-gradient(140deg, #0e0f11, #19140b 55%, #0a0c0f)",
    }),
    typography: Object.freeze({
      fontFamily:
        'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      headingTransform: "uppercase",
    }),
    cardStyle: Object.freeze({
      borderRadius: "28px",
      borderColor: "rgba(255, 255, 255, 0.12)",
      shadow: "0 28px 65px rgba(0, 0, 0, 0.45)",
    }),
    priceStyle: Object.freeze({
      color: "#f2c94c",
      textShadow: "0 0 35px rgba(242, 201, 76, 0.16)",
      fontWeight: 1000,
    }),
    badge: Object.freeze({
      label: "OFERTA",
      background: "#ff5c5c",
      color: "#ffffff",
    }),
    animationIntensity: "normal",
    transitionPreset: DEFAULT_TRANSITION_PRESET,
  }),
});
