import { describe, expect, it } from "vitest";
import { readCssContract } from "@/testing/css-contract";

const stylesDir = __dirname;

describe("portal atmosphere PA-P6 layout CSS", () => {
  const layoutCss = readCssContract(stylesDir, "portal-atmosphere.layout.css");

  it("defines access slot at z-20 with right-side desktop positioning", () => {
    expect(layoutCss).toContain(".portal-access-slot");
    expect(layoutCss).toContain("z-index: 20");
    expect(layoutCss).toContain("position: fixed");
    expect(layoutCss).toContain("justify-content: flex-end");
  });

  it("constrains access slot inner to 24rem per PA-P6 spec", () => {
    expect(layoutCss).toContain(".portal-access-slot__inner");
    expect(layoutCss).toContain("min(100%, 24rem)");
  });

  it("uses portal and shadcn semantic surfaces for placeholder card", () => {
    expect(layoutCss).toContain("var(--portal-card-adjacent)");
    expect(layoutCss).toContain("var(--portal-bg)");
    expect(layoutCss).toContain("var(--portal-border)");
    expect(layoutCss).toContain("var(--portal-ring)");
    expect(layoutCss).toContain("var(--card");
    expect(layoutCss).toContain("var(--font-ui)");
  });

  it("themes placeholder treatment via data-portal-theme", () => {
    expect(layoutCss).toContain('[data-portal-theme="dark"]');
    expect(layoutCss).toContain('[data-portal-theme="light"]');
  });

  it("does not cross PA-P6 boundaries", () => {
    expect(layoutCss).not.toContain(".portal-auth-");
    expect(layoutCss).not.toContain("AuthView");
    expect(layoutCss).not.toContain("animation");
    expect(layoutCss).not.toContain("@keyframes");
  });
});
