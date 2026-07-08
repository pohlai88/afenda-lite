"use client";

import Link from "next/link";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { PortalAuthNeonView } from "@/components/portal-auth-neon-view";
import { PortalInvitationJoinSteps } from "@/components/portal-invitation-join-steps";
import { Skeleton } from "@/components/ui/skeleton";
import { authClient } from "@/lib/auth/client";
import { CLIENT_ONBOARDING_HREF } from "@/lib/client-session";
import { portalCopy } from "@/lib/portal-copy";
import { authSignInHref, buildClientJoinHref } from "@/lib/portal-routes";

function PortalInvitationJoinPanelSkeleton() {
  return (
    <div
      aria-busy="true"
      aria-label="Loading registration form"
      className="flex w-full flex-col gap-4"
    >
      <Skeleton className="h-16 w-full rounded-lg lg:hidden" />
      <Skeleton className="h-4 w-full max-w-sm" />
      <Skeleton className="h-64 w-full rounded-xl" />
    </div>
  );
}

function PortalInvitationJoinPanelInner() {
  const searchParams = useSearchParams();
  const invitationId = searchParams.get("invitationId")?.trim() ?? "";
  const { data: session, isPending } = authClient.useSession();
  const { clientInvitationJoin } = portalCopy;

  if (!invitationId) {
    return (
      <div
        className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive"
        role="alert"
      >
        {clientInvitationJoin.missingInvitationError}
      </div>
    );
  }

  if (isPending) {
    return <PortalInvitationJoinPanelSkeleton />;
  }

  const joinHref = buildClientJoinHref(invitationId);
  const isAuthenticated = Boolean(session?.session);
  const activeStep = isAuthenticated ? 2 : 0;
  const panelDescription = isAuthenticated
    ? clientInvitationJoin.panelAcceptDescription
    : clientInvitationJoin.panelCreateDescription;
  const panelTitle = isAuthenticated
    ? clientInvitationJoin.panelAcceptTitle
    : clientInvitationJoin.panelCreateTitle;

  return (
    <div className="flex w-full flex-col gap-4">
      <PortalInvitationJoinSteps
        activeStep={activeStep}
        variant="compact"
        className="lg:hidden"
      />

      <div className="space-y-1 text-center lg:text-right">
        <h2
          id="client-invitation-heading"
          className="font-heading text-base font-semibold tracking-tight text-balance sm:text-lg"
        >
          {panelTitle}
        </h2>
        <p className="text-body text-muted-foreground text-pretty">{panelDescription}</p>
      </div>

      <PortalAuthNeonView
        pathname={isAuthenticated ? "accept-invitation" : "sign-up"}
        redirectTo={isAuthenticated ? CLIENT_ONBOARDING_HREF : joinHref}
        callbackURL={isAuthenticated ? undefined : joinHref}
      />

      {!isAuthenticated ? (
        <p className="text-center text-caption text-muted-foreground lg:text-right">
          <Link
            href={authSignInHref({ returnTo: joinHref })}
            className="portal-auth-alt-link"
          >
            {clientInvitationJoin.alternateSignInLabel}
          </Link>
        </p>
      ) : null}
    </div>
  );
}

export function PortalInvitationJoinPanel() {
  return (
    <Suspense fallback={<PortalInvitationJoinPanelSkeleton />}>
      <PortalInvitationJoinPanelInner />
    </Suspense>
  );
}
