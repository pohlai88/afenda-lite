import { PortalShell } from "@/components/portal-shell";
import { Skeleton } from "@/components/ui/skeleton";
import { portalCopy } from "@/lib/portal-copy";

export default function DashboardLoading() {
  const { account } = portalCopy;

  return (
    <PortalShell
      eyebrow={account.eyebrow}
      title={account.title}
      description={account.description}
    >
      <div className="grid gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton key={index} className="h-24 rounded-xl" />
        ))}
      </div>
      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(280px,320px)_1fr]">
        <Skeleton className="h-80 rounded-xl" />
        <div className="space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-40 rounded-xl" />
          <Skeleton className="h-40 rounded-xl" />
        </div>
      </div>
    </PortalShell>
  );
}
