import "server-only";

import { notFound } from "next/navigation";
import { requireAdminSession } from "@/lib/auth/session";
import { PortalApplicationShell } from "@/components/portal/portal-application-shell";
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
    <PortalApplicationShell
      navVariant="developer"
      member={operatorMember}
      teams={teams}
      showPreviewClient={showPreviewClient}
      developerScreens={playgroundNav}
    >
      {children}
    </PortalApplicationShell>
  );
}
