"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { submitFftOrderAction } from "@/app/actions/fft";
import { getFftActionError } from "@/modules/fft/domain/fft-action-result";
import type { FftFieldDef, FftProduct } from "@/modules/fft/domain/types";
import { Button } from "@/components-V2/platform-components/ui/button";
import { Label } from "@/components-V2/platform-components/ui/label";
import {
  FFT_NATIVE_FIELD_CLASS,
  FFT_NATIVE_SELECT_CLASS,
  FFT_NATIVE_TEXTAREA_CLASS,
  TradeFormCheckbox,
} from "@/features/fft/fft-form-controls";
import { fftHref, type FftLocale } from "@/modules/fft/i18n/fft-i18n";

export function FftOrderForm({
  locale,
  eventId,
  products,
  fieldDefs,
  depositRequired,
  eventStatus = "open",
}: {
  locale: FftLocale;
  eventId: string;
  products: FftProduct[];
  fieldDefs: FftFieldDef[];
  depositRequired: boolean;
  eventStatus?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const windowOpen = eventStatus === "open";

  if (!windowOpen) {
    return (
      <p
        className="text-muted-foreground rounded-lg border p-4 text-sm"
        data-testid="fft-order-window-closed"
      >
        Orders can only be submitted while the event window is open (status:{" "}
        {eventStatus}).
      </p>
    );
  }

  return (
    <form
      className="space-y-4 rounded-lg border p-4"
      action={(formData) => {
        setError(null);
        startTransition(async () => {
          try {
            const result = await submitFftOrderAction(locale, eventId, formData);
            const err = getFftActionError(result);
            if (err) {
              setError(err);
              return;
            }
            router.push(fftHref("/my-orders"));
            router.refresh();
          } catch {
            setError("order_submit_failed");
          }
        });
      }}
    >
      <div className="space-y-2">
        <Label htmlFor="customerName">Customer name</Label>
        {/* Native + FFT_NATIVE_* — Base UI Input can omit names from FormData. */}
        <input
          id="customerName"
          name="customerName"
          required
          className={FFT_NATIVE_FIELD_CLASS}
          data-testid="fft-order-customer-name"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="customerCode">Customer code</Label>
        <input
          id="customerCode"
          name="customerCode"
          className={FFT_NATIVE_FIELD_CLASS}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="productId">Product</Label>
        <select
          id="productId"
          name="productId"
          required
          className={FFT_NATIVE_SELECT_CLASS}
          data-testid="fft-order-product"
        >
          <option value="">Select product</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.productName}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="requestedQuantity">Requested quantity</Label>
        <input
          id="requestedQuantity"
          name="requestedQuantity"
          type="number"
          min={1}
          required
          className={FFT_NATIVE_FIELD_CLASS}
          data-testid="fft-order-qty"
        />
      </div>
      {depositRequired ? (
        <div className="space-y-2">
          <Label htmlFor="depositStatus">Deposit status</Label>
          <select
            id="depositStatus"
            name="depositStatus"
            className={FFT_NATIVE_SELECT_CLASS}
            defaultValue="pending"
          >
            <option value="pending">pending</option>
            <option value="paid">paid</option>
            <option value="waived">waived</option>
            <option value="not_required">not_required</option>
          </select>
        </div>
      ) : null}
      {fieldDefs.map((def) => (
        <div key={def.id} className="space-y-2">
          <Label htmlFor={`attr_${def.fieldKey}`}>
            {locale === "vi" ? def.labelVi : def.labelEn}
            {def.required ? " *" : ""}
          </Label>
          {def.fieldType === "long_text" ? (
            <textarea
              id={`attr_${def.fieldKey}`}
              name={`attr_${def.fieldKey}`}
              required={def.required}
              className={FFT_NATIVE_TEXTAREA_CLASS}
              data-testid={`trade-order-attr-${def.fieldKey}`}
            />
          ) : def.fieldType === "select" ? (
            <select
              id={`attr_${def.fieldKey}`}
              name={`attr_${def.fieldKey}`}
              className={FFT_NATIVE_SELECT_CLASS}
              required={def.required}
              data-testid={`trade-order-attr-${def.fieldKey}`}
            >
              <option value="">—</option>
              {def.dropdownOptions?.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          ) : def.fieldType === "boolean" ? (
            <TradeFormCheckbox
              id={`attr_${def.fieldKey}`}
              name={`attr_${def.fieldKey}`}
              value="true"
              data-testid={`trade-order-attr-${def.fieldKey}`}
            />
          ) : (
            <input
              id={`attr_${def.fieldKey}`}
              name={`attr_${def.fieldKey}`}
              type={
                def.fieldType === "number" || def.fieldType === "currency"
                  ? "number"
                  : def.fieldType === "date"
                    ? "date"
                    : def.fieldType === "datetime"
                      ? "datetime-local"
                      : "text"
              }
              required={def.required}
              className={FFT_NATIVE_FIELD_CLASS}
              data-testid={`trade-order-attr-${def.fieldKey}`}
            />
          )}
        </div>
      ))}
      <div className="space-y-2">
        <Label htmlFor="remarks">Remarks</Label>
        <textarea
          id="remarks"
          name="remarks"
          rows={3}
          className={FFT_NATIVE_TEXTAREA_CLASS}
        />
      </div>
      <p className="text-muted-foreground text-xs">
        Deposit status is tracking only — not finance settlement.
      </p>
      {error ? (
        <p className="text-destructive text-sm" data-testid="fft-order-error">
          {error}
        </p>
      ) : null}
      <Button type="submit" disabled={pending} data-testid="fft-order-submit">
        Submit order
      </Button>
    </form>
  );
}
