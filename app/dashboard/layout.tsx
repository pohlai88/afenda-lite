import { requireAdminSession } from "@/lib/auth/session";
import { DashboardShell } from "@/components/dashboard-shell";
import { isPlaygroundEmbedRequest, isPlaygroundEnabled } from "@/lib/playground";
import { loadOperatorShellMembers } from "@/lib/operator-shell-members";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdminSession();

  if (await isPlaygroundEmbedRequest()) {
    return children;
  }

  const { operatorMember, teams, showPreviewClient } =
    await loadOperatorShellMembers();

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
