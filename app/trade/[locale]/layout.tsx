import { redirect } from "next/navigation";
import { requireTradeAccess } from "@/lib/auth/trade-session";
import { TradeShell } from "@/components/trade/trade-shell";
import { portalCopy } from "@/lib/copy/portal-copy";
import { CLIENT_HOME_HREF, OPERATOR_DASHBOARD_HREF } from "@/lib/routing/portal-routes";
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

  const portalHomeHref = access.isAdmin ? OPERATOR_DASHBOARD_HREF : CLIENT_HOME_HREF;
  const portalHomeLabel = access.isAdmin
    ? portalCopy.account.backToDashboard
    : portalCopy.clientDashboard.title;

  return (
    <TradeShell
      locale={locale}
      isAdmin={access.isAdmin}
      portalHomeHref={portalHomeHref}
      portalHomeLabel={portalHomeLabel}
    >
      {children}
    </TradeShell>
  );
}
