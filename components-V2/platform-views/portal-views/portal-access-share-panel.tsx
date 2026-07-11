import Image from "next/image";
import Link from "next/link";
import { CopyAccessMessage } from "@/features/organization-admin/copy-access-message";
import { Button } from "@/components-V2/platform-components/ui/button";
import { buildClientAccessMessage } from "@/modules/declarations/client-access-message";
import { buildQrCodeUrl } from "@/modules/identity/domain/invite";
import { portalCopy } from "@/modules/platform/copy/portal-copy";
import { ORGANIZATION_ADMIN_CLIENTS_HREF } from "@/modules/platform/routing/portal-routes";

export type PortalAccessSharePanelProps = {
  loginUrl: string;
  openLinkUrl: string;
  secureLinkUrl: string;
};

/** Operator share links + QR for a declaration (AdminCN portal-views). */
export function PortalAccessSharePanel({
  loginUrl,
  openLinkUrl,
  secureLinkUrl,
}: PortalAccessSharePanelProps) {
  const { share, clientAccess } = portalCopy;
  const generalMessage = buildClientAccessMessage({
    portalUrl: loginUrl,
    clientEmail: clientAccess.generalPlaceholderEmail,
  });

  return (
    <div className="space-y-6">
      <p className="text-muted-foreground text-sm text-pretty">
        {share.clientAccessDescription}
      </p>

      <div className="space-y-4 rounded-lg border p-4">
        <div className="space-y-2">
          <p className="text-muted-foreground text-xs font-medium">
            {share.secureLinkLabel}
          </p>
          <p className="portal-code-block break-all">{secureLinkUrl}</p>
          <p className="text-muted-foreground text-xs">{share.secureLinkHint}</p>
        </div>
        <div className="space-y-2 border-t pt-4">
          <p className="text-muted-foreground text-xs font-medium">
            {share.openLinkLabel}
          </p>
          <p className="portal-code-block break-all">{openLinkUrl}</p>
          <p className="text-muted-foreground text-xs">{share.openLinkHint}</p>
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-muted-foreground text-xs font-medium">
          {share.clientLoginLabel}
        </p>
        <p className="portal-code-block break-all">{loginUrl}</p>
      </div>

      <CopyAccessMessage
        message={generalMessage}
        label={clientAccess.generalLabel}
      />

      <Button
        render={<Link href={`${ORGANIZATION_ADMIN_CLIENTS_HREF}#invite-client`} />}
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
          className="bg-card rounded-md border"
          unoptimized
        />
        <p className="text-muted-foreground text-xs">{share.qrHint}</p>
      </div>
    </div>
  );
}
