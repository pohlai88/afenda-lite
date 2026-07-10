import type { ReactNode } from "react";
import { StudioStatisticsCard } from "@/features/operator/shadcn-studio/blocks/statistics-card-03";
import { cn } from "@/lib/utils";

/** statistics-component-03 — portal adapter for Studio KPI card. */
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
  const showTrend =
    trendLabel != null &&
    trendVariant !== "neutral" &&
    trendLabel !== "—" &&
    trendLabel.length > 0;

  return (
    <StudioStatisticsCard
      icon={icon}
      value={String(value)}
      title={title}
      badgeContent={description}
      changePercentage={trendLabel}
      trend={trendVariant === "negative" ? "down" : "up"}
      showTrend={showTrend}
      className={cn(className)}
    />
  );
}
