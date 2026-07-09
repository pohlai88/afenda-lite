import "server-only";

import { isAdminSession } from "@/lib/admin";
import { getAuthSession } from "@/lib/auth/get-session";
import { getClientProfile } from "@/lib/domain/clients";
import {
  getPreviewClientName,
  getPreviewClientUser,
  isPreviewClientSession,
} from "@/lib/preview-client";
import { portalCopy } from "@/lib/copy/portal-copy";
import {
  pickDisplayName,
  type PortalMember,
  type PortalMemberContext,
  type PortalMemberProfile,
} from "@/lib/portal-member-types";

export type {
  PortalMember,
  PortalMemberContext,
  PortalMemberProfile,
} from "@/lib/portal-member-types";

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
  const isOperator = isAdminSession(session) && !isPreview;
  const context: PortalMemberContext = isOperator ? "operator" : "client";

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
    context === "operator"
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

/** Preview client identity for operator team switcher (may differ from signed-in admin). */
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
