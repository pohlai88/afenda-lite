import type { ReactNode } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

/** form-layout-01 pattern — titled form section with description and grid body. */
export function PortalFormSection({
  title,
  description,
  children,
  className,
  id,
  headingLevel = 2,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
  id?: string;
  /** Use 1 for account pages where the shell has no page-level h1. */
  headingLevel?: 1 | 2;
}) {
  const Heading = headingLevel === 1 ? "h1" : "h2";

  return (
    <Card id={id} className={className}>
      <CardHeader className="gap-1">
        <Heading
          className={cn(
            headingLevel === 1
              ? "portal-page-title sm:text-title"
              : "font-heading text-lg font-medium leading-snug",
          )}
        >
          {title}
        </Heading>
        {description ? (
          <CardDescription className="text-pretty">{description}</CardDescription>
        ) : null}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}
