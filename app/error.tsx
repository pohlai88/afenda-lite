"use client";

import { PortalRouteError } from "@/components/portal/portal-route-error";
import { portalCopy } from "@/lib/copy/portal-copy";
import { AUTH_SIGN_IN_HREF } from "@/lib/routing/portal-routes";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const copy = portalCopy.errors.routeBoundary.root;

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
