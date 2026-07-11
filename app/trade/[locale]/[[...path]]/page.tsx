import { notFound, redirect } from "next/navigation";
import { resolveLegacyTradeLocaleRedirect } from "@/modules/trade/i18n/legacy-locale-redirect";

/**
 * Legacy URL shim only — no TradeShell.
 * Static `app/trade/{admin,events,my-orders}` win over this dynamic segment.
 */
export default async function LegacyTradeLocaleCatchAllPage({
  params,
}: {
  params: Promise<{ locale: string; path?: string[] }>;
}) {
  const { locale, path } = await params;
  const target = resolveLegacyTradeLocaleRedirect(locale, path);
  if (!target) notFound();
  redirect(target);
}
