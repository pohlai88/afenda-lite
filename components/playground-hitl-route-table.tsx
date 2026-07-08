"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { ExternalLinkIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { StudioFilterDataTable } from "@/components/shadcn-studio/blocks/datatable-user";
import {
  PLAYGROUND_HITL_STORAGE_KEY,
  type PlaygroundHitlRow,
} from "@/lib/playground-hitl-rows";
import { cn } from "@/lib/utils";

type PlaygroundHitlTableRow = PlaygroundHitlRow & {
  hitlReviewed: boolean;
  hitlStatus: "reviewed" | "pending";
};

const categoryLabels: Record<PlaygroundHitlRow["category"], string> = {
  admin: "Admin",
  client: "Client",
  dynamic: "Dynamic",
};

function readStoredReviews(): Record<string, boolean> {
  if (typeof window === "undefined") {
    return {};
  }

  try {
    const raw = window.localStorage.getItem(PLAYGROUND_HITL_STORAGE_KEY);
    if (!raw) {
      return {};
    }

    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") {
      return {};
    }

    return Object.fromEntries(
      Object.entries(parsed as Record<string, unknown>)
        .filter(([, value]) => value === true)
        .map(([key]) => [key, true]),
    ) as Record<string, boolean>;
  } catch {
    return {};
  }
}

function writeStoredReviews(reviews: Record<string, boolean>) {
  window.localStorage.setItem(
    PLAYGROUND_HITL_STORAGE_KEY,
    JSON.stringify(reviews),
  );
}

/** datatable-component-04 — HITL route checklist with checkbox progress. */
export function PlaygroundHitlRouteTable({
  rows,
}: {
  rows: PlaygroundHitlRow[];
}) {
  const [reviews, setReviews] = useState<Record<string, boolean>>({});
  const [pendingOnly, setPendingOnly] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setReviews(readStoredReviews());
    setHydrated(true);
  }, []);

  const setReviewed = useCallback((id: string, checked: boolean) => {
    setReviews((current) => {
      const next = { ...current };
      if (checked) {
        next[id] = true;
      } else {
        delete next[id];
      }
      writeStoredReviews(next);
      return next;
    });
  }, []);

  const tableRows = useMemo<PlaygroundHitlTableRow[]>(() => {
    return rows.map((row) => {
      const hitlReviewed = reviews[row.id] === true;
      return {
        ...row,
        hitlReviewed,
        hitlStatus: hitlReviewed ? "reviewed" : "pending",
      };
    });
  }, [rows, reviews]);

  const visibleRows = useMemo(() => {
    if (!pendingOnly) {
      return tableRows;
    }

    return tableRows.filter((row) => !row.hitlReviewed);
  }, [pendingOnly, tableRows]);

  const reviewedCount = tableRows.filter((row) => row.hitlReviewed).length;

  const columns = useMemo<ColumnDef<PlaygroundHitlTableRow>[]>(
    () => [
      {
        id: "hitl",
        header: "HITL",
        enableSorting: false,
        size: 56,
        cell: ({ row }) => (
          <Checkbox
            checked={row.original.hitlReviewed}
            onCheckedChange={(checked) =>
              setReviewed(row.original.id, checked === true)
            }
            aria-label={`Mark ${row.original.label} as HITL reviewed`}
          />
        ),
      },
      {
        accessorKey: "category",
        header: "Category",
        filterFn: "equalsString",
        meta: {
          filterVariant: "select",
          filterLabel: "Category",
          filterAllLabel: "All categories",
          filterOptions: (
            Object.keys(categoryLabels) as PlaygroundHitlRow["category"][]
          ).map((category) => ({
            value: category,
            label: categoryLabels[category],
          })),
        },
        cell: ({ row }) => (
          <Badge variant="outline">{categoryLabels[row.original.category]}</Badge>
        ),
      },
      {
        accessorKey: "label",
        header: "Screen",
        cell: ({ row }) => (
          <div className="min-w-[10rem] max-w-[16rem]">
            <p className="truncate font-medium">{row.original.label}</p>
            <p className="truncate font-mono text-xs text-muted-foreground">
              {row.original.id}
            </p>
          </div>
        ),
      },
      {
        accessorKey: "path",
        header: "Route",
        cell: ({ row }) => (
          <code className="block max-w-[18rem] truncate text-xs">
            {row.original.path}
          </code>
        ),
      },
      {
        accessorKey: "routeFile",
        header: "Page file",
        cell: ({ row }) =>
          row.original.routeFile ? (
            <code className="block max-w-[16rem] truncate text-xs text-muted-foreground">
              {row.original.routeFile}
            </code>
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          ),
      },
      {
        accessorKey: "hitlStatus",
        header: "Status",
        filterFn: "equalsString",
        meta: {
          filterVariant: "select",
          filterLabel: "HITL status",
          filterAllLabel: "All statuses",
          filterOptions: [
            { value: "pending", label: "Pending" },
            { value: "reviewed", label: "Reviewed" },
          ],
        },
        cell: ({ row }) => (
          <Badge
            variant={row.original.hitlReviewed ? "default" : "secondary"}
            className={cn(
              !row.original.hitlReviewed &&
                "bg-amber-500/15 text-amber-900 dark:text-amber-100",
            )}
          >
            {row.original.hitlReviewed ? "Reviewed" : "Pending"}
          </Badge>
        ),
      },
      {
        id: "actions",
        header: "Open",
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex flex-wrap items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              nativeButton={false}
              render={
                <Link
                  href={row.original.playgroundHref}
                  target="_blank"
                  rel="noreferrer"
                />
              }
            >
              Preview
            </Button>
            <Button
              variant="ghost"
              size="sm"
              disabled={!row.original.pathConfigured}
              nativeButton={false}
              render={
                <Link
                  href={row.original.embedHref}
                  target="_blank"
                  rel="noreferrer"
                />
              }
            >
              Live
              <ExternalLinkIcon className="size-3.5" aria-hidden="true" />
            </Button>
          </div>
        ),
      },
    ],
    [setReviewed],
  );

  return (
    <div className="v-stack min-w-0 gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="v-stack gap-1">
          <p className="text-sm text-muted-foreground">
            {hydrated ? (
              <>
                <span className="font-medium text-foreground">
                  {reviewedCount} / {tableRows.length}
                </span>{" "}
                routes marked HITL reviewed
              </>
            ) : (
              "Loading saved HITL progress…"
            )}
          </p>
          {!hydrated ? null : reviewedCount === tableRows.length ? (
            <p className="text-sm text-emerald-600 dark:text-emerald-400">
              All routes reviewed.
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              {tableRows.length - reviewedCount} still pending manual review.
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Checkbox
            id="playground-hitl-pending-only"
            checked={pendingOnly}
            onCheckedChange={(checked) => setPendingOnly(checked === true)}
          />
          <Label htmlFor="playground-hitl-pending-only">
            Show pending only
          </Label>
        </div>
      </div>

      <StudioFilterDataTable
        data={visibleRows}
        columns={columns}
        pageSize={12}
        filterColumnIds={["category", "hitlStatus"]}
        filterTitle="Filter routes"
        searchPlaceholder="Search label, route, page file, or id…"
        emptyMessage={
          pendingOnly
            ? "No pending routes — all marked reviewed."
            : "No routes match your filters."
        }
      />
    </div>
  );
}
