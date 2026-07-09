import {
  isOrgAccessDeniedReason,
  isOrgSignInFrom,
  resolveClientAuthReasonNotice,
} from "@/lib/auth/auth-entry-params";

/** Auth paths that redirect authenticated users before rendering the form. */
export const AUTH_ENTRY_PATHS = new Set([
  "sign-in",
  "sign-up",
  "forgot-password",
]);

export type AuthPageNoticeInput = {
  path: string;
  from?: string;
  reason?: string;
};

export type AuthPageTrustNoticeFlags = {
  showAccessDenied: boolean;
  showOtpTrustNotice: boolean;
  showPasswordResetTrustNotice: boolean;
  showMagicLinkTrustNotice: boolean;
  showOrganizationTrustNotice: boolean;
  reasonNotice: string | null;
};

export function resolveAuthPageTrustNoticeFlags(
  input: AuthPageNoticeInput,
): AuthPageTrustNoticeFlags {
  const { path, from, reason } = input;
  const fromOrg = isOrgSignInFrom(from);

  return {
    showAccessDenied:
      fromOrg && path === "sign-in" && isOrgAccessDeniedReason(reason),
    reasonNotice:
      !fromOrg && path === "sign-in"
        ? resolveClientAuthReasonNotice(reason)
        : null,
    showOtpTrustNotice: path === "sign-up" || path === "email-otp",
    showPasswordResetTrustNotice:
      path === "forgot-password" || path === "reset-password",
    showMagicLinkTrustNotice: path === "magic-link",
    showOrganizationTrustNotice: path === "accept-invitation",
  };
}
