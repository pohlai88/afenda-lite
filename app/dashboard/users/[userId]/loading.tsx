import { Skeleton } from "@/components-V2/platform-components/ui/skeleton";

export default function DashboardUserViewLoading() {
  return (
    <div className="grid gap-6 lg:grid-cols-[350px_minmax(0,1fr)]">
      <Skeleton className="h-[34rem] rounded-xl" />
      <div className="space-y-6">
        <Skeleton className="h-10 rounded-lg" />
        <Skeleton className="h-72 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    </div>
  );
}
