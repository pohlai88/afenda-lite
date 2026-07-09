"use client";

import { PortalRouteError } from "@/components/portal/portal-route-error";
import { portalCopy } from "@/lib/copy/portal-copy";
import { OPERATOR_DASHBOARD_HREF } from "@/lib/routing/portal-routes";

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
