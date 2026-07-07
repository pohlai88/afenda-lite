import type { Metadata } from "next";
import { requireClientSession } from "@/app/actions/client";
import { ClientDashboardAcknowledgement } from "@/components/client-dashboard-acknowledgement";
import { ClientDashboardAssignments } from "@/components/client-dashboard-assignments";
import { ClientDashboardContext } from "@/components/client-dashboard-context";
import { ClientDashboardSummary } from "@/components/client-dashboard-summary";
import { PortalCustomerShell } from "@/components/portal-customer-shell";
import { PortalTrustNotice } from "@/components/portal-trust-notice";
import { computeClientDashboardMetrics } from "@/lib/client-dashboard-metrics";
import {
  getClientProfile,
  isClientPortalAcknowledged,
  listClientAssignments,
} from "@/lib/clients";
import { PORTAL_NAME, portalCopy } from "@/lib/portal-copy";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = {
  title: `${PORTAL_NAME} — ${portalCopy.metadata.client.title}`,
  description: portalCopy.metadata.client.description,
};

export default async function ClientDashboardPage() {
  const { clientDashboard } = portalCopy;
  const session = await requireClientSession({ requireOnboarding: true });

  const [assignments, profile] = await Promise.all([
    listClientAssignments(session.user.email),
    getClientProfile(session.user.id),
  ]);
  const metrics = computeClientDashboardMetrics(assignments);
  const acknowledged = isClientPortalAcknowledged(profile);
  const acknowledgedDate = profile?.portalAckAt
    ? formatDate(profile.portalAckAt)
    : undefined;

  return (
    <PortalCustomerShell
      variant="app"
      eyebrow={clientDashboard.eyebrow}
      title={clientDashboard.title}
      description={clientDashboard.description}
    >
      <div className="flex flex-col gap-8">
        <ClientDashboardSummary profile={profile} metrics={metrics} />

        {acknowledged ? (
          acknowledgedDate ? (
            <p className="text-sm text-muted-foreground">
              {clientDashboard.acknowledgement.acknowledgedOn(acknowledgedDate)}
            </p>
          ) : null
        ) : (
          <ClientDashboardAcknowledgement />
        )}

        <div className="grid min-w-0 gap-8 xl:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="min-w-0">
            <ClientDashboardAssignments
              assignments={assignments}
              actionsEnabled={acknowledged}
            />
          </div>

          <aside className="min-w-0 space-y-6 xl:sticky xl:top-20 xl:self-start">
            <ClientDashboardContext />
            <PortalTrustNotice />
          </aside>
        </div>
      </div>
    </PortalCustomerShell>
  );
}
