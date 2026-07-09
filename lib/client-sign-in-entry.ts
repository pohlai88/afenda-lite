import "server-only";

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import {
  CLIENT_CHECK_EMAIL_REASON,
  CLIENT_INVITE_EXPIRED_REASON,
  CLIENT_INVITE_INVALID_REASON,
  CLIENT_LOGIN_REQUIRED_REASON,
  resolveClientAuthReasonNotice,
} from "@/lib/auth/auth-entry-params";
import {
  appendPlaygroundEmbedQuery,
  resolvePlaygroundEmbedActive,
} from "@/lib/playground";
import { PORTAL_NAME, portalCopy } from "@/lib/portal-copy";
import {
  AUTH_SIGN_IN_HREF,
  CLIENT_SIGN_IN_ENTRY_HREF,
  authSignInHref,
  sanitizeReturnToPath,
} from "@/lib/portal-routes";
import { getAuthenticatedLandingHref } from "@/lib/portal-session-routing";

export {
  CLIENT_CHECK_EMAIL_REASON,
  CLIENT_INVITE_EXPIRED_REASON,
  CLIENT_INVITE_INVALID_REASON,
  CLIENT_LOGIN_REQUIRED_REASON,
  resolveClientAuthReasonNotice,
} from "@/lib/auth/auth-entry-params";

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

/** Named client sign-in entry — session dispatch then Neon Auth UI. */
export async function redirectClientSignInEntry(options?: {
  reason?: string;
  embed?: boolean;
}): Promise<never> {
  const landing = await getAuthenticatedLandingHref({ embed: options?.embed });

  if (landing) {
    redirect(landing);
  }

  const target = clientSignInAuthHref(options?.reason);
  redirect(options?.embed ? appendPlaygroundEmbedQuery(target) : target);
}

/** Shared page handler for `/client/login` and the root session router at `/`. */
export async function runClientSignInEntryPage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string; embed?: string }>;
}): Promise<never> {
  const params = await searchParams;
  const embed = await resolvePlaygroundEmbedActive(params);
  return redirectClientSignInEntry({ reason: params.reason, embed });
}
