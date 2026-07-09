import { PortalCustomerShell } from "@/components/portal/portal-customer-shell";
import { Skeleton } from "@/components/ui/skeleton";
import { portalCopy } from "@/lib/copy/portal-copy";

export default function ClientOnboardingLoading() {
  const { clientOnboarding } = portalCopy;

  return (
    <PortalCustomerShell
      variant="app"
      eyebrow={clientOnboarding.eyebrow}
      title={clientOnboarding.title}
      description={clientOnboarding.description}
    >
      <div className="space-y-4">
        <Skeleton className="h-4 w-full max-w-xl" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    </PortalCustomerShell>
  );
}
