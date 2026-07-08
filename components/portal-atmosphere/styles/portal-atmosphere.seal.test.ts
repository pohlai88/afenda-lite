import { describe, expect, it } from "vitest";
import { readCssContract } from "@/testing/css-contract";

const stylesDir = __dirname;

describe("portal atmosphere PA-P5 seal CSS", () => {
  const sealCss = readCssContract(stylesDir, "portal-atmosphere.seal.css");

  it("defines seal line at z-10 with UI typography", () => {
    expect(sealCss).toContain(".portal-seal-line");
    expect(sealCss).toContain("z-index: 10");
    expect(sealCss).toContain("var(--font-ui)");
  });

  it("uses portal tokens only for color surfaces", () => {
    expect(sealCss).toContain("var(--portal-hero-is)");
    expect(sealCss).toContain("var(--portal-fg)");
    expect(sealCss).toContain("var(--portal-hero-rule)");
    expect(sealCss).toContain("var(--portal-owl-shadow)");
    expect(sealCss).not.toMatch(/oklch\(/);
    expect(sealCss).not.toMatch(/#[0-9a-fA-F]{3,8}/);
  });

  it("themes seal treatment via data-portal-theme", () => {
    expect(sealCss).toContain('[data-portal-theme="dark"]');
    expect(sealCss).toContain('[data-portal-theme="light"]');
  });

  it("does not cross PA-P5 boundaries", () => {
    expect(sealCss).not.toContain(".portal-auth-");
    expect(sealCss).not.toContain(".portal-editorial-hero");
    expect(sealCss).not.toContain(".portal-guardian-owl");
    expect(sealCss).not.toContain("animation");
    expect(sealCss).not.toContain("@keyframes");
  });
});
