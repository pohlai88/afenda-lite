import { PortalCustomerShell } from "@/components/portal-customer-shell";
import { Skeleton } from "@/components/ui/skeleton";
import { portalCopy } from "@/lib/portal-copy";

export default function ClientLoading() {
  const { clientDashboard } = portalCopy;

  return (
    <PortalCustomerShell
      eyebrow={clientDashboard.eyebrow}
      title={clientDashboard.title}
      description={clientDashboard.description}
    >
      <div className="space-y-4">
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-28 w-full" />
      </div>
    </PortalCustomerShell>
  );
}
