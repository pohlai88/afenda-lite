import type { ReactNode } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components-V2/platform-components/ui/card";
import { cn } from "@/lib/utils";

/** form-layout-01 — titled section shell from Shadcn Studio form layout block. */
export type StudioFormLayoutSectionProps = {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
  id?: string;
  /** Use 1 for account pages where the shell has no page-level h1. */
  headingLevel?: 1 | 2;
};

export function StudioFormLayoutSection({
  title,
  description,
  children,
  className,
  id,
  headingLevel = 2,
}: StudioFormLayoutSectionProps) {
  const Heading = headingLevel === 1 ? "h1" : "h2";

  return (
    <Card id={id} className={cn("min-w-0", className)}>
      <CardHeader className="gap-1">
        <Heading
          className={cn(
            headingLevel === 1
              ? "portal-page-title sm:text-title"
              : "text-xl font-semibold",
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

export default StudioFormLayoutSection;
