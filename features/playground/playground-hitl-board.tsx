"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import {
  ArrowRightIcon,
  AlertTriangleIcon,
  CheckCircle2Icon,
  LockKeyholeIcon,
  WrenchIcon,
} from "lucide-react";

import { Avatar, AvatarFallback } from "@/components-V2/platform-components/ui/avatar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components-V2/platform-components/ui/card";
import { PlaygroundHitlDatatable } from "@/components-V2/platform-views/portal-views/playground-hitl-datatable";
import { PlaygroundHitlLiveStrip } from "@/features/playground/playground-hitl-live-strip";
import { PlaygroundHitlViewToolbar } from "@/features/playground/playground-hitl-view-toolbar";
import {
  PlaygroundHitlReviewsProvider,
  usePlaygroundHitlReviews,
} from "@/features/playground/playground-hitl-confirm";
import { cn } from "@/components-V2/lib/utils";
import {
  countPlaygroundHitlAttention,
  type PlaygroundHitlRow,
} from "@/features/playground/playground-hitl-rows";
import {
  PLAYGROUND_HITL_REVIEW_HREF,
  playgroundReviewNavLinks,
} from "@/features/playground/playground-nav";
import {
  buildHitlReviewHref,
  filterHitlRows,
  parseHitlViewFilters,
} from "@/features/playground/playground-hitl-views";

function KpiCard({
  icon,
  title,
  description,
  value,
  iconClassName,
  action,
  href,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  value: string | number;
  iconClassName?: string;
  action: string;
  href: string;
}) {
  const card = (
    <Card className="group-hover:border-foreground/20 h-full shadow-none transition-colors">
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
        <div className="space-y-1">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
          <CardDescription className="text-pretty">{description}</CardDescription>
        </div>
        <Avatar size="lg" className="rounded-sm after:border-0">
          <AvatarFallback
            className={cn(
              "bg-primary/10 text-primary shrink-0 rounded-sm [&>svg]:size-5",
              iconClassName,
            )}
          >
            {icon}
          </AvatarFallback>
        </Avatar>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-2xl font-semibold tabular-nums">{value}</p>
        <p className="text-muted-foreground group-hover:text-foreground flex items-center gap-1.5 text-xs font-medium transition-colors">
          {action}
          <ArrowRightIcon
            className="size-3.5 transition-transform group-hover:translate-x-0.5"
            aria-hidden
          />
        </p>
      </CardContent>
    </Card>
  );

  return (
    <Link
      href={href}
      scroll={false}
      className="group rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      aria-label={`${title}: ${value}. ${description}. ${action}`}
    >
      {card}
    </Link>
  );
}

export type PlaygroundHitlBoardProps = {
  rows: PlaygroundHitlRow[];
  /** Server-rendered Static Inspect panel (shape-first). */
  staticComposition?: ReactNode;
};

/**
 * Route review board — source expectation, human verdict, and bounded handoff.
 * Static never mounts iframes; Inspect follows the compatibility shape.
 */
export function PlaygroundHitlBoard(props: PlaygroundHitlBoardProps) {
  return (
    <PlaygroundHitlReviewsProvider>
      <PlaygroundHitlBoardContent {...props} />
    </PlaygroundHitlReviewsProvider>
  );
}

function PlaygroundHitlBoardContent({
  rows,
  staticComposition = null,
}: PlaygroundHitlBoardProps) {
  const searchParams = useSearchParams();
  const parsed = useMemo(
    () =>
      parseHitlViewFilters({
        view: searchParams.get("view") ?? undefined,
        cat: searchParams.get("cat") ?? undefined,
        shape: searchParams.get("shape") ?? undefined,
        attention: searchParams.get("attention") ?? undefined,
        present: searchParams.get("present") ?? undefined,
        screen: searchParams.get("screen") ?? undefined,
      }),
    [searchParams],
  );

  const { view, cat, shape, attention, present, screen, liveShapeFocus } =
    parsed;
  const filters = { view, cat, shape, attention, present, screen };
  const { reviews, hydrated } = usePlaygroundHitlReviews();

  const metricRows = useMemo(
    () =>
      filterHitlRows(
        rows,
        { view, cat, shape, attention: "all", present, screen },
        { liveShapeFocus, reviews },
      ),
    [rows, view, cat, shape, present, screen, liveShapeFocus, reviews],
  );

  const filteredRows = useMemo(
    () =>
      filterHitlRows(
        rows,
        { view, cat, shape, attention, present, screen },
        { liveShapeFocus, reviews },
      ),
    [rows, view, cat, shape, attention, present, screen, liveShapeFocus, reviews],
  );

  const attentionCounts = countPlaygroundHitlAttention(metricRows, reviews);
  const showInspect = view === "static" && present === "inspect";
  const attentionHref = (
    nextAttention: "needs-review" | "verified" | "repair" | "blocked",
  ) =>
    buildHitlReviewHref({
      view: "static",
      cat,
      shape,
      attention: nextAttention,
      present: "list",
      screen: null,
    });

  return (
    <div className="flex flex-col gap-6">
      <a href="#playground-hitl-main" className="portal-skip-link">
        Skip to route review
      </a>

      <header className="flex flex-col gap-4">
        <div className="space-y-1">
          <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
            Playground · local dev only
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">Route review</h1>
          <p className="text-muted-foreground max-w-3xl text-sm text-pretty">
            <strong className="font-medium">Expected from source</strong>{" "}
            explains what the registered URL should do and why.{" "}
            <strong className="font-medium">Human verdict</strong> records what
            you actually observed. A note or copied repair prompt never marks a
            route verified.
          </p>
        </div>

        <nav aria-label="Playground review modes" className="flex flex-wrap gap-2">
          {playgroundReviewNavLinks.map((item) => {
            const active = item.href === PLAYGROUND_HITL_REVIEW_HREF;

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={
                  active
                    ? "bg-primary text-primary-foreground rounded-md px-3 py-1.5 text-sm font-medium"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground rounded-md border px-3 py-1.5 text-sm font-medium transition-colors"
                }
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <PlaygroundHitlViewToolbar
          filters={filters}
          liveShapeFocus={liveShapeFocus}
          inspectRows={filteredRows}
        />
      </header>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          icon={<AlertTriangleIcon aria-hidden />}
          title="Needs human review"
          description="Not reviewed or source expectation changed"
          value={hydrated ? attentionCounts["needs-review"] : "—"}
          iconClassName="bg-sky-500/10 text-sky-700 dark:text-sky-400"
          action="Review pending routes"
          href={attentionHref("needs-review")}
        />
        <KpiCard
          icon={<CheckCircle2Icon aria-hidden />}
          title="Verified as expected"
          description="Human review matched the source expectation"
          value={hydrated ? attentionCounts.verified : "—"}
          iconClassName="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
          action="Open verified routes"
          href={attentionHref("verified")}
        />
        <KpiCard
          icon={<WrenchIcon aria-hidden />}
          title="Repair required"
          description="Human mismatch or open-scope placeholder"
          value={hydrated ? attentionCounts.repair : "—"}
          iconClassName={
            attentionCounts.repair > 0
              ? "bg-amber-500/10 text-amber-700 dark:text-amber-400"
              : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
          }
          action="Open repair queue"
          href={attentionHref("repair")}
        />
        <KpiCard
          icon={<LockKeyholeIcon aria-hidden />}
          title="Blocked / unclassified"
          description="Closed scope, fixture gap, or missing evidence"
          value={hydrated ? attentionCounts.blocked : "—"}
          iconClassName="bg-rose-500/10 text-rose-700 dark:text-rose-400"
          action="Inspect blockers"
          href={attentionHref("blocked")}
        />
      </div>

      {view === "live" ? <PlaygroundHitlLiveStrip rows={filteredRows} /> : null}

      {showInspect ? (
        <section
          id="playground-hitl-inspect"
          className="min-w-0"
          data-playground-hitl-inspect
        >
          {staticComposition}
        </section>
      ) : null}

      <Card id="playground-hitl-main" className="py-0 shadow-none">
        {filteredRows.length === 0 ? (
          <div className="text-muted-foreground p-6 text-sm">
            No screens in this filter.
          </div>
        ) : (
          <PlaygroundHitlDatatable rows={filteredRows} />
        )}
      </Card>
    </div>
  );
}
