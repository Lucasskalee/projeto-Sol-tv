import { blackFridayTheme } from "./blackFriday";
import { normalTheme } from "./normal";
import type { ThemeRegistry } from "./types";

export const themeRegistry: ThemeRegistry = Object.freeze({
  [normalTheme.slug]: normalTheme,
  [blackFridayTheme.slug]: blackFridayTheme,
});
