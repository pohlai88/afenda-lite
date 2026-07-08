import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { stripCssComments } from "@/testing/css-contract";
import {
  PORTAL_ATMOSPHERE_TOKEN_NAMES,
  assertPortalAtmosphereTokenName,
  isPortalAtmosphereTokenName,
} from "./portal-atmosphere.tokens";

const tokenDir = __dirname;

function readCss(fileName: string): string {
  return readFileSync(join(tokenDir, fileName), "utf8");
}

function extractPortalTokenDefinitions(css: string): Set<string> {
  const matches = css.matchAll(/(--portal-[a-z0-9-]+)\s*:/g);
  return new Set(Array.from(matches, (match) => match[1]));
}

function extractCssCustomProperties(css: string): Set<string> {
  const matches = css.matchAll(/(--[a-z0-9-]+)\s*:/g);
  return new Set(Array.from(matches, (match) => match[1]));
}

describe("portal atmosphere token names", () => {
  it("accepts only declared Portal Atmosphere token names", () => {
    expect(isPortalAtmosphereTokenName("--portal-bg")).toBe(true);
    expect(isPortalAtmosphereTokenName("--brand-primary")).toBe(false);
    expect(isPortalAtmosphereTokenName("--owl-line")).toBe(false);
  });

  it("throws for unknown token names", () => {
    expect(() => assertPortalAtmosphereTokenName("--portal-bg")).not.toThrow();
    expect(() => assertPortalAtmosphereTokenName("--brand-primary")).toThrow(
      "Unknown Portal Atmosphere token",
    );
  });

  it("has no duplicate token names", () => {
    const unique = new Set(PORTAL_ATMOSPHERE_TOKEN_NAMES);

    expect(unique.size).toBe(PORTAL_ATMOSPHERE_TOKEN_NAMES.length);
  });
});

describe("portal atmosphere CSS token authority", () => {
  const darkCss = readCss("portal-atmosphere.dark.css");
  const lightCss = readCss("portal-atmosphere.light.css");
  const entryCss = readCss("portal-atmosphere.css");

  it("defines every declared token in dark theme CSS", () => {
    const darkTokens = extractPortalTokenDefinitions(darkCss);

    expect([...darkTokens].sort()).toEqual(
      [...PORTAL_ATMOSPHERE_TOKEN_NAMES].sort(),
    );
  });

  it("defines every declared token in light theme CSS", () => {
    const lightTokens = extractPortalTokenDefinitions(lightCss);

    expect([...lightTokens].sort()).toEqual(
      [...PORTAL_ATMOSPHERE_TOKEN_NAMES].sort(),
    );
  });

  it("keeps dark and light theme token keys in parity", () => {
    const darkTokens = extractPortalTokenDefinitions(darkCss);
    const lightTokens = extractPortalTokenDefinitions(lightCss);

    expect([...darkTokens].sort()).toEqual([...lightTokens].sort());
  });

  it("uses OKLCH for all portal color token values", () => {
    const combinedCss = `${darkCss}\n${lightCss}`;

    for (const tokenName of PORTAL_ATMOSPHERE_TOKEN_NAMES) {
      const pattern = new RegExp(`${tokenName}\\s*:\\s*oklch\\(`, "g");

      expect(pattern.test(combinedCss)).toBe(true);
    }
  });

  it("does not introduce banned token namespaces", () => {
    const combinedCss = `${entryCss}\n${darkCss}\n${lightCss}`;
    const customProperties = extractCssCustomProperties(combinedCss);

    for (const property of customProperties) {
      expect(property.startsWith("--brand-")).toBe(false);
      expect(property.startsWith("--owl-")).toBe(false);
      expect(property.startsWith("--auth-")).toBe(false);
    }
  });

  it("does not add portal-specific shadcn token definitions", () => {
    const combinedCss = `${entryCss}\n${darkCss}\n${lightCss}`;

    expect(combinedCss).not.toMatch(/--background\s*:/);
    expect(combinedCss).not.toMatch(/--card\s*:/);
    expect(combinedCss).not.toMatch(/--primary\s*:/);
    expect(combinedCss).not.toMatch(/--secondary\s*:/);
    expect(combinedCss).not.toMatch(/--accent\s*:/);
  });

  it("aliases editorial and UI fonts to app/font exports", () => {
    expect(entryCss).toContain("--font-cormorant");
    expect(entryCss).toContain("--font-inter");
    expect(entryCss).not.toContain("--font-playfair");
  });

  it("does not add rendering classes in token-only CSS files", () => {
    const tokenOnlyCss = stripCssComments(`${entryCss}\n${darkCss}\n${lightCss}`);

    expect(tokenOnlyCss).not.toContain(".portal-auth-");
    expect(tokenOnlyCss).not.toContain(".portal-hero-");
    expect(tokenOnlyCss).not.toContain(".portal-owl-");
    expect(tokenOnlyCss).not.toContain("z-index");
    expect(tokenOnlyCss).not.toContain("position:");
  });

  it("imports PA-P2 base layer CSS from the single entry file", () => {
    expect(entryCss).toContain('@import "../styles/portal-atmosphere.base.css"');
    expect(entryCss).toContain(
      '@import "../styles/portal-atmosphere.extensions.css"',
    );
  });

  it("composes PA-P3 through PA-P9 layers via extensions entry", () => {
    const extensionsCss = readFileSync(
      join(tokenDir, "../styles/portal-atmosphere.extensions.css"),
      "utf8",
    );

    expect(extensionsCss).toContain('@import "./portal-atmosphere.owl.css"');
    expect(extensionsCss).toContain('@import "./portal-atmosphere.hero.css"');
    expect(extensionsCss).toContain(
      '@import "./portal-atmosphere.responsive.css"',
    );
    expect(extensionsCss).toContain('@import "./portal-atmosphere.a11y.css"');
  });
});
