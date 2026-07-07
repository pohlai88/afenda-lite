import { getAppBaseUrl } from "@/lib/app-url";
import { portalCopy } from "@/lib/portal-copy";

export function buildClientAccessMessage(input: {
  portalUrl?: string;
  clientEmail: string;
  temporaryPassword: string;
}) {
  const portalUrl = input.portalUrl ?? getAppBaseUrl();
  return portalCopy.clientAccess.message({
    portalUrl,
    clientEmail: input.clientEmail,
    temporaryPassword: input.temporaryPassword,
  });
}
