"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertCircleIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PORTAL_NAME } from "@/lib/portal-copy";

type PortalRouteErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
  title?: string;
  description?: string;
  backHref?: string;
  backLabel?: string;
};

export function PortalRouteError({
  error,
  reset,
  title = "Something went wrong",
  description = "We could not complete this request. You can try again or go back.",
  backHref = "/",
  backLabel = "Back to sign in",
}: PortalRouteErrorProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto flex min-h-[40dvh] max-w-lg flex-col items-center justify-center gap-6 px-4 py-16 text-center">
      <Card className="w-full border-dashed">
        <CardContent className="flex flex-col items-center gap-4 py-10">
          <AlertCircleIcon
            aria-hidden="true"
            className="size-12 text-destructive"
          />
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {PORTAL_NAME}
            </p>
            <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
            <p className="text-sm text-muted-foreground text-pretty">
              {description}
            </p>
          </div>
          <div className="flex w-full flex-col gap-3 sm:flex-row sm:justify-center">
            <Button className="touch-manipulation" onClick={() => reset()}>
              Try again
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
