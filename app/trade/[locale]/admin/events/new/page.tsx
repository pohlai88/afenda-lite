import Link from "next/link";
import { redirect } from "next/navigation";
import {
  TradeEnsureTemplateButton,
  TradeNewEventForm,
} from "@/components/trade/trade-admin-forms";
import { requireTradePermission } from "@/lib/auth/trade-session";
import { isTradeLocale, tradeHref, type TradeLocale } from "@/lib/i18n/trade";

export default async function TradeAdminNewEventPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: localeParam } = await params;
  if (!isTradeLocale(localeParam)) redirect("/trade/vi/admin/events");
  const locale = localeParam as TradeLocale;

  await requireTradePermission("event.create");

  return (
    <div className="space-y-8">
      <div>
        <Link
          href={tradeHref(locale, "/admin/events")}
          className="text-muted-foreground text-sm"
        >
          ← Events
        </Link>
        <h1 className="mt-1 text-2xl font-semibold">
          {locale === "vi" ? "Tạo sự kiện" : "Create event"}
        </h1>
        <p className="text-muted-foreground text-sm">
          Starts as draft — configure products and open from setup.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <TradeEnsureTemplateButton locale={locale} />
      </div>

      <TradeNewEventForm locale={locale} />
    </div>
  );
}
