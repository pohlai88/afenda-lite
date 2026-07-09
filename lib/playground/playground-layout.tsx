import "server-only";

import { notFound } from "next/navigation";
import { requireAdminSession } from "@/lib/auth/session";
import { DashboardShell } from "@/components/dashboard-shell";
import { PlaygroundSidebar } from "@/components/playground-sidebar";
import { isPlaygroundEnabled, playgroundNav } from "@/lib/playground/playground";
import { loadOperatorShellMembers } from "@/lib/operator-shell-members";

/** Shared layout handler for `app/playground`. */
export async function runPlaygroundLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!isPlaygroundEnabled()) {
    notFound();
  }

  await requireAdminSession();

  const { operatorMember, teams, showPreviewClient } =
    await loadOperatorShellMembers();

  return (
    <DashboardShell
      operatorMember={operatorMember}
      dashboardTeams={teams}
      showPreviewClient={showPreviewClient}
      showPlayground={false}
      sidebar={
        <PlaygroundSidebar
          adminScreens={playgroundNav.admin}
          clientScreens={playgroundNav.client}
          dynamicScreens={playgroundNav.dynamic}
        />
      }
    >
      {children}
    </DashboardShell>
  );
}
