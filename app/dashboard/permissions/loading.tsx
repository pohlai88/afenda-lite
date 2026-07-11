import { Skeleton } from "@/components-V2/platform-components/ui/skeleton";

export default function DashboardPermissionsLoading() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-10 w-56" />
      <div className="grid gap-3 sm:grid-cols-3">
        {[0, 1, 2].map((item) => (
          <Skeleton key={item} className="h-24 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-[28rem] rounded-xl" />
    </div>
  );
}
