import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLinkIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { buildEmbedUrl, getPlaygroundScreen, isPlaygroundScreenPathConfigured } from "@/lib/playground";
import { PORTAL_NAME } from "@/lib/portal-copy";

export const metadata: Metadata = {
  title: `${PORTAL_NAME} — Playground`,
  description: "UI review for admin and client portal screens.",
};

export default async function PlaygroundScreenPage({
  params,
}: {
  params: Promise<{ screenId: string }>;
}) {
  const { screenId } = await params;
  const screen = getPlaygroundScreen(screenId);

  if (!screen) {
    notFound();
  }

  const embedUrl = buildEmbedUrl(screen.path);
  const pathConfigured = isPlaygroundScreenPathConfigured(screen.path);

  return (
    <div className="v-stack gap-4 p-4 md:p-6">
      <div className="h-stack flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {screen.category === "admin" ? "Admin" : "Client"}
          </p>
          <h1 className="text-lg font-semibold">{screen.label}</h1>
          <p className="text-sm text-muted-foreground">{screen.path}</p>
          <p className="text-xs text-muted-foreground">Embed: {embedUrl}</p>
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
          className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-900 dark:text-amber-100"
          data-playground-config-warning
        >
          This screen path is not configured. Set PLAYGROUND_SURVEY_ID,
          PLAYGROUND_ASSIGNMENT_ID, and PLAYGROUND_SURVEY_SLUG in .env (run{" "}
          <code className="font-mono text-xs">npm run seed:preview-client</code>{" "}
          to print fixture values).
        </div>
      ) : null}

      <iframe
        key={screenId}
        title={`${screen.label} preview`}
        src={pathConfigured ? embedUrl : undefined}
        data-playground-screen-id={screenId}
        data-playground-target-path={screen.path}
        data-playground-embed-url={embedUrl}
        className="min-h-[80dvh] w-full rounded-lg border bg-background"
      />
    </div>
  );
}
