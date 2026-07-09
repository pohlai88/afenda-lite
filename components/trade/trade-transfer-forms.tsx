"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  approveTransferAction,
  rejectTransferAction,
  requestTransferAction,
} from "@/app/actions/trade";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { HotSalesOrder } from "@/lib/domain/trade/types";
import type { TradeLocale } from "@/lib/i18n/trade";

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
      <p className="text-muted-foreground text-xs">Transfer pending approval</p>
    );
  }

  return (
    <form
      className="grid gap-2 rounded border p-2 text-sm md:grid-cols-2"
      action={(formData) => {
        setError(null);
        startTransition(async () => {
          const result = await requestTransferAction(locale, order.id, formData);
          if (result.error) {
            setError(result.error);
            return;
          }
          router.refresh();
        });
      }}
    >
      <Input name="newCustomerName" placeholder="New customer name" required />
      <Input name="newCustomerCode" placeholder="New customer code" />
      <Input
        name="transferQuantity"
        type="number"
        min={1}
        defaultValue={order.confirmedQuantity ?? order.requestedQuantity}
        required
      />
      <Input name="reason" placeholder="Reason" required />
      <div className="md:col-span-2">
        <Button type="submit" size="sm" disabled={pending}>
          Request transfer
        </Button>
      </div>
      {error ? <p className="text-destructive md:col-span-2 text-xs">{error}</p> : null}
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

  if (transfer.status !== "requested") {
    return (
      <li className="text-muted-foreground text-sm">
        {transfer.orderNumber}: {transfer.originalCustomerName} →{" "}
        {transfer.newCustomerName} ({transfer.status})
      </li>
    );
  }

  return (
    <li className="flex flex-wrap items-center gap-2 rounded border p-2 text-sm">
      <span>
        {transfer.orderNumber}: {transfer.originalCustomerName} →{" "}
        {transfer.newCustomerName} × {transfer.transferQuantity}
      </span>
      <span className="text-muted-foreground">{transfer.reason}</span>
      <Button
        type="button"
        size="sm"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            await approveTransferAction(locale, transfer.orderId, transfer.id);
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
        onClick={() =>
          startTransition(async () => {
            await rejectTransferAction(locale, transfer.orderId, transfer.id);
            router.refresh();
          })
        }
      >
        Reject
      </Button>
    </li>
  );
}
