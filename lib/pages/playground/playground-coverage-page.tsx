import Link from "next/link";
import type { Metadata } from "next";
import { PlaygroundCoverageBadge } from "@/components/playground-coverage-badge";
import { buildRouteCoverageSnapshot } from "@/lib/governance/portal-route-coverage";
import { PORTAL_NAME } from "@/lib/copy/portal-copy";
import {
  PLAYGROUND_COVERAGE_HREF,
  playgroundReviewNavLinks,
} from "@/lib/playground/playground-nav";

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
    <div className="v-stack min-w-0 gap-6 overflow-x-clip p-4 md:p-6">
      <a href="#playground-coverage-main" className="portal-skip-link">
        Skip to coverage table
      </a>

      <header className="v-stack gap-4">
        <div className="v-stack gap-2">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Playground · local dev only
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">
            Route coverage
          </h1>
          <p className="max-w-3xl text-sm text-muted-foreground">
            Ground-truth inventory of{" "}
            <code className="text-xs">app/**/page.tsx</code> (excluding
            playground meta) vs curated registry screens, with reliance-graph
            status per surface.
          </p>
        </div>

        <nav
          aria-label="Playground review modes"
          className="flex flex-wrap gap-2"
        >
          {playgroundReviewNavLinks.map((item) => {
            const active = item.href === PLAYGROUND_COVERAGE_HREF;

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={
                  active
                    ? "rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground"
                    : "rounded-md border px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                }
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <PlaygroundCoverageBadge snapshot={snapshot} />
      </header>

      <section id="playground-coverage-main" className="min-w-0 overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-2 py-2 font-medium">Route</th>
              <th className="px-2 py-2 font-medium">Phase</th>
              <th className="px-2 py-2 font-medium">Presented</th>
              <th className="px-2 py-2 font-medium">Screen ids</th>
              <th className="px-2 py-2 font-medium">Surface</th>
              <th className="px-2 py-2 font-medium">Reliance</th>
            </tr>
          </thead>
          <tbody>
            {snapshot.routes.map((row) => (
              <tr key={row.file} className="border-b align-top">
                <td className="px-2 py-2">
                  <div className="font-medium">{row.routePattern}</div>
                  <div className="font-mono text-xs text-muted-foreground">
                    {row.file}
                  </div>
                </td>
                <td className="px-2 py-2 text-xs">{row.phase}</td>
                <td className="px-2 py-2">
                  {row.presented ? (
                    <span className="text-xs font-medium text-foreground">
                      yes
                    </span>
                  ) : (
                    <span className="text-xs font-medium text-warning-foreground">
                      no
                    </span>
                  )}
                </td>
                <td className="px-2 py-2 font-mono text-xs">
                  {row.screenIds.length > 0 ? row.screenIds.join(", ") : "—"}
                </td>
                <td className="px-2 py-2 font-mono text-xs">
                  {row.surfaceId ?? "—"}
                </td>
                <td className="px-2 py-2">
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
    </div>
  );
}
