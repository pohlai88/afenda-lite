"use client";

import Link from "next/link";
import { useState } from "react";
import { ExternalLinkIcon } from "lucide-react";

import { Button } from "@/components-V2/platform-components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components-V2/platform-components/ui/card";
import { PlaygroundPageShapeBadge } from "@/features/playground/playground-page-shape-badge";
import type { PlaygroundHitlRow } from "@/features/playground/playground-hitl-rows";
import {
  HITL_LIVE_BATCH_SIZE,
  HITL_LIVE_HARD_CAP,
  hitlRowsEligibleForLiveEmbed,
} from "@/features/playground/playground-hitl-views";

export function PlaygroundHitlLiveStrip({
  rows,
}: {
  rows: PlaygroundHitlRow[];
}) {
  const eligible = hitlRowsEligibleForLiveEmbed(rows);
  const [visibleCount, setVisibleCount] = useState(HITL_LIVE_BATCH_SIZE);

  const mounted = eligible.slice(0, Math.min(visibleCount, HITL_LIVE_HARD_CAP));
  const canLoadMore =
    mounted.length < eligible.length && mounted.length < HITL_LIVE_HARD_CAP;

  if (eligible.length === 0) {
    return (
      <Card className="shadow-none" data-playground-hitl-live-strip>
        <CardHeader>
          <CardTitle className="text-base">Live embeds</CardTitle>
          <CardDescription>
            No embeddable screens in this filter (fixture-gap or empty set). Use
            Static list or widen shape/category.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4" data-playground-hitl-live-strip>
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold tracking-tight">Live embeds</h2>
          <p className="text-muted-foreground text-sm">
            Showing {mounted.length} of {eligible.length} embeddable
            {eligible.length > HITL_LIVE_HARD_CAP
              ? ` (hard cap ${HITL_LIVE_HARD_CAP})`
              : ""}
            . Redirect scenarios stay visible so reviewers can verify the final
            URL.
          </p>
        </div>
        {canLoadMore ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              setVisibleCount((count) =>
                Math.min(count + HITL_LIVE_BATCH_SIZE, HITL_LIVE_HARD_CAP),
              )
            }
          >
            Load more
          </Button>
        ) : null}
      </div>

      {/* Full-width embeds — no 2-col / 420px tile that crops auth h-dvh layouts. */}
      <div className="grid gap-4">
        {mounted.map((row) => (
          <Card
            key={row.id}
            className="min-w-0 shadow-none"
            data-playground-shape={row.shape}
            data-screen-id={row.id}
          >
            <CardHeader className="space-y-2 border-b py-3">
              <div className="flex min-w-0 flex-wrap items-start justify-between gap-2">
                <div className="min-w-0 space-y-1">
                  <CardTitle className="truncate text-sm font-semibold">
                    {row.label}
                  </CardTitle>
                  <CardDescription className="break-all font-mono text-xs">
                    {row.path}
                  </CardDescription>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <PlaygroundPageShapeBadge shape={row.shape} />
                  <Button
                    variant="outline"
                    size="sm"
                    nativeButton={false}
                    render={<Link href={row.playgroundHref} />}
                  >
                    <ExternalLinkIcon className="size-3.5" aria-hidden />
                    Preview
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <iframe
                title={`${row.label} live embed`}
                src={row.embedHref}
                className="bg-background block h-[calc(100dvh-6rem)] min-h-[56rem] w-full min-w-0 border-0"
              />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
