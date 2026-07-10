import "server-only";

import type { Metadata } from "next";
import { PORTAL_NAME, portalCopy } from "@/lib/copy/portal-copy";
import { ClientWorkspaceUnavailable } from "@/lib/pages/client-workspace-unavailable";

export const clientDeclarePageMetadata: Metadata = {
  title: `${PORTAL_NAME} — ${portalCopy.clientWorkspace.unavailableTitle}`,
  description: portalCopy.clientWorkspace.unavailableDescription,
  robots: { index: false, follow: false },
};

/**
 * Client declare UI is tombstoned (rebuild deferred).
 * Gate/orchestration logic remains in `client-declare-page.logic.ts` for rebuild.
 * Backend: `submitClientDeclarationAction` + draft API retained.
 */
export async function runClientDeclarePage() {
  const copy = portalCopy.clientWorkspace;

  return (
    <ClientWorkspaceUnavailable
      copy={{
        eyebrow: copy.eyebrow,
        title: copy.unavailableTitle,
        description: copy.unavailableDescription,
        signOutLabel: copy.unavailableSignOutLabel,
      }}
    />
  );
}
