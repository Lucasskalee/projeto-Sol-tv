import { describe, expect, it } from "vitest";
import {
  DEFAULT_MOTION_CONFIG,
  isBlackFridayImageVisible,
  setBlackFridayImageVisibility,
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
