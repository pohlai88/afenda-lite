import type { GuardianCopy, GuardianMode } from "@/components/auth/types";
import {
  SHARP_OWL_EDITORIAL_BY_THEME,
  SHARP_OWL_SEAL,
} from "@/components/portal-atmosphere/contracts/portal-editorial.contract";
import { portalCopy } from "@/lib/copy/portal-copy";
import { PORTAL_NAME } from "@/lib/copy/portal-name";
import { ORG_SIGN_IN_FROM_PARAM } from "@/lib/auth/auth-entry-params";

/** Editorial copy SSOT for GuardianAuthFacade — maps portal sharp owl contract to Guardian modes. */
export function resolveGuardianEditorialCopy(): Record<GuardianMode, GuardianCopy> {
  return {
    night: {
      eyebrow: PORTAL_NAME,
      headline: SHARP_OWL_EDITORIAL_BY_THEME.dark.headline,
      subheadline: SHARP_OWL_EDITORIAL_BY_THEME.dark.subtitle,
      proofline: SHARP_OWL_EDITORIAL_BY_THEME.dark.seal ?? SHARP_OWL_SEAL,
    },
    day: {
      eyebrow: PORTAL_NAME,
      headline: SHARP_OWL_EDITORIAL_BY_THEME.light.headline,
      subheadline: SHARP_OWL_EDITORIAL_BY_THEME.light.subtitle,
      proofline: SHARP_OWL_EDITORIAL_BY_THEME.light.seal ?? SHARP_OWL_SEAL,
    },
  };
}

export function guardianModeFromPortalTheme(
  resolvedTheme: "light" | "dark",
): GuardianMode {
  return resolvedTheme === "dark" ? "night" : "day";
}

export function portalThemeFromGuardianMode(mode: GuardianMode): "light" | "dark" {
  return mode === "night" ? "dark" : "light";
}

/** Org operator sign-in overrides Guardian poster copy to match resolveAuthShellCopy. */
export function resolveGuardianAuthCopyOverride(input: {
  path: string;
  from?: string;
}): Partial<Record<GuardianMode, GuardianCopy>> | undefined {
  if (input.from !== ORG_SIGN_IN_FROM_PARAM || input.path !== "sign-in") {
    return undefined;
  }

  const { orgSignIn, product } = portalCopy;
  const base = resolveGuardianEditorialCopy();

  const orgPoster: GuardianCopy = {
    eyebrow: product.portalEyebrow,
    headline: orgSignIn.heroTitle,
    subheadline: orgSignIn.heroDescription,
    proofline: orgSignIn.footer,
  };

  return {
    night: { ...base.night, ...orgPoster },
    day: { ...base.day, ...orgPoster },
  };
}

/** Join invitation editorial — maps clientInvitationJoin hero to Guardian poster. */
export function resolveGuardianJoinCopyOverride(): Partial<
  Record<GuardianMode, GuardianCopy>
> {
  const { clientInvitationJoin, product } = portalCopy;
  const base = resolveGuardianEditorialCopy();

  const joinPoster: GuardianCopy = {
    eyebrow: product.secureAccessEyebrow,
    headline: clientInvitationJoin.heroTitle,
    subheadline: clientInvitationJoin.heroDescription,
    proofline: clientInvitationJoin.trustNotice,
  };

  return {
    night: { ...base.night, ...joinPoster },
    day: { ...base.day, ...joinPoster },
  };
}
