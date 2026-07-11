import type { RouteCoverageSnapshot } from "@/modules/platform/governance/portal-route-coverage";

/** Inline coverage summary for playground page meta (not a separate frame). */
export function PlaygroundCoverageBadge({
  snapshot,
}: {
  snapshot: RouteCoverageSnapshot;
}) {
  const { totalAvailable, totalPresented, missing } = snapshot.summary;

  return (
    <div
      className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm"
      data-playground-coverage-badge
    >
      <span className="font-medium">Route coverage</span>
      <span className="text-muted-foreground">
        {totalPresented}/{totalAvailable} presented
      </span>
      {missing > 0 ? (
        <span className="text-xs font-medium text-amber-700 dark:text-amber-400">
          {missing} missing
        </span>
      ) : (
        <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
          complete
        </span>
      )}
    </div>
  );
}
