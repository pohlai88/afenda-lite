import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { authViewPaths } from "@neondatabase/auth-ui/server";
import { PortalAccessDeniedNotice } from "@/components/portal-access-denied-notice";
import { PortalAuthFormIntro } from "@/components/portal-auth-form-intro";
import { PortalAuthLayout } from "@/components/portal-auth-layout";
import { PortalAuthNeonView } from "@/components/portal-auth-neon-view";
import { PortalAuthEmailTrustNotice } from "@/components/portal-auth-email-trust-notice";
import { PortalAuthReasonNotice } from "@/components/portal-auth-reason-notice";
import { resolveAuthShellCopy } from "@/lib/auth-shell-copy";
import { portalCopy } from "@/lib/portal-copy";
import { portalAuthMetadata } from "@/lib/auth-metadata";
import { redirectAuthAcceptInvitationToJoin } from "@/lib/client-invitation-entry";
import { resolveClientAuthReasonNotice } from "@/lib/client-sign-in-entry";
import {
  isOrgAccessDeniedReason,
  isOrgSignInFrom,
} from "@/lib/org-sign-in-entry";
import { resolvePlaygroundEmbedActive } from "@/lib/playground";
import { sanitizeReturnToPath } from "@/lib/portal-routes";
import { getAuthenticatedLandingHref } from "@/lib/portal-session-routing";

export const dynamic = "force-dynamic";
export const dynamicParams = false;

const AUTH_ENTRY_PATHS = new Set(["sign-in", "sign-up", "forgot-password"]);

export function generateStaticParams() {
  return Object.values(authViewPaths).map((path) => ({ path }));
}

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ path: string }>;
  searchParams: Promise<{ from?: string }>;
}): Promise<Metadata> {
  const [{ path }, { from }] = await Promise.all([params, searchParams]);
  return portalAuthMetadata(path, { from });
}

export default async function AuthPage({
  params,
  searchParams,
}: {
  params: Promise<{ path: string }>;
  searchParams: Promise<{
    from?: string;
    reason?: string;
    returnTo?: string;
    invitationId?: string;
    embed?: string;
  }>;
}) {
  const [{ path }, query] = await Promise.all([params, searchParams]);
  const { from, reason, returnTo: returnToRaw, invitationId } = query;
  const embed = await resolvePlaygroundEmbedActive(query);
  const fromOrg = isOrgSignInFrom(from);
  const returnTo = sanitizeReturnToPath(returnToRaw);

  if (path === "accept-invitation" && invitationId?.trim()) {
    redirectAuthAcceptInvitationToJoin(invitationId.trim());
  }

  if (AUTH_ENTRY_PATHS.has(path) && !embed) {
    const landing = await getAuthenticatedLandingHref();
    if (landing) {
      redirect(returnTo ?? landing);
    }
  }

  const showAccessDenied =
    fromOrg && path === "sign-in" && isOrgAccessDeniedReason(reason);
  const reasonNotice =
    !fromOrg && path === "sign-in"
      ? resolveClientAuthReasonNotice(reason)
      : null;

  const showOtpTrustNotice =
    path === "sign-up" || path === "email-otp";

  const showPasswordResetTrustNotice =
    path === "forgot-password" || path === "reset-password";

  const showMagicLinkTrustNotice = path === "magic-link";

  const showOrganizationTrustNotice = path === "accept-invitation";

  const header = (
    <>
      {showAccessDenied ? <PortalAccessDeniedNotice /> : null}
      {reasonNotice ? <PortalAuthReasonNotice message={reasonNotice} /> : null}
      {showOtpTrustNotice ? (
        <PortalAuthEmailTrustNotice
          message={portalCopy.emailOtp.trustNotice}
          variant="email"
        />
      ) : null}
      {showPasswordResetTrustNotice ? (
        <PortalAuthEmailTrustNotice
          message={portalCopy.passwordReset.trustNotice}
          variant="link"
        />
      ) : null}
      {showMagicLinkTrustNotice ? (
        <PortalAuthEmailTrustNotice
          message={portalCopy.magicLink.trustNotice}
          variant="link"
        />
      ) : null}
      {showOrganizationTrustNotice ? (
        <PortalAuthEmailTrustNotice
          message={portalCopy.organizationAuth.trustNotice}
          variant="email"
        />
      ) : null}
    </>
  );

  const shellCopy = resolveAuthShellCopy({ path, from });

  return (
    <PortalAuthLayout headerExtra={header}>
      <div className="flex w-full flex-col gap-4">
        <PortalAuthFormIntro {...shellCopy} />
        <PortalAuthNeonView pathname={path} redirectTo={returnTo ?? undefined} />
      </div>
    </PortalAuthLayout>
  );
}
