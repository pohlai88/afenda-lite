import { ORG_ACCESS_DENIED_HREF, ORG_SIGN_IN_HREF } from "@/lib/admin";
import {
  CLIENT_HOME_HREF,
  CLIENT_ONBOARDING_HREF,
  OPERATOR_DASHBOARD_HREF,
} from "@/lib/client-session";

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
export const AUTH_FORGOT_PASSWORD_HREF = "/auth/forgot-password" as const;
export const AUTH_RESET_PASSWORD_HREF = "/auth/reset-password" as const;
export const AUTH_SIGN_OUT_HREF = "/auth/sign-out" as const;

export const CLIENT_PROFILE_HREF = "/client/profile" as const;
export const OPERATOR_CLIENTS_HREF = "/dashboard/clients" as const;
export const CLIENT_PREVIEW_UNAVAILABLE_HREF = "/client/preview-unavailable" as const;

/** Hot Sales event engine (trade-scoped i18n). */
export const TRADE_HOME_HREF = "/trade/vi/events" as const;

export function tradeHrefForLocale(locale: "vi" | "en", path = "/events") {
  return `/trade/${locale}${path.startsWith("/") ? path : `/${path}`}`;
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

export {
  PLAYGROUND_HREF,
  PLAYGROUND_HITL_REVIEW_HREF,
} from "@/lib/playground/playground-nav";

export function authSignInHref(params?: Record<string, string>) {
  if (!params || Object.keys(params).length === 0) {
    return AUTH_SIGN_IN_HREF;
  }

  const query = new URLSearchParams(params);
  return `${AUTH_SIGN_IN_HREF}?${query.toString()}`;
}
