import { isTradeLocale } from "@/modules/trade/i18n/trade";
import { tradeHref } from "@/modules/trade/i18n/trade";

/**
 * Map legacy `/trade/{vi|en}/…` bookmarks onto locale-free `/trade/…`.
 * Returns null when the first segment is not a trade locale (let other routes 404).
 */
export function resolveLegacyTradeLocaleRedirect(
  localeSegment: string,
  pathSegments: string[] | undefined,
): string | null {
  if (!isTradeLocale(localeSegment)) return null;
  if (!pathSegments?.length) return tradeHref("/events");
  return tradeHref(`/${pathSegments.join("/")}`);
}
