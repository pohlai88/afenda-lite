"use client";

import { Suspense } from "react";
import { PortalAuthLayout } from "@/components/portal-auth-layout";
import { PortalAuthEmailTrustNotice } from "@/components/portal-auth-email-trust-notice";
import { PortalInvitationJoinBrandPanel } from "@/components/portal-invitation-join-brand-panel";
import { PortalInvitationJoinPanel } from "@/components/portal-invitation-join-panel";
import { authClient } from "@/lib/auth/client";
import { resolveJoinInvitationAuthView } from "@/lib/client-invitation-join-auth";
import { portalCopy } from "@/lib/portal-copy";

function PortalInvitationJoinPageInner() {
  const { data: session, isPending } = authClient.useSession();
  const { organizationAuth, emailOtp } = portalCopy;
  const authView = resolveJoinInvitationAuthView({
    isPending,
    isAuthenticated: Boolean(session?.session),
    emailVerified: Boolean(session?.user.emailVerified),
  });

  const headerNotice =
    authView.pathname === "email-otp"
      ? emailOtp.trustNotice
      : organizationAuth.trustNotice;

  return (
    <PortalAuthLayout
      brandPanel={<PortalInvitationJoinBrandPanel activeStep={authView.activeStep} />}
      headerExtra={
        <PortalAuthEmailTrustNotice
          message={headerNotice}
          variant={authView.pathname === "email-otp" ? "email" : "email"}
        />
      }
    >
      <PortalInvitationJoinPanel />
    </PortalAuthLayout>
  );
}

export function PortalInvitationJoinPage() {
  return (
    <Suspense fallback={null}>
      <PortalInvitationJoinPageInner />
    </Suspense>
  );
}
