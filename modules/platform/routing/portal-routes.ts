import { ORG_ACCESS_DENIED_HREF, ORG_SIGN_IN_HREF } from "@/modules/identity/admin";
import {
  CLIENT_HOME_HREF,
  CLIENT_ONBOARDING_HREF,
  OPERATOR_DASHBOARD_HREF,
} from "@/modules/identity/client-session";

export {
  CLIENT_HOME_HREF,
  CLIENT_ONBOARDING_HREF,
  OPERATOR_DASHBOARD_HREF,
  ORG_ACCESS_DENIED_HREF,
  ORG_SIGN_IN_HREF,
};

/** Session router entry — dispatches authenticated users before auth UI. */
export const HOME_HREF = "/" as const;

/** Named client sign-in entry (share links, QR codes, emails). */
export const CLIENT_SIGN_IN_ENTRY_HREF = "/client/login" as const;

/** Dedicated client org invitation entry — Neon Auth UI sign-up then accept. */
export const CLIENT_JOIN_HREF = "/join" as const;

export function buildClientJoinHref(invitationId: string) {
  return `${CLIENT_JOIN_HREF}?invitationId=${encodeURIComponent(invitationId)}`;
}

/** Neon Auth UI (matches `proxy.ts` loginUrl). */
export const AUTH_SIGN_IN_HREF = "/auth/sign-in" as const;
export const AUTH_SIGN_UP_HREF = "/auth/sign-up" as const;
export const AUTH_FORGOT_PASSWORD_HREF = "/auth/forgot-password" as const;
export const AUTH_RESET_PASSWORD_HREF = "/auth/reset-password" as const;
export const AUTH_SIGN_OUT_HREF = "/auth/sign-out" as const;

export const CLIENT_PROFILE_HREF = "/client/profile" as const;
export const OPERATOR_CLIENTS_HREF = "/dashboard/clients" as const;
export const CLIENT_PREVIEW_UNAVAILABLE_HREF = "/client/preview-unavailable" as const;

/** Feed Farm Trade event engine (locale deferred — flat /trade paths). */
export const TRADE_HOME_HREF = "/trade/events" as const;

/** @deprecated Locale ignored; use TRADE_HOME_HREF or tradeHref(path). */
export function tradeHrefForLocale(_locale: "vi" | "en", path = "/events") {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `/trade${normalized}`;
}

export function clientPostAuthHref(onboardingComplete: boolean) {
  return onboardingComplete ? CLIENT_HOME_HREF : CLIENT_ONBOARDING_HREF;
}

export function operatorDeclarationHref(id: string) {
  return `/dashboard/${id}`;
}

export function operatorDeclarationManageHref(id: string) {
  return `/dashboard/${id}?tab=manage`;
}

export function clientDeclareHref(assignmentId: string) {
  return `/client/declare/${assignmentId}`;
}

export function secureLinkHref(token: string) {
  return `/f/${token}`;
}

export function openSurveyHref(slug: string) {
  return `/survey/${slug}`;
}

const RETURN_TO_PREFIXES = [
  "/f/",
  "/survey/",
  "/client/",
  "/invite/",
  "/join",
] as const;

export function sanitizeReturnToPath(value: string | undefined) {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) {
    return null;
  }

  if (!RETURN_TO_PREFIXES.some((prefix) => trimmed.startsWith(prefix))) {
    return null;
  }

  return trimmed;
}

export function playgroundScreenHref(screenId: string) {
  return `/playground/${screenId}`;
}

/** Local-only developer harness routes. */
export const PLAYGROUND_HREF = "/playground" as const;
export const PLAYGROUND_HITL_REVIEW_HREF = "/playground/hitl-review" as const;
export const PLAYGROUND_COVERAGE_HREF = "/playground/coverage" as const;

function authHref(
  pathname: typeof AUTH_SIGN_IN_HREF | typeof AUTH_SIGN_UP_HREF,
  params?: Record<string, string>,
) {
  if (!params || Object.keys(params).length === 0) {
    return pathname;
  }

  const query = new URLSearchParams(params);
  return `${pathname}?${query.toString()}`;
}

export function authSignInHref(params?: Record<string, string>) {
  return authHref(AUTH_SIGN_IN_HREF, params);
}

export function authSignUpHref(params?: Record<string, string>) {
  return authHref(AUTH_SIGN_UP_HREF, params);
}

function clientAuthParams(reason?: string, returnTo?: string) {
  const params: Record<string, string> = {};
  if (reason) {
    params.reason = reason;
  }

  const safeReturnTo = sanitizeReturnToPath(returnTo);
  if (safeReturnTo) {
    params.returnTo = safeReturnTo;
  }

  return params;
}

/** Neon Auth sign-in with optional reason + sanitized returnTo. */
export function clientSignInAuthHref(reason?: string, returnTo?: string) {
  const params = clientAuthParams(reason, returnTo);
  if (Object.keys(params).length === 0) {
    return AUTH_SIGN_IN_HREF;
  }

  return authSignInHref(params);
}

/** Neon Auth sign-up with the same safe query policy as sign-in. */
export function clientSignUpAuthHref(reason?: string, returnTo?: string) {
  const params = clientAuthParams(reason, returnTo);
  if (Object.keys(params).length === 0) {
    return AUTH_SIGN_UP_HREF;
  }

  return authSignUpHref(params);
}
