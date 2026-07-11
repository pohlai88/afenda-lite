"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  approveTransferAction,
  rejectTransferAction,
  requestTransferAction,
} from "@/app/actions/trade";
import { Button } from "@/components-V2/platform-components/ui/button";
import {
  TRADE_NATIVE_FIELD_CLASS,
} from "@/features/trade/trade-form-controls";
import {
  TradeFormError,
  TradeFormPending,
} from "@/features/trade/trade-form-feedback";
import { getTradeActionError } from "@/modules/trade/domain/trade-action-result";
import type { HotSalesOrder } from "@/modules/trade/domain/types";
import type { TradeLocale } from "@/modules/trade/i18n/trade";

export function TradeTransferRequestForm({
  locale,
  order,
}: {
  locale: TradeLocale;
  order: HotSalesOrder;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (order.transferStatus === "requested") {
    return (
      <p
        className="text-muted-foreground text-xs"
        data-testid="trade-transfer-pending"
      >
        Transfer pending approval
      </p>
    );
  }

  const transferable = new Set(["confirmed", "partial", "full"]);
  if (!transferable.has(order.status)) {
    return null;
  }

  return (
    <form
      className="grid gap-2 rounded border p-2 text-sm md:grid-cols-2"
      action={(formData) => {
        setError(null);
        startTransition(async () => {
          const result = await requestTransferAction(locale, order.id, formData);
          const err = getTradeActionError(result);
          if (err) {
            setError(err);
            return;
          }
          router.refresh();
        });
      }}
    >
      {/* Native + TRADE_NATIVE_* so FormData includes names under Base UI Input gaps. */}
      <input
        className={TRADE_NATIVE_FIELD_CLASS}
        name="newCustomerName"
        placeholder="New customer name"
        required
        data-testid="trade-transfer-new-customer"
      />
      <input
        className={TRADE_NATIVE_FIELD_CLASS}
        name="newCustomerCode"
        placeholder="New customer code"
      />
      <input
        className={TRADE_NATIVE_FIELD_CLASS}
        name="transferQuantity"
        type="number"
        min={1}
        defaultValue={order.confirmedQuantity ?? order.requestedQuantity}
        required
        data-testid="trade-transfer-qty"
      />
      <input
        className={TRADE_NATIVE_FIELD_CLASS}
        name="reason"
        placeholder="Reason"
        required
        data-testid="trade-transfer-reason"
      />
      <div className="md:col-span-2">
        <Button
          type="submit"
          size="sm"
          disabled={pending}
          data-testid="trade-transfer-request"
        >
          {pending ? "Submitting…" : "Request transfer"}
        </Button>
      </div>
      <div className="md:col-span-2 space-y-1">
        <TradeFormError message={error} testId="trade-transfer-error" />
        <TradeFormPending pending={pending} label="Submitting transfer…" />
      </div>
    </form>
  );
}

export function TradeTransferAdminRow({
  locale,
  transfer,
}: {
  locale: TradeLocale;
  transfer: {
    id: string;
    orderId: string;
    orderNumber: string;
    originalCustomerName: string;
    newCustomerName: string;
    transferQuantity: number;
    reason: string;
    status: string;
  };
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (transfer.status !== "requested") {
    return (
      <li className="text-muted-foreground text-sm">
        {transfer.orderNumber}: {transfer.originalCustomerName} →{" "}
        {transfer.newCustomerName} ({transfer.status})
      </li>
    );
  }

  return (
    <li className="space-y-2 rounded border p-2 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <span>
          {transfer.orderNumber}: {transfer.originalCustomerName} →{" "}
          {transfer.newCustomerName} × {transfer.transferQuantity}
        </span>
        <span className="text-muted-foreground">{transfer.reason}</span>
        <Button
          type="button"
          size="sm"
          disabled={pending}
          data-testid="trade-transfer-approve"
          onClick={() =>
            startTransition(async () => {
              setError(null);
              const result = await approveTransferAction(
                locale,
                transfer.orderId,
                transfer.id,
              );
              const err = getTradeActionError(result);
              if (err) {
                setError(err);
                return;
              }
              router.refresh();
            })
          }
        >
          Approve
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={pending}
          data-testid="trade-transfer-reject"
          onClick={() =>
            startTransition(async () => {
              setError(null);
              const result = await rejectTransferAction(
                locale,
                transfer.orderId,
                transfer.id,
              );
              const err = getTradeActionError(result);
              if (err) {
                setError(err);
                return;
              }
              router.refresh();
            })
          }
        >
          Reject
        </Button>
      </div>
      <TradeFormError message={error} testId="trade-transfer-admin-error" />
      <TradeFormPending pending={pending} label="Updating transfer…" />
    </li>
  );
}
