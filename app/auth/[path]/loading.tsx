import { Skeleton } from "@/components-V2/platform-components/ui/skeleton";

export default function Loading() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 p-6">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-64 w-full max-w-md" />
    </div>
  );
}
