"use client";

import { useMemo, useState } from "react";
import { TradeEmptyState } from "@/features/fft/fft-form-feedback";
import {
  filterFftAuditRows,
  listAuditActors,
  type FftAuditListItem,
} from "@/features/fft/fft-audit-filter-model";
import {
  FFT_NATIVE_SELECT_CLASS,
} from "@/features/fft/fft-form-controls";
import { Input } from "@/components-V2/platform-components/ui/input";

export function FftAuditPanel({ rows }: { rows: FftAuditListItem[] }) {
  const [actorId, setActorId] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const actors = useMemo(() => listAuditActors(rows), [rows]);
  const view = useMemo(
    () => filterFftAuditRows(rows, { actorId, fromDate, toDate }),
    [rows, actorId, fromDate, toDate],
  );

  return (
    <section className="space-y-3" data-testid="fft-audit-panel">
      <h2 className="font-medium">Audit</h2>

      {rows.length === 0 ? (
        <TradeEmptyState
          title="No audit entries yet"
          description="Event mutations will appear here when you have audit.view."
          testId="trade-audit-empty"
        />
      ) : (
        <>
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <label className="text-muted-foreground text-xs" htmlFor="trade-audit-actor">
                Actor
              </label>
              <select
                id="trade-audit-actor"
                className={FFT_NATIVE_SELECT_CLASS}
                value={actorId}
                onChange={(e) => setActorId(e.target.value)}
                data-testid="fft-audit-actor-filter"
              >
                <option value="">All actors</option>
                {actors.map((id) => (
                  <option key={id} value={id}>
                    {id}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-muted-foreground text-xs" htmlFor="trade-audit-from">
                From
              </label>
              <Input
                id="trade-audit-from"
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                data-testid="fft-audit-from-date"
              />
            </div>
            <div className="space-y-1">
              <label className="text-muted-foreground text-xs" htmlFor="trade-audit-to">
                To
              </label>
              <Input
                id="trade-audit-to"
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                data-testid="fft-audit-to-date"
              />
            </div>
          </div>

          {view.length === 0 ? (
            <TradeEmptyState
              title="No matching audit rows"
              description="Try clearing actor or date filters."
              testId="trade-audit-filter-empty"
            />
          ) : (
            <ul
              className="text-muted-foreground max-h-64 overflow-auto text-xs"
              data-testid="fft-audit-list"
            >
              {view.map((row) => (
                <li key={row.id} data-testid="fft-audit-row">
                  {row.createdAt} · {row.action} · {row.actorId || "—"}
                </li>
              ))}
            </ul>
          )}
          <p className="text-muted-foreground text-xs" data-testid="fft-audit-count">
            Showing {view.length} of {rows.length}
          </p>
        </>
      )}
    </section>
  );
}
