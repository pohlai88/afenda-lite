import { PortalCustomerShell } from "@/components/portal-customer-shell";
import { Skeleton } from "@/components/ui/skeleton";
import { portalCopy } from "@/lib/portal-copy";

export default function ClientDeclareLoading() {
  const { clientDashboard, nav } = portalCopy;

  return (
    <PortalCustomerShell
      eyebrow={portalCopy.product.declarationEyebrow}
      title={clientDashboard.title}
      backHref="/client"
      backLabel={clientDashboard.backToAssignments}
      homeHref="/client"
      showSignOut
      breadcrumbs={[{ label: nav.assignments, href: "/client" }]}
    >
      <div className="space-y-4">
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    </PortalCustomerShell>
  );
}
