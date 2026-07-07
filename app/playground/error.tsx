"use client";

import { PortalRouteError } from "@/components/portal-route-error";
import { portalCopy } from "@/lib/portal-copy";
import { OPERATOR_DASHBOARD_HREF } from "@/lib/portal-routes";

export default function PlaygroundError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const copy = portalCopy.errors.routeBoundary.operator;

  return (
    <PortalRouteError
      backHref={OPERATOR_DASHBOARD_HREF}
      backLabel={copy.backLabel}
      description={copy.description}
      error={error}
      reset={reset}
    />
  );
}
