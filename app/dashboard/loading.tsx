import { DashboardPageSkeleton } from "@/components/dashboard-page";
import { Skeleton } from "@/components/ui/skeleton";
import { operatorDashboardBreadcrumbs } from "@/lib/operator-breadcrumbs";
import { isPlaygroundEmbedRequest } from "@/lib/playground";
import { portalCopy } from "@/lib/portal-copy";

export default async function DashboardLoading() {
  const embed = await isPlaygroundEmbedRequest();
  const { org } = portalCopy;

  return (
    <DashboardPageSkeleton
      embed={embed}
      eyebrow={org.eyebrow}
      title={org.title}
      description={org.description}
      breadcrumbs={operatorDashboardBreadcrumbs()}
    >
      <div className="grid gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton key={index} className="h-24 rounded-xl" />
        ))}
      </div>
      <div className="grid gap-8 portal-grid-split">
        <Skeleton className="h-80 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    </DashboardPageSkeleton>
  );
}
