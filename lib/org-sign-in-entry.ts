import "server-only";

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import {
  isOrgAccessDeniedReason,
  ORG_ACCESS_DENIED_REASON,
  ORG_SIGN_IN_FROM_PARAM,
} from "@/lib/auth/auth-entry-params";
import { ORG_SIGN_IN_HREF } from "@/lib/admin";
import {
  appendPlaygroundEmbedQuery,
  resolvePlaygroundEmbedActive,
} from "@/lib/playground";
import { PORTAL_NAME, portalCopy } from "@/lib/portal-copy";
import {
  authSignInHref,
  sanitizeReturnToPath,
} from "@/lib/portal-routes";
import { getAuthenticatedLandingHref } from "@/lib/portal-session-routing";

export {
  isOrgAccessDeniedReason,
  isOrgSignInFrom,
  ORG_ACCESS_DENIED_REASON,
  ORG_SIGN_IN_FROM_PARAM,
} from "@/lib/auth/auth-entry-params";

/** Legacy operator sign-in URL — forwards through the canonical org entry flow. */
export const AUTH_ADMIN_LEGACY_HREF = "/auth/admin" as const;

export const orgLoginPageMetadata: Metadata = {
  title: `${PORTAL_NAME} — ${portalCopy.metadata.orgLogin.title}`,
  description: portalCopy.metadata.orgLogin.description,
};

export type OrgSignInEntrySearchParams = {
  reason?: string;
  returnTo?: string;
  embed?: string;
};

/** Named operator sign-in entry URL (before Neon Auth redirect). */
export function orgSignInEntryHref(options?: OrgSignInEntrySearchParams) {
  const params = new URLSearchParams();

  if (isOrgAccessDeniedReason(options?.reason)) {
    params.set("reason", ORG_ACCESS_DENIED_REASON);
  }

  const safeReturnTo = sanitizeReturnToPath(options?.returnTo);
  if (safeReturnTo) {
    params.set("returnTo", safeReturnTo);
  }

  const query = params.toString();
  return query ? `${ORG_SIGN_IN_HREF}?${query}` : ORG_SIGN_IN_HREF;
}

export function orgSignInAuthHref(
  reason?: string,
  returnTo?: string,
) {
  const params: Record<string, string> = { from: ORG_SIGN_IN_FROM_PARAM };

  if (isOrgAccessDeniedReason(reason)) {
    params.reason = ORG_ACCESS_DENIED_REASON;
  }

  const safeReturnTo = sanitizeReturnToPath(returnTo);
  if (safeReturnTo) {
    params.returnTo = safeReturnTo;
  }

  return authSignInHref(params);
}

/** Canonical org operator sign-in entry — session dispatch then Neon Auth UI. */
export async function redirectOrgSignInEntry(options?: {
  reason?: string;
  embed?: boolean;
  returnTo?: string;
}): Promise<never> {
  const landing = await getAuthenticatedLandingHref({ embed: options?.embed });

  if (landing) {
    redirect(sanitizeReturnToPath(options?.returnTo) ?? landing);
  }

  const target = orgSignInAuthHref(options?.reason, options?.returnTo);
  redirect(options?.embed ? appendPlaygroundEmbedQuery(target) : target);
}

/** Shared page handler for `/org/login` and legacy `/auth/admin`. */
export async function runOrgSignInEntryPage({
  searchParams,
}: {
  searchParams: Promise<OrgSignInEntrySearchParams>;
}): Promise<never> {
  const params = await searchParams;
  const embed = await resolvePlaygroundEmbedActive(params);
  return redirectOrgSignInEntry({
    reason: params.reason,
    embed,
    returnTo: params.returnTo,
  });
}
