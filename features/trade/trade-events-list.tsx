"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { TradeCloneEventButton } from "@/features/trade/trade-clone-button";
import { TradeEmptyState } from "@/features/trade/trade-form-feedback";
import {
  applyTradeEventListView,
  type TradeEventListItem,
  type TradeEventSortDir,
  type TradeEventSortKey,
} from "@/features/trade/trade-events-list-model";
import { Button } from "@/components-V2/platform-components/ui/button";
import { Input } from "@/components-V2/platform-components/ui/input";
import {
  TRADE_NATIVE_SELECT_CLASS,
  TradeFormCheckbox,
} from "@/features/trade/trade-form-controls";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components-V2/platform-components/ui/table";
import { HOT_SALES_EVENT_STATUSES } from "@/modules/trade/domain/types";
import { tradeHref, type TradeLocale } from "@/modules/trade/i18n/trade";

export function TradeEventsList({
  events,
  locale,
  variant = "sales",
}: {
  events: TradeEventListItem[];
  locale: TradeLocale;
  /** Admin shows clone + allocation; sales shows order link. */
  variant?: "admin" | "sales";
}) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [templatesOnly, setTemplatesOnly] = useState(false);
  const [sortKey, setSortKey] = useState<TradeEventSortKey>("opensAt");
  const [sortDir, setSortDir] = useState<TradeEventSortDir>("desc");

  const view = useMemo(
    () =>
      applyTradeEventListView(
        events,
        { query, status, templatesOnly },
        sortKey,
        sortDir,
      ),
    [events, query, status, templatesOnly, sortKey, sortDir],
  );

  function toggleSort(key: TradeEventSortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(key);
    setSortDir(key === "eventName" ? "asc" : "desc");
  }

  function sortLabel(key: TradeEventSortKey, label: string) {
    if (sortKey !== key) return label;
    return `${label} ${sortDir === "asc" ? "↑" : "↓"}`;
  }

  return (
    <div className="space-y-3" data-testid="trade-events-list">
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[12rem] flex-1 space-y-1">
          <label className="text-muted-foreground text-xs" htmlFor="trade-events-search">
            Search
          </label>
          <Input
            id="trade-events-search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Name or code"
            data-testid="trade-events-search"
          />
        </div>
        <div className="space-y-1">
          <label className="text-muted-foreground text-xs" htmlFor="trade-events-status">
            Status
          </label>
          <select
            id="trade-events-status"
            className={TRADE_NATIVE_SELECT_CLASS}
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            data-testid="trade-events-status-filter"
          >
            <option value="">All statuses</option>
            {HOT_SALES_EVENT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        {variant === "admin" ? (
          <label className="flex items-center gap-2 pb-2 text-sm">
            <TradeFormCheckbox
              checked={templatesOnly}
              onCheckedChange={setTemplatesOnly}
              data-testid="trade-events-templates-only"
            />
            Templates only
          </label>
        ) : null}
      </div>

      {events.length === 0 ? (
        <TradeEmptyState
          title="No events yet"
          description="Create an event or ensure the piglet template to get started."
          testId="trade-events-empty"
        />
      ) : view.length === 0 ? (
        <TradeEmptyState
          title="No matching events"
          description="Try clearing search or status filters."
          testId="trade-events-filter-empty"
        />
      ) : (
        <Table data-testid="trade-events-table">
          <TableHeader>
            <TableRow>
              <TableHead>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="-ml-2 h-8 px-2"
                  onClick={() => toggleSort("eventName")}
                  data-testid="trade-events-sort-name"
                >
                  {sortLabel("eventName", "Name")}
                </Button>
              </TableHead>
              <TableHead>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="-ml-2 h-8 px-2"
                  onClick={() => toggleSort("status")}
                  data-testid="trade-events-sort-status"
                >
                  {sortLabel("status", "Status")}
                </Button>
              </TableHead>
              <TableHead>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="-ml-2 h-8 px-2"
                  onClick={() => toggleSort("opensAt")}
                  data-testid="trade-events-sort-opens"
                >
                  {sortLabel("opensAt", "Opens")}
                </Button>
              </TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {view.map((event) => (
              <TableRow key={event.id} data-testid="trade-events-row">
                <TableCell>
                  <p className="font-medium">{event.eventName}</p>
                  <p className="text-muted-foreground text-xs">
                    {event.eventCode}
                    {event.isTemplate ? " · template" : ""}
                  </p>
                </TableCell>
                <TableCell>{event.status}</TableCell>
                <TableCell className="text-muted-foreground text-xs tabular-nums">
                  {new Date(event.opensAt).toLocaleString()}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    {variant === "sales" ? (
                      <Link
                        className="text-sm underline"
                        href={tradeHref(`/events/${event.id}/order`)}
                      >
                        Order
                      </Link>
                    ) : null}
                    <Link
                      className="text-sm underline"
                      href={tradeHref(`/admin/events/${event.id}/setup`)}
                    >
                      Setup
                    </Link>
                    {variant === "admin" ? (
                      <>
                        <Link
                          className="text-sm underline"
                          href={tradeHref(
                            `/admin/events/${event.id}/allocation`,
                          )}
                        >
                          Allocation
                        </Link>
                        <TradeCloneEventButton
                          locale={locale}
                          eventId={event.id}
                        />
                      </>
                    ) : null}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      <p className="text-muted-foreground text-xs" data-testid="trade-events-count">
        Showing {view.length} of {events.length}
      </p>
    </div>
  );
}
