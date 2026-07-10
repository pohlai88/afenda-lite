"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  activateScheduledTradeEventAction,
  closeTradeEventAction,
  importPriorityCsvAction,
  openTradeEventAction,
  runTradeAllocationAction,
  saveTradeEventSetupAction,
  saveTradeFieldDefAction,
  saveTradeProductAction,
} from "@/app/actions/trade";
import type { HotSalesEvent, HotSalesFieldDef, HotSalesProduct } from "@/lib/domain/trade/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { TradeLocale } from "@/lib/i18n/trade";

function toLocalInputValue(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function TradeEventSetupForm({
  locale,
  event,
}: {
  locale: TradeLocale;
  event: HotSalesEvent;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const isOpen = event.status === "open";
  const afterClose =
    event.status === "closed" ||
    event.status === "allocating" ||
    event.status === "confirmed" ||
    event.status === "completed";
  const supportLockedHard = afterClose;
  const supportNeedsOverride = isOpen;

  return (
    <form
      className="space-y-4 rounded-lg border p-4"
      action={(formData) => {
        setError(null);
        startTransition(async () => {
          const result = await saveTradeEventSetupAction(locale, event.id, formData);
          if (result?.error) {
            setError(result.error);
            return;
          }
          router.refresh();
        });
      }}
    >
      <div className="space-y-2">
        <Label htmlFor="eventName">Event name</Label>
        <Input id="eventName" name="eventName" defaultValue={event.eventName} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="opensAt">Opens at</Label>
          <Input
            id="opensAt"
            name="opensAt"
            type="datetime-local"
            defaultValue={toLocalInputValue(event.opensAt)}
            disabled={event.status === "open"}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="closesAt">Closes at</Label>
          <Input
            id="closesAt"
            name="closesAt"
            type="datetime-local"
            defaultValue={toLocalInputValue(event.closesAt)}
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="sourceLocation">Source</Label>
        <Input
          id="sourceLocation"
          name="sourceLocation"
          defaultValue={event.sourceLocation ?? ""}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="supportAmountPerUnit">Support / unit</Label>
          <Input
            id="supportAmountPerUnit"
            name="supportAmountPerUnit"
            type="number"
            defaultValue={event.supportAmountPerUnit ?? ""}
            disabled={supportLockedHard}
          />
          {supportNeedsOverride ? (
            <p className="text-muted-foreground text-xs">
              Changing support while open requires an override reason below.
            </p>
          ) : null}
          {supportLockedHard ? (
            <p className="text-muted-foreground text-xs">
              Support is locked after the event closes.
            </p>
          ) : null}
        </div>
        <div className="space-y-2">
          <Label htmlFor="supportUnitLabel">Support unit label</Label>
          <Input
            id="supportUnitLabel"
            name="supportUnitLabel"
            defaultValue={event.supportUnitLabel ?? ""}
            disabled={supportLockedHard}
          />
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="transferAllowed" defaultChecked={event.transferAllowed} />
        Transfer allowed
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="depositRequired" defaultChecked={event.depositRequired} />
        Deposit required
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="depositRefundable"
          defaultChecked={event.depositRefundable}
        />
        Deposit refundable
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="standaloneProgram"
          defaultChecked={event.standaloneProgram}
        />
        Standalone program
      </label>
      {(event.status === "open" ||
        event.status === "closed" ||
        event.status === "allocating") && (
        <div className="space-y-2">
          <Label htmlFor="overrideReason">
            Override reason (required to change closes-at or support while open)
          </Label>
          <Input id="overrideReason" name="overrideReason" />
        </div>
      )}
      <p className="text-muted-foreground text-xs">
        Deposit tracking only — not finance settlement.
      </p>
      {error ? <p className="text-destructive text-sm">{error}</p> : null}
      <Button type="submit" disabled={pending}>
        Save setup
      </Button>
    </form>
  );
}

export function TradeEventStatusActions({
  locale,
  eventId,
  status,
}: {
  locale: TradeLocale;
  eventId: string;
  status: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex flex-wrap gap-2">
      {status === "draft" ? (
        <Button
          type="button"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              await openTradeEventAction(locale, eventId);
              router.refresh();
            })
          }
        >
          Open / schedule event
        </Button>
      ) : null}
      {status === "scheduled" ? (
        <Button
          type="button"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              await activateScheduledTradeEventAction(locale, eventId);
              router.refresh();
            })
          }
        >
          Activate (open now)
        </Button>
      ) : null}
      {status === "open" ? (
        <Button
          type="button"
          variant="secondary"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              await closeTradeEventAction(locale, eventId);
              router.refresh();
            })
          }
        >
          Close event
        </Button>
      ) : null}
    </div>
  );
}

export function TradeProductForm({
  locale,
  eventId,
  product,
  eventStatus = "draft",
}: {
  locale: TradeLocale;
  eventId: string;
  product?: HotSalesProduct;
  eventStatus?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const isOpen = eventStatus === "open";
  const isLocked =
    eventStatus === "closed" ||
    eventStatus === "allocating" ||
    eventStatus === "confirmed" ||
    eventStatus === "completed";
  const catalogLocked = isOpen || isLocked;
  // Open/closed: only final confirmed qty on existing products.
  if (catalogLocked && !product) {
    return (
      <p className="text-muted-foreground text-sm">
        Cannot add products while event is {eventStatus}.
      </p>
    );
  }

  return (
    <form
      className="grid gap-3 rounded-lg border p-4 md:grid-cols-2"
      action={(formData) => {
        setError(null);
        startTransition(async () => {
          if (product?.id) formData.set("id", product.id);
          const result = await saveTradeProductAction(locale, eventId, formData);
          if (result?.error) {
            setError(result.error);
            return;
          }
          router.refresh();
        });
      }}
    >
      {product?.id ? <input type="hidden" name="id" value={product.id} /> : null}
      <Input
        name="productName"
        placeholder="Product name"
        defaultValue={product?.productName}
        required
        disabled={catalogLocked}
      />
      <Input
        name="productCode"
        placeholder="Code"
        defaultValue={product?.productCode ?? ""}
        disabled={catalogLocked}
      />
      <Input
        name="source"
        placeholder="Source"
        defaultValue={product?.source ?? ""}
        disabled={catalogLocked}
      />
      <Input
        name="batch"
        placeholder="Batch"
        defaultValue={product?.batch ?? ""}
        disabled={catalogLocked}
      />
      <Input
        name="category"
        placeholder="Category"
        defaultValue={product?.category ?? ""}
        disabled={catalogLocked}
      />
      <Input
        name="weight"
        placeholder="Weight"
        defaultValue={product?.weight ?? ""}
        disabled={catalogLocked}
      />
      <Input
        name="unit"
        placeholder="Unit"
        defaultValue={product?.unit ?? "piece"}
        disabled={catalogLocked}
      />
      <Input
        name="tentativeQuantity"
        type="number"
        placeholder="Tentative qty"
        defaultValue={product?.tentativeQuantity ?? ""}
        disabled={catalogLocked}
      />
      <Input
        name="finalConfirmedQuantity"
        type="number"
        placeholder="Final confirmed qty"
        defaultValue={product?.finalConfirmedQuantity ?? ""}
      />
      <Input
        name="supportAmountPerUnit"
        type="number"
        placeholder="Support / unit"
        defaultValue={product?.supportAmountPerUnit ?? ""}
        disabled={catalogLocked}
      />
      <Input
        name="pickupLocation"
        placeholder="Pickup location"
        defaultValue={product?.pickupLocation ?? ""}
        disabled={catalogLocked}
      />
      <div className="md:col-span-2 flex items-center gap-2">
        <Button type="submit" size="sm" disabled={pending}>
          {catalogLocked
            ? "Update final qty"
            : product
              ? "Update product"
              : "Add product"}
        </Button>
        {isOpen ? (
          <span className="text-muted-foreground text-xs">
            Open event: only final confirmed quantity is editable.
          </span>
        ) : null}
      </div>
      {error ? <p className="text-destructive md:col-span-2 text-xs">{error}</p> : null}
    </form>
  );
}

export function TradeFieldDefForm({
  locale,
  eventId,
  field,
  eventStatus = "draft",
}: {
  locale: TradeLocale;
  eventId: string;
  field?: HotSalesFieldDef;
  eventStatus?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const requiredLocked =
    eventStatus === "open" ||
    eventStatus === "closed" ||
    eventStatus === "allocating" ||
    eventStatus === "confirmed" ||
    eventStatus === "completed";
  // While open/closed: cannot add a new *required* column; optional columns still ok.
  const blockNewRequired = requiredLocked && !field;

  return (
    <form
      className="grid gap-3 rounded-lg border p-4 md:grid-cols-2"
      action={(formData) => {
        setError(null);
        startTransition(async () => {
          if (field?.id) formData.set("id", field.id);
          const result = await saveTradeFieldDefAction(locale, eventId, formData);
          if (result?.error) {
            setError(result.error);
            return;
          }
          router.refresh();
        });
      }}
    >
      {field?.id ? <input type="hidden" name="id" value={field.id} /> : null}
      <Input
        name="fieldKey"
        placeholder="field_key"
        defaultValue={field?.fieldKey}
        required
        disabled={Boolean(field?.id)}
      />
      <select
        name="fieldType"
        defaultValue={field?.fieldType ?? "text"}
        className="border-input bg-background rounded-md border px-3 py-2 text-sm disabled:opacity-60"
        disabled={requiredLocked && Boolean(field?.required)}
      >
        <option value="text">text</option>
        <option value="number">number</option>
        <option value="currency">currency</option>
        <option value="date">date</option>
        <option value="datetime">datetime</option>
        <option value="select">select</option>
        <option value="boolean">boolean</option>
        <option value="long_text">long_text</option>
      </select>
      <Input name="labelEn" placeholder="Label EN" defaultValue={field?.labelEn} required />
      <Input name="labelVi" placeholder="Label VI" defaultValue={field?.labelVi} required />
      <Input
        name="dropdownOptions"
        placeholder="Options (comma-separated)"
        defaultValue={field?.dropdownOptions?.join(", ") ?? ""}
        className="md:col-span-2"
      />
      <label className="flex items-center gap-2 text-sm md:col-span-2">
        {requiredLocked && field?.required ? (
          <input type="hidden" name="required" value="on" />
        ) : null}
        <input
          type="checkbox"
          name={requiredLocked ? undefined : "required"}
          defaultChecked={field?.required}
          disabled={requiredLocked}
        />
        Required
        {requiredLocked ? (
          <span className="text-muted-foreground text-xs">
            (frozen while {eventStatus})
          </span>
        ) : null}
      </label>
      {blockNewRequired ? (
        <p className="text-muted-foreground md:col-span-2 text-xs">
          New columns while {eventStatus} must stay optional — required fields are frozen.
        </p>
      ) : null}
      <div className="md:col-span-2">
        <Button type="submit" size="sm" disabled={pending}>
          {field ? "Update column" : "Add column"}
        </Button>
      </div>
      {error ? <p className="text-destructive md:col-span-2 text-xs">{error}</p> : null}
    </form>
  );
}

export function TradeRunAllocationButton({
  locale,
  eventId,
}: {
  locale: TradeLocale;
  eventId: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await runTradeAllocationAction(locale, eventId);
          router.refresh();
        })
      }
    >
      Run allocation
    </Button>
  );
}

export function TradePriorityImportForm({
  locale,
  eventId,
}: {
  locale: TradeLocale;
  eventId: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="space-y-3 rounded-lg border p-4"
      onSubmit={(e) => {
        e.preventDefault();
        const form = e.currentTarget;
        const csvText = (form.elements.namedItem("csv") as HTMLTextAreaElement).value;
        startTransition(async () => {
          await importPriorityCsvAction(locale, eventId, csvText);
          router.refresh();
        });
      }}
    >
      <Label htmlFor="csv">Priority CSV (customer_name, customer_code, priority_rank, priority_group)</Label>
      <Textarea
        id="csv"
        name="csv"
        rows={6}
        placeholder={"customer_name,customer_code,priority_rank,priority_group\nCustomer A,C001,1,P1"}
      />
      <Button type="submit" size="sm" disabled={pending}>
        Import priority CSV
      </Button>
    </form>
  );
}
