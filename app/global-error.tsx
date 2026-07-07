"use client";

import { useEffect } from "react";
import { PORTAL_NAME } from "@/lib/portal-copy";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body className="font-sans antialiased">
        <main className="mx-auto flex min-h-dvh max-w-lg flex-col items-center justify-center gap-6 px-4 py-16 text-center">
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
              {PORTAL_NAME}
            </p>
            <h1 className="text-2xl font-semibold tracking-tight">
              Application error
            </h1>
            <p className="text-sm text-neutral-600">
              A critical error occurred. Please reload the page or try again
              later.
            </p>
          </div>
          <button
            type="button"
            className="inline-flex h-9 items-center justify-center rounded-md bg-neutral-900 px-4 text-sm font-medium text-white"
            onClick={() => reset()}
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
