"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  cancelImportBatchAction,
  confirmImportBatchAction,
  getImportTemplateAction,
  uploadImportDryRunAction,
} from "@/app/actions/trade";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { getTradeActionError } from "@/lib/domain/trade/trade-action-result";
import type { HotSalesImportType } from "@/lib/domain/trade/import-types";
import type { TradeLocale } from "@/lib/i18n/trade";
import { tradeHref } from "@/lib/i18n/trade";

type DryRunRow = {
  rowNumber: number;
  validationErrors: string[];
  payload: Record<string, unknown>;
};

type DryRunResult = {
  batchId: string;
  rowCount: number;
  validCount: number;
  errorCount: number;
  rows: DryRunRow[];
};

type ImportOption = {
  value: HotSalesImportType;
  label: string;
  disabled?: boolean;
  disabledReason?: string;
};

function downloadBase64File(dataBase64: string, filename: string) {
  const bytes = Uint8Array.from(atob(dataBase64), (c) => c.charCodeAt(0));
  const blob = new Blob([bytes], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function TradeImportNavLink({
  locale,
  eventId,
}: {
  locale: TradeLocale;
  eventId: string;
}) {
  return (
    <Link
      href={tradeHref(locale, `/admin/events/${eventId}/imports`)}
      className="text-primary underline-offset-4 hover:underline"
    >
      Excel imports
    </Link>
  );
}

export function TradeImportPanel({
  locale,
  eventId,
  depositEnabled,
  pickupEnabled,
}: {
  locale: TradeLocale;
  eventId: string;
  depositEnabled: boolean;
  pickupEnabled: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const importOptions: ImportOption[] = [
    { value: "customer_priority", label: "Customer priority" },
    { value: "product_supply", label: "Product / supply quantities" },
    { value: "bulk_order", label: "Bulk orders" },
    {
      value: "deposit_record",
      label: "Deposit records",
      disabled: !depositEnabled,
      disabledReason: "Requires HOT_SALES_DEPOSIT_ENABLED",
    },
    {
      value: "pickup_confirmation",
      label: "Pickup confirmation",
      disabled: !pickupEnabled,
      disabledReason: "Requires HOT_SALES_PICKUP_OPS_ENABLED",
    },
  ];

  const firstEnabled =
    importOptions.find((o) => !o.disabled)?.value ?? "customer_priority";

  const [importType, setImportType] = useState<HotSalesImportType>(firstEnabled);
  const [error, setError] = useState<string | null>(null);
  const [dryRun, setDryRun] = useState<DryRunResult | null>(null);

  const selected = importOptions.find((o) => o.value === importType);

  return (
    <div className="space-y-6">
      <div className="rounded-lg border p-4 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="importType">Import type</Label>
          <select
            id="importType"
            className="border-input bg-background flex h-9 w-full rounded-md border px-3 text-sm"
            value={importType}
            onChange={(e) => {
              setImportType(e.target.value as HotSalesImportType);
              setDryRun(null);
              setError(null);
            }}
          >
            {importOptions.map((opt) => (
              <option key={opt.value} value={opt.value} disabled={opt.disabled}>
                {opt.label}
                {opt.disabled ? " (flag off)" : ""}
              </option>
            ))}
          </select>
          {selected?.disabledReason ? (
            <p className="text-muted-foreground text-xs">{selected.disabledReason}</p>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={pending || selected?.disabled}
            onClick={() => {
              setError(null);
              startTransition(async () => {
                const result = await getImportTemplateAction(locale, importType);
                if ("error" in result) {
                  setError(result.error);
                  return;
                }
                downloadBase64File(result.dataBase64, result.filename);
              });
            }}
          >
            Download template
          </Button>
        </div>

        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (selected?.disabled) return;
            setError(null);
            const formData = new FormData(e.currentTarget);
            formData.set("importType", importType);
            startTransition(async () => {
              const result = await uploadImportDryRunAction(locale, eventId, formData);
              if (!result || !("ok" in result) || result.ok !== true) {
                setError(getTradeActionError(result) ?? "Import dry-run failed");
                setDryRun(null);
                return;
              }
              setDryRun({
                batchId: result.batchId,
                rowCount: result.rowCount,
                validCount: result.validCount,
                errorCount: result.errorCount,
                rows: result.rows,
              });
            });
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="file">Excel file (.xlsx)</Label>
            <input
              id="file"
              name="file"
              type="file"
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              required
              disabled={selected?.disabled}
              className="block w-full text-sm"
            />
          </div>
          <Button type="submit" disabled={pending || selected?.disabled}>
            {pending ? "Validating…" : "Upload & dry-run"}
          </Button>
        </form>

        {error ? <p className="text-destructive text-sm">{error}</p> : null}
      </div>

      {dryRun ? (
        <div className="space-y-4 rounded-lg border p-4">
          <div>
            <h3 className="font-medium">Dry-run summary</h3>
            <p className="text-muted-foreground text-sm">
              {dryRun.validCount} valid · {dryRun.errorCount} errors · {dryRun.rowCount}{" "}
              total rows
            </p>
          </div>

          {dryRun.errorCount > 0 ? (
            <div className="max-h-64 overflow-auto rounded border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50 text-left">
                    <th className="p-2">Row</th>
                    <th className="p-2">Errors</th>
                  </tr>
                </thead>
                <tbody>
                  {dryRun.rows
                    .filter((r) => r.validationErrors.length > 0)
                    .slice(0, 50)
                    .map((r) => (
                      <tr key={r.rowNumber} className="border-b">
                        <td className="p-2 align-top">{r.rowNumber}</td>
                        <td className="p-2 text-destructive">
                          {r.validationErrors.join(", ")}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              disabled={pending || dryRun.validCount === 0}
              onClick={() => {
                setError(null);
                startTransition(async () => {
                  const result = await confirmImportBatchAction(
                    locale,
                    eventId,
                    dryRun.batchId,
                  );
                  const err = getTradeActionError(result);
                  if (err) {
                    setError(err);
                    return;
                  }
                  setDryRun(null);
                  router.refresh();
                });
              }}
            >
              Confirm import ({dryRun.validCount} rows)
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={() => {
                setError(null);
                startTransition(async () => {
                  const result = await cancelImportBatchAction(
                    locale,
                    eventId,
                    dryRun.batchId,
                  );
                  const err = getTradeActionError(result);
                  if (err) {
                    setError(err);
                    return;
                  }
                  setDryRun(null);
                });
              }}
            >
              Cancel
            </Button>
          </div>
          <p className="text-muted-foreground text-xs">
            Commit writes only rows that passed validation. Failed rows remain in the batch
            audit log.
          </p>
        </div>
      ) : null}
    </div>
  );
}
