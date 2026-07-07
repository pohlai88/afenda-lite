import type { ReactNode } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/** statistics-component-01 pattern — icon, value, title, supporting copy. */
export function PortalStatisticsCard({
  icon,
  value,
  title,
  description,
  className,
}: {
  icon: ReactNode;
  value: string | number;
  title: string;
  description: string;
  className?: string;
}) {
  return (
    <Card className={cn("h-full", className)}>
      <CardHeader className="flex flex-row items-center gap-2 pb-2">
        <div className="bg-primary/10 text-primary flex size-8 shrink-0 items-center justify-center rounded-md">
          {icon}
        </div>
        <span className="text-2xl font-semibold tabular-nums">{value}</span>
      </CardHeader>
      <CardContent className="flex flex-col gap-1 pt-0">
        <span className="text-base font-semibold">{title}</span>
        <p className="text-sm text-muted-foreground text-pretty">{description}</p>
      </CardContent>
    </Card>
  );
}
