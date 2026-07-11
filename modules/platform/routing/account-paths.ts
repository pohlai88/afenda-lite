import { accountViewPaths } from "@neondatabase/auth-ui/server";
import type { OrganizationMemberKind } from "@/modules/identity/portal-member-types";
import { portalCopy } from "@/modules/platform/copy/portal-copy";
import { CLIENT_PROFILE_HREF } from "@/modules/platform/routing/portal-routes";
import {
  CLIENT_HOME_HREF,
  ORGANIZATION_ADMIN_DASHBOARD_HREF,
} from "@/modules/identity/client-session";

/** Organization-admin account tabs exposed in the portal (Neon teams/org paths omitted). */
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

/** Default landing route for `/account` — organization admins use settings; clients use declarant profile. */
export function resolvePortalAccountIndexHref(context: OrganizationMemberKind) {
  return context === "organizationAdmin"
    ? PORTAL_ACCOUNT_SETTINGS_HREF
    : CLIENT_PROFILE_HREF;
}

/** Clients manage profile at `/client/profile`; organization admins use Neon AccountView settings. */
export function resolveAccountSettingsHref(context: OrganizationMemberKind) {
  return context === "organizationAdmin"
    ? PORTAL_ACCOUNT_SETTINGS_HREF
    : CLIENT_PROFILE_HREF;
}

export function resolveAccountSettingsLabel(context: OrganizationMemberKind) {
  return context === "organizationAdmin"
    ? portalCopy.userMenu.accountSettings
    : portalCopy.clientNav.declarantProfile;
}

/** Section nav for `/account/[path]` — settings href/label varies by member kind (BL-07). */
export function resolveAccountSectionNavItems(
  context: OrganizationMemberKind,
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

/** Enforce member-kind account routes before rendering AccountView. */
export function resolveAccountPathAccess(
  context: OrganizationMemberKind,
  path: PortalAccountPath,
): AccountPathAccess {
  if (context === "client" && path === accountViewPaths.SETTINGS) {
    return { allowed: false, redirectHref: CLIENT_PROFILE_HREF };
  }

  return { allowed: true };
}

export function resolveAccountShellBack(context: OrganizationMemberKind) {
  return context === "organizationAdmin"
    ? {
        href: ORGANIZATION_ADMIN_DASHBOARD_HREF,
        label: portalCopy.account.backToDashboard,
      }
    : {
        href: CLIENT_HOME_HREF,
        label: portalCopy.clientDashboard.backToAssignments,
      };
}
