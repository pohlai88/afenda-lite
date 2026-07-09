/**
 * @vitest-environment node
 */
import { describe, expect, it } from "vitest";
import {
  GUARDIAN_CLASSIC_SEAL,
  guardianModeFromPortalTheme,
  portalThemeFromGuardianMode,
  resolveGuardianAuthCopyOverride,
  resolveGuardianEditorialCopy,
  resolveGuardianJoinCopyOverride,
} from "@/lib/copy/guardian-editorial-copy";
import { PORTAL_NAME } from "@/lib/copy/portal-name";
import { portalCopy } from "@/lib/copy/portal-copy";
import {
  SHARP_OWL_EDITORIAL_BY_THEME,
  SHARP_OWL_SEAL,
} from "@/components/portal-atmosphere/contracts/portal-editorial.contract";

describe("guardian-editorial-copy", () => {
  it("defaults Guardian facade to readable sky-cycle sentences", () => {
    const copy = resolveGuardianEditorialCopy();
    expect(copy.night.variant).toBe("sentence");
    expect(copy.day.variant).toBe("sentence");
    expect(copy.night.eyebrow).toBe(PORTAL_NAME);
    expect(copy.night.headline).toBe(SHARP_OWL_EDITORIAL_BY_THEME.dark.headline);
    expect(copy.day.headline).toBe(SHARP_OWL_EDITORIAL_BY_THEME.light.headline);
    expect(copy.day.proofline).toBe(SHARP_OWL_SEAL);
    expect(GUARDIAN_CLASSIC_SEAL).toContain("SECURE");
  });

  it("maps portal theme to Guardian mode bidirectionally", () => {
    expect(guardianModeFromPortalTheme("dark")).toBe("night");
    expect(portalThemeFromGuardianMode("night")).toBe("dark");
    expect(portalThemeFromGuardianMode("day")).toBe("light");
  });

  it("overrides poster copy for join invitation as sentence mode", () => {
    const override = resolveGuardianJoinCopyOverride();

    expect(override?.night?.variant).toBe("sentence");
    expect(override?.night?.headline).toBe(portalCopy.clientInvitationJoin.heroTitle);
    expect(override?.day?.subheadline).toBe(
      portalCopy.clientInvitationJoin.heroDescription,
    );
  });

  it("overrides poster copy for org operator sign-in as sentence mode", () => {
    const override = resolveGuardianAuthCopyOverride({
      path: "sign-in",
      from: "org",
    });

    expect(override?.night?.variant).toBe("sentence");
    expect(override?.night?.headline).toBe(portalCopy.orgSignIn.heroTitle);
    expect(override?.day?.subheadline).toBe(portalCopy.orgSignIn.heroDescription);
    expect(
      resolveGuardianAuthCopyOverride({ path: "sign-in" }),
    ).toBeUndefined();
  });
});
