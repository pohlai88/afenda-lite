import { requireAdminSession } from "@/app/actions/admin";
import { DashboardShell } from "@/components/dashboard-shell";
import { isPlaygroundEmbedRequest, isPlaygroundEnabled } from "@/lib/playground";
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

  return (
    <DashboardShell
      showPreviewClient={isPreviewClientConfigured()}
      showPlayground={isPlaygroundEnabled()}
    >
      {children}
    </DashboardShell>
  );
}
