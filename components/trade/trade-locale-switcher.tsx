"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { tradeHref, tradeLocales, type TradeLocale } from "@/lib/i18n/trade";

export function TradeLocaleSwitcher({ locale }: { locale: TradeLocale }) {
  const pathname = usePathname();

  function hrefFor(nextLocale: TradeLocale) {
    const suffix = pathname.replace(/^\/trade\/[^/]+/, "") || "/events";
    return tradeHref(nextLocale, suffix);
  }

  return (
    <div className="flex gap-1 rounded-md border p-0.5 text-xs">
      {tradeLocales.map((loc) => (
        <Link
          key={loc}
          href={hrefFor(loc)}
          className={
            loc === locale
              ? "rounded bg-primary px-2 py-1 text-primary-foreground"
              : "rounded px-2 py-1 text-muted-foreground hover:text-foreground"
          }
        >
          {loc.toUpperCase()}
        </Link>
      ))}
    </div>
  );
}
