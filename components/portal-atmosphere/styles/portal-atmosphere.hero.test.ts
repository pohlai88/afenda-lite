import { describe, expect, it } from "vitest";
import { readCssContract } from "@/testing/css-contract";

const stylesDir = __dirname;

describe("portal atmosphere PA-P4 hero CSS", () => {
  const heroCss = readCssContract(stylesDir, "portal-atmosphere.hero.css");

  it("defines editorial hero at z-5 with token typography", () => {
    expect(heroCss).toContain(".portal-editorial-hero");
    expect(heroCss).toContain("z-index: 5");
    expect(heroCss).toContain("position: relative");
    expect(heroCss).toContain("var(--font-editorial)");
    expect(heroCss).toContain("var(--font-ui)");
  });

  it("uses portal hero tokens only for color surfaces", () => {
    expect(heroCss).toContain("var(--portal-hero-truth)");
    expect(heroCss).toContain("var(--portal-hero-protected)");
    expect(heroCss).toContain("var(--portal-hero-is)");
    expect(heroCss).toContain("var(--portal-hero-rule)");
    expect(heroCss).not.toMatch(/oklch\(/);
    expect(heroCss).not.toMatch(/#[0-9a-fA-F]{3,8}/);
  });

  it("applies single-word inversion via rotate transform", () => {
    expect(heroCss).toContain(".portal-hero-word--inverted");
    expect(heroCss).toContain("transform: rotate(180deg)");
  });

  it("themes hero treatment via data-portal-theme", () => {
    expect(heroCss).toContain('[data-portal-theme="dark"]');
    expect(heroCss).toContain('[data-portal-theme="light"]');
  });

  it("defines sharp editorial sentence variant", () => {
    expect(heroCss).toContain(".portal-editorial-hero--sharp");
    expect(heroCss).toContain(".portal-hero-headline");
    expect(heroCss).toContain(".portal-hero-divider");
    expect(heroCss).toContain(".portal-hero-subtitle");
  });

  it("does not cross PA-P4 boundaries", () => {
    expect(heroCss).not.toContain(".portal-auth-");
    expect(heroCss).not.toContain(".portal-guardian-owl");
    expect(heroCss).not.toContain(".portal-auth-seal");
    expect(heroCss).not.toContain("animation");
    expect(heroCss).not.toContain("@keyframes");
  });
});
