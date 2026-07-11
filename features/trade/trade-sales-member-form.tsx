"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { addSalesMemberAction } from "@/app/actions/trade";
import { Button } from "@/components-V2/platform-components/ui/button";
import { Input } from "@/components-V2/platform-components/ui/input";
import { getTradeActionError } from "@/modules/trade/domain/trade-action-result";
import type { TradeLocale } from "@/modules/trade/i18n/trade";

export function TradeAddSalesMemberForm({ locale }: { locale: TradeLocale }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      className="space-y-2"
      action={(formData) => {
        setError(null);
        startTransition(async () => {
          const email = String(formData.get("email") ?? "");
          try {
            const result = await addSalesMemberAction(locale, email);
            const err = getTradeActionError(result);
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
      <div className="flex gap-2">
        <Input
          name="email"
          type="email"
          placeholder="sales@company.com"
          required
          data-testid="trade-sales-member-email"
        />
        <Button
          type="submit"
          size="sm"
          disabled={pending}
          data-testid="trade-sales-member-add"
        >
          Add
        </Button>
      </div>
      {error ? (
        <p className="text-destructive text-xs" data-testid="trade-sales-member-error">
          {error}
        </p>
      ) : null}
    </form>
  );
}
