import { notFound } from "next/navigation";
import { requireAdminSession } from "@/lib/auth/session";
import { DashboardShell } from "@/components/dashboard-shell";
import { PlaygroundSidebar } from "@/components/playground-sidebar";
import { buildDashboardTeams } from "@/lib/dashboard-nav";
import {
  isPlaygroundEnabled,
  playgroundNav,
} from "@/lib/playground";
import {
  resolvePortalMember,
  resolvePreviewClientMember,
} from "@/lib/portal-member";
import { isPreviewClientConfigured } from "@/lib/preview-client";

export const dynamic = "force-dynamic";

export default async function PlaygroundLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!isPlaygroundEnabled()) {
    notFound();
  }

  await requireAdminSession();

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
      sidebar={
        <PlaygroundSidebar
          adminScreens={playgroundNav.admin}
          clientScreens={playgroundNav.client}
        />
      }
    >
      {children}
    </DashboardShell>
  );
}
