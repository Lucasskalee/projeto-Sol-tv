export type TransitionPreset =
  | "none"
  | "fade"
  | "slide-left"
  | "slide-right"
  | "zoom"
  | "cinematic";

export type ExitPreset =
  | "none"
  | "fade-out"
  | "lift"
  | "hop-lift"
  | "black-friday-lift"
  | "paint-swipe"
  | "paint-swipe-right"
  | "slide-left-out"
  | "slide-right-out"
  | "zoom-out";

export const DEFAULT_TRANSITION_PRESET: TransitionPreset = "cinematic";
export const DEFAULT_OFFER_EXIT_PRESET: ExitPreset = "hop-lift";
export const DEFAULT_MEDIA_EXIT_PRESET: ExitPreset = "fade-out";

export const EXIT_ANIMATION_DURATION = 650; // ms
export const PAINT_SWIPE_COVER_DURATION = 420; // ms para cobrir a tela
export const PAINT_SWIPE_REVEAL_DURATION = 420; // ms para revelar a tela

export const TRANSITION_PRESETS: { id: TransitionPreset; label: string }[] = [
  { id: "cinematic", label: "Cinemático (Padrão)" },
  { id: "fade", label: "Fade Suave" },
  { id: "slide-left", label: "Deslizar para a Esquerda" },
  { id: "slide-right", label: "Deslizar para a Direita" },
  { id: "zoom", label: "Zoom Suave" },
  { id: "none", label: "Sem Transição" },
];

export const EXIT_PRESETS: { id: ExitPreset; label: string }[] = [
  { id: "paint-swipe", label: "Pincelada de Tinta (Esquerda → Direita)" },
  { id: "paint-swipe-right", label: "Pincelada de Tinta (Direita → Esquerda)" },
  { id: "hop-lift", label: "Hop-Lift (Padrão Ofertas)" },
  { id: "black-friday-lift", label: "Black Friday Lift (Elegante)" },
  { id: "lift", label: "Lift para Cima" },
  { id: "fade-out", label: "Fade Out" },
  { id: "slide-left-out", label: "Deslizar para a Esquerda" },
  { id: "slide-right-out", label: "Deslizar para a Direita" },
  { id: "zoom-out", label: "Zoom Out" },
  { id: "none", label: "Sem Saída" },
];

export function getExitPresetForItem(kind?: string): ExitPreset {
  if (kind === "offer") return DEFAULT_OFFER_EXIT_PRESET;
  if (kind === "image") return DEFAULT_MEDIA_EXIT_PRESET;
  if (kind === "video") return "fade-out";
  return DEFAULT_MEDIA_EXIT_PRESET;
}

export function getExitClass(preset: ExitPreset): string {
  switch (preset) {
    case "paint-swipe":
      return "slide-exit-paint-swipe";
    case "paint-swipe-right":
      return "slide-exit-paint-swipe-right";
    case "hop-lift":
      return "slide-exit-hop-lift";
    case "black-friday-lift":
      return "slide-exit-black-friday-lift";
    case "lift":
      return "slide-exit-lift";
    case "slide-left-out":
      return "slide-exit-slide-left";
    case "slide-right-out":
      return "slide-exit-slide-right";
    case "zoom-out":
      return "slide-exit-zoom";
    case "fade-out":
      return "slide-exit-fade";
    case "none":
    default:
      return "";
  }
}

export function getTransitionClasses(
  preset: TransitionPreset = DEFAULT_TRANSITION_PRESET,
  isExiting = false,
  exitPreset: ExitPreset = "fade-out",
): string {
  if (isExiting) {
    return getExitClass(exitPreset);
  }

  if (preset === "none") {
    return "";
  }

  switch (preset) {
    case "fade":
      return "slide-enter-fade";
    case "slide-left":
      return "slide-enter-slide-left";
    case "slide-right":
      return "slide-enter-slide-right";
    case "zoom":
      return "slide-enter-zoom";
    case "cinematic":
    default:
      return "slide-enter-cinematic";
  }
}
