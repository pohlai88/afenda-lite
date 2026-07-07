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
