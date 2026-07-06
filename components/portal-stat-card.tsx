import type { ReactNode } from "react";
import Link from "next/link";
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
  href,
}: {
  icon: ReactNode;
  value: string;
  title: string;
  detail: string;
  href?: string;
}) {
  const card = (
    <Card className={href ? "transition-colors hover:bg-muted/40" : undefined}>
      <CardHeader className="h-stack items-start gap-3 pb-2">
        <div className="center size-8 shrink-0 rounded-md bg-primary/10 text-primary">
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

  if (!href) {
    return card;
  }

  return (
    <Link
      href={href}
      className="block rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {card}
    </Link>
  );
}
