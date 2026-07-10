"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  createPickupWindowAction,
  recordPickupExceptionAction,
  recordPickupFulfillmentAction,
  schedulePickupAction,
} from "@/app/actions/trade";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getTradeActionError } from "@/lib/domain/trade/trade-action-result";
import type { HotSalesPickupListItem, HotSalesPickupWindow } from "@/lib/domain/trade/types";
import { tradeHref, type TradeLocale } from "@/lib/i18n/trade";

export function TradePickupNavLink({
  locale,
  eventId,
}: {
  locale: TradeLocale;
  eventId: string;
}) {
  return (
    <Link
      href={tradeHref(locale, `/admin/events/${eventId}/pickup`)}
      className="text-sm underline-offset-4 hover:underline"
    >
      {locale === "vi" ? "Giao hàng / lấy hàng" : "Pickup ops"}
    </Link>
  );
}

export function TradePickupPanel({
  locale,
  eventId,
  windows,
  queue,
  canManage,
}: {
  locale: TradeLocale;
  eventId: string;
  windows: HotSalesPickupWindow[];
  queue: HotSalesPickupListItem[];
  canManage: boolean;
}) {
  return (
    <div className="space-y-8">
      {canManage ? (
        <section className="space-y-3">
          <h2 className="font-medium">
            {locale === "vi" ? "Khung giờ lấy hàng" : "Pickup windows"}
          </h2>
          <TradePickupWindowForm locale={locale} eventId={eventId} />
          <ul className="text-sm">
            {windows.map((w) => (
              <li key={w.id} className="text-muted-foreground">
                {w.startsAt.toISOString()} – {w.endsAt.toISOString()}
                {w.location ? ` · ${w.location}` : ""}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="space-y-3">
        <h2 className="font-medium">
          {locale === "vi" ? "Hàng đợi lấy hàng" : "Pickup queue"}
        </h2>
        {queue.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            {locale === "vi"
              ? "Chưa có đơn đã xác nhận."
              : "No confirmed orders in queue."}
          </p>
        ) : (
          <ul className="space-y-4">
            {queue.map((item) => (
              <li key={item.orderId} className="rounded-lg border p-4">
                <div className="flex flex-wrap justify-between gap-2">
                  <div>
                    <p className="font-medium">
                      {item.orderNumber} · {item.customerName}
                    </p>
                    <p className="text-muted-foreground text-sm">
                      {locale === "vi" ? "Trạng thái" : "Status"}: {item.pickupStatus}
                      {item.fulfilledQuantity != null
                        ? ` · ${locale === "vi" ? "Đã giao" : "Fulfilled"}: ${item.fulfilledQuantity}`
                        : ""}
                    </p>
                  </div>
                </div>
                {canManage ? (
                  <div className="mt-4 grid gap-4 lg:grid-cols-3">
                    {windows.length > 0 ? (
                      <TradeSchedulePickupForm
                        locale={locale}
                        eventId={eventId}
                        orderId={item.orderId}
                        windows={windows}
                      />
                    ) : null}
                    <TradeFulfillmentForm
                      locale={locale}
                      eventId={eventId}
                      orderId={item.orderId}
                    />
                    <TradePickupExceptionForm
                      locale={locale}
                      eventId={eventId}
                      orderId={item.orderId}
                    />
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function TradePickupWindowForm({
  locale,
  eventId,
}: {
  locale: TradeLocale;
  eventId: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function submit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await createPickupWindowAction(locale, eventId, formData);
      const err = getTradeActionError(result);
      if (err) {
        setError(err);
        return;
      }
      router.refresh();
    });
  }

  return (
    <form action={submit} className="grid gap-3 rounded-lg border p-4 sm:grid-cols-2">
      <div className="space-y-1">
        <Label htmlFor="startsAt">{locale === "vi" ? "Bắt đầu" : "Starts"}</Label>
        <Input id="startsAt" name="startsAt" type="datetime-local" required />
      </div>
      <div className="space-y-1">
        <Label htmlFor="endsAt">{locale === "vi" ? "Kết thúc" : "Ends"}</Label>
        <Input id="endsAt" name="endsAt" type="datetime-local" required />
      </div>
      <div className="space-y-1">
        <Label htmlFor="location">{locale === "vi" ? "Địa điểm" : "Location"}</Label>
        <Input id="location" name="location" />
      </div>
      <div className="space-y-1">
        <Label htmlFor="capacity">{locale === "vi" ? "Sức chứa" : "Capacity"}</Label>
        <Input id="capacity" name="capacity" type="number" min="1" />
      </div>
      {error ? <p className="text-destructive text-sm sm:col-span-2">{error}</p> : null}
      <Button type="submit" size="sm" disabled={pending} className="sm:col-span-2 w-fit">
        {locale === "vi" ? "Thêm khung giờ" : "Add window"}
      </Button>
    </form>
  );
}

function TradeSchedulePickupForm({
  locale,
  eventId,
  orderId,
  windows,
}: {
  locale: TradeLocale;
  eventId: string;
  orderId: string;
  windows: HotSalesPickupWindow[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function submit(formData: FormData) {
    formData.set("orderId", orderId);
    startTransition(async () => {
      await schedulePickupAction(locale, eventId, formData);
      router.refresh();
    });
  }

  return (
    <form action={submit} className="space-y-2 rounded-md border p-3">
      <p className="text-sm font-medium">{locale === "vi" ? "Lên lịch" : "Schedule"}</p>
      <select
        name="windowId"
        className="border-input bg-background w-full rounded-md border px-3 py-2 text-sm"
        required
      >
        {windows.map((w) => (
          <option key={w.id} value={w.id}>
            {w.startsAt.toLocaleString()}
          </option>
        ))}
      </select>
      <Button type="submit" size="sm" disabled={pending}>
        {locale === "vi" ? "Lên lịch" : "Schedule"}
      </Button>
    </form>
  );
}

function TradeFulfillmentForm({
  locale,
  eventId,
  orderId,
}: {
  locale: TradeLocale;
  eventId: string;
  orderId: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function submit(formData: FormData) {
    setError(null);
    formData.set("orderId", orderId);
    startTransition(async () => {
      const result = await recordPickupFulfillmentAction(locale, eventId, formData);
      const err = getTradeActionError(result);
      if (err) setError(err);
      else router.refresh();
    });
  }

  return (
    <form action={submit} className="space-y-2 rounded-md border p-3">
      <p className="text-sm font-medium">
        {locale === "vi" ? "Xác nhận số lượng" : "Confirm qty"}
      </p>
      <Input name="quantity" type="number" min="0" step="0.01" required />
      {error ? <p className="text-destructive text-sm">{error}</p> : null}
      <Button type="submit" size="sm" disabled={pending}>
        {locale === "vi" ? "Ghi nhận" : "Record"}
      </Button>
    </form>
  );
}

function TradePickupExceptionForm({
  locale,
  eventId,
  orderId,
}: {
  locale: TradeLocale;
  eventId: string;
  orderId: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function submit(formData: FormData) {
    setError(null);
    formData.set("orderId", orderId);
    startTransition(async () => {
      const result = await recordPickupExceptionAction(locale, eventId, formData);
      const err = getTradeActionError(result);
      if (err) setError(err);
      else router.refresh();
    });
  }

  return (
    <form action={submit} className="space-y-2 rounded-md border p-3">
      <p className="text-sm font-medium">
        {locale === "vi" ? "Ngoại lệ" : "Exception"}
      </p>
      <select
        name="exceptionType"
        className="border-input bg-background w-full rounded-md border px-3 py-2 text-sm"
        required
      >
        <option value="no_show">{locale === "vi" ? "Không đến" : "No-show"}</option>
        <option value="partial">{locale === "vi" ? "Một phần" : "Partial"}</option>
        <option value="cancel">{locale === "vi" ? "Hủy" : "Cancel"}</option>
        <option value="override">{locale === "vi" ? "Ghi đè" : "Override"}</option>
      </select>
      <Input name="reason" placeholder={locale === "vi" ? "Lý do" : "Reason"} required />
      {error ? <p className="text-destructive text-sm">{error}</p> : null}
      <Button type="submit" size="sm" variant="secondary" disabled={pending}>
        {locale === "vi" ? "Áp dụng" : "Apply"}
      </Button>
    </form>
  );
}
