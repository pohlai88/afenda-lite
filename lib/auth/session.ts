import "server-only";

/**
 * S1 session guards — operator and client route enforcement.
 *
 * - `requireAdminSession` / `requireClientSession` — redirecting page guards
 * - `guardClientSession` — non-redirecting gate for JSON APIs (`declaration-draft`)
 * - `rejectNonOperatorSignIn` — org login boundary (sign-out + audit on denial)
 *
 * Operator role check: `lib/admin.ts` (`isAdminSession`). Neon Admin APIs: `lib/auth/admin.ts`.
 */
import { cache } from "react";
import { redirect } from "next/navigation";
import {
  isAdminSession,
  ORG_ACCESS_DENIED_HREF,
  toAdminAuthenticatedSession,
  type AdminAuthenticatedSession,
} from "@/lib/admin";
import { recordAuditEvent } from "@/lib/domain/audit";
import { bootstrapClientAfterAuth } from "@/lib/auth/bootstrap-client-invite";
import { getAuthSession } from "@/lib/auth/get-session";
import { auth } from "@/lib/auth/server";
import {
  CLIENT_ONBOARDING_HREF,
  toClientAuthenticatedSession,
  toPreviewClientSession,
  type ClientAuthenticatedSession,
} from "@/lib/client-session";
import { getClientProfile } from "@/lib/domain/clients";
import {
  AUTH_SIGN_IN_HREF,
  OPERATOR_DASHBOARD_HREF,
} from "@/lib/routing/portal-routes";
import {
  isPlaygroundEmbedRequest,
  isPlaygroundEnabled,
} from "@/lib/playground/playground";
import { portalCopy } from "@/lib/copy/portal-copy";
import {
  clientPreviewUnavailableHref,
  getPreviewClientUser,
} from "@/lib/preview-client";

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

export type ClientSessionGuardReason =
  | "unauthenticated"
  | "operator"
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
    return { allowed: false, reason: "operator" };
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
      case "operator":
        redirect(OPERATOR_DASHBOARD_HREF);
      case "onboarding_incomplete":
        redirect(CLIENT_ONBOARDING_HREF);
      case "preview_unavailable":
        redirect(clientPreviewUnavailableHref({ embed: true }));
    }
  }

  return guard.session;
}
