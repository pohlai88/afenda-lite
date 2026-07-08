import { describe, expect, it } from "vitest";
import {
  DEFAULT_PORTAL_EDITORIAL_COPY,
  formatPortalEditorialHeading,
  PORTAL_EDITORIAL_HEADING,
  resolveSharpEditorialHeading,
  SHARP_OWL_EDITORIAL_BY_THEME,
  type PortalEditorialContract,
  type PortalEditorialCopy,
} from "./portal-editorial.contract";
import { getPortalInversionMode } from "./portal-theme.contract";

describe("portal editorial contract", () => {
  it("exports default editorial copy with stable semantic keys", () => {
    const copy = DEFAULT_PORTAL_EDITORIAL_COPY satisfies PortalEditorialCopy;

    expect(copy).toEqual({
      truth: "TRUTH",
      connector: "IS",
      protected: "PROTECTED",
    });
  });

  it("exports the canonical semantic page heading", () => {
    expect(PORTAL_EDITORIAL_HEADING).toBe("Truth is protected");
    expect(formatPortalEditorialHeading(DEFAULT_PORTAL_EDITORIAL_COPY)).toBe(
      "truth is protected",
    );
  });

  it("exports sharp owl editorial copy per theme", () => {
    expect(SHARP_OWL_EDITORIAL_BY_THEME.dark.headline).toBe("Truth, held quietly.");
    expect(SHARP_OWL_EDITORIAL_BY_THEME.light.headline).toBe("Protected by clarity.");
    expect(SHARP_OWL_EDITORIAL_BY_THEME.dark.seal).toBe("Confidential. Secure. Always.");
    expect(resolveSharpEditorialHeading("dark")).toBe("Truth, held quietly");
  });

  it("supports editorial contract without rendering concerns", () => {
    const contract = {
      copy: DEFAULT_PORTAL_EDITORIAL_COPY,
      inversionMode: getPortalInversionMode("dark"),
    } satisfies PortalEditorialContract;

    expect(contract.copy.truth).toBe("TRUTH");
    expect(contract.inversionMode).toBe("dark-truth-readable");
  });
});
