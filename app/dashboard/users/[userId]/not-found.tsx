import Link from "next/link";
import { Button } from "@/components-V2/platform-components/ui/button";
import { ORGANIZATION_ADMIN_USERS_HREF } from "@/modules/platform/routing/portal-routes";

export default function DashboardUserNotFound() {
  return (
    <div className="portal-centered-state flex flex-col items-start gap-4">
      <p className="portal-state-kicker">Not found</p>
      <p className="portal-state-title">User not found</p>
      <Button
        variant="outline"
        size="sm"
        render={<Link href={ORGANIZATION_ADMIN_USERS_HREF} />}
        nativeButton={false}
      >
        Back to Users List
      </Button>
    </div>
  );
}
