import Link from "next/link";

import { AUTH_SIGN_OUT_HREF } from "@/lib/routing/portal-routes";

export type ClientWorkspaceUnavailableCopy = {
  eyebrow: string;
  title: string;
  description: string;
  signOutLabel: string;
};

/**
 * Stable unavailable panel for tombstoned client-workspace routes.
 * Prevents `/` ↔ `/client*` redirect loops while rebuild is deferred.
 */
export function ClientWorkspaceUnavailable({
  copy,
}: {
  copy: ClientWorkspaceUnavailableCopy;
}) {
  return (
    <main className="portal-centered-state-panel flex min-h-dvh items-center justify-center p-6">
      <div className="w-full max-w-md space-y-4 text-center">
        <p className="text-sm font-medium tracking-wide text-muted-foreground uppercase">
          {copy.eyebrow}
        </p>
        <h1 className="font-heading text-2xl font-semibold tracking-tight text-balance">
          {copy.title}
        </h1>
        <p className="text-sm text-muted-foreground text-pretty">
          {copy.description}
        </p>
        <p>
          <Link
            href={AUTH_SIGN_OUT_HREF}
            className="text-sm font-medium text-primary underline-offset-4 hover:underline"
          >
            {copy.signOutLabel}
          </Link>
        </p>
      </div>
    </main>
  );
}
