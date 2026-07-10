import {
  PortalAccessDeniedNotice,
  PortalAuthEmailTrustNotice,
  PortalAuthReasonNotice,
} from "@/features/auth/notices";
import {
  resolveAuthPageTrustNoticeFlags,
  type AuthPageNoticeInput,
} from "@/lib/auth/auth-page-trust";
import { portalCopy } from "@/lib/copy/portal-copy";

export { AUTH_ENTRY_PATHS } from "@/lib/auth/auth-page-trust";
export type { AuthPageNoticeInput } from "@/lib/auth/auth-page-trust";

/** Portal-owned trust and reason notices above Neon AuthView. */
export function AuthPageNotices(input: AuthPageNoticeInput) {
  const flags = resolveAuthPageTrustNoticeFlags(input);

  return (
    <>
      {flags.showAccessDenied ? <PortalAccessDeniedNotice /> : null}
      {flags.reasonNotice ? (
        <PortalAuthReasonNotice message={flags.reasonNotice} />
      ) : null}
      {flags.showOtpTrustNotice ? (
        <PortalAuthEmailTrustNotice
          message={portalCopy.emailOtp.trustNotice}
          variant="email"
        />
      ) : null}
      {flags.showPasswordResetTrustNotice ? (
        <PortalAuthEmailTrustNotice
          message={portalCopy.passwordReset.trustNotice}
          variant="link"
        />
      ) : null}
      {flags.showMagicLinkTrustNotice ? (
        <PortalAuthEmailTrustNotice
          message={portalCopy.magicLink.trustNotice}
          variant="link"
        />
      ) : null}
      {flags.showOrganizationTrustNotice ? (
        <PortalAuthEmailTrustNotice
          message={portalCopy.organizationAuth.trustNotice}
          variant="email"
        />
      ) : null}
    </>
  );
}
