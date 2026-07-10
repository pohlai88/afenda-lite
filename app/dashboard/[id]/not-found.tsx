import Link from "next/link";
import { Button } from "@/components-V2/platform-components/ui/button";
import { OPERATOR_DASHBOARD_HREF } from "@/lib/routing/portal-routes";
import { portalCopy } from "@/lib/copy/portal-copy";

export default function DashboardNotFound() {
  const copy = portalCopy.errors.routeBoundary.operator;

  return (
    <div className="portal-centered-state flex flex-col items-start gap-4">
      <p className="portal-state-kicker">Not found</p>
      <p className="portal-state-title">Declaration not found</p>
      <Button
        variant="outline"
        size="sm"
        render={<Link href={OPERATOR_DASHBOARD_HREF} />}
        nativeButton={false}
      >
        {copy.backLabel}
      </Button>
    </div>
  );
}
