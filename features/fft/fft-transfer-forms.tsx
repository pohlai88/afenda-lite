"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  approveTransferAction,
  rejectTransferAction,
  requestTransferAction,
} from "@/app/actions/fft";
import { Button } from "@/components-V2/platform-components/ui/button";
import {
  FFT_NATIVE_FIELD_CLASS,
} from "@/features/fft/fft-form-controls";
import {
  TradeFormError,
  TradeFormPending,
} from "@/features/fft/fft-form-feedback";
import { getFftActionError } from "@/modules/fft/domain/fft-action-result";
import type { FftOrder } from "@/modules/fft/domain/types";
import type { FftLocale } from "@/modules/fft/i18n/fft-i18n";

export function FftTransferRequestForm({
  locale,
  order,
}: {
  locale: FftLocale;
  order: FftOrder;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (order.transferStatus === "requested") {
    return (
      <p
        className="text-muted-foreground text-xs"
        data-testid="fft-transfer-pending"
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
          const err = getFftActionError(result);
          if (err) {
            setError(err);
            return;
          }
          router.refresh();
        });
      }}
    >
      {/* Native + FFT_NATIVE_* so FormData includes names under Base UI Input gaps. */}
      <input
        className={FFT_NATIVE_FIELD_CLASS}
        name="newCustomerName"
        placeholder="New customer name"
        required
        data-testid="fft-transfer-new-customer"
      />
      <input
        className={FFT_NATIVE_FIELD_CLASS}
        name="newCustomerCode"
        placeholder="New customer code"
      />
      <input
        className={FFT_NATIVE_FIELD_CLASS}
        name="transferQuantity"
        type="number"
        min={1}
        defaultValue={order.confirmedQuantity ?? order.requestedQuantity}
        required
        data-testid="fft-transfer-qty"
      />
      <input
        className={FFT_NATIVE_FIELD_CLASS}
        name="reason"
        placeholder="Reason"
        required
        data-testid="fft-transfer-reason"
      />
      <div className="md:col-span-2">
        <Button
          type="submit"
          size="sm"
          disabled={pending}
          data-testid="fft-transfer-request"
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

export function FftTransferAdminRow({
  locale,
  transfer,
}: {
  locale: FftLocale;
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
          data-testid="fft-transfer-approve"
          onClick={() =>
            startTransition(async () => {
              setError(null);
              const result = await approveTransferAction(
                locale,
                transfer.orderId,
                transfer.id,
              );
              const err = getFftActionError(result);
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
          data-testid="fft-transfer-reject"
          onClick={() =>
            startTransition(async () => {
              setError(null);
              const result = await rejectTransferAction(
                locale,
                transfer.orderId,
                transfer.id,
              );
              const err = getFftActionError(result);
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
