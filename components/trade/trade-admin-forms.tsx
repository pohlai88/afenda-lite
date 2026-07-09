"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  createTradeEventAction,
  ensurePigletTemplateAction,
} from "@/app/actions/trade";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { tradeHref, type TradeLocale } from "@/lib/i18n/trade";

export function TradeNewEventForm({ locale }: { locale: TradeLocale }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function submit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await createTradeEventAction(locale, formData);
      if (result.error) {
        setError(result.error);
        return;
      }
      if (result.eventId) {
        router.push(tradeHref(locale, `/admin/events/${result.eventId}/setup`));
      }
    });
  }

  return (
    <form action={submit} className="space-y-4 rounded-lg border p-4">
      <div className="space-y-2">
        <Label htmlFor="eventName">Event name</Label>
        <Input id="eventName" name="eventName" required />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="opensAt">Opens at</Label>
          <Input id="opensAt" name="opensAt" type="datetime-local" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="closesAt">Closes at</Label>
          <Input id="closesAt" name="closesAt" type="datetime-local" required />
        </div>
      </div>
      <input type="hidden" name="timezone" value="Asia/Ho_Chi_Minh" />
      <input type="hidden" name="eventType" value="hot_sales" />
      {error ? <p className="text-destructive text-sm">{error}</p> : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Create event"}
      </Button>
    </form>
  );
}

export function TradeEnsureTemplateButton({ locale }: { locale: TradeLocale }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="outline"
      disabled={pending}
      onClick={() => {
        startTransition(async () => {
          const result = await ensurePigletTemplateAction(locale);
          if (result.eventId) {
            router.push(tradeHref(locale, `/admin/events/${result.eventId}/setup`));
          }
        });
      }}
    >
      {pending ? "Loading…" : "Ensure GP2 piglet template"}
    </Button>
  );
}
