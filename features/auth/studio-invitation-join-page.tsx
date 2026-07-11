"use client";

import { type ReactNode } from "react";
import { StudioAuthShell } from "@/features/auth/studio-auth-shell";
import { PortalAuthEmailTrustNotice } from "@/features/auth/notices";
import {
  InvitationJoinPanel,
  InvitationJoinPanelSkeleton,
} from "@/features/auth/invitation-join-panel";
import { useJoinInvitationAuthView } from "@/features/auth/use-join-invitation-auth-view";
import { resolveJoinInvitationTrustNotice } from "@/modules/identity/client-invitation-join-auth";
import { portalCopy } from "@/modules/platform/copy/portal-copy";

function JoinStudioShell({ children }: { children: ReactNode }) {
  const { clientInvitationJoin } = portalCopy;

  return (
    <StudioAuthShell backHref="/" backLabel={clientInvitationJoin.backLabel}>
      {children}
    </StudioAuthShell>
  );
}

function StudioInvitationJoinPageInner({
  invitationId,
}: {
  invitationId: string | null;
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
      <JoinStudioShell>
        <InvitationJoinPanelSkeleton />
      </JoinStudioShell>
    );
  }

  return (
    <JoinStudioShell>
      <div className="flex flex-col gap-6">
        {headerExtra}
        <InvitationJoinPanel
          invitationId={invitationId}
          authView={authView}
          isAuthenticated={isAuthenticated}
        />
      </div>
    </JoinStudioShell>
  );
}

export function StudioInvitationJoinPage({
  invitationId,
}: {
  invitationId: string | null;
}) {
  return <StudioInvitationJoinPageInner invitationId={invitationId} />;
}
