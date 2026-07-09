import "server-only";

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PlaygroundScreenPreview } from "@/components/playground-screen-preview";
import { getPlaygroundScreen, getPlaygroundScreenIds } from "@/lib/playground/playground";
import { PORTAL_NAME } from "@/lib/copy/portal-copy";
import {
  buildPlaygroundScreenViewModel,
  resolvePlaygroundScreenMetadataTitle,
} from "@/lib/playground/playground-screen.logic";

export function generatePlaygroundScreenStaticParams() {
  return getPlaygroundScreenIds().map((screenId) => ({ screenId }));
}

export async function playgroundScreenPageMetadata({
  params,
}: {
  params: Promise<{ screenId: string }>;
}): Promise<Metadata> {
  const { screenId } = await params;
  const screen = getPlaygroundScreen(screenId);

  return {
    title: resolvePlaygroundScreenMetadataTitle(screen, PORTAL_NAME),
    description: "UI review for admin, client, and dynamic route screens.",
    robots: { index: false, follow: false },
  };
}

/** Shared page handler for `/playground/[screenId]`. */
export async function runPlaygroundScreenPage({
  params,
}: {
  params: Promise<{ screenId: string }>;
}) {
  const { screenId } = await params;
  const screen = getPlaygroundScreen(screenId);

  if (!screen) {
    notFound();
  }

  const view = buildPlaygroundScreenViewModel(screen);

  return (
    <PlaygroundScreenPreview
      screen={view.screen}
      embedUrl={view.embedUrl}
      pathConfigured={view.pathConfigured}
      categoryLabel={view.categoryLabel}
    />
  );
}
