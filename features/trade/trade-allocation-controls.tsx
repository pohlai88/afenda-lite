"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import {
  completeTradeOrderAction,
  manualAdjustTradeOrderAction,
  previewTradeAllocationAction,
  runTradeAllocationAction,
} from "@/app/actions/trade";
import { Button } from "@/components-V2/platform-components/ui/button";
import { Input } from "@/components-V2/platform-components/ui/input";
import { TRADE_NATIVE_FIELD_CLASS } from "@/features/trade/trade-form-controls";
import {
  TradeEmptyState,
  TradeFormError,
  TradeFormPending,
} from "@/features/trade/trade-form-feedback";
import { TradeListPagination } from "@/features/trade/trade-list-pagination";
import {
  paginateItems,
  TRADE_ORDERS_PAGE_SIZE,
} from "@/features/trade/trade-orders-pagination-model";
import { getTradeActionError } from "@/modules/trade/domain/trade-action-result";
import type { AllocationSummary, HotSalesOrder } from "@/modules/trade/domain/types";
import type { TradeLocale } from "@/modules/trade/i18n/trade";

export function TradeAllocationControls({
  locale,
  eventId,
  orders,
  canOverride = false,
}: {
  locale: TradeLocale;
  eventId: string;
  orders: HotSalesOrder[];
  /** G9 — only when caller has `allocation.override` (not preview/run). */
  canOverride?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [preview, setPreview] = useState<AllocationSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ordersPage, setOrdersPage] = useState(1);
  const ordersSlice = useMemo(
    () => paginateItems(orders, ordersPage, TRADE_ORDERS_PAGE_SIZE),
    [orders, ordersPage],
  );

  return (
    <div className="space-y-4" data-testid="trade-allocation-controls">
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={pending}
          data-testid="trade-preview-allocation"
          onClick={() =>
            startTransition(async () => {
              setError(null);
              try {
                const result = await previewTradeAllocationAction(
                  locale,
                  eventId,
                );
                const err = getTradeActionError(result);
                if (err) {
                  setPreview(null);
                  setError(err);
                  return;
                }
                if (!result || !("totalRequested" in result)) {
                  setPreview(null);
                  setError("preview_failed");
                  return;
                }
                setPreview(result);
              } catch {
                setPreview(null);
                setError("preview_failed");
              }
            })
          }
        >
          Preview allocation
        </Button>
        <Button
          type="button"
          disabled={pending}
          data-testid="trade-run-allocation"
          onClick={() =>
            startTransition(async () => {
              setError(null);
              try {
                const result = await runTradeAllocationAction(locale, eventId);
                const err = getTradeActionError(result);
                if (err) {
                  setError(err);
                  return;
                }
                setPreview(null);
                router.refresh();
              } catch {
                setError("allocation_run_failed");
              }
            })
          }
        >
          {pending ? "Working…" : "Run allocation"}
        </Button>
      </div>
      <TradeFormPending pending={pending} label="Allocation in progress…" />

      {preview ? (
        <div
          className="rounded-lg border p-3 text-sm"
          data-testid="trade-allocation-preview"
        >
          <p className="font-medium">Preview</p>
          <p>
            Requested {preview.totalRequested} · Allocated {preview.totalAllocated}{" "}
            · Rejected {preview.totalRejected}
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
        <h2 className="font-medium">
          {canOverride ? "Manual override / complete" : "Orders / complete"}
        </h2>
        {orders.length === 0 ? (
          <TradeEmptyState
            title="No orders yet"
            description="Orders appear here after sales submit during the open window."
            testId="trade-allocation-orders-empty"
          />
        ) : (
          <>
            {ordersSlice.items.map((order) => (
              <TradeOrderAdjustRow
                key={order.id}
                locale={locale}
                order={order}
                canOverride={canOverride}
                onDone={() => router.refresh()}
              />
            ))}
            <TradeListPagination
              page={ordersSlice.page}
              pageCount={ordersSlice.pageCount}
              total={ordersSlice.total}
              pageSize={ordersSlice.pageSize}
              onPageChange={setOrdersPage}
            />
          </>
        )}
      </div>
      <TradeFormError message={error} testId="trade-allocation-error" />
    </div>
  );
}

function TradeOrderAdjustRow({
  locale,
  order,
  canOverride,
  onDone,
}: {
  locale: TradeLocale;
  order: HotSalesOrder;
  canOverride: boolean;
  onDone: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div
      className="grid gap-2 rounded-lg border p-3 text-sm md:grid-cols-6"
      data-testid="trade-order-row"
      data-order-id={order.id}
      data-status={order.status}
      data-customer={order.customerName}
    >
      <div className="md:col-span-2">
        <p className="font-medium">{order.orderNumber}</p>
        <p className="text-muted-foreground">
          {order.customerName} · req {order.requestedQuantity} · conf{" "}
          {order.confirmedQuantity ?? "—"} · {order.status} · dep{" "}
          {order.depositStatus}
        </p>
      </div>
      {canOverride ? (
        <form
          className="contents"
          data-testid="trade-override-form"
          action={(formData) => {
            setError(null);
            startTransition(async () => {
              const qty = Number(formData.get("confirmedQuantity"));
              const reason = String(formData.get("reason") ?? "");
              try {
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
              } catch {
                setError("override_failed");
              }
            });
          }}
        >
          <Input
            name="confirmedQuantity"
            type="number"
            min={0}
            defaultValue={order.confirmedQuantity ?? order.requestedQuantity}
            placeholder="Confirmed qty"
            data-testid="trade-override-qty"
          />
          <Input
            name="reason"
            placeholder="Reason (required)"
            required
            data-testid="trade-override-reason"
          />
          <Button
            type="submit"
            size="sm"
            disabled={pending}
            data-testid="trade-override-adjust"
          >
            Override
          </Button>
        </form>
      ) : (
        <p
          className="text-muted-foreground md:col-span-3 text-xs"
          data-testid="trade-override-hidden"
        >
          Manual override requires allocation.override
        </p>
      )}
      <form
        action={(formData) => {
          setError(null);
          startTransition(async () => {
            const qty = Number(formData.get("fulfilledQuantity"));
            try {
              const result = await completeTradeOrderAction(locale, order.id, qty);
              const err = getTradeActionError(result);
              if (err) {
                setError(err);
                return;
              }
              onDone();
            } catch {
              setError("order_complete_failed");
            }
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
        <Button
          type="submit"
          size="sm"
          variant="secondary"
          disabled={pending}
          data-testid="trade-complete-order"
        >
          Complete (final support)
        </Button>
      </form>
      {error ? (
        <TradeFormError message={error} testId="trade-override-error" />
      ) : null}
      <TradeFormPending pending={pending} />
    </div>
  );
}

export function TradeCompleteOrderForm({
  locale,
  orderId,
  defaultFulfilledQuantity,
}: {
  locale: TradeLocale;
  orderId: string;
  defaultFulfilledQuantity: number;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      className="flex flex-wrap items-end gap-2"
      action={(formData) => {
        setError(null);
        startTransition(async () => {
          const qty = Number(formData.get("fulfilledQuantity"));
          try {
            const result = await completeTradeOrderAction(locale, orderId, qty);
            const err = getTradeActionError(result);
            if (err) {
              setError(err);
              return;
            }
            router.refresh();
          } catch {
            setError("order_complete_failed");
          }
        });
      }}
    >
      <label className="text-xs">
        Fulfilled qty
        <input
          className={`${TRADE_NATIVE_FIELD_CLASS} ml-2 inline-block w-28`}
          name="fulfilledQuantity"
          type="number"
          min={0}
          defaultValue={defaultFulfilledQuantity}
          data-testid="trade-complete-fulfilled-qty"
        />
      </label>
      <Button
        type="submit"
        variant="outline"
        size="sm"
        disabled={pending}
        data-testid="trade-complete-order"
      >
        Complete order
      </Button>
      {error ? (
        <TradeFormError message={error} testId="trade-complete-error" />
      ) : null}
      <TradeFormPending pending={pending} />
    </form>
  );
}
