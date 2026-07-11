import { Skeleton } from "@/components-V2/platform-components/ui/skeleton";

export default function DashboardRolesLoading() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-10 w-48" />
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {[0, 1, 2].map((item) => (
          <Skeleton key={item} className="h-56 rounded-xl" />
        ))}
      </div>
    </div>
  );
}
