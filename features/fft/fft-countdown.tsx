"use client";

import { useEffect, useState } from "react";
import {
  formatCountdown,
  getCountdownParts,
} from "@/modules/fft/domain/countdown";
import type { FftLocale } from "@/modules/fft/i18n/fft-i18n";

export function FftCountdown({
  closesAtIso,
  locale,
  label,
}: {
  closesAtIso: string;
  locale: FftLocale;
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
      data-testid="fft-countdown"
      suppressHydrationWarning
    >
      {label ? `${label}: ` : null}
      {text}
    </p>
  );
}
