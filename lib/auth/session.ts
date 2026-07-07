import "server-only";

import { redirect } from "next/navigation";
import {
  isAdminSession,
  ORG_ACCESS_DENIED_HREF,
  toAdminAuthenticatedSession,
  type AdminAuthenticatedSession,
} from "@/lib/admin";
import { recordAuditEvent } from "@/lib/audit";
import { bootstrapClientAfterAuth } from "@/lib/auth/bootstrap-client-invite";
import { getAuthSession } from "@/lib/auth/get-session";
import { auth } from "@/lib/auth/server";
import {
  CLIENT_ONBOARDING_HREF,
  toClientAuthenticatedSession,
  toPreviewClientSession,
  type ClientAuthenticatedSession,
} from "@/lib/client-session";
import { getClientProfile } from "@/lib/clients";
import {
  AUTH_SIGN_IN_HREF,
  OPERATOR_DASHBOARD_HREF,
} from "@/lib/portal-routes";
import {
  isPlaygroundEmbedRequest,
  isPlaygroundEnabled,
} from "@/lib/playground";
import { portalCopy } from "@/lib/portal-copy";
import {
  clientPreviewUnavailableHref,
  getPreviewClientUser,
} from "@/lib/preview-client";

export async function requireAdminSession(): Promise<AdminAuthenticatedSession> {
  const session = await getAuthSession();
  const authenticated = toAdminAuthenticatedSession(session);

  if (!authenticated || !isAdminSession(authenticated)) {
    redirect(ORG_ACCESS_DENIED_HREF);
  }

  return authenticated;
}

export async function rejectNonOperatorSignIn(signedInEmail: string) {
  const session = await getAuthSession();

  if (isAdminSession(session, signedInEmail)) {
    return null;
  }

  await auth.signOut();
  await recordAuditEvent({
    eventType: "auth.sign_in_failed",
    resourceType: "session",
    metadata: { surface: "org", reason: "access_denied" },
  });

  return { error: portalCopy.orgSignIn.accessDenied };
}

export async function requireClientSession(options?: {
  requireOnboarding?: boolean;
}): Promise<ClientAuthenticatedSession> {
  const session = await getAuthSession();
  const embed = await isPlaygroundEmbedRequest();

  if (
    embed &&
    isPlaygroundEnabled() &&
    isAdminSession(session) &&
    session?.user
  ) {
    const previewUser = await getPreviewClientUser();
    if (!previewUser) {
      redirect(clientPreviewUnavailableHref({ embed: true }));
    }

    const previewSession = toPreviewClientSession(previewUser);

    if (options?.requireOnboarding) {
      const profile = await getClientProfile(previewSession.user.id);
      if (!profile?.onboardingComplete) {
        redirect(CLIENT_ONBOARDING_HREF);
      }
    }

    return previewSession;
  }

  const authenticated = toClientAuthenticatedSession(session);
  if (!authenticated) {
    redirect(AUTH_SIGN_IN_HREF);
  }

  if (isAdminSession(authenticated)) {
    redirect(OPERATOR_DASHBOARD_HREF);
  }

  await bootstrapClientAfterAuth({
    userId: authenticated.user.id,
    email: authenticated.user.email,
  });

  if (options?.requireOnboarding) {
    const profile = await getClientProfile(authenticated.user.id);
    if (!profile?.onboardingComplete) {
      redirect(CLIENT_ONBOARDING_HREF);
    }
  }

  return authenticated;
}
