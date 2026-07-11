import "server-only";

import { isAdminSession } from "@/modules/identity/admin";
import { getAuthSession } from "@/modules/identity/auth/get-session";
import { getClientProfile } from "@/modules/identity/domain/client-profile";
import {
  getPreviewClientName,
  getPreviewClientUser,
  isPreviewClientSession,
} from "@/modules/identity/preview-client";
import { portalCopy } from "@/modules/platform/copy/portal-copy";
import {
  pickDisplayName,
  type OrganizationMemberKind,
  type PortalMember,
  type PortalMemberProfile,
} from "@/modules/identity/portal-member-types";

export type {
  OrganizationMemberKind,
  PortalMember,
  PortalMemberProfile,
} from "@/modules/identity/portal-member-types";

type SessionLike = {
  user?: {
    id?: string;
    email?: string | null;
    name?: string | null;
    role?: string | null;
  };
} | null;

export async function resolvePortalMember(
  sessionInput?: SessionLike,
): Promise<PortalMember | null> {
  const session =
    sessionInput ??
    (await getAuthSession()) ??
    null;

  const user = session?.user;
  if (!user?.id || !user.email) {
    return null;
  }

  const isPreview = isPreviewClientSession(session);
  const isOrganizationAdmin = isAdminSession(session) && !isPreview;
  const context: OrganizationMemberKind = isOrganizationAdmin
    ? "organizationAdmin"
    : "client";

  const profileRow = await getClientProfile(user.id);
  const profile: PortalMemberProfile | null = profileRow
    ? {
        fullLegalName: profileRow.fullLegalName,
        entityName: profileRow.entityName,
        onboardingComplete: profileRow.onboardingComplete,
      }
    : null;

  const displayName = pickDisplayName({
    fullLegalName: profile?.fullLegalName,
    authName: user.name,
    email: user.email,
  });

  const subtitle =
    context === "organizationAdmin"
      ? portalCopy.nav.organization
      : (profile?.entityName?.trim() ||
          portalCopy.clientDashboard.eyebrow);

  return {
    userId: user.id,
    email: user.email,
    authName: user.name ?? null,
    displayName,
    subtitle,
    role: user.role ?? null,
    context,
    isPreviewSession: isPreview,
    profile,
  };
}

/** Preview client identity for organization-admin team switcher (may differ from signed-in admin). */
export async function resolvePreviewClientMember(): Promise<PortalMember | null> {
  const previewUser = await getPreviewClientUser();
  if (!previewUser) {
    return null;
  }

  const profileRow = await getClientProfile(previewUser.id);
  const profile: PortalMemberProfile | null = profileRow
    ? {
        fullLegalName: profileRow.fullLegalName,
        entityName: profileRow.entityName,
        onboardingComplete: profileRow.onboardingComplete,
      }
    : null;

  const displayName = pickDisplayName({
    fullLegalName: profile?.fullLegalName,
    authName: previewUser.name,
    email: previewUser.email,
    fallback: getPreviewClientName(),
  });

  return {
    userId: previewUser.id,
    email: previewUser.email,
    authName: previewUser.name,
    displayName,
    subtitle: profile?.entityName?.trim() || portalCopy.clientDashboard.eyebrow,
    role: "user",
    context: "client",
    isPreviewSession: false,
    profile,
  };
}
