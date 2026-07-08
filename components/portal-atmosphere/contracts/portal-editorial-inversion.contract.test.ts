import { describe, expect, it } from "vitest";
import { getPortalInversionMode } from "./portal-theme.contract";
import {
  isPortalHeroWordInverted,
  resolvePortalHeroInvertedWord,
  resolvePortalHeroInversionDecision,
} from "./portal-editorial-inversion.contract";

describe("portal editorial inversion contract", () => {
  it("inverts PROTECTED only in dark theme", () => {
    expect(resolvePortalHeroInvertedWord("dark")).toBe("protected");

    expect(isPortalHeroWordInverted("dark", "protected")).toBe(true);
    expect(isPortalHeroWordInverted("dark", "truth")).toBe(false);
  });

  it("inverts TRUTH only in light theme", () => {
    expect(resolvePortalHeroInvertedWord("light")).toBe("truth");

    expect(isPortalHeroWordInverted("light", "truth")).toBe(true);
    expect(isPortalHeroWordInverted("light", "protected")).toBe(false);
  });

  it("returns a stable inversion decision object", () => {
    expect(resolvePortalHeroInversionDecision("dark")).toEqual({
      theme: "dark",
      invertedWord: "protected",
    });

    expect(resolvePortalHeroInversionDecision("light")).toEqual({
      theme: "light",
      invertedWord: "truth",
    });
  });

  it("stays aligned with theme inversion mode metadata", () => {
    for (const theme of ["dark", "light"] as const) {
      const mode = getPortalInversionMode(theme);
      const inverted = resolvePortalHeroInvertedWord(theme);

      if (mode === "dark-truth-readable") {
        expect(inverted).toBe("protected");
      } else {
        expect(inverted).toBe("truth");
      }
    }
  });
});
