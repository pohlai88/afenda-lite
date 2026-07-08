import { describe, expect, it } from "vitest";
import { readCssContract } from "@/testing/css-contract";

const stylesDir = __dirname;

describe("portal atmosphere PA-P9 a11y CSS", () => {
  const a11yCss = readCssContract(stylesDir, "portal-atmosphere.a11y.css");

  it("defines focus-visible and aria-hidden guardrails", () => {
    expect(a11yCss).toContain(":focus-visible");
    expect(a11yCss).toContain("var(--portal-ring)");
    expect(a11yCss).toContain('[aria-hidden="true"]');
    expect(a11yCss).toContain("pointer-events: none");
  });

  it("applies prefers-reduced-motion without enabling animation", () => {
    expect(a11yCss).toContain("@media (prefers-reduced-motion: reduce)");
    expect(a11yCss).toContain("animation: none !important");
    expect(a11yCss).not.toContain("@keyframes");
  });

  it("does not cross PA-P9 boundaries", () => {
    expect(a11yCss).not.toContain(".portal-auth-");
    expect(a11yCss).not.toContain("AuthView");
  });
});
