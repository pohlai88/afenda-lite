import type { ReactNode } from "react";
import type { UiCriterion } from "@/lib/governance/ui-decision-matrix";

type Delta = {
  criterion: UiCriterion;
  winner: number;
  runnerUp: number;
};

export function ScoreAnnotation({
  winner,
  runnerUp,
  winnerScore,
  runnerUpScore,
  deltas,
  summary,
}: {
  winner: string;
  runnerUp: string;
  winnerScore: number;
  runnerUpScore: number;
  deltas: Delta[];
  summary: string;
}) {
  return (
    <aside className="rounded-lg border border-vault-rim bg-vault-surface/60 p-4 text-sm">
      <p className="font-semibold">Score comparison</p>
      <p className="mt-1 text-muted-foreground">
        <span className="font-medium text-foreground">{winner}</span>{" "}
        {winnerScore.toFixed(2)} vs{" "}
        <span className="font-medium text-foreground">{runnerUp}</span>{" "}
        {runnerUpScore.toFixed(2)}
      </p>
      <ul className="mt-3 space-y-1">
        {deltas.map((d) => {
          const diff = d.winner - d.runnerUp;
          const sign = diff >= 0 ? "+" : "";
          return (
            <li key={d.criterion}>
              {d.criterion}: {sign}
              {diff.toFixed(1)} ({d.winner} vs {d.runnerUp})
            </li>
          );
        })}
      </ul>
      <p className="mt-3 text-pretty text-muted-foreground">{summary}</p>
    </aside>
  );
}

export function ComparisonGrid({
  left,
  right,
  annotation,
}: {
  left: ReactNode;
  right: ReactNode;
  annotation: ReactNode;
}) {
  return (
    <div className="grid min-h-dvh gap-6 bg-background p-6 lg:grid-cols-2">
      <div className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Current
        </p>
        {left}
      </div>
      <div className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Winning candidate
        </p>
        {right}
      </div>
      <div className="lg:col-span-2">{annotation}</div>
    </div>
  );
}

export function MockKpiCards({ variant }: { variant: "current" | "stats03" }) {
  const items =
    variant === "current"
      ? [
          { label: "Open", value: "2" },
          { label: "Submitted", value: "5" },
        ]
      : [
          { label: "Total declarations", value: "12", trend: "+8%" },
          { label: "Pending review", value: "3", trend: "-2%" },
          { label: "Completed", value: "9", trend: "+4%" },
        ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => (
        <div key={item.label} className="rounded-lg border bg-card p-4">
          <p className="text-xs text-muted-foreground">{item.label}</p>
          <p className="text-2xl font-semibold">{item.value}</p>
          {"trend" in item && item.trend ? (
            <p className="text-caption text-success">{item.trend} vs last month</p>
          ) : null}
        </div>
      ))}
    </div>
  );
}

export function MockDataTable({ variant }: { variant: "current" | "studio" }) {
  const cols =
    variant === "studio"
      ? ["Client", "Email", "Status", "Role", "Actions"]
      : ["Name", "Status", "Updated"];

  return (
    <div className="overflow-hidden rounded-lg border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50">
          <tr>
            {cols.map((c) => (
              <th key={c} className="px-3 py-2 text-left font-medium">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr className="border-t">
            {cols.map((c) => (
              <td key={c} className="px-3 py-2 text-muted-foreground">
                …
              </td>
            ))}
          </tr>
        </tbody>
      </table>
      {variant === "studio" ? (
        <div className="border-t px-3 py-2 text-xs text-muted-foreground">
          Pagination · row actions · filters
        </div>
      ) : null}
    </div>
  );
}
