"use client";

import { PortalRouteError } from "@/features/portal-chrome/portal-route-error";
import { portalCopy } from "@/lib/copy/portal-copy";
import { CLIENT_ONBOARDING_HREF } from "@/lib/routing/portal-routes";

export default function ClientOnboardingError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const copy = portalCopy.errors.routeBoundary.onboarding;

  return (
    <PortalRouteError
      backHref={CLIENT_ONBOARDING_HREF}
      backLabel={copy.backLabel}
      description={copy.description}
      error={error}
      reset={reset}
    />
  );
}
