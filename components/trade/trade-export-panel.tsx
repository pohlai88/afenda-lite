"use client";

import { useState, useTransition } from "react";
import {
  exportAllocationCsvAction,
  exportEventSummaryCsvAction,
  exportOrdersCsvAction,
} from "@/app/actions/trade";
import { Button } from "@/components/ui/button";
import type { TradeLocale } from "@/lib/i18n/trade";

export function TradeExportPanel({
  locale,
  eventId,
}: {
  locale: TradeLocale;
  eventId: string;
}) {
  const [pending, startTransition] = useTransition();
  const [active, setActive] = useState<"orders" | "summary" | "allocation" | null>(
    null,
  );
  const [csv, setCsv] = useState<string>("");

  function load(kind: "orders" | "summary" | "allocation") {
    startTransition(async () => {
      setActive(kind);
      if (kind === "orders") {
        setCsv(await exportOrdersCsvAction(locale, eventId));
      } else if (kind === "summary") {
        setCsv(await exportEventSummaryCsvAction(locale, eventId));
      } else {
        setCsv(await exportAllocationCsvAction(locale, eventId));
      }
    });
  }

  return (
    <section className="space-y-3" data-testid="trade-export-panel">
      <h2 className="font-medium">Exports (CSV)</h2>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant={active === "orders" ? "default" : "outline"}
          disabled={pending}
          onClick={() => load("orders")}
        >
          Orders
        </Button>
        <Button
          type="button"
          size="sm"
          variant={active === "summary" ? "default" : "outline"}
          disabled={pending}
          onClick={() => load("summary")}
          data-testid="trade-export-summary"
        >
          Event summary
        </Button>
        <Button
          type="button"
          size="sm"
          variant={active === "allocation" ? "default" : "outline"}
          disabled={pending}
          onClick={() => load("allocation")}
          data-testid="trade-export-allocation"
        >
          Allocation
        </Button>
      </div>
      {csv ? (
        <pre
          className="max-h-48 overflow-auto rounded border p-2 text-xs"
          data-testid="trade-export-csv"
        >
          {csv}
        </pre>
      ) : (
        <p className="text-muted-foreground text-sm">
          Choose an export to preview CSV.
        </p>
      )}
    </section>
  );
}
