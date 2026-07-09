"use client";

import { PortalRouteError } from "@/components/portal/portal-route-error";
import { portalCopy } from "@/lib/copy/portal-copy";
import { CLIENT_HOME_HREF } from "@/lib/routing/portal-routes";

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
