import "server-only";

import {
  resolvePortalMember,
  resolvePreviewClientMember,
} from "@/modules/identity/portal-member";
import { isPreviewClientConfigured } from "@/modules/identity/preview-client";

/** Organization-admin shell member payload (AdminCN may ignore; kept for preview wiring). */
export async function loadOrganizationAdminShellMembers() {
  const showPreviewClient = isPreviewClientConfigured();
  const [organizationAdminMember, previewClientMember] = await Promise.all([
    resolvePortalMember(),
    showPreviewClient ? resolvePreviewClientMember() : Promise.resolve(null),
  ]);

  return {
    organizationAdminMember,
    previewClientMember,
    showPreviewClient,
  };
}
