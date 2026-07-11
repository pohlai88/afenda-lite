import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";

import PlaygroundHitlChecklist from "@/components-V2/platform-views/portal-views/playground-hitl-checklist";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components-V2/platform-components/ui/card";
import { Button } from "@/components-V2/platform-components/ui/button";
import { PlaygroundPageShapeBadge } from "@/features/playground/playground-page-shape-badge";
import { buildPlaygroundHitlRows } from "@/features/playground/playground-hitl-rows";
import { parseHitlViewFilters } from "@/features/playground/playground-hitl-views";
import { buildPlaygroundScreensWithAutoDiscovery } from "@/features/playground/playground-auto-discovery";
import { loadPlaygroundStaticComposition } from "@/features/playground/playground-static-compositions";
import { PORTAL_NAME } from "@/modules/platform/copy/portal-copy";
import { playgroundScreenHref } from "@/modules/platform/routing/portal-routes";

export const playgroundHitlReviewPageMetadata: Metadata = {
  title: `${PORTAL_NAME} — Playground · Route review`,
  description:
    "Source-backed route expectations with explicit human verdicts, notes, and repair handoff.",
  robots: { index: false, follow: false },
};

async function resolveStaticInspectSlot(options: {
  present: string;
  screen: string | null;
  view: string;
}): Promise<ReactNode> {
  if (options.view !== "static" || options.present !== "inspect") {
    return null;
  }

  const screenId = options.screen ?? "admin-dashboard";
  const result = await loadPlaygroundStaticComposition(screenId);

  if (result.status === "ready") {
    return (
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-medium">{result.title}</p>
          <span className="text-muted-foreground text-xs uppercase">
            {result.kind}
          </span>
          <PlaygroundPageShapeBadge shape={result.shape} />
        </div>
        <div className="bg-background min-w-0 overflow-hidden rounded-xl border">
          {result.node}
        </div>
      </div>
    );
  }

  if (result.status === "condition") {
    return (
      <Card className="shadow-none" data-playground-static-condition={result.shape}>
        <CardHeader className="gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle className="text-base">{result.label}</CardTitle>
            <PlaygroundPageShapeBadge shape={result.shape} />
          </div>
          <CardDescription className="text-pretty">
            {result.reason}
          </CardDescription>
          <p className="text-muted-foreground text-xs">
            Path: <code>{result.path}</code>
          </p>
          <div>
            <Button
              variant="outline"
              size="sm"
              nativeButton={false}
              render={<Link href={playgroundScreenHref(result.screenId)} />}
            >
              Open Preview
            </Button>
          </div>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="shadow-none" data-playground-static-live-embed-only>
      <CardHeader className="gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <CardTitle className="text-base">{result.label}</CardTitle>
          <PlaygroundPageShapeBadge shape={result.shape} />
        </div>
        <CardDescription className="text-pretty">{result.reason}</CardDescription>
        <p className="text-muted-foreground text-xs">
          Path: <code>{result.path}</code>
        </p>
        <div>
          <Button
            variant="outline"
            size="sm"
            nativeButton={false}
            render={<Link href={playgroundScreenHref(result.screenId)} />}
          >
            Open Preview
          </Button>
        </div>
      </CardHeader>
    </Card>
  );
}

/** Shared page handler for `/playground/hitl-review` — thin loader → AdminCN portal-view. */
export async function runPlaygroundHitlReviewPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
} = {}) {
  const params = searchParams ? await searchParams : {};
  const filters = parseHitlViewFilters(params);
  const rows = buildPlaygroundHitlRows(
    buildPlaygroundScreensWithAutoDiscovery(),
  );
  const staticComposition = await resolveStaticInspectSlot(filters);

  return (
    <PlaygroundHitlChecklist
      rows={rows}
      staticComposition={staticComposition}
    />
  );
}
