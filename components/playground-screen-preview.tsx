import Link from "next/link";
import { ExternalLinkIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PlaygroundScreen } from "@/lib/playground";

export function PlaygroundScreenPreview({
  screen,
  embedUrl,
  pathConfigured,
  categoryLabel,
}: {
  screen: PlaygroundScreen;
  embedUrl: string;
  pathConfigured: boolean;
  categoryLabel: string;
}) {
  return (
    <div className="v-stack min-w-0 gap-4 overflow-x-clip p-4 md:p-6">
      <a href="#playground-main" className="portal-skip-link">
        Skip to preview
      </a>

      <div id="playground-main" className="v-stack min-w-0 gap-4">
        <div className="h-stack min-w-0 flex-wrap items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="portal-state-kicker">{categoryLabel}</p>
            <h1 className="portal-toolbar-title">{screen.label}</h1>
            <p className="text-sm text-muted-foreground break-words">
              {screen.path}
            </p>
            {screen.routeFile ? (
              <p className="text-xs text-muted-foreground font-mono break-all">
                Page: {screen.routeFile}
              </p>
            ) : null}
            <p className="portal-code-block mt-2 break-all">Embed: {embedUrl}</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            nativeButton={false}
            render={
              <Link href={screen.path} target="_blank" rel="noopener noreferrer" />
            }
          >
            <ExternalLinkIcon aria-hidden="true" />
            Open in new tab
          </Button>
        </div>

        {!pathConfigured ? (
          <div
            className="rounded-lg border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-warning-foreground"
            data-playground-config-warning
          >
            This screen path is not configured. Set PLAYGROUND_SURVEY_ID,
            PLAYGROUND_ASSIGNMENT_ID, and PLAYGROUND_SURVEY_SLUG in .env (run{" "}
            <code className="font-mono text-xs">npm run seed:preview-client</code>{" "}
            to print fixture values).
          </div>
        ) : null}

        <iframe
          key={screen.id}
          title={`${screen.label} preview`}
          src={pathConfigured ? embedUrl : undefined}
          data-playground-screen-id={screen.id}
          data-playground-target-path={screen.path}
          data-playground-embed-url={embedUrl}
          className="min-h-[80dvh] w-full min-w-0 rounded-lg border bg-background"
        />
      </div>
    </div>
  );
}
