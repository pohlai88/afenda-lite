import Link from "next/link";
import { redirect } from "next/navigation";
import { TradeDepositsNavLink } from "@/components/trade/trade-deposit-forms";
import { TradeImportNavLink, TradeImportPanel } from "@/components/trade/trade-import-panel";
import { TradePickupNavLink } from "@/components/trade/trade-pickup-forms";
import {
  isHotSalesDepositFeatureActive,
  isHotSalesPickupFeatureActive,
} from "@/lib/auth/trade-phase2b";
import { requireTradeAdmin } from "@/lib/auth/trade-session";
import { getEventById } from "@/lib/domain/trade/store";
import { isTradeLocale, tradeHref, type TradeLocale } from "@/lib/i18n/trade";

export default async function TradeAdminImportsPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale: localeParam, id } = await params;
  if (!isTradeLocale(localeParam)) redirect("/trade/vi/admin/events");
  const locale = localeParam as TradeLocale;

  await requireTradeAdmin();
  const event = await getEventById(id);
  if (!event) redirect(tradeHref(locale, "/admin/events"));

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            href={tradeHref(locale, `/admin/events/${id}/setup`)}
            className="text-muted-foreground text-sm"
          >
            ← Event setup
          </Link>
          <h1 className="mt-1 text-2xl font-semibold">Excel imports</h1>
          <p className="text-muted-foreground text-sm">{event.eventName}</p>
        </div>
        <div className="flex flex-wrap gap-3 text-sm">
          {isHotSalesDepositFeatureActive() ? (
            <TradeDepositsNavLink locale={locale} eventId={id} />
          ) : null}
          {isHotSalesPickupFeatureActive() ? (
            <TradePickupNavLink locale={locale} eventId={id} />
          ) : null}
          <TradeImportNavLink locale={locale} eventId={id} />
        </div>
      </div>

      <p className="text-muted-foreground text-sm max-w-2xl">
        Upload an Excel file to validate rows before commit. Dry-run is mandatory — nothing
        is written until you confirm. Replaces the legacy priority CSV path for structured
        imports with audit batches.
      </p>

      <TradeImportPanel
        locale={locale}
        eventId={id}
        depositEnabled={isHotSalesDepositFeatureActive()}
        pickupEnabled={isHotSalesPickupFeatureActive()}
      />
    </div>
  );
}
