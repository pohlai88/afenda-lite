import { Skeleton } from "@/components-V2/platform-components/ui/skeleton";

export default function JoinLoading() {
  return (
    <div className="auth-surface flex h-dvh items-center justify-center px-6">
      <div className="flex w-full max-w-md flex-col gap-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-40 w-full rounded-lg" />
        <Skeleton className="h-10 w-full rounded-md" />
      </div>
    </div>
  );
}
