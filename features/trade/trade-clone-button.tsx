"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { cloneTradeEventAction } from "@/app/actions/trade";
import { Button } from "@/components-V2/platform-components/ui/button";
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
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="inline-flex flex-col gap-1">
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            setError(null);
            const result = await cloneTradeEventAction(locale, eventId);
            if ("error" in result && result.error) {
              setError(result.error);
              return;
            }
            if ("eventId" in result && result.eventId) {
              router.push(
                tradeHref(locale, `/admin/events/${result.eventId}/setup`),
              );
            }
          })
        }
      >
        Clone
      </Button>
      {error ? <p className="text-destructive text-xs">{error}</p> : null}
    </div>
  );
}
