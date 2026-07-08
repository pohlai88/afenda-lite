import { describe, expect, it } from "vitest";
import { readCssContract } from "@/testing/css-contract";

const stylesDir = __dirname;

describe("portal atmosphere PA-P2 base CSS", () => {
  const baseCss = readCssContract(stylesDir, "portal-atmosphere.base.css");

  it("defines shell and background layer selectors only", () => {
    expect(baseCss).toContain(".portal-atmosphere");
    expect(baseCss).toContain(".portal-background-layers");
    expect(baseCss).toContain(".portal-background-layers__grid");
    expect(baseCss).toContain(".portal-atmosphere__content");
  });

  it("uses portal token variables for color surfaces", () => {
    expect(baseCss).toContain("var(--portal-bg)");
    expect(baseCss).toContain("var(--portal-fg)");
    expect(baseCss).toContain("var(--portal-glow-primary)");
    expect(baseCss).toContain("var(--portal-glow-soft)");
    expect(baseCss).not.toMatch(/oklch\(/);
    expect(baseCss).not.toMatch(/#[0-9a-fA-F]{3,8}/);
  });

  it("uses portal tokens for theme surfaces without attribute overrides in base CSS", () => {
    expect(baseCss).not.toContain('[data-portal-theme="dark"]');
    expect(baseCss).not.toContain('[data-portal-theme="light"]');
  });

  it("does not cross PA-P2 boundaries", () => {
    expect(baseCss).not.toContain(".portal-auth-");
    expect(baseCss).not.toContain(".portal-hero-");
    expect(baseCss).not.toContain(".portal-owl-");
    expect(baseCss).not.toContain(".portal-seal-");
    expect(baseCss).not.toContain(".portal-atmosphere__layout");
    expect(baseCss).not.toContain("animation");
    expect(baseCss).not.toContain("@keyframes");
  });

  it("keeps decorative layers non-interactive", () => {
    expect(baseCss).toContain("pointer-events: none");
    expect(baseCss).toContain("overflow-x: clip");
  });
});
