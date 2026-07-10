"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Button } from "@/components-V2/platform-components/ui/button";
import { portalCopy } from "@/lib/copy/portal-copy";

export default function JoinError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const copy = portalCopy.errors.routeBoundary.join;

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="portal-centered-state flex flex-col items-start gap-4">
      <p className="portal-state-kicker">Error</p>
      <p className="portal-state-title">Could not load invitation join</p>
      <p className="text-muted-foreground text-sm text-pretty">{copy.description}</p>
      {error.digest ? (
        <p className="portal-code-block">{error.digest}</p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" size="sm" onClick={reset}>
          Try again
        </Button>
        <Button
          variant="ghost"
          size="sm"
          render={<Link href="/" />}
          nativeButton={false}
        >
          {copy.backLabel}
        </Button>
      </div>
    </div>
  );
}
