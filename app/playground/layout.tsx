// Admin-gated UI review route. Requires PLAYGROUND_ENABLED=true in production.
import { notFound } from "next/navigation";
import { requireAdminSession } from "@/app/actions/admin";
import { DashboardShell } from "@/components/dashboard-shell";
import { PlaygroundSidebar } from "@/components/playground-sidebar";
import { isPlaygroundEnabled, playgroundNav } from "@/lib/playground";

export default async function PlaygroundLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!isPlaygroundEnabled()) {
    notFound();
  }

  await requireAdminSession();

  return (
    <DashboardShell
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
