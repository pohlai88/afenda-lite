"use client";

import Link from "next/link";
import { Skeleton } from "@/components-V2/platform-components/ui/skeleton";
import { PortalAuthNeonView } from "@/features/auth/portal-auth-neon-view";
import { InvitationJoinSteps } from "@/features/auth/invitation-join-steps";
import type { JoinInvitationAuthView } from "@/modules/identity/client-invitation-join-auth";
import { CLIENT_ONBOARDING_HREF } from "@/modules/identity/client-session";
import { portalCopy } from "@/modules/platform/copy/portal-copy";
import { authSignInHref, buildClientJoinHref } from "@/modules/platform/routing/portal-routes";

export function InvitationJoinPanelSkeleton() {
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

export function InvitationJoinPanel({
  invitationId,
  authView,
  isAuthenticated = false,
}: {
  /** Server-resolved from `/join?invitationId=` — avoids useSearchParams CSR bailout. */
  invitationId: string | null;
  authView: JoinInvitationAuthView;
  isAuthenticated?: boolean;
}) {
  const { clientInvitationJoin } = portalCopy;
  const trimmedId = invitationId?.trim() ?? "";

  if (!trimmedId) {
    return (
      <div
        className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive"
        role="alert"
      >
        {clientInvitationJoin.missingInvitationError}
      </div>
    );
  }

  const joinHref = buildClientJoinHref(trimmedId);
  const panelTitle = clientInvitationJoin[authView.panelTitleKey];
  const panelDescription = clientInvitationJoin[authView.panelDescriptionKey];
  const redirectTo =
    authView.pathname === "accept-invitation"
      ? CLIENT_ONBOARDING_HREF
      : joinHref;

  return (
    <div className="flex w-full flex-col gap-4">
      <InvitationJoinSteps
        activeStep={authView.activeStep}
        className="lg:hidden"
      />

      <div className="space-y-1 text-center sm:text-left">
        <h2
          id="client-invitation-heading"
          className="font-heading text-2xl font-semibold tracking-tight text-balance"
        >
          {panelTitle}
        </h2>
        <p className="text-muted-foreground text-pretty">{panelDescription}</p>
        {authView.pathname === "sign-up" ? (
          <p className="text-sm text-muted-foreground text-pretty">
            {portalCopy.signUp.passwordRequirements}
          </p>
        ) : null}
        {authView.pathname === "email-otp" ? (
          <p className="text-sm text-muted-foreground text-pretty">
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
        <p className="text-center text-sm text-muted-foreground sm:text-left">
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
