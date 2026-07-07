import { PortalCustomerShell } from "@/components/portal-customer-shell";
import { Skeleton } from "@/components/ui/skeleton";
import { clientDashboardBreadcrumb } from "@/lib/client-breadcrumbs";
import { portalCopy } from "@/lib/portal-copy";

export default function ClientDeclareLoading() {
  const { clientDashboard } = portalCopy;

  return (
    <PortalCustomerShell
      variant="app"
      eyebrow={portalCopy.product.declarationEyebrow}
      title={clientDashboard.title}
      breadcrumbs={[clientDashboardBreadcrumb()]}
    >
      <div className="space-y-4">
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    </PortalCustomerShell>
  );
}
