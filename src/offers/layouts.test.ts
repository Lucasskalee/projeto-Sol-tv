import { describe, expect, it } from "vitest";
import { OFFER_LAYOUTS, normalizeOfferLayout } from "./layouts";

describe("offer layouts", () => {
  it("defines the supported product densities without magic numbers", () => {
    expect(Object.values(OFFER_LAYOUTS).map((layout) => layout.productCount)).toEqual([
      1, 2, 3, 4, 8,
    ]);
  });

  it.each([
    ["single", "hero"],
    ["pair", "duo"],
    ["grid", "grid4"],
    ["hero", "hero"],
    ["duo", "duo"],
    ["trio", "trio"],
    ["grid4", "grid4"],
    ["grid8", "grid8"],
  ] as const)("normalizes %s to %s", (input, expected) => {
    expect(normalizeOfferLayout(input)).toBe(expected);
  });

  it("falls back to hero for missing values", () => {
    expect(normalizeOfferLayout(undefined)).toBe("hero");
  });
});
