import Image from "next/image";
import Link from "next/link";
import { CopyAccessMessage } from "@/features/organization-admin/copy-access-message";
import { Button } from "@/components-V2/platform-components/ui/button";
import { buildClientAccessMessage } from "@/modules/declarations/client-access-message";
import { buildQrCodeUrl } from "@/modules/identity/domain/invite";
import { portalCopy } from "@/modules/platform/copy/portal-copy";

export type ClientAccessSharePanelProps = {
  loginUrl: string;
  openLinkUrl: string;
  secureLinkUrl: string;
};

export function ClientAccessSharePanel({
  loginUrl,
  openLinkUrl,
  secureLinkUrl,
}: ClientAccessSharePanelProps) {
  const { share, clientAccess } = portalCopy;
  const generalMessage = buildClientAccessMessage({
    portalUrl: loginUrl,
    clientEmail: clientAccess.generalPlaceholderEmail,
  });

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">{share.clientAccessDescription}</p>

      <div className="space-y-4 rounded-lg border p-4">
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">
            {share.secureLinkLabel}
          </p>
          <p className="portal-code-block break-all">{secureLinkUrl}</p>
          <p className="text-xs text-muted-foreground">{share.secureLinkHint}</p>
        </div>
        <div className="space-y-2 border-t pt-4">
          <p className="text-xs font-medium text-muted-foreground">
            {share.openLinkLabel}
          </p>
          <p className="portal-code-block break-all">{openLinkUrl}</p>
          <p className="text-xs text-muted-foreground">{share.openLinkHint}</p>
        </div>
      </div>

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
          className="rounded-md border bg-card"
          unoptimized
        />
        <p className="text-xs text-muted-foreground">{share.qrHint}</p>
      </div>
    </div>
  );
}
