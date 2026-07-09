import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";

/** empty-state-02 pattern — dashed panel with optional CTA action. */
export function PortalEmptyStateCta({
  sectionTitle,
  sectionDescription,
  icon: Icon,
  title,
  description,
  action,
}: {
  sectionTitle?: string;
  sectionDescription?: string;
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  const hasHeader = Boolean(sectionTitle || sectionDescription);

  return (
    <Card className="min-w-0 w-full">
      {hasHeader ? (
        <CardHeader className="gap-0">
          {sectionTitle ? (
            <h2 className="portal-card-title">{sectionTitle}</h2>
          ) : null}
          {sectionDescription ? (
            <CardDescription>{sectionDescription}</CardDescription>
          ) : null}
        </CardHeader>
      ) : null}
      <CardContent className={hasHeader ? undefined : "pt-6"}>
        <div className="portal-empty-state-panel">
          <Icon
            aria-hidden="true"
            className="mx-auto size-12 text-muted-foreground"
          />
          <p className="mt-3 text-sm font-medium">{title}</p>
          <p className="mt-1 text-sm text-muted-foreground text-pretty">
            {description}
          </p>
          {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
        </div>
      </CardContent>
    </Card>
  );
}
