import { describe, expect, it } from "vitest";
import {
  DEFAULT_PORTAL_THEME_SELECTION,
  PORTAL_ATMOSPHERE_THEMES,
  PORTAL_INVERSION_MODES,
  getPortalInversionMode,
  isPortalAtmosphereTheme,
  isPortalInversionMode,
  normalizePortalThemeSelection,
  resolvePortalThemeClassName,
  type PortalAtmosphereTheme,
  type PortalInversionMode,
} from "./portal-theme.contract";

describe("portal theme contract", () => {
  it("exports closed theme and inversion sets", () => {
    expect(PORTAL_ATMOSPHERE_THEMES).toEqual(["dark", "light"]);
    expect(PORTAL_INVERSION_MODES).toEqual([
      "dark-truth-readable",
      "light-protected-readable",
    ]);
  });

  it("exports valid theme and inversion defaults", () => {
    const theme =
      DEFAULT_PORTAL_THEME_SELECTION.theme satisfies PortalAtmosphereTheme;
    const inversionMode =
      DEFAULT_PORTAL_THEME_SELECTION.inversionMode satisfies PortalInversionMode;

    expect(theme).toBe("dark");
    expect(inversionMode).toBe("dark-truth-readable");
  });

  it("narrows theme and inversion values at runtime", () => {
    expect(isPortalAtmosphereTheme("dark")).toBe(true);
    expect(isPortalAtmosphereTheme("light")).toBe(true);
    expect(isPortalAtmosphereTheme("system")).toBe(false);

    expect(isPortalInversionMode("dark-truth-readable")).toBe(true);
    expect(isPortalInversionMode("invalid")).toBe(false);
  });

  it("derives ADR inversion mode from theme", () => {
    expect(getPortalInversionMode("dark")).toBe("dark-truth-readable");
    expect(getPortalInversionMode("light")).toBe("light-protected-readable");
  });

  it("resolves isolated theme class names", () => {
    expect(resolvePortalThemeClassName("dark")).toBe(
      "portal-atmosphere-theme-dark",
    );
    expect(resolvePortalThemeClassName("light")).toBe(
      "portal-atmosphere-theme-light",
    );
  });

  it("normalizes theme selection to canonical inversion mode", () => {
    expect(
      normalizePortalThemeSelection({
        theme: "light",
        inversionMode: "dark-truth-readable",
      }),
    ).toEqual({
      theme: "light",
      inversionMode: "light-protected-readable",
    });
  });
});
