import { isOrgSignInFrom } from "@/modules/identity/auth/auth-entry-params";

/**
 * When false, PortalAuthFormIntro returns null on Studio routes — Neon AuthView
 * already owns title, description, expiry hints, and auth-method links.
 * Only org operator sign-in keeps a portal-owned heading (distinct from Neon).
 */
export function resolveShowVaultHeading(input: {
  path: string;
  from?: string;
}): boolean {
  if (isOrgSignInFrom(input.from) && input.path === "sign-in") {
    return true;
  }

  return false;
}
