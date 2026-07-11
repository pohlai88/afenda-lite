"use client";

import { useState, useTransition } from "react";
import {
  exportAllocationCsvAction,
  exportEventSummaryCsvAction,
  exportOrdersCsvAction,
} from "@/app/actions/trade";
import { Button } from "@/components-V2/platform-components/ui/button";
import { getTradeActionError } from "@/modules/trade/domain/trade-action-result";
import type { TradeLocale } from "@/modules/trade/i18n/trade";

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
  const [error, setError] = useState<string | null>(null);

  function load(kind: "orders" | "summary" | "allocation") {
    startTransition(async () => {
      setActive(kind);
      setError(null);
      try {
        const result =
          kind === "orders"
            ? await exportOrdersCsvAction(locale, eventId)
            : kind === "summary"
              ? await exportEventSummaryCsvAction(locale, eventId)
              : await exportAllocationCsvAction(locale, eventId);
        const actionError = getTradeActionError(
          typeof result === "string" ? null : result,
        );
        if (actionError) {
          setCsv("");
          setError(actionError);
          return;
        }
        setCsv(typeof result === "string" ? result : "");
      } catch {
        setCsv("");
        setError("export_failed");
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
          data-testid="trade-export-orders"
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
      {error ? (
        <p
          className="text-destructive text-sm"
          role="alert"
          data-testid="trade-export-error"
        >
          {error}
        </p>
      ) : null}
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
