import "server-only";

import Link from "next/link";
import { redirect } from "next/navigation";
import {
  previewUnavailablePageMetadata,
  resolvePreviewUnavailableCopy,
  resolvePreviewUnavailableLandingHref,
  runPreviewUnavailablePage,
} from "@/lib/preview-client";
import { portalCopy } from "@/lib/copy/portal-copy";
import { AUTH_SIGN_IN_HREF } from "@/lib/routing/portal-routes";

export { previewUnavailablePageMetadata };

/** Shared page handler for `/client/preview-unavailable`. */
export async function runClientPreviewUnavailablePage({
  searchParams,
}: {
  searchParams: Promise<{ embed?: string; reason?: string }>;
}) {
  const { reason, embed } = await runPreviewUnavailablePage({ searchParams });
  const landing = await resolvePreviewUnavailableLandingHref({ embed });

  if (landing) {
    redirect(landing);
  }

  const copy = resolvePreviewUnavailableCopy(reason);

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-xl font-semibold tracking-tight">{copy.title}</h1>
      <p className="max-w-md text-muted-foreground text-pretty">{copy.description}</p>
      <Link href={AUTH_SIGN_IN_HREF} className="text-primary underline-offset-4 hover:underline">
        {portalCopy.errors.routeBoundary.root.backLabel}
      </Link>
    </main>
  );
}
