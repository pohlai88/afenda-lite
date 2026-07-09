import Link from "next/link";
import type { ReactNode } from "react";
import { TradeLocaleSwitcher } from "@/components/trade/trade-locale-switcher";
import {
  defaultTradeLocale,
  getTradeMessages,
  isTradeLocale,
  tradeHref,
  type TradeLocale,
} from "@/lib/i18n/trade";
import { NextIntlClientProvider } from "next-intl";

export async function TradeShell({
  locale,
  children,
  isAdmin,
}: {
  locale: string;
  children: ReactNode;
  isAdmin: boolean;
}) {
  const resolvedLocale: TradeLocale = isTradeLocale(locale)
    ? locale
    : defaultTradeLocale;
  const messages = await getTradeMessages(resolvedLocale);

  return (
    <NextIntlClientProvider locale={resolvedLocale} messages={messages}>
      <div className="min-h-screen bg-background">
        <header className="border-b">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
            <div>
              <Link
                href={tradeHref(resolvedLocale, "/events")}
                className="font-semibold tracking-tight"
              >
                Hot Sales
              </Link>
              <p className="text-muted-foreground text-sm">
                {resolvedLocale === "vi"
                  ? "Cổng sự kiện bán spot"
                  : "Spot-selling event portal"}
              </p>
            </div>
            <nav className="flex flex-wrap items-center gap-3 text-sm">
              <Link href={tradeHref(resolvedLocale, "/events")}>
                {resolvedLocale === "vi" ? "Sự kiện" : "Events"}
              </Link>
              <Link href={tradeHref(resolvedLocale, "/my-orders")}>
                {resolvedLocale === "vi" ? "Đơn của tôi" : "My orders"}
              </Link>
              {isAdmin ? (
                <Link href={tradeHref(resolvedLocale, "/admin/events")}>
                  {resolvedLocale === "vi" ? "Quản trị" : "Admin"}
                </Link>
              ) : null}
              <TradeLocaleSwitcher locale={resolvedLocale} />
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
      </div>
    </NextIntlClientProvider>
  );
}
