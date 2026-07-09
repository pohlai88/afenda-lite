import { portalCopy } from "@/lib/portal-copy";

export const ORG_SIGN_IN_FROM_PARAM = "org" as const;
export const ORG_ACCESS_DENIED_REASON = "access-denied" as const;

export const CLIENT_LOGIN_REQUIRED_REASON = "login-required" as const;
export const CLIENT_CHECK_EMAIL_REASON = "check-email" as const;
export const CLIENT_INVITE_EXPIRED_REASON = "invite-expired" as const;
export const CLIENT_INVITE_INVALID_REASON = "invite-invalid" as const;

export function isOrgSignInFrom(value: string | undefined) {
  return value === ORG_SIGN_IN_FROM_PARAM;
}

export function isOrgAccessDeniedReason(value: string | undefined) {
  return value === ORG_ACCESS_DENIED_REASON;
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
