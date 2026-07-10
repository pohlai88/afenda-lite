import { Skeleton } from "@/components-V2/platform-components/ui/skeleton";

export default function OperatorDeclarationDetailLoading() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-36 w-full rounded-xl" />
      <Skeleton className="h-10 w-72 max-w-full" />
      <Skeleton className="h-96 w-full rounded-xl" />
    </div>
  );
}