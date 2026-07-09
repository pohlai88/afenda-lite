import { portalCopy } from "@/lib/portal-copy";

export type PortalMemberContext = "operator" | "client";

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
  context: PortalMemberContext;
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

export function fallbackOperatorMember(displayName: string): PortalMember {
  return {
    userId: "",
    email: "",
    authName: null,
    displayName,
    subtitle: portalCopy.nav.organization,
    role: "admin",
    context: "operator",
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

/** Client-safe context inference — mirrors server `resolvePortalMember` when profile is unavailable. */
export function resolvePortalMemberContext(
  role: string | null | undefined,
): PortalMemberContext {
  return role === "admin" ? "operator" : "client";
}

export function resolvePortalMemberSubtitle(
  context: PortalMemberContext,
): string {
  return context === "operator"
    ? portalCopy.nav.organization
    : portalCopy.clientDashboard.eyebrow;
}

/** Fallback member for menus when server-synced `PortalMember` is not in context yet. */
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

  const context = resolvePortalMemberContext(sessionUser.role);

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
