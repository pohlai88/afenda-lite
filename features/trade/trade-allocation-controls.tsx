"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  completeTradeOrderAction,
  manualAdjustTradeOrderAction,
  previewTradeAllocationAction,
  runTradeAllocationAction,
} from "@/app/actions/trade";
import { Button } from "@/components-V2/platform-components/ui/button";
import { Input } from "@/components-V2/platform-components/ui/input";
import { getTradeActionError } from "@/lib/domain/trade/trade-action-result";
import type { AllocationSummary, HotSalesOrder } from "@/lib/domain/trade/types";
import type { TradeLocale } from "@/lib/i18n/trade";

export function TradeAllocationControls({
  locale,
  eventId,
  orders,
}: {
  locale: TradeLocale;
  eventId: string;
  orders: HotSalesOrder[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [preview, setPreview] = useState<AllocationSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              setError(null);
              const result = await previewTradeAllocationAction(locale, eventId);
              if (!("totalRequested" in result)) {
                setPreview(null);
                setError(result.error);
                return;
              }
              setPreview(result);
            })
          }
        >
          Preview allocation
        </Button>
        <Button
          type="button"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              setError(null);
              await runTradeAllocationAction(locale, eventId);
              setPreview(null);
              router.refresh();
            })
          }
        >
          Run allocation
        </Button>
      </div>

      {preview ? (
        <div className="rounded-lg border p-3 text-sm">
          <p className="font-medium">Preview</p>
          <p>
            Requested {preview.totalRequested} · Allocated {preview.totalAllocated} ·
            Rejected {preview.totalRejected}
          </p>
          <ul className="mt-2 max-h-40 space-y-1 overflow-auto text-xs">
            {preview.results.map((r) => (
              <li key={r.orderId}>
                {r.orderId.slice(0, 8)}… → {r.confirmedQuantity} ({r.status})
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="space-y-3">
        <h2 className="font-medium">Manual adjust / complete</h2>
        {orders.map((order) => (
          <TradeOrderAdjustRow
            key={order.id}
            locale={locale}
            order={order}
            onDone={() => router.refresh()}
          />
        ))}
      </div>
      {error ? <p className="text-destructive text-sm">{error}</p> : null}
    </div>
  );
}

function TradeOrderAdjustRow({
  locale,
  order,
  onDone,
}: {
  locale: TradeLocale;
  order: HotSalesOrder;
  onDone: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="grid gap-2 rounded-lg border p-3 text-sm md:grid-cols-6">
      <div className="md:col-span-2">
        <p className="font-medium">{order.orderNumber}</p>
        <p className="text-muted-foreground">
          {order.customerName} · req {order.requestedQuantity} · conf{" "}
          {order.confirmedQuantity ?? "—"} · {order.status} · dep{" "}
          {order.depositStatus}
        </p>
      </div>
      <form
        className="contents"
        action={(formData) => {
          setError(null);
          startTransition(async () => {
            const qty = Number(formData.get("confirmedQuantity"));
            const reason = String(formData.get("reason") ?? "");
            const result = await manualAdjustTradeOrderAction(
              locale,
              order.id,
              qty,
              reason,
            );
            const err = getTradeActionError(result);
            if (err) {
              setError(err);
              return;
            }
            onDone();
          });
        }}
      >
        <Input
          name="confirmedQuantity"
          type="number"
          min={0}
          defaultValue={order.confirmedQuantity ?? order.requestedQuantity}
          placeholder="Confirmed qty"
        />
        <Input name="reason" placeholder="Reason (required)" required />
        <Button type="submit" size="sm" disabled={pending}>
          Adjust
        </Button>
      </form>
      <form
        action={(formData) => {
          setError(null);
          startTransition(async () => {
            const qty = Number(formData.get("fulfilledQuantity"));
            const result = await completeTradeOrderAction(locale, order.id, qty);
            const err = getTradeActionError(result);
            if (err) {
              setError(err);
              return;
            }
            onDone();
          });
        }}
        className="flex gap-2 md:col-span-6"
      >
        <Input
          name="fulfilledQuantity"
          type="number"
          min={0}
          defaultValue={order.fulfilledQuantity ?? order.confirmedQuantity ?? ""}
          placeholder="Fulfilled qty"
        />
        <Button type="submit" size="sm" variant="secondary" disabled={pending}>
          Complete (final support)
        </Button>
      </form>
      {error ? (
        <p className="text-destructive md:col-span-6 text-xs">{error}</p>
      ) : null}
    </div>
  );
}
