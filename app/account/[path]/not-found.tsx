import Link from "next/link";
import { Button } from "@/components-V2/platform-components/ui/button";
import { PORTAL_ACCOUNT_SETTINGS_HREF } from "@/lib/routing/account-paths";
import { portalCopy } from "@/lib/copy/portal-copy";

export default function AccountNotFound() {
  const copy = portalCopy.errors.routeBoundary.account;

  return (
    <div className="portal-centered-state flex flex-col items-start gap-4">
      <p className="portal-state-kicker">Not found</p>
      <p className="portal-state-title">Account page not found</p>
      <p className="text-muted-foreground text-sm text-pretty">{copy.description}</p>
      <Button
        variant="outline"
        size="sm"
        render={<Link href={PORTAL_ACCOUNT_SETTINGS_HREF} />}
        nativeButton={false}
      >
        {portalCopy.account.settings.title}
      </Button>
    </div>
  );
}
