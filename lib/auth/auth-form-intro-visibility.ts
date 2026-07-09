import { isOrgSignInFrom } from "@/lib/auth/auth-entry-params";

/** Paths where portal-owned h2 copy differs from the Neon AuthView card title. */
const PATHS_WITH_DISTINCT_PORTAL_HEADING = new Set(["email-otp", "magic-link"]);

/**
 * When false, PortalAuthFormIntro still renders alternate links and hints but
 * skips the vault h2/description Neon already shows in the AuthView card.
 */
export function resolveShowVaultHeading(input: {
  path: string;
  from?: string;
}): boolean {
  if (isOrgSignInFrom(input.from) && input.path === "sign-in") {
    return true;
  }

  return PATHS_WITH_DISTINCT_PORTAL_HEADING.has(input.path);
}
