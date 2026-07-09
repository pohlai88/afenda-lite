"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { cloneTradeEventAction } from "@/app/actions/trade";
import { Button } from "@/components/ui/button";
import { tradeHref, type TradeLocale } from "@/lib/i18n/trade";

export function TradeCloneEventButton({
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
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const result = await cloneTradeEventAction(locale, eventId);
          if (result.eventId) {
            router.push(tradeHref(locale, `/admin/events/${result.eventId}/setup`));
          }
        })
      }
    >
      Clone
    </Button>
  );
}
