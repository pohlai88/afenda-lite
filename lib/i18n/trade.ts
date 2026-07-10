export const tradeLocales = ["vi", "en"] as const;

export type TradeLocale = (typeof tradeLocales)[number];

export const defaultTradeLocale: TradeLocale = "vi";

export function isTradeLocale(value: string): value is TradeLocale {
  return tradeLocales.includes(value as TradeLocale);
}

/** Canonical trade href using the default locale. */
export function tradeDefaultHref(path: string) {
  return tradeHref(defaultTradeLocale, path);
}

export async function getTradeMessages(locale: TradeLocale) {
  switch (locale) {
    case "en":
      return (await import("@/messages/trade/en.json")).default;
    case "vi":
    default:
      return (await import("@/messages/trade/vi.json")).default;
  }
}

export function tradeHref(locale: TradeLocale, path: string) {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `/trade/${locale}${normalized}`;
}
