import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { FireSparks } from "./FireSparks";

describe("FireSparks component", () => {
  it("renders null when enabled={false}", () => {
    const html = renderToStaticMarkup(<FireSparks enabled={false} />);
    expect(html).toBe("");
  });

  it("renders fire sparks container when enabled", () => {
    const html = renderToStaticMarkup(<FireSparks enabled={true} />);
    expect(html).toContain('class="fire-sparks');
    expect(html).toContain('aria-hidden="true"');
  });

  it("renders correct default commercial preset particles", () => {
    const html = renderToStaticMarkup(<FireSparks enabled={true} intensity="commercial" />);
    expect(html).toContain("fire-sparks-bottom-glow");
    const matches = html.match(/class="fire-spark\s/g);
    expect(matches?.length).toBe(26);
  });

  it("renders subtle preset with fewer particles", () => {
    const html = renderToStaticMarkup(<FireSparks enabled={true} intensity="subtle" />);
    const matches = html.match(/class="fire-spark\s/g);
    expect(matches?.length).toBe(16);
  });

  it("renders fire-sale preset with more particles and intense glow", () => {
    const html = renderToStaticMarkup(<FireSparks enabled={true} intensity="fire-sale" />);
    const matches = html.match(/class="fire-spark\s/g);
    expect(matches?.length).toBe(38);
    expect(html).toContain("fire-sparks-intensity-fire-sale");
  });

  it("includes all 3 tiers of particles (small, medium, strong)", () => {
    const html = renderToStaticMarkup(<FireSparks enabled={true} intensity="commercial" />);
    expect(html).toContain("fire-spark-small");
    expect(html).toContain("fire-spark-medium");
    expect(html).toContain("fire-spark-strong");
  });

  it("caps particle count in low performance mode for older TVs", () => {
    const html = renderToStaticMarkup(
      <FireSparks enabled={true} particleCount={40} performance="low" />
    );
    const matches = html.match(/class="fire-spark\s/g);
    expect(matches?.length).toBeLessThanOrEqual(14);
    expect(html).toContain("fire-sparks-perf-low");
  });

  it("hides bottom glow when bottomGlow={false}", () => {
    const html = renderToStaticMarkup(<FireSparks enabled={true} bottomGlow={false} />);
    expect(html).not.toContain("fire-sparks-bottom-glow");
  });
});
