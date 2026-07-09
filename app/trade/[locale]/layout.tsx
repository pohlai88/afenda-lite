import { redirect } from "next/navigation";
import { requireTradeAccess } from "@/lib/auth/trade-session";
import { TradeShell } from "@/components/trade/trade-shell";
import { defaultTradeLocale, isTradeLocale } from "@/lib/i18n/trade";

export default async function TradeLocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isTradeLocale(locale)) {
    redirect(`/trade/${defaultTradeLocale}/events`);
  }

  const access = await requireTradeAccess();

  return (
    <TradeShell locale={locale} isAdmin={access.isAdmin}>
      {children}
    </TradeShell>
  );
}
