"use client";

import { PortalRouteError } from "@/components/portal-route-error";
import { portalCopy } from "@/lib/portal-copy";
import { CLIENT_HOME_HREF } from "@/lib/portal-routes";

export default function ClientError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const copy = portalCopy.errors.routeBoundary.client;

  return (
    <PortalRouteError
      backHref={CLIENT_HOME_HREF}
      backLabel={copy.backLabel}
      description={copy.description}
      error={error}
      reset={reset}
    />
  );
}
