import Link from "next/link";
import { redirect } from "next/navigation";
import {
  TradeEventSetupForm,
  TradeEventStatusActions,
  TradeFieldDefForm,
  TradePriorityImportForm,
  TradeProductForm,
} from "@/components/trade/trade-setup-forms";
import { TradeAddSalesMemberForm } from "@/components/trade/trade-sales-member-form";
import { TradeExportPanel } from "@/components/trade/trade-export-panel";
import { TradeDepositsNavLink } from "@/components/trade/trade-deposit-forms";
import { TradeErpSyncNavLink } from "@/components/trade/trade-erp-sync-panel";
import { TradeImportNavLink } from "@/components/trade/trade-import-panel";
import { TradePickupNavLink } from "@/components/trade/trade-pickup-forms";
import {
  isHotSalesDepositFeatureActive,
  isHotSalesPickupFeatureActive,
} from "@/lib/auth/trade-phase2b";
import { isHotSalesErpSyncFeatureActive } from "@/lib/auth/trade-phase2d";
import { requireTradeAdmin } from "@/lib/auth/trade-session";
import {
  getEventById,
  listAuditForEvent,
  listFieldDefsForEvent,
  listPrioritiesForEvent,
  listProductsForEvent,
  listSalesMembers,
} from "@/lib/domain/trade/store";
import { isTradeLocale, tradeHref, type TradeLocale } from "@/lib/i18n/trade";

export default async function TradeAdminSetupPage({
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

  const [products, fieldDefs, priorities, members, audit] = await Promise.all([
    listProductsForEvent(id),
    listFieldDefsForEvent(id),
    listPrioritiesForEvent(id),
    listSalesMembers(),
    listAuditForEvent(id),
  ]);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            href={tradeHref(locale, "/admin/events")}
            className="text-muted-foreground text-sm"
          >
            ← Events
          </Link>
          <h1 className="mt-1 text-2xl font-semibold">{event.eventName}</h1>
          <p className="text-muted-foreground text-sm">{event.status}</p>
        </div>
        <TradeEventStatusActions locale={locale} eventId={id} status={event.status} />
        <div className="flex flex-wrap gap-3 text-sm">
          {isHotSalesDepositFeatureActive() ? (
            <TradeDepositsNavLink locale={locale} eventId={id} />
          ) : null}
          {isHotSalesPickupFeatureActive() ? (
            <TradePickupNavLink locale={locale} eventId={id} />
          ) : null}
          <TradeImportNavLink locale={locale} eventId={id} />
          {isHotSalesErpSyncFeatureActive() ? (
            <TradeErpSyncNavLink locale={locale} />
          ) : null}
        </div>
      </div>

      <section className="space-y-3">
        <h2 className="font-medium">Event setup</h2>
        <TradeEventSetupForm locale={locale} event={event} />
      </section>

      <section className="space-y-3">
        <h2 className="font-medium">Products</h2>
        {products.map((p) => (
          <TradeProductForm
            key={p.id}
            locale={locale}
            eventId={id}
            product={p}
            eventStatus={event.status}
          />
        ))}
        <TradeProductForm locale={locale} eventId={id} eventStatus={event.status} />
      </section>

      <section className="space-y-3">
        <h2 className="font-medium">Custom columns</h2>
        {fieldDefs.map((f) => (
          <TradeFieldDefForm
            key={f.id}
            locale={locale}
            eventId={id}
            field={f}
            eventStatus={event.status}
          />
        ))}
        <TradeFieldDefForm
          locale={locale}
          eventId={id}
          eventStatus={event.status}
        />
      </section>

      <section className="space-y-3">
        <h2 className="font-medium">Customer priority ({priorities.length})</h2>
        <TradePriorityImportForm locale={locale} eventId={id} />
      </section>

      <section className="space-y-3">
        <h2 className="font-medium">Sales allowlist</h2>
        <TradeAddSalesMemberForm locale={locale} />
        <ul className="text-sm">
          {members.map((m) => (
            <li key={m.id}>{m.email}</li>
          ))}
        </ul>
      </section>

      <TradeExportPanel locale={locale} eventId={id} />

      <section className="space-y-3">
        <h2 className="font-medium">Audit log</h2>
        <ul className="space-y-1 text-sm">
          {audit.map((a) => (
            <li key={a.id} className="text-muted-foreground">
              {new Date(a.created_at).toISOString()} · {a.action}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
