import Link from "next/link";
import { Button } from "@/components-V2/platform-components/ui/button";
import { ORGANIZATION_ADMIN_DASHBOARD_HREF } from "@/modules/platform/routing/portal-routes";
import { portalCopy } from "@/modules/platform/copy/portal-copy";

export default function DashboardNotFound() {
  const copy = portalCopy.errors.routeBoundary.operator;

  return (
    <div className="portal-centered-state flex flex-col items-start gap-4">
      <p className="portal-state-kicker">Not found</p>
      <p className="portal-state-title">Declaration not found</p>
      <Button
        variant="outline"
        size="sm"
        render={<Link href={ORGANIZATION_ADMIN_DASHBOARD_HREF} />}
        nativeButton={false}
      >
        {copy.backLabel}
      </Button>
    </div>
  );
}
