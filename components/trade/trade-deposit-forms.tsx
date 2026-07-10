"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  recordDepositAdjustmentAction,
  recordDepositReceiptAction,
  updateDepositDetailsAction,
} from "@/app/actions/trade";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getTradeActionError } from "@/lib/domain/trade/trade-action-result";
import type { HotSalesDepositListItem, HotSalesFinanceAuditEntry } from "@/lib/domain/trade/types";
import { tradeHref, type TradeLocale } from "@/lib/i18n/trade";

export function TradeDepositPanel({
  locale,
  eventId,
  deposits,
  audit,
  canManage,
}: {
  locale: TradeLocale;
  eventId: string;
  deposits: HotSalesDepositListItem[];
  audit: HotSalesFinanceAuditEntry[];
  canManage: boolean;
}) {
  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <h2 className="font-medium">
          {locale === "vi" ? "Tiền cọc (vận hành)" : "Deposits (operational)"}
        </h2>
        {deposits.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            {locale === "vi"
              ? "Chưa có bản ghi cọc. Bật HOT_SALES_DEPOSIT_ENABLED và đặt cọc bắt buộc trên sự kiện."
              : "No deposit records yet. Enable HOT_SALES_DEPOSIT_ENABLED and require deposit on the event."}
          </p>
        ) : (
          <ul className="space-y-4">
            {deposits.map((d) => (
              <li key={d.id} className="rounded-lg border p-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <div>
                    <p className="font-medium">
                      {d.orderNumber} · {d.customerName}
                    </p>
                    <p className="text-muted-foreground text-sm">
                      {locale === "vi" ? "Trạng thái đơn" : "Order status"}:{" "}
                      {d.orderDepositStatus}
                    </p>
                  </div>
                  <p className="text-sm">
                    {d.amount != null
                      ? `${d.amount} ${d.currency}`
                      : locale === "vi"
                        ? "Chưa đặt số tiền"
                        : "Amount not set"}
                  </p>
                </div>
                {canManage ? (
                  <div className="mt-4 grid gap-4 lg:grid-cols-2">
                    <TradeDepositDetailsForm
                      locale={locale}
                      eventId={eventId}
                      depositId={d.id}
                      orderId={d.orderId}
                      amount={d.amount}
                      nonRefundable={d.nonRefundable}
                    />
                    <TradeDepositReceiptForm
                      locale={locale}
                      eventId={eventId}
                      depositId={d.id}
                      orderId={d.orderId}
                    />
                    <TradeDepositAdjustmentForm
                      locale={locale}
                      eventId={eventId}
                      depositId={d.id}
                      orderId={d.orderId}
                    />
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="font-medium">
          {locale === "vi" ? "Nhật ký tài chính" : "Finance audit"}
        </h2>
        <ul className="space-y-1 text-sm">
          {audit.map((a) => (
            <li key={a.id} className="text-muted-foreground">
              {a.createdAt.toISOString()} · {a.action}
              {a.reason ? ` · ${a.reason}` : ""}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function TradeDepositDetailsForm({
  locale,
  eventId,
  depositId,
  orderId,
  amount,
  nonRefundable,
}: {
  locale: TradeLocale;
  eventId: string;
  depositId: string;
  orderId: string;
  amount: number | null;
  nonRefundable: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function submit(formData: FormData) {
    setError(null);
    formData.set("depositId", depositId);
    formData.set("orderId", orderId);
    startTransition(async () => {
      const result = await updateDepositDetailsAction(locale, eventId, formData);
      const err = getTradeActionError(result);
      if (err) {
        setError(err);
        return;
      }
      router.refresh();
    });
  }

  return (
    <form action={submit} className="space-y-2 rounded-md border p-3 lg:col-span-2">
      <p className="text-sm font-medium">
        {locale === "vi" ? "Số tiền cọc" : "Deposit amount"}
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor={`damt-${depositId}`}>
            {locale === "vi" ? "Số tiền" : "Amount"}
          </Label>
          <Input
            id={`damt-${depositId}`}
            name="amount"
            type="number"
            min="0"
            step="0.01"
            defaultValue={amount ?? ""}
          />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="nonRefundable"
            defaultChecked={nonRefundable}
            className="size-4"
          />
          {locale === "vi" ? "Không hoàn" : "Non-refundable"}
        </label>
      </div>
      {error ? <p className="text-destructive text-sm">{error}</p> : null}
      <Button type="submit" size="sm" variant="outline" disabled={pending}>
        {locale === "vi" ? "Cập nhật" : "Update"}
      </Button>
    </form>
  );
}

function TradeDepositReceiptForm({
  locale,
  eventId,
  depositId,
  orderId,
}: {
  locale: TradeLocale;
  eventId: string;
  depositId: string;
  orderId: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function submit(formData: FormData) {
    setError(null);
    formData.set("depositId", depositId);
    formData.set("orderId", orderId);
    startTransition(async () => {
      const result = await recordDepositReceiptAction(locale, eventId, formData);
      const err = getTradeActionError(result);
      if (err) {
        setError(err);
        return;
      }
      router.refresh();
    });
  }

  return (
    <form action={submit} className="space-y-2 rounded-md border p-3">
      <p className="text-sm font-medium">
        {locale === "vi" ? "Ghi nhận thanh toán" : "Record receipt"}
      </p>
      <div className="space-y-1">
        <Label htmlFor={`amount-${depositId}`}>
          {locale === "vi" ? "Số tiền" : "Amount"}
        </Label>
        <Input
          id={`amount-${depositId}`}
          name="amount"
          type="number"
          min="0"
          step="0.01"
          required
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor={`ref-${depositId}`}>
          {locale === "vi" ? "Tham chiếu" : "Reference"}
        </Label>
        <Input id={`ref-${depositId}`} name="reference" />
      </div>
      {error ? <p className="text-destructive text-sm">{error}</p> : null}
      <Button type="submit" size="sm" disabled={pending}>
        {pending
          ? locale === "vi"
            ? "Đang lưu…"
            : "Saving…"
          : locale === "vi"
            ? "Lưu biên nhận"
            : "Save receipt"}
      </Button>
    </form>
  );
}

function TradeDepositAdjustmentForm({
  locale,
  eventId,
  depositId,
  orderId,
}: {
  locale: TradeLocale;
  eventId: string;
  depositId: string;
  orderId: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function submit(formData: FormData) {
    setError(null);
    formData.set("depositId", depositId);
    formData.set("orderId", orderId);
    startTransition(async () => {
      const result = await recordDepositAdjustmentAction(locale, eventId, formData);
      const err = getTradeActionError(result);
      if (err) {
        setError(err);
        return;
      }
      router.refresh();
    });
  }

  return (
    <form action={submit} className="space-y-2 rounded-md border p-3">
      <p className="text-sm font-medium">
        {locale === "vi" ? "Điều chỉnh" : "Adjustment"}
      </p>
      <div className="space-y-1">
        <Label htmlFor={`adj-${depositId}`}>
          {locale === "vi" ? "Loại" : "Type"}
        </Label>
        <select
          id={`adj-${depositId}`}
          name="adjustmentType"
          className="border-input bg-background w-full rounded-md border px-3 py-2 text-sm"
          required
        >
          <option value="waive">{locale === "vi" ? "Miễn cọc" : "Waive"}</option>
          <option value="refund">{locale === "vi" ? "Hoàn" : "Refund"}</option>
          <option value="forfeit">{locale === "vi" ? "Tịch thu" : "Forfeit"}</option>
          <option value="correction">
            {locale === "vi" ? "Sửa" : "Correction"}
          </option>
          <option value="cancelled">
            {locale === "vi" ? "Hủy" : "Cancelled"}
          </option>
        </select>
      </div>
      <div className="space-y-1">
        <Label htmlFor={`reason-${depositId}`}>
          {locale === "vi" ? "Lý do" : "Reason"}
        </Label>
        <Input id={`reason-${depositId}`} name="reason" required />
      </div>
      {error ? <p className="text-destructive text-sm">{error}</p> : null}
      <Button type="submit" size="sm" variant="secondary" disabled={pending}>
        {pending
          ? locale === "vi"
            ? "Đang lưu…"
            : "Saving…"
          : locale === "vi"
            ? "Áp dụng"
            : "Apply"}
      </Button>
    </form>
  );
}

export function TradeDepositsNavLink({
  locale,
  eventId,
}: {
  locale: TradeLocale;
  eventId: string;
}) {
  return (
    <Link
      href={tradeHref(locale, `/admin/events/${eventId}/deposits`)}
      className="text-sm underline-offset-4 hover:underline"
    >
      {locale === "vi" ? "Tiền cọc" : "Deposits"}
    </Link>
  );
}
