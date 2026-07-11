import { Skeleton } from "@/components-V2/platform-components/ui/skeleton";

export default function DashboardUsersLoading() {
  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((item) => (
          <Skeleton key={item} className="h-32 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-[32rem] rounded-xl" />
    </div>
  );
}
