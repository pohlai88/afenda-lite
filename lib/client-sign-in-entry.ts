import "server-only";

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { isPlaygroundEmbedRequest } from "@/lib/playground";
import { PORTAL_NAME, portalCopy } from "@/lib/portal-copy";
import {
  AUTH_SIGN_IN_HREF,
  CLIENT_SIGN_IN_ENTRY_HREF,
  authSignInHref,
  sanitizeReturnToPath,
} from "@/lib/portal-routes";
import { getAuthenticatedLandingHref } from "@/lib/portal-session-routing";

export const CLIENT_LOGIN_REQUIRED_REASON = "login-required" as const;
export const CLIENT_CHECK_EMAIL_REASON = "check-email" as const;
export const CLIENT_INVITE_EXPIRED_REASON = "invite-expired" as const;
export const CLIENT_INVITE_INVALID_REASON = "invite-invalid" as const;

export const clientLoginPageMetadata: Metadata = {
  title: `${PORTAL_NAME} — ${portalCopy.metadata.home.title}`,
  description: portalCopy.metadata.home.description,
};

export function clientSignInEntryHref(reason?: string) {
  if (!reason) {
    return CLIENT_SIGN_IN_ENTRY_HREF;
  }

  return `${CLIENT_SIGN_IN_ENTRY_HREF}?reason=${encodeURIComponent(reason)}`;
}

export function clientSignInAuthHref(reason?: string, returnTo?: string) {
  const params: Record<string, string> = {};
  if (reason) {
    params.reason = reason;
  }

  const safeReturnTo = sanitizeReturnToPath(returnTo);
  if (safeReturnTo) {
    params.returnTo = safeReturnTo;
  }

  if (Object.keys(params).length === 0) {
    return AUTH_SIGN_IN_HREF;
  }

  return authSignInHref(params);
}

export function resolveClientAuthReasonNotice(reason?: string) {
  if (reason === CLIENT_LOGIN_REQUIRED_REASON) {
    return portalCopy.signIn.loginRequiredHint;
  }

  if (reason === CLIENT_CHECK_EMAIL_REASON) {
    return portalCopy.signIn.checkEmailHint;
  }

  if (reason === CLIENT_INVITE_EXPIRED_REASON) {
    return portalCopy.signIn.inviteExpiredHint;
  }

  if (reason === CLIENT_INVITE_INVALID_REASON) {
    return portalCopy.signIn.inviteInvalidHint;
  }

  return null;
}

/** Named client sign-in entry — session dispatch then Neon Auth UI. */
export async function redirectClientSignInEntry(options?: {
  reason?: string;
  embed?: boolean;
}): Promise<never> {
  const landing = await getAuthenticatedLandingHref({ embed: options?.embed });

  if (landing) {
    redirect(landing);
  }

  redirect(clientSignInAuthHref(options?.reason));
}

/** Shared page handler for `/client/login` and the root session router at `/`. */
export async function runClientSignInEntryPage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string }>;
}): Promise<never> {
  const [{ reason }, embed] = await Promise.all([
    searchParams,
    isPlaygroundEmbedRequest(),
  ]);
  return redirectClientSignInEntry({ reason, embed });
}
