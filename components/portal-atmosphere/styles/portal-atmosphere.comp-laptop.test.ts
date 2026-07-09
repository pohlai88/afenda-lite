import { describe, expect, it } from "vitest";
import { readCssContract } from "@/testing/css-contract";

const stylesDir = __dirname;

describe("portal atmosphere comp-laptop CSS", () => {
  const compLaptopCss = readCssContract(
    stylesDir,
    "portal-atmosphere.comp-laptop.css",
  );

  it("defines scoped comp-laptop modifier only", () => {
    expect(compLaptopCss).toContain(".portal-atmosphere--comp-laptop");
    expect(compLaptopCss).not.toMatch(
      /^\.portal-atmosphere\s*\{/m,
    );
  });

  it("locks height under comp-laptop at laptop breakpoint", () => {
    expect(compLaptopCss).toContain("height: 100svh");
    expect(compLaptopCss).toContain("overflow-y: hidden");
    expect(compLaptopCss).toContain("env(safe-area-inset-top)");
  });

  it("does not use invert filters on owl selectors", () => {
    expect(compLaptopCss).not.toContain("invert(");
  });

  it("avoids WIG anti-patterns", () => {
    expect(compLaptopCss).not.toContain("outline: none");
    expect(compLaptopCss).not.toContain("transition: all");
  });

  it("themes comp-base owl via data-portal-theme without filter hacks", () => {
    expect(compLaptopCss).toContain(
      '.portal-atmosphere--comp-laptop[data-portal-theme="dark"]',
    );
    expect(compLaptopCss).toContain(
      '.portal-atmosphere--comp-laptop[data-portal-theme="light"]',
    );
    expect(compLaptopCss).toContain(".portal-guardian-owl--comp-base");
  });

  it("defines CSS deco layers (wash, rings, glow)", () => {
    expect(compLaptopCss).toContain(".portal-celestial-deco__wash");
    expect(compLaptopCss).toContain(".portal-celestial-deco__rings");
    expect(compLaptopCss).toContain(".portal-celestial-deco__glow");
  });
});
