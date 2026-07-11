import "server-only";

/**
 * S1 session guards — organization admin, member, and client route enforcement.
 *
 * - `requireMemberSession` — Declarations module / shared AdminCN shell
 * - `requireAdminSession` — organization admin routes and mutations
 * - `requireClientSession` — redirecting client workspace guards
 * - `guardClientSession` — non-redirecting gate for JSON APIs (`declaration-draft`)
 * - `rejectNonOrganizationAdminSignIn` — org login boundary (sign-out + audit on denial)
 *
 * Organization-admin check: `modules/identity/admin` (`isAdminSession`).
 */
import { cache } from "react";
import { redirect } from "next/navigation";
import {
  isAdminSession,
  ORG_ACCESS_DENIED_HREF,
  toAdminAuthenticatedSession,
  type AdminAuthenticatedSession,
} from "@/modules/identity/admin";
import { recordAuditEvent } from "@/modules/platform/audit";
import { bootstrapClientAfterAuth } from "@/modules/identity/auth/bootstrap-client-invite";
import { getAuthSession } from "@/modules/identity/auth/get-session";
import { auth } from "@/modules/identity/auth/server";
import {
  CLIENT_ONBOARDING_HREF,
  toClientAuthenticatedSession,
  toPreviewClientSession,
  type ClientAuthenticatedSession,
} from "@/modules/identity/client-session";
import { getClientProfile } from "@/modules/identity/domain/client-profile";
import {
  AUTH_SIGN_IN_HREF,
  ORGANIZATION_ADMIN_DASHBOARD_HREF,
} from "@/modules/platform/routing/portal-routes";
import {
  isPlaygroundEmbedRequest,
  isPlaygroundEnabled,
} from "@/modules/platform/playground-embed";
import { portalCopy } from "@/modules/platform/copy/portal-copy";
import {
  clientPreviewUnavailableHref,
  getPreviewClientUser,
} from "@/modules/identity/preview-client";

export const requireAdminSession = cache(
  async (): Promise<AdminAuthenticatedSession> => {
    const session = await getAuthSession();
    const authenticated = toAdminAuthenticatedSession(session);

    if (!authenticated || !isAdminSession(authenticated)) {
      redirect(ORG_ACCESS_DENIED_HREF);
    }

    return authenticated;
  },
);

/**
 * Authenticated org member — Declarations module gate.
 * Organization admin is a separate role (`requireAdminSession` / admin routes).
 */
export const requireMemberSession = cache(async () => {
  const session = await getAuthSession();
  const user = session?.user;
  if (!user?.id || !user.email) {
    redirect(AUTH_SIGN_IN_HREF);
  }

  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name ?? null,
      role: user.role ?? null,
    },
  };
});

export async function rejectNonOrganizationAdminSignIn(signedInEmail: string) {
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

export type ClientSessionGuardReason =
  | "unauthenticated"
  | "organizationAdmin"
  | "onboarding_incomplete"
  | "preview_unavailable";

export type ClientSessionGuardResult =
  | { allowed: true; session: ClientAuthenticatedSession }
  | { allowed: false; reason: ClientSessionGuardReason };

/** Non-redirecting client session gate — shared by pages and JSON API routes. */
export async function guardClientSession(options?: {
  requireOnboarding?: boolean;
}): Promise<ClientSessionGuardResult> {
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
      return { allowed: false, reason: "preview_unavailable" };
    }

    const previewSession = toPreviewClientSession(previewUser);

    if (options?.requireOnboarding) {
      const profile = await getClientProfile(previewSession.user.id);
      if (!profile?.onboardingComplete) {
        return { allowed: false, reason: "onboarding_incomplete" };
      }
    }

    return { allowed: true, session: previewSession };
  }

  const authenticated = toClientAuthenticatedSession(session);
  if (!authenticated) {
    return { allowed: false, reason: "unauthenticated" };
  }

  if (isAdminSession(authenticated)) {
    return { allowed: false, reason: "organizationAdmin" };
  }

  await bootstrapClientAfterAuth({
    userId: authenticated.user.id,
    email: authenticated.user.email,
  });

  if (options?.requireOnboarding) {
    const profile = await getClientProfile(authenticated.user.id);
    if (!profile?.onboardingComplete) {
      return { allowed: false, reason: "onboarding_incomplete" };
    }
  }

  return { allowed: true, session: authenticated };
}

export async function requireClientSession(options?: {
  requireOnboarding?: boolean;
}): Promise<ClientAuthenticatedSession> {
  const guard = await guardClientSession(options);

  if (!guard.allowed) {
    switch (guard.reason) {
      case "unauthenticated":
        redirect(AUTH_SIGN_IN_HREF);
      case "organizationAdmin":
        redirect(ORGANIZATION_ADMIN_DASHBOARD_HREF);
      case "onboarding_incomplete":
        redirect(CLIENT_ONBOARDING_HREF);
      case "preview_unavailable":
        redirect(clientPreviewUnavailableHref({ embed: true }));
    }
  }

  return guard.session;
}
