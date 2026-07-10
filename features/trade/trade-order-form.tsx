"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { submitTradeOrderAction } from "@/app/actions/trade";
import { getTradeActionError } from "@/lib/domain/trade/trade-action-result";
import type { HotSalesFieldDef, HotSalesProduct } from "@/lib/domain/trade/types";
import { Button } from "@/components-V2/platform-components/ui/button";
import { Input } from "@/components-V2/platform-components/ui/input";
import { Label } from "@/components-V2/platform-components/ui/label";
import { Textarea } from "@/components-V2/platform-components/ui/textarea";
import { tradeHref, type TradeLocale } from "@/lib/i18n/trade";

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
          const result = await submitTradeOrderAction(locale, eventId, formData);
          const err = getTradeActionError(result);
          if (err) {
            setError(err);
            return;
          }
          router.push(tradeHref(locale, "/my-orders"));
          router.refresh();
        });
      }}
    >
      <div className="space-y-2">
        <Label htmlFor="customerName">Customer name</Label>
        <Input id="customerName" name="customerName" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="customerCode">Customer code</Label>
        <Input id="customerCode" name="customerCode" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="productId">Product</Label>
        <select
          id="productId"
          name="productId"
          required
          className="border-input bg-background w-full rounded-md border px-3 py-2 text-sm"
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
        <Input id="requestedQuantity" name="requestedQuantity" type="number" min={1} required />
      </div>
      {depositRequired ? (
        <div className="space-y-2">
          <Label htmlFor="depositStatus">Deposit status</Label>
          <select
            id="depositStatus"
            name="depositStatus"
            className="border-input bg-background w-full rounded-md border px-3 py-2 text-sm"
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
            <Textarea
              id={`attr_${def.fieldKey}`}
              name={`attr_${def.fieldKey}`}
              required={def.required}
            />
          ) : def.fieldType === "select" ? (
            <select
              id={`attr_${def.fieldKey}`}
              name={`attr_${def.fieldKey}`}
              className="border-input bg-background w-full rounded-md border px-3 py-2 text-sm"
              required={def.required}
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
            />
          ) : (
            <Input
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
            />
          )}
        </div>
      ))}
      <div className="space-y-2">
        <Label htmlFor="remarks">Remarks</Label>
        <Textarea id="remarks" name="remarks" rows={3} />
      </div>
      <p className="text-muted-foreground text-xs">
        Deposit status is tracking only — not finance settlement.
      </p>
      {error ? <p className="text-destructive text-sm">{error}</p> : null}
      <Button type="submit" disabled={pending}>
        Submit order
      </Button>
    </form>
  );
}