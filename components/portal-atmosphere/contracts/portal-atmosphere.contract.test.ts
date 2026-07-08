import { describe, expect, it } from "vitest";
import { PORTAL_ATMOSPHERE_TOKEN_NAMES } from "../tokens/portal-atmosphere.tokens";
import { DEFAULT_PORTAL_THEME_SELECTION } from "./portal-theme.contract";
import {
  buildPortalAtmosphereContract,
  buildPortalAtmosphereThemeAttributes,
  resolvePortalThemeSurface,
  resolvePortalThemeSurfaceFromTheme,
} from "./portal-atmosphere.contract";

describe("portal atmosphere contract", () => {
  it("builds theme attributes from selection", () => {
    expect(buildPortalAtmosphereThemeAttributes(DEFAULT_PORTAL_THEME_SELECTION)).toEqual({
      "data-portal-atmosphere": "",
      "data-portal-theme": "dark",
      "data-portal-inversion": "dark-truth-readable",
    });
  });

  it("resolves className and data attributes together for PA-P2 wiring", () => {
    expect(resolvePortalThemeSurfaceFromTheme("dark")).toEqual({
      className: "portal-atmosphere-theme-dark",
      "data-portal-atmosphere": "",
      "data-portal-theme": "dark",
      "data-portal-inversion": "dark-truth-readable",
    });
  });

  it("builds atmosphere contract without runtime color duplication", () => {
    const contract = buildPortalAtmosphereContract(
      DEFAULT_PORTAL_THEME_SELECTION,
      PORTAL_ATMOSPHERE_TOKEN_NAMES,
    );

    expect(contract.tokenNames).toContain("--portal-bg");
    expect(contract.theme).toBe("dark");
    expect(contract.inversionMode).toBe("dark-truth-readable");
  });

  it("normalizes mismatched inversion mode from theme", () => {
    expect(
      resolvePortalThemeSurface({
        theme: "light",
        inversionMode: "dark-truth-readable",
      }),
    ).toEqual({
      className: "portal-atmosphere-theme-light",
      "data-portal-atmosphere": "",
      "data-portal-theme": "light",
      "data-portal-inversion": "light-protected-readable",
    });

    expect(
      buildPortalAtmosphereContract({
        theme: "dark",
        inversionMode: "light-protected-readable",
      }).inversionMode,
    ).toBe("dark-truth-readable");
  });
});
