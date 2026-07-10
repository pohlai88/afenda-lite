"use client";

import { useEffect, useState } from "react";
import {
  formatCountdown,
  getCountdownParts,
} from "@/lib/domain/trade/countdown";
import type { TradeLocale } from "@/lib/i18n/trade";

export function TradeCountdown({
  closesAtIso,
  locale,
  label,
}: {
  closesAtIso: string;
  locale: TradeLocale;
  label?: string;
}) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const parts = getCountdownParts(new Date(closesAtIso), now);
  const text = formatCountdown(parts, locale);

  return (
    <p
      className={
        parts.expired
          ? "text-muted-foreground text-xs"
          : "font-mono text-xs tabular-nums"
      }
      data-testid="trade-countdown"
      suppressHydrationWarning
    >
      {label ? `${label}: ` : null}
      {text}
    </p>
  );
}
