import Link from "next/link";
import { ExternalLinkIcon } from "lucide-react";

import { Button } from "@/components-V2/platform-components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components-V2/platform-components/ui/card";
import {
  PlaygroundHitlConfirm,
  PlaygroundHitlReviewsProvider,
} from "@/features/playground/playground-hitl-confirm";
import type { PlaygroundScreen } from "@/features/playground/playground";
import type { PlaygroundPageShape } from "@/features/playground/playground-page-shape";
import { getPlaygroundRouteReview } from "@/features/playground/playground-route-review";

type PlaygroundScreenPreviewProps = {
  screen: PlaygroundScreen;
  embedUrl: string;
  pathConfigured: boolean;
  categoryLabel: string;
  shape: PlaygroundPageShape;
  needsRegistryEntry?: boolean;
};

export function PlaygroundScreenPreview(props: PlaygroundScreenPreviewProps) {
  return (
    <PlaygroundHitlReviewsProvider>
      <PlaygroundScreenPreviewContent {...props} />
    </PlaygroundHitlReviewsProvider>
  );
}

function PlaygroundScreenPreviewContent({
  screen,
  embedUrl,
  pathConfigured,
  categoryLabel,
  shape,
  needsRegistryEntry = false,
}: PlaygroundScreenPreviewProps) {
  return (
    <div className="min-w-0 space-y-4">
      <a href="#playground-main" className="portal-skip-link">
        Skip to preview
      </a>

      <PlaygroundHitlConfirm
        screenId={screen.id}
        label={screen.label}
        path={screen.path}
        pathConfigured={pathConfigured}
        shape={shape}
        review={getPlaygroundRouteReview(screen.id)}
        variant="card"
      />

      <Card id="playground-main" className="min-w-0 shadow-none">
        <CardHeader className="border-b">
          <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1 space-y-1">
              <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                {categoryLabel}
              </p>
              <CardTitle className="text-2xl font-semibold tracking-tight">
                {screen.label}
              </CardTitle>
              <CardDescription className="break-words font-mono text-xs">
                {screen.path}
              </CardDescription>
              {screen.routeFile ? (
                <p className="text-muted-foreground break-all font-mono text-xs">
                  Page: {screen.routeFile}
                </p>
              ) : null}
              <p className="text-muted-foreground break-all font-mono text-xs">
                Embed: {embedUrl}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              nativeButton={false}
              render={
                <Link
                  href={pathConfigured ? embedUrl : screen.path}
                  target="_blank"
                  rel="noopener noreferrer"
                />
              }
            >
              <ExternalLinkIcon aria-hidden="true" />
              Open in new tab
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-4 pt-(--card-spacing)">
          {needsRegistryEntry ? (
            <div
              className="bg-muted/40 text-muted-foreground rounded-lg border border-border px-4 py-3 text-sm"
              data-playground-auto-screen
            >
              Auto-discovered screen — add a curated registry entry for stable
              fixtures and labels.
            </div>
          ) : null}

          {!pathConfigured ? (
            <div
              className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-900 dark:text-amber-200"
              data-playground-config-warning
            >
              This screen path is not configured. Set PLAYGROUND_SURVEY_ID,
              PLAYGROUND_ASSIGNMENT_ID, and PLAYGROUND_SURVEY_SLUG in .env (run{" "}
              <code className="font-mono text-xs">
                npm run seed:preview-client
              </code>{" "}
              to print fixture values).
            </div>
          ) : null}

          {/* Match auth `h-dvh` — fill the content column, do not tile at 70vh. */}
          <iframe
            key={screen.id}
            title={`${screen.label} preview`}
            src={pathConfigured ? embedUrl : undefined}
            data-playground-screen-id={screen.id}
            data-playground-target-path={screen.path}
            data-playground-embed-url={embedUrl}
            className="bg-background block h-[calc(100dvh-6rem)] min-h-[56rem] w-full min-w-0 max-w-none rounded-lg border"
          />
        </CardContent>
      </Card>
    </div>
  );
}
