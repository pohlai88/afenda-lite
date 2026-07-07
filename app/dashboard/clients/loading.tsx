import { DashboardPageSkeleton } from "@/components/dashboard-page";
import { Skeleton } from "@/components/ui/skeleton";
import { operatorClientsBreadcrumbs } from "@/lib/operator-breadcrumbs";
import { isPlaygroundEmbedRequest } from "@/lib/playground";
import { portalCopy } from "@/lib/portal-copy";

export default async function DashboardClientsLoading() {
  const embed = await isPlaygroundEmbedRequest();
  const { clientInvitationsPage } = portalCopy;

  return (
    <DashboardPageSkeleton
      embed={embed}
      eyebrow={clientInvitationsPage.eyebrow}
      title={clientInvitationsPage.title}
      description={clientInvitationsPage.description}
      breadcrumbs={operatorClientsBreadcrumbs()}
    >
      <Skeleton className="h-16 rounded-xl" />
      <div className="grid gap-8 lg:grid-cols-[minmax(280px,360px)_1fr]">
        <Skeleton className="h-96 rounded-xl" />
        <div className="space-y-8">
          <Skeleton className="h-4 w-full max-w-md" />
          <Skeleton className="h-48 rounded-xl" />
          <Skeleton className="h-48 rounded-xl" />
        </div>
      </div>
    </DashboardPageSkeleton>
  );
}
