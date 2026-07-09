import { describe, expect, it } from "vitest";
import { readCssContract } from "@/testing/css-contract";

const stylesDir = __dirname;

describe("portal atmosphere fade-owl CSS", () => {
  const fadeOwlCss = readCssContract(stylesDir, "portal-atmosphere.fade-owl.css");

  it("defines scoped fade-owl fixture selectors only", () => {
    expect(fadeOwlCss).toContain(".portal-fade-owl");
    expect(fadeOwlCss).not.toMatch(/^\.portal-atmosphere\s*\{/m);
  });

  it("locks viewport height for laptop review", () => {
    expect(fadeOwlCss).toContain("height: 100svh");
    expect(fadeOwlCss).toContain("min-height: 100svh");
  });

  it("cross-fades dual guardians via data-fade-owl-mode without invert hacks", () => {
    expect(fadeOwlCss).toContain('[data-fade-owl-mode="light"]');
    expect(fadeOwlCss).toContain('[data-fade-owl-mode="night"]');
    expect(fadeOwlCss).toContain('[data-fade-owl-variant="dual"]');
    expect(fadeOwlCss).toContain('[data-fade-owl-variant="morpho"]');
    expect(fadeOwlCss).toContain(".portal-fade-owl__owl--light");
    expect(fadeOwlCss).toContain(".portal-fade-owl__owl--night");
    expect(fadeOwlCss).toContain(".portal-fade-owl__owl--morpho");
    expect(fadeOwlCss).toContain(".portal-fade-owl__atmosphere--light");
    expect(fadeOwlCss).toContain(".portal-fade-owl__atmosphere--night");
    expect(fadeOwlCss).toContain("--fade-owl-transition: opacity 2000ms ease-in-out");
    expect(fadeOwlCss).not.toContain("invert(");
  });

  it("shifts editorial and surface colors over 2s in night beastmode", () => {
    expect(fadeOwlCss).toContain("background-color 2000ms ease-in-out");
    expect(fadeOwlCss).toContain('.portal-fade-owl[data-fade-owl-mode="night"]');
    expect(fadeOwlCss).not.toContain(".portal-fade-owl__threshold");
    expect(fadeOwlCss).toContain(".portal-fade-owl__beastmode-toggle");
  });

  it("uses contain positioning for portrait guardians", () => {
    expect(fadeOwlCss).toContain("object-fit: contain");
    expect(fadeOwlCss).toContain("object-position: center bottom");
    expect(fadeOwlCss).not.toContain("invert(");
  });

  it("avoids WIG anti-patterns", () => {
    expect(fadeOwlCss).not.toContain("outline: none");
    expect(fadeOwlCss).not.toContain("transition: all");
    expect(fadeOwlCss).toContain("prefers-reduced-motion: reduce");
    expect(fadeOwlCss).toContain("focus-visible");
  });
});
