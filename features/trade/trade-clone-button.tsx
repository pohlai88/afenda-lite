"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { cloneTradeEventAction } from "@/app/actions/trade";
import { Button } from "@/components-V2/platform-components/ui/button";
import { getTradeActionError } from "@/modules/trade/domain/trade-action-result";
import { tradeHref, type TradeLocale } from "@/modules/trade/i18n/trade";

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
        data-testid="trade-clone-event"
        onClick={() =>
          startTransition(async () => {
            setError(null);
            try {
              const result = await cloneTradeEventAction(locale, eventId);
              const err = getTradeActionError(result);
              if (err) {
                setError(err);
                return;
              }
              if ("eventId" in result && result.eventId) {
                router.push(
                  tradeHref(`/admin/events/${result.eventId}/setup`),
                );
              }
            } catch {
              setError("clone_failed");
            }
          })
        }
      >
        Clone
      </Button>
      {error ? (
        <p
          className="text-destructive text-xs"
          data-testid="trade-clone-error"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}
