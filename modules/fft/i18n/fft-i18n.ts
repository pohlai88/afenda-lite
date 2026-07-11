export const fftLocales = ["vi", "en"] as const;

export type FftLocale = (typeof fftLocales)[number];

export const defaultFftLocale: FftLocale = "vi";

export function isFftLocale(value: string): value is FftLocale {
  return fftLocales.includes(value as FftLocale);
}

/** Locale-free trade path helper (i18n URL segment deferred). */
export function fftHref(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `/fft${normalized}`;
}

export function fftDefaultHref(path: string) {
  return fftHref(path);
}

export async function getFftMessages(locale: FftLocale) {
  switch (locale) {
    case "en":
      return (await import("@/messages/fft/en.json")).default;
    case "vi":
    default:
      return (await import("@/messages/fft/vi.json")).default;
  }
}
