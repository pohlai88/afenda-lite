import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { readCssContract } from "@/testing/css-contract";

const cssDir = join(process.cwd(), "components", "auth");

describe("guardian auth facade layout contract", () => {
  const css = readCssContract(cssDir, "guardian-auth-facade.css");

  it("fills one viewport with locked overflow on desktop", () => {
    expect(css).toContain("height: 100dvh");
    expect(css).toContain("box-sizing: border-box");
    expect(css).toContain("overflow: hidden");
    expect(css).toContain(
      "grid-template-columns: minmax(0, 1.08fr) minmax(320px, 0.56fr)",
    );
  });

  it("compresses poster elements on short laptop viewports", () => {
    expect(css).toContain("@media (max-height: 760px) and (min-width: 981px)");
    expect(css).toMatch(
      /@media \(max-height: 760px\) and \(min-width: 981px\)[\s\S]*\.editorial-copy__headline/,
    );
  });

  it("allows vertical scroll on mobile when needed", () => {
    expect(css).toMatch(
      /@media \(max-width: 980px\)[\s\S]*height: auto[\s\S]*overflow-y: auto/,
    );
  });

  it("styles production Neon slot inside access panel", () => {
    expect(css).toContain(".guardian-auth__access-panel .bg-card");
    expect(css).toContain("max-height: calc(100dvh - 2 * clamp(22px, 3.2vw, 52px))");
    expect(css).toContain(".owl-scene__owl--morpho");
    expect(css).toMatch(/\.owl-scene__owl--morpho[\s\S]*max-height:/);
  });

  it("defines semantic state topics (green, amber, gold)", () => {
    expect(css).toContain(".guardian-auth--state-success");
    expect(css).toContain(".guardian-auth--state-warning");
    expect(css).toContain(".guardian-auth--state-typing");
    expect(css).toMatch(
      /\.guardian-auth--state-success[\s\S]*--scene-stars: rgba\(95, 242, 163/,
    );
  });

  it("keeps geometry spin centered during loading motion", () => {
    expect(css).toContain("@keyframes guardianGeometrySpin");
    expect(css).toMatch(
      /@keyframes guardianGeometrySpin[\s\S]*translate\(-50%, -50%\) rotate\(360deg\)/,
    );
  });

  it("stacks layout on narrow viewports", () => {
    expect(css).toContain("@media (max-width: 980px)");
    expect(css).toMatch(/@media \(max-width: 980px\)[\s\S]*grid-template-columns: 1fr/);
  });
});
