import { describe, expect, it } from "vitest";
import {
  DEFAULT_FIRE_SPARKS_CONFIG,
  DEFAULT_MOTION_CONFIG,
  isBlackFridayImageVisible,
  isFireSparksVisible,
  setBlackFridayImageVisibility,
  setFireSparksVisibility,
  shouldRenderBlackFridayImage,
} from "./defaults";

describe("visibilidade da imagem Black Friday", () => {
  it("considera a imagem oculta quando qualquer estado legado estiver desativado", () => {
    expect(
      isBlackFridayImageVisible({
        ...DEFAULT_MOTION_CONFIG,
        visibility: { ...DEFAULT_MOTION_CONFIG.visibility, blackFridayImage: false },
        blackFridayImage: { ...DEFAULT_MOTION_CONFIG.blackFridayImage!, visible: true },
      })
    ).toBe(false);

    expect(
      isBlackFridayImageVisible({
        ...DEFAULT_MOTION_CONFIG,
        visibility: { ...DEFAULT_MOTION_CONFIG.visibility, blackFridayImage: true },
        blackFridayImage: { ...DEFAULT_MOTION_CONFIG.blackFridayImage!, visible: false },
      })
    ).toBe(false);
  });

  it("reativa os dois estados para desbloquear configurações antigas inconsistentes", () => {
    const inconsistent = {
      ...DEFAULT_MOTION_CONFIG,
      visibility: { ...DEFAULT_MOTION_CONFIG.visibility, blackFridayImage: false },
      blackFridayImage: { ...DEFAULT_MOTION_CONFIG.blackFridayImage!, visible: true },
    };

    const enabled = setBlackFridayImageVisibility(inconsistent, true);

    expect(enabled.visibility?.blackFridayImage).toBe(true);
    expect(enabled.blackFridayImage?.visible).toBe(true);
    expect(isBlackFridayImageVisible(enabled)).toBe(true);
  });

  it("desativa os dois estados de forma consistente", () => {
    const disabled = setBlackFridayImageVisibility(DEFAULT_MOTION_CONFIG, false);

    expect(disabled.visibility?.blackFridayImage).toBe(false);
    expect(disabled.blackFridayImage?.visible).toBe(false);
    expect(isBlackFridayImageVisible(disabled)).toBe(false);
  });
});

describe("renderização dos efeitos na tela", () => {
  it("mostra uma imagem personalizada mesmo fora do tema Black Friday", () => {
    const config = {
      ...DEFAULT_MOTION_CONFIG,
      themeSlug: "sol-premium",
      blackFridayImage: {
        ...DEFAULT_MOTION_CONFIG.blackFridayImage!,
        src: "https://cdn.exemplo.com/aniversario.png",
        visible: true,
      },
    };

    expect(shouldRenderBlackFridayImage(config, "sol-premium")).toBe(true);
  });

  it("não injeta o selo padrão Black Friday em outros temas sem imagem personalizada", () => {
    const config = {
      ...DEFAULT_MOTION_CONFIG,
      blackFridayImage: {
        ...DEFAULT_MOTION_CONFIG.blackFridayImage!,
        src: "",
        visible: true,
      },
    };

    expect(shouldRenderBlackFridayImage(config, "sol-premium")).toBe(false);
    expect(shouldRenderBlackFridayImage(config, "black-friday")).toBe(true);
  });

  it("sincroniza o botão das faíscas com a visibilidade efetiva na TV", () => {
    const legacyHidden = {
      ...DEFAULT_MOTION_CONFIG,
      visibility: { ...DEFAULT_MOTION_CONFIG.visibility, fireSparks: false },
      fireSparks: { ...DEFAULT_FIRE_SPARKS_CONFIG, enabled: true },
    };

    expect(isFireSparksVisible(legacyHidden)).toBe(false);

    const enabled = setFireSparksVisibility(legacyHidden, true);
    expect(enabled.visibility?.fireSparks).toBe(true);
    expect(enabled.fireSparks?.enabled).toBe(true);
    expect(enabled.fx?.fireSparks?.enabled).toBe(true);
    expect(isFireSparksVisible(enabled)).toBe(true);
  });
});
