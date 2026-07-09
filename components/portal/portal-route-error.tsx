"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertCircleIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PORTAL_NAME, portalCopy } from "@/lib/copy/portal-copy";
import { AUTH_SIGN_IN_HREF } from "@/lib/routing/portal-routes";

type PortalRouteErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
  title?: string;
  description?: string;
  retryLabel?: string;
  backHref?: string;
  backLabel?: string;
};

export function PortalRouteError({
  error,
  reset,
  title = "Something went wrong",
  description = "We could not complete this request. You can try again or go back.",
  retryLabel = portalCopy.errors.globalBoundary.retryLabel,
  backHref = AUTH_SIGN_IN_HREF,
  backLabel = portalCopy.errors.routeBoundary.root.backLabel,
}: PortalRouteErrorProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="portal-centered-state-panel">
      <Card className="w-full border-dashed">
        <CardContent className="flex flex-col items-center gap-4 py-10">
          <AlertCircleIcon
            aria-hidden="true"
            className="size-12 text-destructive"
          />
          <div className="space-y-2">
            <p className="portal-state-kicker">{PORTAL_NAME}</p>
            <h1 className="portal-state-title">{title}</h1>
            <p className="portal-state-description">{description}</p>
          </div>
          <div className="flex w-full flex-col gap-3 sm:flex-row sm:justify-center">
            <Button className="touch-manipulation" onClick={() => reset()}>
              {retryLabel}
            </Button>
            <Button
              className="touch-manipulation"
              variant="outline"
              render={<Link href={backHref} />}
              nativeButton={false}
            >
              {backLabel}
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
