"use client";

import { useTransition } from "react";
import { addSalesMemberAction } from "@/app/actions/trade";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { TradeLocale } from "@/lib/i18n/trade";

export function TradeAddSalesMemberForm({ locale }: { locale: TradeLocale }) {
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="flex gap-2"
      action={(formData) => {
        startTransition(async () => {
          const email = String(formData.get("email") ?? "");
          await addSalesMemberAction(locale, email);
        });
      }}
    >
      <Input name="email" type="email" placeholder="sales@company.com" required />
      <Button type="submit" size="sm" disabled={pending}>
        Add
      </Button>
    </form>
  );
}
