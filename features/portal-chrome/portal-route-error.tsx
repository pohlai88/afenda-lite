"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertCircleIcon } from "lucide-react";
import { Button, buttonVariants } from "@/components-V2/platform-components/ui/button";
import {
  Card,
  CardContent,
} from "@/components-V2/platform-components/ui/card";
import { PORTAL_NAME, portalCopy } from "@/modules/platform/copy/portal-copy";
import { AUTH_SIGN_IN_HREF } from "@/modules/platform/routing/portal-routes";
import { cn } from "@/modules/platform/utils";

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
    <main className="portal-centered-state-panel flex min-h-dvh items-center justify-center p-6">
      <Card className="w-full max-w-md border-dashed">
        <CardContent className="flex flex-col items-center gap-4 py-10">
          <AlertCircleIcon
            aria-hidden="true"
            className="size-12 text-destructive"
          />
          <div className="space-y-2 text-center">
            <p className="text-sm text-muted-foreground">{PORTAL_NAME}</p>
            <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
            <p className="text-muted-foreground text-pretty">{description}</p>
          </div>
          <div className="flex w-full flex-col gap-3 sm:flex-row sm:justify-center">
            <Button className="touch-manipulation" onClick={() => reset()}>
              {retryLabel}
            </Button>
            <Link
              href={backHref}
              className={cn(
                buttonVariants({ variant: "outline" }),
                "touch-manipulation",
              )}
            >
              {backLabel}
            </Link>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
