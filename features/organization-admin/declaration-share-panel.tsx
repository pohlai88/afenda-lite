import { requirePlatformOperatorSession } from "@/modules/identity/auth/platform-operator-session";
import {
  ClientAccessSharePanel,
  type ClientAccessSharePanelProps,
} from "@/features/organization-admin/client/client-access-share-panel";
import { SecureLinkRotateButton } from "@/features/organization-admin/secure-link-rotate-button";
import { loadDeclarationShareLinks } from "@/modules/declarations/domain/declaration-share-links";

export async function DeclarationSharePanel({
  surveyId,
  slug,
}: {
  surveyId: string;
  slug: string;
}) {
  const session = await requirePlatformOperatorSession({
    anyOf: ["declarations.read", "declarations.manage"],
  });
  const links = await loadDeclarationShareLinks({
    surveyId,
    slug,
    createdBy: session.user.id,
  });

  return (
    <div className="space-y-4">
      <ClientAccessSharePanel {...links} />
      <SecureLinkRotateButton surveyId={surveyId} />
    </div>
  );
}

export type { ClientAccessSharePanelProps };
