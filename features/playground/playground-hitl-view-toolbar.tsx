"use client";

import Link from "next/link";

import { cn } from "@/components-V2/lib/utils";
import {
  HITL_ATTENTION_FILTERS,
  HITL_ATTENTION_FILTER_LABEL,
  HITL_CATEGORY_FILTERS,
  HITL_CATEGORY_FILTER_LABEL,
  HITL_SHAPE_FILTERS,
  HITL_SHAPE_FILTER_LABEL,
  HITL_STATIC_PRESENTS,
  HITL_STATIC_PRESENT_LABEL,
  HITL_VIEW_MODES,
  buildHitlReviewHref,
  type HitlAttentionFilter,
  type HitlCategoryFilter,
  type HitlShapeFilter,
  type HitlStaticPresent,
  type HitlViewFilters,
  type HitlViewMode,
} from "@/features/playground/playground-hitl-views";
import type { PlaygroundHitlRow } from "@/features/playground/playground-hitl-rows";
import { PLAYGROUND_PAGE_SHAPE_LABEL } from "@/features/playground/playground-page-shape";
import { isPlaygroundStaticCompositionId } from "@/features/playground/playground-static-composition-ids";

function Chip({
  active,
  href,
  children,
}: {
  active: boolean;
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      scroll={false}
      aria-current={active ? "page" : undefined}
      className={cn(
        "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
        active
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:bg-muted hover:text-foreground border",
      )}
    >
      {children}
    </Link>
  );
}

function ChipGroup({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
        {label}
      </p>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

export function PlaygroundHitlViewToolbar({
  filters,
  liveShapeFocus,
  inspectRows,
}: {
  filters: HitlViewFilters;
  liveShapeFocus: boolean;
  /** Filtered inventory — Inspect picks any screen; shape drives the panel. */
  inspectRows: PlaygroundHitlRow[];
}) {
  function hrefFor(
    next: Partial<HitlViewFilters>,
    options?: { liveShapeFocus?: boolean },
  ) {
    const merged: HitlViewFilters = {
      view: next.view ?? filters.view,
      cat: next.cat ?? filters.cat,
      shape: next.shape ?? filters.shape,
      attention: next.attention ?? filters.attention,
      present: next.present ?? filters.present,
      screen: next.screen !== undefined ? next.screen : filters.screen,
    };

    if (merged.view === "live") {
      merged.present = "list";
      merged.screen = null;
    }

    return buildHitlReviewHref(merged, options);
  }

  const defaultInspectScreen =
    filters.screen ??
    inspectRows.find((row) => isPlaygroundStaticCompositionId(row.id))?.id ??
    inspectRows[0]?.id ??
    "admin-dashboard";

  return (
    <div className="flex flex-col gap-4" data-playground-hitl-toolbar>
      <ChipGroup label="View">
        {HITL_VIEW_MODES.map((mode: HitlViewMode) => (
          <Chip
            key={mode}
            active={filters.view === mode}
            href={
              mode === "live"
                ? hrefFor(
                    { view: "live", shape: "all", present: "list", screen: null },
                    { liveShapeFocus: true },
                  )
                : hrefFor(
                    {
                      view: "static",
                      shape: liveShapeFocus ? "all" : filters.shape,
                      present:
                        filters.present === "inspect" ? "inspect" : "list",
                    },
                    { liveShapeFocus: false },
                  )
            }
          >
            {mode === "live" ? "Live" : "Static"}
          </Chip>
        ))}
      </ChipGroup>

      {filters.view === "static" ? (
        <ChipGroup label="Static present">
          {HITL_STATIC_PRESENTS.map((present: HitlStaticPresent) => (
            <Chip
              key={present}
              active={filters.present === present}
              href={hrefFor({
                present,
                screen: present === "inspect" ? defaultInspectScreen : null,
              })}
            >
              {HITL_STATIC_PRESENT_LABEL[present]}
            </Chip>
          ))}
        </ChipGroup>
      ) : null}

      {filters.view === "static" && filters.present === "inspect" ? (
        <ChipGroup label="Inspect screen (follows shape)">
          {inspectRows.slice(0, 24).map((row) => (
            <Chip
              key={row.id}
              active={filters.screen === row.id}
              href={hrefFor({ present: "inspect", screen: row.id })}
            >
              {row.label}
              <span className="ml-1 opacity-70">
                · {PLAYGROUND_PAGE_SHAPE_LABEL[row.shape]}
              </span>
            </Chip>
          ))}
          {inspectRows.length > 24 ? (
            <p className="text-muted-foreground w-full text-xs">
              Showing 24 of {inspectRows.length} — narrow category/shape to
              pick others.
            </p>
          ) : null}
        </ChipGroup>
      ) : null}

      <ChipGroup label="Category">
        {HITL_CATEGORY_FILTERS.map((cat: HitlCategoryFilter) => (
          <Chip
            key={cat}
            active={filters.cat === cat}
            href={hrefFor({ cat }, { liveShapeFocus })}
          >
            {HITL_CATEGORY_FILTER_LABEL[cat]}
          </Chip>
        ))}
      </ChipGroup>

      <ChipGroup label="Review status">
        {HITL_ATTENTION_FILTERS.map((attention: HitlAttentionFilter) => (
          <Chip
            key={attention}
            active={filters.attention === attention}
            href={hrefFor({ attention }, { liveShapeFocus })}
          >
            {HITL_ATTENTION_FILTER_LABEL[attention]}
          </Chip>
        ))}
      </ChipGroup>

      <details open={filters.shape !== "all"} className="group">
        <summary className="text-muted-foreground hover:text-foreground cursor-pointer text-xs font-semibold uppercase tracking-wide">
          Advanced compatibility shape
        </summary>
        <div className="mt-3">
          <ChipGroup label="Shape">
            {liveShapeFocus ? (
              <Chip
                active
                href={hrefFor(
                  { view: "live", shape: "all" },
                  { liveShapeFocus: true },
                )}
              >
                Live + Redirect (default)
              </Chip>
            ) : null}
            {HITL_SHAPE_FILTERS.map((shape: HitlShapeFilter) => (
              <Chip
                key={shape}
                active={!liveShapeFocus && filters.shape === shape}
                href={hrefFor({ shape }, { liveShapeFocus: false })}
              >
                {HITL_SHAPE_FILTER_LABEL[shape]}
              </Chip>
            ))}
          </ChipGroup>
        </div>
      </details>
    </div>
  );
}
