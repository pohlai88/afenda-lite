import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { readCssContract } from "@/testing/css-contract";

const cssDir = join(process.cwd(), "components", "auth");

describe("guardian auth facade layout contract", () => {
  const css = readCssContract(cssDir, "guardian-auth-facade.css");

  it("fills one viewport with locked overflow on desktop", () => {
    expect(css).toContain("height: 100dvh");
    expect(css).toContain("max-height: 100dvh");
    expect(css).toContain("min-height: min(620px, 100dvh)");
    expect(css).toContain("box-sizing: border-box");
    expect(css).toContain("overflow: hidden");
    expect(css).toContain(
      "grid-template-columns: var(--g-col-editorial) var(--g-col-chamber)",
    );
  });

  it("compresses poster elements on short laptop viewports", () => {
    expect(css).toContain("@media (max-height: 820px) and (min-width: 981px)");
    expect(css).toMatch(
      /@media \(max-height: 820px\) and \(min-width: 981px\)[\s\S]*--g-poster-headline:/,
    );
  });

  it("contains owl scene layout without expanding the viewport", () => {
    expect(css).toMatch(/\.owl-scene[\s\S]*contain:\s*layout paint/);
  });

  it("allows vertical scroll on mobile when needed", () => {
    expect(css).toMatch(
      /@media \(max-width: 980px\)[\s\S]*height: auto[\s\S]*overflow-y: auto/,
    );
  });

  it("styles production Neon slot inside access panel", () => {
    expect(css).toContain(".guardian-auth__access-panel .bg-card");
    expect(css).toContain("max-height: calc(100dvh - 2 * var(--g-pad-y))");
    expect(css).toContain(".owl-scene__owl--morpho");
    expect(css).toMatch(/\.owl-scene__owl--morpho[\s\S]*max-height:\s*var\(--g-owl-max-h\)/);
    expect(css).not.toContain(".owl-scene__owl--day");
    expect(css).not.toContain(".owl-scene__owl--night");
  });

  it("uses Fade Owl exchange plus morpho day/night presentation", () => {
    expect(css).toContain("--guardian-plate:");
    expect(css).toContain("background-color: var(--guardian-plate)");
    expect(css).toContain("--guardian-morph-duration: 2000ms");
    expect(css).toContain("--guardian-morph-atmosphere:");
    expect(css).toMatch(/\.owl-scene[\s\S]*background:\s*transparent/);
    expect(css).toMatch(
      /\.guardian-auth--day \.owl-scene__owl--morpho[\s\S]*mix-blend-mode:\s*multiply/,
    );
    expect(css).toMatch(
      /\.guardian-auth--night \.owl-scene__owl--morpho[\s\S]*mix-blend-mode:\s*normal/,
    );
  });

  it("uses sunrise day plate and sky atmosphere (not milky white)", () => {
    expect(css).toMatch(/\.guardian-auth--day[\s\S]*--guardian-plate:\s*#f8efe0/);
    expect(css).toContain(".owl-scene__grain");
    expect(css).toMatch(
      /\.owl-scene__atmosphere--day[\s\S]*rgba\(255,\s*190,\s*118/,
    );
    expect(css).toMatch(
      /\.owl-scene__atmosphere--day[\s\S]*#eef3f8/,
    );
  });

  it("defines living sky cycle ambient animations (48s)", () => {
    expect(css).toContain("--guardian-sky-duration: 48s");
    expect(css).toContain(".guardian-auth--ambient");
    expect(css).toContain("@keyframes guardianSkyDayLayer");
    expect(css).toContain("@keyframes guardianSkyNightLayer");
    expect(css).toContain("@keyframes guardianSkyMorphoOwl");
    expect(css).toContain("@keyframes guardianSkyCopyDay");
    expect(css).toContain("@keyframes guardianSkyCopyNight");
    expect(css).toContain("animation-play-state: paused");
  });

  it("uses sky-cycle dual copy sets without flipped typography", () => {
    expect(css).toContain(".editorial-copy--sky");
    expect(css).toContain(".editorial-copy__set--day");
    expect(css).toContain(".editorial-copy__set--night");
    expect(css).not.toContain(".editorial-copy__word--inverted");
    expect(css).not.toContain(".editorial-copy__word--truth");
    expect(css).toMatch(/--g-owl-x:\s*48%/);
    expect(css).toMatch(/--g-owl-w:\s*min\(92vw,\s*1280px\)/);
  });

  it("restrains chamber to vault glass (no blue fill glow on card)", () => {
    expect(css).toContain(".guardian-auth__brand-mark-img");
    expect(css).toContain(".access-vault__emblem-img");
    expect(css).toContain(".access-vault__magic");
    expect(css).toMatch(/--g-chamber-w:\s*min\(26vw,\s*380px\)/);
    expect(css).toMatch(
      /\.guardian-auth__access-panel \.bg-card[\s\S]*0 34px 110px rgba\(0,\s*0,\s*0,\s*\.58\)/,
    );
    expect(css).toMatch(
      /\.guardian-auth--day \.access-vault[\s\S]*rgba\(139,\s*112,\s*70/,
    );
  });

  it("defines director composition tokens and wires owl/chamber/poster", () => {
    expect(css).toContain("--g-owl-w:");
    expect(css).toContain("--g-chamber-w:");
    expect(css).toContain("--g-poster-headline:");
    expect(css).toContain("width: var(--g-owl-w)");
    expect(css).toContain("left: var(--g-owl-x)");
    expect(css).toContain("width: var(--g-chamber-w)");
    expect(css).toContain("font-size: var(--g-poster-headline)");
  });

  it("defines semantic state topics (green, amber, gold)", () => {
    expect(css).toContain(".guardian-auth--state-success");
    expect(css).toContain(".guardian-auth--state-warning");
    expect(css).toContain(".guardian-auth--state-typing");
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
