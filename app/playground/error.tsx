"use client";

import { PortalRouteError } from "@/features/portal-chrome/portal-route-error";
import { portalCopy } from "@/modules/platform/copy/portal-copy";
import { ORGANIZATION_ADMIN_DASHBOARD_HREF } from "@/modules/platform/routing/portal-routes";

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
      backHref={ORGANIZATION_ADMIN_DASHBOARD_HREF}
      backLabel={copy.backLabel}
      description={copy.description}
      error={error}
      reset={reset}
    />
  );
}
