"use client";

import { Suspense } from "react";
import { PortalAuthLayout } from "@/components/portal-auth-layout";
import { PortalAuthEmailTrustNotice } from "@/components/portal-auth-email-trust-notice";
import { PortalInvitationJoinBrandPanel } from "@/components/portal-invitation-join-brand-panel";
import { PortalInvitationJoinPanel } from "@/components/portal-invitation-join-panel";
import { authClient } from "@/lib/auth/client";
import { portalCopy } from "@/lib/portal-copy";

function PortalInvitationJoinPageInner() {
  const { data: session, isPending } = authClient.useSession();
  const { organizationAuth } = portalCopy;
  const activeStep = !isPending && session?.session ? 2 : 0;

  return (
    <PortalAuthLayout
      brandPanel={<PortalInvitationJoinBrandPanel activeStep={activeStep} />}
      headerExtra={
        <PortalAuthEmailTrustNotice
          message={organizationAuth.trustNotice}
          variant="email"
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
