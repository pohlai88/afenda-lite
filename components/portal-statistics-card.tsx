import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/** statistics-component-03 pattern — KPI card with optional trend badge. */
export function PortalStatisticsCard({
  icon,
  value,
  title,
  description,
  trendLabel,
  trendVariant = "neutral",
  className,
}: {
  icon: ReactNode;
  value: string | number;
  title: string;
  description: string;
  trendLabel?: string;
  trendVariant?: "positive" | "negative" | "neutral";
  className?: string;
}) {
  return (
    <Card className={cn("h-full", className)}>
      <CardHeader className="flex flex-row items-start justify-between gap-2 pb-2">
        <div className="flex items-center gap-2">
          <div className="bg-primary/10 text-primary flex size-8 shrink-0 items-center justify-center rounded-md">
            {icon}
          </div>
          <span className="text-2xl font-semibold tabular-nums">{value}</span>
        </div>
        {trendLabel ? (
          <Badge
            variant="outline"
            className={cn(
              "shrink-0 text-xs font-medium",
              trendVariant === "positive" && "border-emerald-500/40 text-emerald-700 dark:text-emerald-400",
              trendVariant === "negative" && "border-destructive/40 text-destructive",
            )}
          >
            {trendLabel}
          </Badge>
        ) : null}
      </CardHeader>
      <CardContent className="flex flex-col gap-1 pt-0">
        <span className="text-base font-semibold">{title}</span>
        <p className="text-sm text-muted-foreground text-pretty">{description}</p>
      </CardContent>
    </Card>
  );
}
