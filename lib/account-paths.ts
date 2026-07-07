import { accountViewPaths } from "@neondatabase/auth/react/ui/server";
import type { PortalMemberContext } from "@/lib/portal-member-types";
import { CLIENT_PROFILE_HREF } from "@/lib/portal-routes";

/** Operator account tabs exposed in the portal (Neon teams/org paths omitted). */
export const PORTAL_ACCOUNT_PATHS = [
  accountViewPaths.SETTINGS,
  accountViewPaths.SECURITY,
] as const;

export type PortalAccountPath = (typeof PORTAL_ACCOUNT_PATHS)[number];

export const PORTAL_ACCOUNT_SETTINGS_HREF =
  `/account/${accountViewPaths.SETTINGS}` as const;

export const PORTAL_ACCOUNT_SECURITY_HREF =
  `/account/${accountViewPaths.SECURITY}` as const;

export function isPortalAccountPath(path: string): path is PortalAccountPath {
  return (PORTAL_ACCOUNT_PATHS as readonly string[]).includes(path);
}

export function accountCopyKey(path: PortalAccountPath): "settings" | "security" {
  return path === accountViewPaths.SECURITY ? "security" : "settings";
}

/** Default landing route for `/account` — operators use settings; clients use declarant profile. */
export function resolvePortalAccountIndexHref(context: PortalMemberContext) {
  return context === "operator"
    ? PORTAL_ACCOUNT_SETTINGS_HREF
    : CLIENT_PROFILE_HREF;
}
