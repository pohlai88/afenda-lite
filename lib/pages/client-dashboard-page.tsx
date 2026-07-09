import "server-only";

import type { Metadata } from "next";
import { requireClientSession } from "@/lib/auth/session";
import { ClientDashboardAcknowledgement } from "@/components/client/client-dashboard-acknowledgement";
import { ClientDashboardAssignments } from "@/components/client/client-dashboard-assignments";
import { ClientDashboardContext } from "@/components/client/client-dashboard-context";
import { ClientDashboardSummary } from "@/components/client/client-dashboard-summary";
import { PortalCustomerShell } from "@/components/portal/portal-customer-shell";
import { PortalTrustNotice } from "@/components/portal/portal-trust-notice";
import { buildClientDashboardView } from "@/lib/client-dashboard.presenter";
import { getClientProfile, listClientAssignments } from "@/lib/domain/clients";
import { PORTAL_NAME, portalCopy } from "@/lib/copy/portal-copy";

export const clientDashboardPageMetadata: Metadata = {
  title: `${PORTAL_NAME} — ${portalCopy.metadata.client.title}`,
  description: portalCopy.metadata.client.description,
};

/** Shared page handler for `/client`. */
export async function runClientDashboardPage() {
  const { clientDashboard } = portalCopy;
  const session = await requireClientSession({ requireOnboarding: true });

  const [assignments, profile] = await Promise.all([
    listClientAssignments(session.user.email),
    getClientProfile(session.user.id),
  ]);
  const view = buildClientDashboardView({ assignments, profile });

  return (
    <PortalCustomerShell
      variant="app"
      eyebrow={clientDashboard.eyebrow}
      title={clientDashboard.title}
      description={clientDashboard.description}
    >
      <div className="flex flex-col gap-8">
        <ClientDashboardSummary
          declarant={view.declarant}
          metrics={view.metrics}
        />

        <ClientDashboardAcknowledgement status={view.acknowledgement} />

        <div className="grid min-w-0 gap-8 xl:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="min-w-0">
            <ClientDashboardAssignments
              assignments={view.assignments}
              actionsEnabled={view.actionsEnabled}
            />
          </div>

          <aside
            className="min-w-0 space-y-6 xl:sticky xl:top-20 xl:self-start"
            aria-label={clientDashboard.legalNoticeTitle}
          >
            <ClientDashboardContext />
            <PortalTrustNotice />
          </aside>
        </div>
      </div>
    </PortalCustomerShell>
  );
}
