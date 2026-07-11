import type { Metadata } from "next";

import { PlaygroundCoverageBadge } from "@/features/playground/playground-coverage-badge";
import { PlaygroundPageShell } from "@/features/playground/playground-page-shell";
import { PLAYGROUND_COVERAGE_HREF } from "@/features/playground/playground-nav";
import { PORTAL_NAME } from "@/modules/platform/copy/portal-copy";
import { buildRouteCoverageSnapshot } from "@/modules/platform/governance/portal-route-coverage";

export const playgroundCoveragePageMetadata: Metadata = {
  title: `${PORTAL_NAME} — Playground · Route coverage`,
  description:
    "Product page coverage vs playground registry, with reliance-graph wiring status.",
  robots: { index: false, follow: false },
};

/** Shared page handler for `/playground/coverage`. */
export function runPlaygroundCoveragePage() {
  const snapshot = buildRouteCoverageSnapshot();

  return (
    <PlaygroundPageShell
      title="Route coverage"
      description={
        <>
          Ground-truth inventory of{" "}
          <code className="text-xs">app/**/page.tsx</code> (excluding playground
          meta) vs curated registry screens, with reliance-graph status per
          surface.
        </>
      }
      activeHref={PLAYGROUND_COVERAGE_HREF}
      skipLinkHref="#playground-coverage-main"
      skipLinkLabel="Skip to coverage table"
      meta={<PlaygroundCoverageBadge snapshot={snapshot} />}
    >
      <section
        id="playground-coverage-main"
        className="min-w-0 overflow-x-auto rounded-lg border"
      >
        <table className="w-full min-w-[720px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-3 py-2 font-medium">Route</th>
              <th className="px-3 py-2 font-medium">Phase</th>
              <th className="px-3 py-2 font-medium">Presented</th>
              <th className="px-3 py-2 font-medium">Screen ids</th>
              <th className="px-3 py-2 font-medium">Surface</th>
              <th className="px-3 py-2 font-medium">Reliance</th>
            </tr>
          </thead>
          <tbody>
            {snapshot.routes.map((row) => (
              <tr key={row.file} className="border-b align-top last:border-b-0">
                <td className="px-3 py-2">
                  <div className="font-medium">{row.routePattern}</div>
                  <div className="font-mono text-xs text-muted-foreground">
                    {row.file}
                  </div>
                </td>
                <td className="px-3 py-2 text-xs">{row.phase}</td>
                <td className="px-3 py-2">
                  {row.presented ? (
                    <span className="text-xs font-medium text-foreground">
                      yes
                    </span>
                  ) : (
                    <span className="text-xs font-medium text-amber-700 dark:text-amber-400">
                      no
                    </span>
                  )}
                </td>
                <td className="px-3 py-2 font-mono text-xs">
                  {row.screenIds.length > 0 ? row.screenIds.join(", ") : "—"}
                </td>
                <td className="px-3 py-2 font-mono text-xs">
                  {row.surfaceId ?? "—"}
                </td>
                <td className="px-3 py-2">
                  <div className="text-xs font-medium">{row.relianceStatus}</div>
                  {row.relianceEdges.length > 0 ? (
                    <ul className="mt-1 space-y-0.5 font-mono text-[11px] text-muted-foreground">
                      {row.relianceEdges.map((edge) => (
                        <li key={`${edge.type}:${edge.target}`}>
                          {edge.type} → {edge.target}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </PlaygroundPageShell>
  );
}
