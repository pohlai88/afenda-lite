"use client";

import { PortalRouteError } from "@/features/portal-chrome/portal-route-error";
import { AUTH_SIGN_IN_HREF } from "@/lib/routing/portal-routes";

export default function LegacyInviteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <PortalRouteError
      backHref={AUTH_SIGN_IN_HREF}
      backLabel="Sign in"
      description="We could not process this invitation link. Try again, or use the join link from your email."
      error={error}
      reset={reset}
    />
  );
}
