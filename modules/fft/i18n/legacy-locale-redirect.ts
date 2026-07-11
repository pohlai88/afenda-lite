import { isFftLocale } from "@/modules/fft/i18n/fft-i18n";
import { fftHref } from "@/modules/fft/i18n/fft-i18n";

/**
 * Map legacy `/fft/{vi|en}/…` bookmarks onto locale-free `/fft/…`.
 * Returns null when the first segment is not a trade locale (let other routes 404).
 */
export function resolveLegacyFftLocaleRedirect(
  localeSegment: string,
  pathSegments: string[] | undefined,
): string | null {
  if (!isFftLocale(localeSegment)) return null;
  if (!pathSegments?.length) return fftHref("/events");
  return fftHref(`/${pathSegments.join("/")}`);
}
