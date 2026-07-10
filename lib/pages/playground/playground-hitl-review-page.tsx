import Link from "next/link";
import type { Metadata } from "next";
import { PlaygroundHitlRouteTable } from "@/components/playground-hitl-route-table";
import { buildPlaygroundHitlRows } from "@/lib/playground/playground-hitl-rows";
import {
  PLAYGROUND_HITL_REVIEW_HREF,
  playgroundReviewNavLinks,
} from "@/lib/playground/playground-nav";
import { playgroundScreens } from "@/lib/playground/playground";
import { PORTAL_NAME } from "@/lib/copy/portal-copy";

export const playgroundHitlReviewPageMetadata: Metadata = {
  title: `${PORTAL_NAME} — Playground · HITL route checklist`,
  description:
    "Human-in-the-loop review checklist for playground routes, paths, and page files.",
  robots: { index: false, follow: false },
};

const categoryNav = [
  { id: "admin", label: "Admin" },
  { id: "client", label: "Client" },
  { id: "dynamic", label: "Dynamic" },
  { id: "hot-sales", label: "Hot Sales" },
] as const;

/** Shared page handler for `/playground/hitl-review`. */
export function runPlaygroundHitlReviewPage() {
  const rows = buildPlaygroundHitlRows(playgroundScreens);

  return (
    <div className="v-stack min-w-0 gap-6 overflow-x-clip p-4 md:p-6">
      <a href="#playground-hitl-main" className="portal-skip-link">
        Skip to checklist
      </a>

      <header className="v-stack gap-4">
        <div className="v-stack gap-2">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Playground · local dev only
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">
            HITL route checklist
          </h1>
          <p className="max-w-3xl text-sm text-muted-foreground">
            Check each row after you manually open and verify the page. Progress
            is saved in this browser (
            <code className="text-xs">localStorage</code>).
          </p>
        </div>

        <nav
          aria-label="Playground review modes"
          className="flex flex-wrap gap-2"
        >
          {playgroundReviewNavLinks.map((item) => {
            const active =
              item.href === PLAYGROUND_HITL_REVIEW_HREF
                ? item.id === "hitl-review"
                : false;

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

        <nav
          aria-label="Route categories"
          className="flex flex-wrap gap-2 border-t pt-4"
        >
          {categoryNav.map((item) => (
            <span
              key={item.id}
              className="rounded-md bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground"
            >
              {item.label}:{" "}
              {rows.filter((row) => row.category === item.id).length}
            </span>
          ))}
          <span className="rounded-md bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
            Total: {rows.length}
          </span>
        </nav>
      </header>

      <section id="playground-hitl-main" className="min-w-0">
        <PlaygroundHitlRouteTable rows={rows} />
      </section>
    </div>
  );
}
