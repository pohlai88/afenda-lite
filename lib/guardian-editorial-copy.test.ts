/**
 * @vitest-environment node
 */
import { describe, expect, it } from "vitest";
import {
  guardianModeFromPortalTheme,
  portalThemeFromGuardianMode,
  resolveGuardianAuthCopyOverride,
  resolveGuardianEditorialCopy,
  resolveGuardianJoinCopyOverride,
} from "@/lib/guardian-editorial-copy";
import { PORTAL_NAME } from "@/lib/portal-name";
import { portalCopy } from "@/lib/portal-copy";
import {
  SHARP_OWL_EDITORIAL_BY_THEME,
  SHARP_OWL_SEAL,
} from "@/components/portal-atmosphere/contracts/portal-editorial.contract";

describe("guardian-editorial-copy", () => {
  it("maps portal sharp editorial contract to Guardian modes", () => {
    const copy = resolveGuardianEditorialCopy();
    expect(copy.night.eyebrow).toBe(PORTAL_NAME);
    expect(copy.night.headline).toBe(SHARP_OWL_EDITORIAL_BY_THEME.dark.headline);
    expect(copy.day.proofline).toBe(SHARP_OWL_SEAL);
  });

  it("maps portal theme to Guardian mode bidirectionally", () => {
    expect(guardianModeFromPortalTheme("dark")).toBe("night");
    expect(portalThemeFromGuardianMode("night")).toBe("dark");
    expect(portalThemeFromGuardianMode("day")).toBe("light");
  });

  it("overrides poster copy for join invitation hero", () => {
    const override = resolveGuardianJoinCopyOverride();

    expect(override?.night?.headline).toBe(portalCopy.clientInvitationJoin.heroTitle);
    expect(override?.day?.subheadline).toBe(
      portalCopy.clientInvitationJoin.heroDescription,
    );
  });

  it("overrides poster copy for org operator sign-in", () => {
    const override = resolveGuardianAuthCopyOverride({
      path: "sign-in",
      from: "org",
    });

    expect(override?.night?.headline).toBe(portalCopy.orgSignIn.heroTitle);
    expect(override?.day?.subheadline).toBe(portalCopy.orgSignIn.heroDescription);
    expect(
      resolveGuardianAuthCopyOverride({ path: "sign-in" }),
    ).toBeUndefined();
  });
});
