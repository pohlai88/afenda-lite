import { portalCopy } from "@/modules/platform/copy/portal-copy";

/** Organization member kind — organization admin vs client (declarant). */
export type OrganizationMemberKind = "organizationAdmin" | "client";

export type PortalMemberProfile = {
  fullLegalName: string | null;
  entityName: string | null;
  onboardingComplete: boolean;
};

export type PortalMember = {
  userId: string;
  email: string;
  authName: string | null;
  displayName: string;
  subtitle: string;
  role: string | null;
  context: OrganizationMemberKind;
  isPreviewSession: boolean;
  profile: PortalMemberProfile | null;
};

export function pickDisplayName(input: {
  fullLegalName?: string | null;
  authName?: string | null;
  email?: string | null;
  fallback?: string;
}) {
  const legal = input.fullLegalName?.trim();
  if (legal) return legal;

  const auth = input.authName?.trim();
  if (auth) return auth;

  const email = input.email?.trim();
  if (email) return email;

  return input.fallback ?? "Account";
}

export function memberInitials(name: string, email: string | null) {
  const source = name.trim() || email?.trim() || "iAM";
  return source
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function fallbackOrganizationAdminMember(
  displayName: string,
): PortalMember {
  return {
    userId: "",
    email: "",
    authName: null,
    displayName,
    subtitle: portalCopy.nav.organization,
    role: "admin",
    context: "organizationAdmin",
    isPreviewSession: false,
    profile: null,
  };
}

export type AuthSessionUser = {
  id?: string;
  email?: string | null;
  name?: string | null;
  role?: string | null;
};

/** Client-safe kind inference — mirrors server `resolvePortalMember` when profile is unavailable. */
export function resolveOrganizationMemberKind(
  role: string | null | undefined,
): OrganizationMemberKind {
  return role === "admin" ? "organizationAdmin" : "client";
}

export function resolvePortalMemberSubtitle(
  context: OrganizationMemberKind,
): string {
  return context === "organizationAdmin"
    ? portalCopy.nav.organization
    : portalCopy.clientDashboard.eyebrow;
}

/** Fallback member for menus when server-synced `PortalMember` is not available yet. */
export function resolvePortalMemberFromSession(
  synced: PortalMember | null | undefined,
  sessionUser: AuthSessionUser | undefined,
): PortalMember | null {
  if (synced) {
    return synced;
  }

  if (!sessionUser?.id || !sessionUser.email) {
    return null;
  }

  const context = resolveOrganizationMemberKind(sessionUser.role);

  return {
    userId: sessionUser.id,
    email: sessionUser.email,
    authName: sessionUser.name ?? null,
    displayName: pickDisplayName({
      authName: sessionUser.name,
      email: sessionUser.email,
    }),
    subtitle: resolvePortalMemberSubtitle(context),
    role: sessionUser.role ?? null,
    context,
    isPreviewSession: false,
    profile: null,
  };
}
