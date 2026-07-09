"use client";

import { Suspense } from "react";
import { GuardianInvitationJoinPage } from "@/components/guardian-invitation-join-page";
import { PortalAuthLayout } from "@/components/portal-auth-layout";
import { PortalAuthEmailTrustNotice } from "@/components/portal-auth-email-trust-notice";
import { PortalInvitationJoinBrandPanel } from "@/components/portal-invitation-join-brand-panel";
import {
  PortalInvitationJoinPanel,
  PortalInvitationJoinPanelSkeleton,
} from "@/components/portal-invitation-join-panel";
import { useJoinInvitationAuthView } from "@/components/use-join-invitation-auth-view";
import { resolveJoinInvitationTrustNotice } from "@/lib/client-invitation-join-auth";

function PortalInvitationJoinPageInner({
  useGuardianShell,
}: {
  useGuardianShell: boolean;
}) {
  const { isPending, isAuthenticated, authView } = useJoinInvitationAuthView();

  const headerExtra = (
    <PortalAuthEmailTrustNotice
      message={resolveJoinInvitationTrustNotice(authView)}
      variant="email"
    />
  );

  if (isPending) {
    return (
      <div className="flex min-h-dvh items-center justify-center p-6">
        <PortalInvitationJoinPanelSkeleton />
      </div>
    );
  }

  if (useGuardianShell) {
    return (
      <GuardianInvitationJoinPage
        activeStep={authView.activeStep}
        authView={authView}
        isAuthenticated={isAuthenticated}
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
      <PortalInvitationJoinPanel
        authView={authView}
        isAuthenticated={isAuthenticated}
      />
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
    <Suspense fallback={<PortalInvitationJoinPanelSkeleton />}>
      <PortalInvitationJoinPageInner useGuardianShell={useGuardianShell} />
    </Suspense>
  );
}
