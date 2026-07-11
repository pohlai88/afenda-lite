import Link from "next/link";
import { notFound } from "next/navigation";
import { FftAuditPanel } from "@/features/fft/fft-audit-panel";
import { toFftAuditListItems } from "@/features/fft/fft-audit-filter-model";
import { FftCloneEventButton } from "@/features/fft/fft-clone-button";
import { FftDepositsNavLink } from "@/features/fft/fft-deposit-forms";
import { FftErpSyncNavLink } from "@/features/fft/fft-erp-sync-panel";
import { FftExportPanel } from "@/features/fft/fft-export-panel";
import { TradeEmptyState } from "@/features/fft/fft-form-feedback";
import { TradeImportNavLink } from "@/features/fft/fft-import-panel";
import { FftPickupNavLink } from "@/features/fft/fft-pickup-forms";
import {
  FftEventSetupForm,
  FftEventStatusActions,
  TradeFieldDefForm,
  TradePriorityImportForm,
  TradeProductForm,
} from "@/features/fft/fft-setup-forms";
import { FFT_UI_LOCALE } from "@/features/fft/fft-ui-locale";
import {
  hasFftEventManagePermission,
  isFftDepositFeatureActive,
  isFftPickupFeatureActive,
} from "@/modules/fft/auth/fft-phase2b";
import { isFftErpSyncFeatureActive } from "@/modules/fft/auth/fft-phase2d";
import { requireFftAccess } from "@/modules/fft/auth/fft-session";
import {
  listAuditForEvent,
  listFieldDefsForEvent,
  listPrioritiesForEvent,
  listProductsForEvent,
} from "@/modules/fft/domain/store";
import { getFftEventForOrganization } from "@/features/fft/fft-organization-context";
import { fftHref } from "@/modules/fft/i18n/fft-i18n";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ eventId: string }> };

export default async function FftEventSetupPage({ params }: Props) {
  const { eventId } = await params;
  const access = await requireFftAccess();
  const event = await getFftEventForOrganization(eventId);
  if (!event) notFound();

  const canViewAudit = await hasFftEventManagePermission(
    access,
    "audit.view",
    eventId,
  );

  const [products, fieldDefs, priorities, audit] = await Promise.all([
    listProductsForEvent(eventId),
    listFieldDefsForEvent(eventId),
    listPrioritiesForEvent(eventId),
    canViewAudit ? listAuditForEvent(eventId) : Promise.resolve([]),
  ]);

  return (
    <main className="space-y-8 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{event.eventName}</h1>
          <p className="text-muted-foreground text-sm">
            Setup · {event.status} · {event.eventCode}
          </p>
        </div>
        <div className="flex flex-wrap gap-3 text-sm">
          <Link className="underline" href={fftHref(`/events/${eventId}/order`)}>
            Order
          </Link>
          <Link
            className="underline"
            href={fftHref(`/admin/events/${eventId}/allocation`)}
          >
            Allocation
          </Link>
          <TradeImportNavLink locale={FFT_UI_LOCALE} eventId={eventId} />
          {isFftDepositFeatureActive() ? (
            <FftDepositsNavLink locale={FFT_UI_LOCALE} eventId={eventId} />
          ) : null}
          {isFftPickupFeatureActive() ? (
            <FftPickupNavLink locale={FFT_UI_LOCALE} eventId={eventId} />
          ) : null}
          {isFftErpSyncFeatureActive() ? (
            <FftErpSyncNavLink locale={FFT_UI_LOCALE} />
          ) : null}
          <FftCloneEventButton locale={FFT_UI_LOCALE} eventId={eventId} />
        </div>
      </div>

      <FftEventStatusActions
        locale={FFT_UI_LOCALE}
        eventId={eventId}
        status={event.status}
      />

      <FftEventSetupForm locale={FFT_UI_LOCALE} event={event} />

      <section className="space-y-4">
        <h2 className="font-medium">Products / supply</h2>
        <TradeProductForm
          locale={FFT_UI_LOCALE}
          eventId={eventId}
          eventStatus={event.status}
        />
        {products.length === 0 ? (
          <TradeEmptyState
            title="No products yet"
            description="Add a product above to define supply for this event."
            testId="trade-products-empty"
          />
        ) : (
          <ul className="space-y-4">
            {products.map((product) => (
              <li key={product.id}>
                <TradeProductForm
                  locale={FFT_UI_LOCALE}
                  eventId={eventId}
                  product={product}
                  eventStatus={event.status}
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="font-medium">Custom fields</h2>
        <TradeFieldDefForm
          locale={FFT_UI_LOCALE}
          eventId={eventId}
          eventStatus={event.status}
        />
        {fieldDefs.length === 0 ? (
          <TradeEmptyState
            title="No custom fields yet"
            description="Optional columns for order forms — add one above."
            testId="trade-fields-empty"
          />
        ) : (
          <ul className="space-y-4">
            {fieldDefs.map((field) => (
              <li key={field.id}>
                <TradeFieldDefForm
                  locale={FFT_UI_LOCALE}
                  eventId={eventId}
                  field={field}
                  eventStatus={event.status}
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="font-medium">Customer priority</h2>
        <TradePriorityImportForm locale={FFT_UI_LOCALE} eventId={eventId} />
        {priorities.length === 0 ? (
          <TradeEmptyState
            title="No priority rows imported"
            description="Paste CSV above to rank customers for allocation."
            testId="trade-priority-empty"
          />
        ) : (
          <ul className="text-muted-foreground text-sm">
            {priorities.map((row) => (
              <li key={`${row.customerName}-${row.priorityRank}`}>
                #{row.priorityRank} {row.customerName}
                {row.customerCode ? ` (${row.customerCode})` : ""}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-2">
        <h2 className="font-medium">Exports</h2>
        <FftExportPanel locale={FFT_UI_LOCALE} eventId={eventId} />
      </section>

      {canViewAudit ? (
        <FftAuditPanel rows={toFftAuditListItems(audit)} />
      ) : null}
    </main>
  );
}
