"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  activateScheduledFftEventAction,
  closeFftEventAction,
  importPriorityCsvAction,
  openFftEventAction,
  runFftAllocationAction,
  saveFftEventSetupAction,
  saveTradeFieldDefAction,
  saveTradeProductAction,
} from "@/app/actions/fft";
import type { FftEvent, FftFieldDef, FftProduct } from "@/modules/fft/domain/types";
import { getFftActionError } from "@/modules/fft/domain/fft-action-result";
import { Button } from "@/components-V2/platform-components/ui/button";
import { Input } from "@/components-V2/platform-components/ui/input";
import { Label } from "@/components-V2/platform-components/ui/label";
import { Textarea } from "@/components-V2/platform-components/ui/textarea";
import {
  FFT_NATIVE_SELECT_CLASS,
  TradeFormCheckbox,
} from "@/features/fft/fft-form-controls";
import {
  TradeFormError,
  TradeFormPending,
} from "@/features/fft/fft-form-feedback";
import type { FftLocale } from "@/modules/fft/i18n/fft-i18n";

function toLocalInputValue(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function FftEventSetupForm({
  locale,
  event,
}: {
  locale: FftLocale;
  event: FftEvent;
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
          const result = await saveFftEventSetupAction(locale, event.id, formData);
          const err = getFftActionError(result);
          if (err) {
            setError(err);
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
        <TradeFormCheckbox
          name="transferAllowed"
          defaultChecked={event.transferAllowed}
        />
        Transfer allowed
      </label>
      <label className="flex items-center gap-2 text-sm">
        <TradeFormCheckbox
          name="depositRequired"
          defaultChecked={event.depositRequired}
        />
        Deposit required
      </label>
      <label className="flex items-center gap-2 text-sm">
        <TradeFormCheckbox
          name="depositRefundable"
          defaultChecked={event.depositRefundable}
        />
        Deposit refundable
      </label>
      <label className="flex items-center gap-2 text-sm">
        <TradeFormCheckbox
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
      <TradeFormError message={error} testId="trade-setup-error" />
      <TradeFormPending pending={pending} />
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save setup"}
      </Button>
    </form>
  );
}

export function FftEventStatusActions({
  locale,
  eventId,
  status,
}: {
  locale: FftLocale;
  eventId: string;
  status: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {status === "draft" ? (
          <Button
            type="button"
            disabled={pending}
            data-testid="fft-open-event"
            onClick={() =>
              startTransition(async () => {
                setError(null);
                const result = await openFftEventAction(locale, eventId);
                const err = getFftActionError(result);
                if (err) {
                  setError(err);
                  return;
                }
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
            data-testid="fft-activate-event"
            onClick={() =>
              startTransition(async () => {
                setError(null);
                const result = await activateScheduledFftEventAction(
                  locale,
                  eventId,
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
            Activate (open now)
          </Button>
        ) : null}
        {status === "open" ? (
          <Button
            type="button"
            variant="secondary"
            disabled={pending}
            data-testid="fft-close-event"
            onClick={() =>
              startTransition(async () => {
                setError(null);
                const result = await closeFftEventAction(locale, eventId);
                const err = getFftActionError(result);
                if (err) {
                  setError(err);
                  return;
                }
                router.refresh();
              })
            }
          >
            Close event
          </Button>
        ) : null}
      </div>
      {error ? (
        <TradeFormError message={error} testId="trade-event-status-error" />
      ) : null}
      <TradeFormPending pending={pending} label="Updating event status…" />
    </div>
  );
}

export function TradeProductForm({
  locale,
  eventId,
  product,
  eventStatus = "draft",
}: {
  locale: FftLocale;
  eventId: string;
  product?: FftProduct;
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
          const err = getFftActionError(result);
          if (err) {
            setError(err);
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
        data-testid="fft-product-name"
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
        data-testid="fft-product-tentative-qty"
      />
      <Input
        name="finalConfirmedQuantity"
        type="number"
        placeholder="Final confirmed qty"
        defaultValue={product?.finalConfirmedQuantity ?? ""}
        data-testid="fft-product-final-qty"
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
        <Button
          type="submit"
          size="sm"
          disabled={pending}
          data-testid="fft-product-save"
        >
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
      <TradeFormError message={error} testId="trade-product-error" />
      <TradeFormPending pending={pending} />
    </form>
  );
}

export function TradeFieldDefForm({
  locale,
  eventId,
  field,
  eventStatus = "draft",
}: {
  locale: FftLocale;
  eventId: string;
  field?: FftFieldDef;
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
          const err = getFftActionError(result);
          if (err) {
            setError(err);
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
        data-testid="fft-field-key"
      />
      <select
        name="fieldType"
        defaultValue={field?.fieldType ?? "text"}
        className={FFT_NATIVE_SELECT_CLASS}
        disabled={requiredLocked && Boolean(field?.required)}
        data-testid="fft-field-type"
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
      <Input
        name="labelEn"
        placeholder="Label EN"
        defaultValue={field?.labelEn}
        required
        data-testid="fft-field-label-en"
      />
      <Input
        name="labelVi"
        placeholder="Label VI"
        defaultValue={field?.labelVi}
        required
        data-testid="fft-field-label-vi"
      />
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
        <TradeFormCheckbox
          name={requiredLocked ? undefined : "required"}
          defaultChecked={field?.required}
          disabled={requiredLocked}
          data-testid="fft-field-required"
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
        <Button
          type="submit"
          size="sm"
          disabled={pending}
          data-testid="fft-field-save"
        >
          {field ? "Update column" : "Add column"}
        </Button>
      </div>
      <div className="md:col-span-2 space-y-1">
        <TradeFormError message={error} testId="trade-field-error" />
        <TradeFormPending pending={pending} />
      </div>
    </form>
  );
}

export function TradeRunAllocationButton({
  locale,
  eventId,
}: {
  locale: FftLocale;
  eventId: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="space-y-2">
      <Button
        type="button"
        disabled={pending}
        data-testid="fft-run-allocation-setup"
        onClick={() =>
          startTransition(async () => {
            setError(null);
            try {
              const result = await runFftAllocationAction(locale, eventId);
              const err = getFftActionError(result);
              if (err) {
                setError(err);
                return;
              }
              router.refresh();
            } catch {
              setError("allocation_run_failed");
            }
          })
        }
      >
        {pending ? "Running…" : "Run allocation"}
      </Button>
      <TradeFormError message={error} testId="trade-run-allocation-error" />
      <TradeFormPending pending={pending} label="Running allocation…" />
    </div>
  );
}

export function TradePriorityImportForm({
  locale,
  eventId,
}: {
  locale: FftLocale;
  eventId: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      className="space-y-3 rounded-lg border p-4"
      onSubmit={(e) => {
        e.preventDefault();
        const form = e.currentTarget;
        const csvText = (form.elements.namedItem("csv") as HTMLTextAreaElement)
          .value;
        setError(null);
        startTransition(async () => {
          const result = await importPriorityCsvAction(locale, eventId, csvText);
          const err = getFftActionError(result);
          if (err) {
            setError(err);
            return;
          }
          router.refresh();
        });
      }}
    >
      <Label htmlFor="csv">
        Priority CSV (customer_name, customer_code, priority_rank, priority_group)
      </Label>
      <Textarea
        id="csv"
        name="csv"
        rows={6}
        data-testid="fft-priority-csv"
        placeholder={
          "customer_name,customer_code,priority_rank,priority_group\nCustomer A,C001,1,P1"
        }
      />
      <Button
        type="submit"
        size="sm"
        disabled={pending}
        data-testid="fft-priority-import"
      >
        {pending ? "Importing…" : "Import priority CSV"}
      </Button>
      <TradeFormError message={error} testId="trade-priority-error" />
      <TradeFormPending pending={pending} label="Importing priority CSV…" />
    </form>
  );
}
