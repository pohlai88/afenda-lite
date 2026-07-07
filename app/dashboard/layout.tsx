import { requireAdminSession } from "@/lib/auth/session";
import { DashboardShell } from "@/components/dashboard-shell";
import { buildDashboardTeams } from "@/lib/dashboard-nav";
import { isPlaygroundEmbedRequest, isPlaygroundEnabled } from "@/lib/playground";
import {
  resolvePortalMember,
  resolvePreviewClientMember,
} from "@/lib/portal-member";
import { isPreviewClientConfigured } from "@/lib/preview-client";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdminSession();

  if (await isPlaygroundEmbedRequest()) {
    return children;
  }

  const showPreviewClient = isPreviewClientConfigured();
  const [operatorMember, previewClientMember] = await Promise.all([
    resolvePortalMember(),
    showPreviewClient ? resolvePreviewClientMember() : Promise.resolve(null),
  ]);

  const teams =
    operatorMember != null
      ? buildDashboardTeams({
          operator: operatorMember,
          previewClient: previewClientMember,
        })
      : undefined;

  return (
    <DashboardShell
      operatorMember={operatorMember}
      dashboardTeams={teams}
      showPreviewClient={showPreviewClient}
      showPlayground={isPlaygroundEnabled()}
    >
      {children}
    </DashboardShell>
  );
}
