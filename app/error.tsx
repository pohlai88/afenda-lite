"use client";

import { PortalRouteError } from "@/components/portal-route-error";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <PortalRouteError
      description="We could not complete this request. You can try again or return to sign in."
      error={error}
      reset={reset}
    />
  );
}
