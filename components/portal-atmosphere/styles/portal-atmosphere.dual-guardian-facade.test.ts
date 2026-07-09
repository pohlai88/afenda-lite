import { describe, expect, it } from "vitest";
import { readCssContract } from "@/testing/css-contract";

const stylesDir = __dirname;

describe("portal atmosphere dual-guardian-facade CSS", () => {
  const dualGuardianCss = readCssContract(
    stylesDir,
    "portal-atmosphere.dual-guardian-facade.css",
  );

  it("defines scoped dual-guardian modifier only", () => {
    expect(dualGuardianCss).toContain(".portal-atmosphere--dual-guardian");
    expect(dualGuardianCss).not.toMatch(/^\.portal-atmosphere\s*\{/m);
  });

  it("locks height under dual-guardian at laptop breakpoint", () => {
    expect(dualGuardianCss).toContain("height: 100svh");
    expect(dualGuardianCss).toContain("overflow-y: hidden");
    expect(dualGuardianCss).toContain("env(safe-area-inset-top)");
  });

  it("does not use invert filters or forbidden WIG anti-patterns", () => {
    expect(dualGuardianCss).not.toContain("invert(");
    expect(dualGuardianCss).not.toContain("outline: none");
    expect(dualGuardianCss).not.toContain("transition: all");
  });

  it("renders both guardian owls together (not theme-swapped)", () => {
    expect(dualGuardianCss).toContain(".portal-dual-guardian-owls__frame--dark");
    expect(dualGuardianCss).toContain(".portal-dual-guardian-owls__frame--light");
    expect(dualGuardianCss).not.toMatch(/\[data-portal-theme="(dark|light)"\]/);
  });

  it("ghosts owls into shadow/light via mask-image, not opacity-only stickers", () => {
    expect(dualGuardianCss).toContain("mask-image: linear-gradient(90deg");
    expect(dualGuardianCss).toContain("mask-image: linear-gradient(270deg");
  });

  it("defines celestial gold rings and marble/threshold-glow deco layers", () => {
    expect(dualGuardianCss).toContain(".portal-dual-guardian-deco__marble");
    expect(dualGuardianCss).toContain(".portal-dual-guardian-deco__rings::before");
    expect(dualGuardianCss).toContain(".portal-dual-guardian-deco__rings::after");
    expect(dualGuardianCss).toContain(".portal-dual-guardian-deco__threshold-glow");
  });

  it("integrates the Access Vault into a shield/keyhole threshold", () => {
    expect(dualGuardianCss).toContain(".portal-vault-threshold__shield");
    expect(dualGuardianCss).toContain(".portal-vault-threshold__shield-hole");
    expect(dualGuardianCss).toContain(".portal-vault-threshold__shield-keyway");
    expect(dualGuardianCss).toContain("clip-path: polygon(");
  });
});
