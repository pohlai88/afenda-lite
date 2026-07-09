"use client";

import Link from "next/link";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { PortalAuthNeonView } from "@/components/portal-auth-neon-view";
import { PortalInvitationJoinSteps } from "@/components/portal-invitation-join-steps";
import { Skeleton } from "@/components/ui/skeleton";
import type { JoinInvitationAuthView } from "@/lib/client-invitation-join-auth";
import { CLIENT_ONBOARDING_HREF } from "@/lib/client-session";
import { portalCopy } from "@/lib/portal-copy";
import { authSignInHref, buildClientJoinHref } from "@/lib/portal-routes";

export function PortalInvitationJoinPanelSkeleton() {
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

function PortalInvitationJoinPanelInner({
  authView,
  isAuthenticated,
}: {
  authView: JoinInvitationAuthView;
  isAuthenticated: boolean;
}) {
  const searchParams = useSearchParams();
  const invitationId = searchParams.get("invitationId")?.trim() ?? "";
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

  const joinHref = buildClientJoinHref(invitationId);
  const panelTitle = clientInvitationJoin[authView.panelTitleKey];
  const panelDescription = clientInvitationJoin[authView.panelDescriptionKey];
  const redirectTo =
    authView.pathname === "accept-invitation"
      ? CLIENT_ONBOARDING_HREF
      : joinHref;

  return (
    <div className="flex w-full flex-col gap-4">
      <PortalInvitationJoinSteps
        activeStep={authView.activeStep}
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
        {authView.pathname === "sign-up" ? (
          <p className="text-caption text-muted-foreground text-pretty">
            {portalCopy.signUp.passwordRequirements}
          </p>
        ) : null}
        {authView.pathname === "email-otp" ? (
          <p className="text-caption text-muted-foreground text-pretty">
            {portalCopy.emailOtp.codeExpiryHint}
          </p>
        ) : null}
      </div>

      <PortalAuthNeonView
        pathname={authView.pathname}
        redirectTo={redirectTo}
        callbackURL={authView.pathname === "sign-up" ? joinHref : undefined}
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

export function PortalInvitationJoinPanel({
  authView,
  isAuthenticated = false,
}: {
  authView: JoinInvitationAuthView;
  isAuthenticated?: boolean;
}) {
  return (
    <Suspense fallback={<PortalInvitationJoinPanelSkeleton />}>
      <PortalInvitationJoinPanelInner
        authView={authView}
        isAuthenticated={isAuthenticated}
      />
    </Suspense>
  );
}
