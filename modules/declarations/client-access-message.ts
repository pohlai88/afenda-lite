import { getClientSignInUrl } from "@/modules/platform/app-url";
import { portalCopy } from "@/modules/platform/copy/portal-copy";

export function buildClientAccessMessage(input: {
  portalUrl?: string;
  clientEmail: string;
}) {
  const portalUrl = input.portalUrl ?? getClientSignInUrl();
  return portalCopy.clientAccess.message({
    portalUrl,
    clientEmail: input.clientEmail,
  });
}
