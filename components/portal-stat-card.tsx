import type { ReactNode } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function PortalStatCard({
  icon,
  value,
  title,
  detail,
}: {
  icon: ReactNode;
  value: string;
  title: string;
  detail: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-start gap-3 pb-2">
        <div className="bg-primary/10 text-primary flex size-8 shrink-0 items-center justify-center rounded-md">
          {icon}
        </div>
        <div className="min-w-0 space-y-1">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {title}
          </CardTitle>
          <p className="text-2xl font-semibold tabular-nums">{value}</p>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <p className="text-pretty text-xs text-muted-foreground">{detail}</p>
      </CardContent>
    </Card>
  );
}
