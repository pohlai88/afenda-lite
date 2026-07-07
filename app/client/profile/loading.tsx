import { PortalCustomerShell } from "@/components/portal-customer-shell";
import { Skeleton } from "@/components/ui/skeleton";
import { clientProfileBreadcrumbs } from "@/lib/client-breadcrumbs";
import { portalCopy } from "@/lib/portal-copy";

export default function ClientProfileLoading() {
  const { clientProfile } = portalCopy;

  return (
    <PortalCustomerShell
      variant="app"
      eyebrow={clientProfile.eyebrow}
      title={clientProfile.title}
      description={clientProfile.description}
      breadcrumbs={clientProfileBreadcrumbs()}
    >
      <div className="space-y-4">
        <Skeleton className="h-4 w-full max-w-xl" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    </PortalCustomerShell>
  );
}
