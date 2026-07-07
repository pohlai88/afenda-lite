"use client";

import { PortalRouteError } from "@/components/portal-route-error";

export default function ClientError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <PortalRouteError
      backHref="/client"
      backLabel="Back to dashboard"
      description="We could not load this client page. You can try again or return to your dashboard."
      error={error}
      reset={reset}
    />
  );
}
