"use client";

/**
 * FFT-UI-SALES-MEMBER — AdminCN form-layout DNA adapted from
 * ACN-BLK-FORMS-FORM-LAYOUTS-VERTICAL.
 * @fft-dna ACN-BLK-FORMS-FORM-LAYOUTS-VERTICAL
 */

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { addSalesMemberAction } from "@/app/actions/fft";
import { Button } from "@/components-V2/platform-components/ui/button";
import {
  Field,
  FieldGroup,
  FieldLabel,
} from "@/components-V2/platform-components/ui/field";
import { Input } from "@/components-V2/platform-components/ui/input";
import { getFftActionError } from "@/modules/fft/domain/fft-action-result";
import type { FftLocale } from "@/modules/fft/i18n/fft-i18n";

export function TradeAddSalesMemberForm({ locale }: { locale: FftLocale }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      className="space-y-4"
      data-testid="fft-sales-member-form"
      action={(formData) => {
        setError(null);
        startTransition(async () => {
          const email = String(formData.get("email") ?? "");
          try {
            const result = await addSalesMemberAction(locale, email);
            const err = getFftActionError(result);
            if (err) {
              setError(err);
              return;
            }
            router.refresh();
          } catch {
            setError("sales_member_add_failed");
          }
        });
      }}
    >
      <FieldGroup className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
        <Field className="gap-2">
          <FieldLabel htmlFor="trade-sales-member-email">Email</FieldLabel>
          <Input
            id="trade-sales-member-email"
            name="email"
            type="email"
            placeholder="sales@company.com"
            required
            data-testid="fft-sales-member-email"
          />
        </Field>
        <Button
          type="submit"
          size="sm"
          disabled={pending}
          data-testid="fft-sales-member-add"
        >
          Add
        </Button>
      </FieldGroup>
      {error ? (
        <p className="text-destructive text-xs" data-testid="fft-sales-member-error">
          {error}
        </p>
      ) : null}
    </form>
  );
}
