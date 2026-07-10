"use client";

import { PortalRouteError } from "@/features/portal-chrome/portal-route-error";
import { AUTH_SIGN_IN_HREF } from "@/lib/routing/portal-routes";

export default function OrgLoginError({
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
      description="We could not open the organization sign-in entry. Try again."
      error={error}
      reset={reset}
    />
  );
}
