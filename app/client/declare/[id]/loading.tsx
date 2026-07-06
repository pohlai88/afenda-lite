import { Skeleton } from "@/components/ui/skeleton";

export default function ClientDeclareLoading() {
  return (
    <div className="portal-main-narrow space-y-4 py-10">
      <Skeleton className="h-8 w-2/3" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}
