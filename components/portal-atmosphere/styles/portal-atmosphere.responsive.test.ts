import { describe, expect, it } from "vitest";
import { readCssContract } from "@/testing/css-contract";

const stylesDir = __dirname;

describe("portal atmosphere PA-P8 responsive CSS", () => {
  const responsiveCss = readCssContract(stylesDir, "portal-atmosphere.responsive.css");

  it("defines access-first mobile grid order", () => {
    expect(responsiveCss).toContain(".portal-atmosphere__layout");
    expect(responsiveCss).toContain('"header"');
    expect(responsiveCss).toContain('"access"');
    expect(responsiveCss).toContain('"brand"');
  });

  it("uses modern viewport units on the layout shell", () => {
    expect(responsiveCss).toContain("100svh");
    expect(responsiveCss).not.toMatch(/100vh[^a-z]/);
  });

  it("repositions owl frame and compresses hero typography on small screens", () => {
    expect(responsiveCss).toContain(".portal-guardian-owl__frame");
    expect(responsiveCss).toContain(".portal-guardian-owl::before");
    expect(responsiveCss).toContain(".portal-hero-word");
    expect(responsiveCss).toContain("min(100vw");
    expect(responsiveCss).toContain("clamp(2.85rem");
  });

  it("adapts grid areas to active layout slots", () => {
    expect(responsiveCss).toContain("[data-portal-layout-access=\"true\"]");
    expect(responsiveCss).toContain(":not([data-portal-layout-header=\"true\"])");
  });

  it("releases fixed poster coordinates inside the layout grid", () => {
    expect(responsiveCss).toContain(
      ".portal-atmosphere__layout .portal-editorial-hero",
    );
    expect(responsiveCss).toContain(
      ".portal-atmosphere__layout .portal-access-slot",
    );
    expect(responsiveCss).toContain(
      ".portal-atmosphere__layout .portal-seal-line__text",
    );
  });

  it("does not duplicate PA-P2 root shell rules", () => {
    expect(responsiveCss).not.toContain(".portal-atmosphere {");
  });

  it("does not cross PA-P8 boundaries", () => {
    expect(responsiveCss).not.toContain(".portal-auth-");
    expect(responsiveCss).not.toContain("animation");
    expect(responsiveCss).not.toContain("@keyframes");
  });
});
