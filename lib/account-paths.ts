import { accountViewPaths } from "@neondatabase/auth-ui/server";
import type { PortalMemberContext } from "@/lib/portal-member-types";
import { portalCopy } from "@/lib/portal-copy";
import { CLIENT_PROFILE_HREF } from "@/lib/portal-routes";
import { CLIENT_HOME_HREF, OPERATOR_DASHBOARD_HREF } from "@/lib/client-session";

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

export type AccountSectionNavItem = {
  path: PortalAccountPath;
  href: string;
  label: string;
};

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

/** Clients manage profile at `/client/profile`; operators use Neon AccountView settings. */
export function resolveAccountSettingsHref(context: PortalMemberContext) {
  return context === "operator"
    ? PORTAL_ACCOUNT_SETTINGS_HREF
    : CLIENT_PROFILE_HREF;
}

export function resolveAccountSettingsLabel(context: PortalMemberContext) {
  return context === "operator"
    ? portalCopy.userMenu.accountSettings
    : portalCopy.clientNav.declarantProfile;
}

/** Section nav for `/account/[path]` — settings href/label varies by persona (BL-07). */
export function resolveAccountSectionNavItems(
  context: PortalMemberContext,
): AccountSectionNavItem[] {
  return [
    {
      path: accountViewPaths.SETTINGS,
      href: resolveAccountSettingsHref(context),
      label: resolveAccountSettingsLabel(context),
    },
    {
      path: accountViewPaths.SECURITY,
      href: PORTAL_ACCOUNT_SECURITY_HREF,
      label: portalCopy.userMenu.accountSecurity,
    },
  ];
}

export type AccountPathAccess =
  | { allowed: true }
  | { allowed: false; redirectHref: string };

/** Enforce persona-specific account routes before rendering AccountView. */
export function resolveAccountPathAccess(
  context: PortalMemberContext,
  path: PortalAccountPath,
): AccountPathAccess {
  if (context === "client" && path === accountViewPaths.SETTINGS) {
    return { allowed: false, redirectHref: CLIENT_PROFILE_HREF };
  }

  return { allowed: true };
}

export function resolveAccountShellBack(context: PortalMemberContext) {
  return context === "operator"
    ? {
        href: OPERATOR_DASHBOARD_HREF,
        label: portalCopy.account.backToDashboard,
      }
    : {
        href: CLIENT_HOME_HREF,
        label: portalCopy.clientDashboard.backToAssignments,
      };
}
