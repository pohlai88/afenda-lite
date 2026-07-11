import "server-only";

import {
  resolvePortalMember,
  resolvePreviewClientMember,
} from "@/modules/identity/portal-member";
import { isPreviewClientConfigured } from "@/modules/identity/preview-client";

/** Operator shell member payload (AdminCN may ignore; kept for preview wiring). */
export async function loadOperatorShellMembers() {
  const showPreviewClient = isPreviewClientConfigured();
  const [operatorMember, previewClientMember] = await Promise.all([
    resolvePortalMember(),
    showPreviewClient ? resolvePreviewClientMember() : Promise.resolve(null),
  ]);

  return {
    operatorMember,
    previewClientMember,
    showPreviewClient,
  };
}
