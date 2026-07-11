"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { submitTradeOrderAction } from "@/app/actions/trade";
import { getTradeActionError } from "@/modules/trade/domain/trade-action-result";
import type { HotSalesFieldDef, HotSalesProduct } from "@/modules/trade/domain/types";
import { Button } from "@/components-V2/platform-components/ui/button";
import { Label } from "@/components-V2/platform-components/ui/label";
import { tradeHref, type TradeLocale } from "@/modules/trade/i18n/trade";

const fieldClassName =
  "border-input bg-background w-full rounded-md border px-3 py-2 text-sm";

export function TradeOrderForm({
  locale,
  eventId,
  products,
  fieldDefs,
  depositRequired,
}: {
  locale: TradeLocale;
  eventId: string;
  products: HotSalesProduct[];
  fieldDefs: HotSalesFieldDef[];
  depositRequired: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      className="space-y-4 rounded-lg border p-4"
      action={(formData) => {
        setError(null);
        startTransition(async () => {
          try {
            const result = await submitTradeOrderAction(locale, eventId, formData);
            const err = getTradeActionError(result);
            if (err) {
              setError(err);
              return;
            }
            router.push(tradeHref("/my-orders"));
            router.refresh();
          } catch {
            setError("order_submit_failed");
          }
        });
      }}
    >
      <div className="space-y-2">
        <Label htmlFor="customerName">Customer name</Label>
        {/* Native inputs — Base UI Input can omit names from FormData. */}
        <input
          id="customerName"
          name="customerName"
          required
          className={fieldClassName}
          data-testid="trade-order-customer-name"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="customerCode">Customer code</Label>
        <input id="customerCode" name="customerCode" className={fieldClassName} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="productId">Product</Label>
        <select
          id="productId"
          name="productId"
          required
          className={fieldClassName}
          data-testid="trade-order-product"
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
          className={fieldClassName}
          data-testid="trade-order-qty"
        />
      </div>
      {depositRequired ? (
        <div className="space-y-2">
          <Label htmlFor="depositStatus">Deposit status</Label>
          <select
            id="depositStatus"
            name="depositStatus"
            className={fieldClassName}
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
              className={fieldClassName}
              data-testid={`trade-order-attr-${def.fieldKey}`}
            />
          ) : def.fieldType === "select" ? (
            <select
              id={`attr_${def.fieldKey}`}
              name={`attr_${def.fieldKey}`}
              className={fieldClassName}
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
            <input
              id={`attr_${def.fieldKey}`}
              name={`attr_${def.fieldKey}`}
              type="checkbox"
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
              className={fieldClassName}
              data-testid={`trade-order-attr-${def.fieldKey}`}
            />
          )}
        </div>
      ))}
      <div className="space-y-2">
        <Label htmlFor="remarks">Remarks</Label>
        <textarea id="remarks" name="remarks" rows={3} className={fieldClassName} />
      </div>
      <p className="text-muted-foreground text-xs">
        Deposit status is tracking only — not finance settlement.
      </p>
      {error ? (
        <p className="text-destructive text-sm" data-testid="trade-order-error">
          {error}
        </p>
      ) : null}
      <Button type="submit" disabled={pending} data-testid="trade-order-submit">
        Submit order
      </Button>
    </form>
  );
}
