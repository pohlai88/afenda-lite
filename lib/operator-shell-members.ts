import "server-only";

import { buildDashboardTeams } from "@/lib/dashboard-nav";
import {
  resolvePortalMember,
  resolvePreviewClientMember,
} from "@/lib/portal-member";
import { isPreviewClientConfigured } from "@/lib/preview-client";

export async function loadOperatorShellMembers() {
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

  return {
    operatorMember,
    previewClientMember,
    teams,
    showPreviewClient,
  };
}
