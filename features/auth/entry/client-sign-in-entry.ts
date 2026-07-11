import "server-only";

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import {
  CLIENT_CHECK_EMAIL_REASON,
  CLIENT_INVITE_EXPIRED_REASON,
  CLIENT_INVITE_INVALID_REASON,
  CLIENT_LOGIN_REQUIRED_REASON,
  resolveClientAuthReasonNotice,
} from "@/modules/identity/auth/auth-entry-params";
import {
  resolvePlaygroundEmbedActive,
} from "@/modules/platform/playground-embed";
import { PORTAL_NAME, portalCopy } from "@/modules/platform/copy/portal-copy";
import {
  CLIENT_SIGN_IN_ENTRY_HREF,
  buildClientSignInEmbedRedirectPath,
  clientSignInAuthHref,
  clientSignUpAuthHref,
} from "@/modules/platform/routing/portal-routes";
import { getAuthenticatedLandingHref } from "@/modules/platform/routing/portal-session-routing";

export {
  CLIENT_CHECK_EMAIL_REASON,
  CLIENT_INVITE_EXPIRED_REASON,
  CLIENT_INVITE_INVALID_REASON,
  CLIENT_LOGIN_REQUIRED_REASON,
  resolveClientAuthReasonNotice,
} from "@/modules/identity/auth/auth-entry-params";
export {
  clientSignInAuthHref,
  clientSignUpAuthHref,
} from "@/modules/platform/routing/portal-routes";

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

/** Named client sign-in entry — session dispatch then Neon Auth UI. */
export async function redirectClientSignInEntry(options?: {
  reason?: string;
  embed?: boolean;
}): Promise<never> {
  const landing = await getAuthenticatedLandingHref({ embed: options?.embed });

  if (landing) {
    redirect(landing);
  }

  if (options?.embed) {
    redirect(buildClientSignInEmbedRedirectPath({ reason: options.reason }));
  }

  redirect(clientSignInAuthHref(options?.reason));
}

/** Page handler for the named `/client/login` entry. */
export async function runClientSignInEntryPage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string; embed?: string }>;
}): Promise<never> {
  const params = await searchParams;
  const embed = await resolvePlaygroundEmbedActive(params);
  return redirectClientSignInEntry({ reason: params.reason, embed });
}
