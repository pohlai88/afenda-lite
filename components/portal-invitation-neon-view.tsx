"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { PortalAuthNeonView } from "@/components/portal-auth-neon-view";
import { authClient } from "@/lib/auth/client";
import { CLIENT_ONBOARDING_HREF } from "@/lib/client-session";
import { portalCopy } from "@/lib/portal-copy";
import { buildClientJoinHref } from "@/lib/portal-routes";

function PortalInvitationNeonViewInner() {
  const searchParams = useSearchParams();
  const invitationId = searchParams.get("invitationId")?.trim() ?? "";
  const { data: session, isPending } = authClient.useSession();
  const { clientInvitationJoin } = portalCopy;

  if (!invitationId) {
    return (
      <p className="text-sm text-destructive" role="alert">
        {clientInvitationJoin.missingInvitationError}
      </p>
    );
  }

  if (isPending) {
    return null;
  }

  const joinHref = buildClientJoinHref(invitationId);

  if (!session?.session) {
    return (
      <PortalAuthNeonView
        pathname="sign-up"
        redirectTo={joinHref}
        callbackURL={joinHref}
      />
    );
  }

  return (
    <PortalAuthNeonView
      pathname="accept-invitation"
      redirectTo={CLIENT_ONBOARDING_HREF}
    />
  );
}

export function PortalInvitationNeonView() {
  return (
    <Suspense fallback={null}>
      <PortalInvitationNeonViewInner />
    </Suspense>
  );
}
