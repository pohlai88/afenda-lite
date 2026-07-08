import { describe, expect, it } from "vitest";
import { readCssContract } from "@/testing/css-contract";

const stylesDir = __dirname;

describe("portal atmosphere PA-P3 owl CSS", () => {
  const owlCss = readCssContract(stylesDir, "portal-atmosphere.owl.css");

  it("defines guardian owl layer selectors at z-2", () => {
    expect(owlCss).toContain(".portal-guardian-owl");
    expect(owlCss).toContain("z-index: 2");
    expect(owlCss).toContain("pointer-events: none");
  });

  it("uses portal owl and glow tokens only", () => {
    expect(owlCss).toContain("var(--portal-owl-highlight)");
    expect(owlCss).toContain("var(--portal-owl-shadow)");
    expect(owlCss).toContain("var(--portal-glow-primary)");
    expect(owlCss).toContain("var(--portal-bg)");
    expect(owlCss).not.toMatch(/oklch\(/);
    expect(owlCss).not.toMatch(/#[0-9a-fA-F]{3,8}/);
  });

  it("themes owl treatment via data-portal-theme", () => {
    expect(owlCss).toContain("mix-blend-mode: screen");
    expect(owlCss).toContain("mix-blend-mode: multiply");
    expect(owlCss).toContain('[data-portal-theme="dark"]');
    expect(owlCss).toContain('[data-portal-theme="light"]');
  });

  it("includes desktop scale rules", () => {
    expect(owlCss).toContain("@media (min-width: 1280px)");
  });

  it("defines sharp owl centered preset", () => {
    expect(owlCss).toContain(".portal-guardian-owl--sharp");
    expect(owlCss).toContain("aspect-ratio: 435 / 405");
    expect(owlCss).toContain(".portal-guardian-owl__image--dark");
    expect(owlCss).toContain(".portal-guardian-owl__image--light");
  });

  it("uses pseudo-elements for keylight and scrim", () => {
    expect(owlCss).toContain(".portal-guardian-owl::before");
    expect(owlCss).toContain(".portal-guardian-owl::after");
    expect(owlCss).not.toContain(".portal-guardian-owl__keylight");
    expect(owlCss).not.toContain(".portal-guardian-owl__scrim");
  });

  it("does not cross PA-P3 boundaries", () => {
    expect(owlCss).not.toContain(".portal-auth-");
    expect(owlCss).not.toContain(".portal-hero-");
    expect(owlCss).not.toContain("animation");
    expect(owlCss).not.toContain("@keyframes");
  });
});
