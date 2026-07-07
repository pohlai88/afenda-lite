"use client";

import { PortalRouteError } from "@/components/portal-route-error";
import { portalCopy } from "@/lib/portal-copy";
import { AUTH_SIGN_IN_HREF } from "@/lib/portal-routes";

export default function AccountError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const copy = portalCopy.errors.routeBoundary.account;

  return (
    <PortalRouteError
      backHref={AUTH_SIGN_IN_HREF}
      backLabel={copy.backLabel}
      description={copy.description}
      error={error}
      reset={reset}
    />
  );
}
