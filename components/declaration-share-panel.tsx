import { requireAdminSession } from "@/lib/auth/session";
import {
  ClientAccessSharePanel,
  type ClientAccessSharePanelProps,
} from "@/components/client/client-access-share-panel";
import { SecureLinkRotateButton } from "@/components/secure-link-rotate-button";
import { loadDeclarationShareLinks } from "@/lib/domain/declaration-share-links";

export async function DeclarationSharePanel({
  surveyId,
  slug,
}: {
  surveyId: string;
  slug: string;
}) {
  const session = await requireAdminSession();
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
