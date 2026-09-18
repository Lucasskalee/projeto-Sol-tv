import { describe, expect, it } from "vitest";
import { clearLightBorder } from "./removeWhiteBackground";

describe("white background removal", () => {
  it("clears connected background and preserves the white label inside the product", () => {
    const pixels = new Uint8ClampedArray(5 * 5 * 4).fill(255);
    for (let y = 1; y < 4; y++) for (let x = 1; x < 4; x++) {
      const offset = (y * 5 + x) * 4;
      pixels[offset] = 150; pixels[offset + 1] = 20; pixels[offset + 2] = 20;
    }
    pixels.set([255, 255, 255, 255], 12 * 4);
    expect(clearLightBorder(pixels, 5, 5, 45)).toBe(16);
    expect(pixels[3]).toBe(0);
    expect(pixels[12 * 4 + 3]).toBe(255);
    expect(pixels[6 * 4 + 3]).toBe(255);
  });
  it("preserves colored edges and clears pale gray background at the chosen intensity", () => {
    const pixels = new Uint8ClampedArray([235,235,235,255, 255,210,210,255]);
    expect(clearLightBorder(pixels, 2, 1, 30)).toBe(1);
    expect([...pixels]).toEqual([235,235,235,0,255,210,210,255]);
  });
});
