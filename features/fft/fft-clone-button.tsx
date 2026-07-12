"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { cloneFftEventAction } from "@/app/actions/fft";
import { Button } from "@/components-V2/platform-components/ui/button";
import { getFftActionError } from "@/modules/fft/domain/fft-action-result";
import { fftHref, type FftLocale } from "@/modules/fft/i18n/fft-i18n";

export function FftCloneEventButton({
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
    <div className="inline-flex flex-col gap-1">
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={pending}
        data-testid="fft-clone-event"
        onClick={() =>
          startTransition(async () => {
            setError(null);
            try {
              const result = await cloneFftEventAction(locale, eventId);
              const err = getFftActionError(result);
              if (err) {
                setError(err);
                return;
              }
              if ("eventId" in result && result.eventId) {
                router.push(
                  fftHref(`/admin/events/${result.eventId}/setup`),
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
          data-testid="fft-clone-error"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}
