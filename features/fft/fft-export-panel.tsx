"use client";

import { useState, useTransition } from "react";
import {
  exportAllocationCsvAction,
  exportEventSummaryCsvAction,
  exportOrdersCsvAction,
} from "@/app/actions/fft";
import { Button } from "@/components-V2/platform-components/ui/button";
import { getFftActionError } from "@/modules/fft/domain/fft-action-result";
import type { FftLocale } from "@/modules/fft/i18n/fft-i18n";

export function FftExportPanel({
  locale,
  eventId,
}: {
  locale: FftLocale;
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
        const actionError = getFftActionError(
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
    <section className="space-y-3" data-testid="fft-export-panel">
      <h2 className="font-medium">Exports (CSV)</h2>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant={active === "orders" ? "default" : "outline"}
          disabled={pending}
          onClick={() => load("orders")}
          data-testid="fft-export-orders"
        >
          Orders
        </Button>
        <Button
          type="button"
          size="sm"
          variant={active === "summary" ? "default" : "outline"}
          disabled={pending}
          onClick={() => load("summary")}
          data-testid="fft-export-summary"
        >
          Event summary
        </Button>
        <Button
          type="button"
          size="sm"
          variant={active === "allocation" ? "default" : "outline"}
          disabled={pending}
          onClick={() => load("allocation")}
          data-testid="fft-export-allocation"
        >
          Allocation
        </Button>
      </div>
      {error ? (
        <p
          className="text-destructive text-sm"
          role="alert"
          data-testid="fft-export-error"
        >
          {error}
        </p>
      ) : null}
      {csv ? (
        <pre
          className="max-h-48 overflow-auto rounded border p-2 text-xs"
          data-testid="fft-export-csv"
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
