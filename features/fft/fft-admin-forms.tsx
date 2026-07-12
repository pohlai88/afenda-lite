"use client";

/**
 * FFT-UI-ADM-FORMS — AdminCN form-layout DNA adapted from
 * ACN-BLK-FORMS-FORM-LAYOUTS-VERTICAL (+ Studio form-layout inspiration).
 * @fft-dna ACN-BLK-FORMS-FORM-LAYOUTS-VERTICAL
 */

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  createFftEventAction,
  ensurePigletTemplateAction,
} from "@/app/actions/fft";
import { Button } from "@/components-V2/platform-components/ui/button";
import {
  Field,
  FieldGroup,
  FieldLabel,
} from "@/components-V2/platform-components/ui/field";
import { Input } from "@/components-V2/platform-components/ui/input";
import { getFftActionError } from "@/modules/fft/domain/fft-action-result";
import { fftHref, type FftLocale } from "@/modules/fft/i18n/fft-i18n";

export function TradeNewEventForm({ locale }: { locale: FftLocale }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function submit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await createFftEventAction(locale, formData);
      const err = getFftActionError(result);
      if (err) {
        setError(err);
        return;
      }
      if ("eventId" in result && result.eventId) {
        router.push(fftHref(`/admin/events/${result.eventId}/setup`));
      }
    });
  }

  return (
    <form action={submit} className="space-y-6" data-testid="fft-new-event-form">
      <FieldGroup className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <Field className="gap-2 sm:col-span-2">
          <FieldLabel htmlFor="eventName">Event name</FieldLabel>
          <Input id="eventName" name="eventName" required />
        </Field>
        <Field className="gap-2">
          <FieldLabel htmlFor="opensAt">Opens at</FieldLabel>
          <Input id="opensAt" name="opensAt" type="datetime-local" required />
        </Field>
        <Field className="gap-2">
          <FieldLabel htmlFor="closesAt">Closes at</FieldLabel>
          <Input id="closesAt" name="closesAt" type="datetime-local" required />
        </Field>
      </FieldGroup>
      <input type="hidden" name="timezone" value="Asia/Ho_Chi_Minh" />
      <input type="hidden" name="eventType" value="hot_sales" />
      {error ? <p className="text-destructive text-sm">{error}</p> : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Create event"}
      </Button>
    </form>
  );
}

export function TradeEnsureTemplateButton({ locale }: { locale: FftLocale }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="space-y-2">
      <Button
        type="button"
        variant="outline"
        disabled={pending}
        data-testid="fft-ensure-template"
        onClick={() => {
          setError(null);
          startTransition(async () => {
            try {
              const result = await ensurePigletTemplateAction(locale);
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
              setError("template_ensure_failed");
            }
          });
        }}
      >
        {pending ? "Loading…" : "Ensure GP2 piglet template"}
      </Button>
      {error ? (
        <p
          className="text-destructive text-sm"
          data-testid="fft-ensure-template-error"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}
