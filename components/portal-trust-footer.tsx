import { portalCopy } from "@/lib/portal-copy";
import { ShieldCheckIcon } from "lucide-react";

export function PortalTrustFooter() {
  const { trust } = portalCopy;

  return (
    <footer className="space-y-1 text-center text-xs text-muted-foreground">
      <p className="inline-flex items-center justify-center gap-1.5">
        <ShieldCheckIcon aria-hidden="true" className="size-3.5 shrink-0" />
        <span>{trust.footer.line}</span>
      </p>
      <p>{trust.footer.complianceNote}</p>
    </footer>
  );
}
