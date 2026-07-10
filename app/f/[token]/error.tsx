"use client";

import { PortalRouteError } from "@/features/portal-chrome/portal-route-error";
import { AUTH_SIGN_IN_HREF } from "@/lib/routing/portal-routes";

export default function SecureLinkError({
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
      description="We could not open this secure link. Try again, or ask your organization for a rotated link."
      error={error}
      reset={reset}
    />
  );
}
