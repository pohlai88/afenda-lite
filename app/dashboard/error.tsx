"use client";

import { PortalRouteError } from "@/components/portal-route-error";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <PortalRouteError
      backHref="/dashboard"
      backLabel="Back to dashboard"
      description="We could not load this organization page. You can try again or return to the dashboard."
      error={error}
      reset={reset}
    />
  );
}
