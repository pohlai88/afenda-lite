"use client";

import { Suspense } from "react";
import { GuardianInvitationJoinPage } from "@/components/guardian-invitation-join-page";
import { PortalAuthLayout } from "@/components/portal-auth-layout";
import { PortalAuthEmailTrustNotice } from "@/components/portal-auth-email-trust-notice";
import { PortalInvitationJoinBrandPanel } from "@/components/portal-invitation-join-brand-panel";
import { PortalInvitationJoinPanel } from "@/components/portal-invitation-join-panel";
import { authClient } from "@/lib/auth/client";
import { resolveJoinInvitationAuthView } from "@/lib/client-invitation-join-auth";
import { portalCopy } from "@/lib/portal-copy";

function PortalInvitationJoinPageInner({
  useGuardianShell,
}: {
  useGuardianShell: boolean;
}) {
  const { data: session, isPending } = authClient.useSession();
  const { organizationAuth, emailOtp } = portalCopy;
  const authView = resolveJoinInvitationAuthView({
    isPending,
    isAuthenticated: Boolean(session?.session),
    emailVerified: Boolean(session?.user.emailVerified),
  });

  const headerExtra = (
    <PortalAuthEmailTrustNotice
      message={
        authView.pathname === "email-otp"
          ? emailOtp.trustNotice
          : organizationAuth.trustNotice
      }
      variant="email"
    />
  );

  if (useGuardianShell) {
    return (
      <GuardianInvitationJoinPage
        activeStep={authView.activeStep}
        headerExtra={headerExtra}
      />
    );
  }

  return (
    <PortalAuthLayout
      brandPanel={
        <PortalInvitationJoinBrandPanel activeStep={authView.activeStep} />
      }
      headerExtra={headerExtra}
    >
      <PortalInvitationJoinPanel />
    </PortalAuthLayout>
  );
}

export function PortalInvitationJoinPage({
  useGuardianShell = true,
}: {
  /** Set from server via `isGuardianAuthShellEnabled()` — not a public env var. */
  useGuardianShell?: boolean;
}) {
  return (
    <Suspense fallback={null}>
      <PortalInvitationJoinPageInner useGuardianShell={useGuardianShell} />
    </Suspense>
  );
}
