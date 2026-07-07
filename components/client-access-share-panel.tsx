import Image from "next/image";
import Link from "next/link";
import { CopyAccessMessage } from "@/components/copy-access-message";
import { Button } from "@/components/ui/button";
import { getAppBaseUrl } from "@/lib/app-url";
import { buildClientAccessMessage } from "@/lib/client-access-message";
import { getClientDefaultPassword } from "@/lib/client-default-password";
import { buildQrCodeUrl } from "@/lib/invite";
import { portalCopy } from "@/lib/portal-copy";

export function ClientAccessSharePanel() {
  const loginUrl = getAppBaseUrl();
  const { share, clientAccess } = portalCopy;
  const temporaryPassword = getClientDefaultPassword();
  const generalMessage = buildClientAccessMessage({
    portalUrl: loginUrl,
    clientEmail: clientAccess.generalPlaceholderEmail,
    temporaryPassword,
  });

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">{share.clientAccessDescription}</p>
      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground">
          {share.clientLoginLabel}
        </p>
        <p className="portal-code-block break-all">{loginUrl}</p>
      </div>
      <CopyAccessMessage
        message={generalMessage}
        label={clientAccess.generalLabel}
      />
      <Button
        render={<Link href="/dashboard/clients#invite-client" />}
        nativeButton={false}
        variant="outline"
        size="sm"
      >
        {share.inviteClientCta}
      </Button>
      <div className="flex items-start gap-3 border-t pt-4">
        <Image
          src={buildQrCodeUrl(loginUrl)}
          alt={share.qrAlt}
          width={96}
          height={96}
          className="rounded-md border bg-white"
          unoptimized
        />
        <p className="text-xs text-muted-foreground">{share.qrHint}</p>
      </div>
    </div>
  );
}
