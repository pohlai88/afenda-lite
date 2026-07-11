import { notFound, redirect } from "next/navigation";
import { resolveLegacyFftLocaleRedirect } from "@/modules/fft/i18n/legacy-locale-redirect";

/**
 * Legacy URL shim only — no FftShell.
 * Static `app/fft/{admin,events,my-orders}` win over this dynamic segment.
 */
export default async function LegacyFftLocaleCatchAllPage({
  params,
}: {
  params: Promise<{ locale: string; path?: string[] }>;
}) {
  const { locale, path } = await params;
  const target = resolveLegacyFftLocaleRedirect(locale, path);
  if (!target) notFound();
  redirect(target);
}
