import { DashboardPageSkeleton } from "@/components/dashboard-page";
import { Skeleton } from "@/components/ui/skeleton";
import { operatorDeclarationBreadcrumbs } from "@/lib/operator-breadcrumbs";
import { isPlaygroundEmbedRequest } from "@/lib/playground/playground";
import { portalCopy } from "@/lib/copy/portal-copy";

export default async function OperatorDeclarationDetailLoading() {
  const embed = await isPlaygroundEmbedRequest();
  const { declarationDetail, nav } = portalCopy;

  return (
    <DashboardPageSkeleton
      embed={embed}
      eyebrow={declarationDetail.eyebrow}
      title={nav.declarations}
      breadcrumbs={operatorDeclarationBreadcrumbs(nav.declarations)}
    >
      <Skeleton className="h-36 w-full rounded-xl" />
      <Skeleton className="h-10 w-72 max-w-full" />
      <Skeleton className="h-96 w-full rounded-xl" />
    </DashboardPageSkeleton>
  );
}
