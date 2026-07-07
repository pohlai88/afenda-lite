import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export function PortalEmptyState({ children }: { children: React.ReactNode }) {
  return (
    <Card className="border-dashed">
      <CardContent className="py-10 text-center text-sm text-muted-foreground">
        {children}
      </CardContent>
    </Card>
  );
}

/** Empty-state-01 pattern: icon, title, and description in a dashed panel. */
export function PortalEmptyStateCard({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  return (
    <Card className="w-full">
      <CardContent className="pt-6">
        <div className="rounded-md border border-dashed p-8 text-center">
          <Icon
            aria-hidden="true"
            className="mx-auto size-12 text-muted-foreground"
          />
          <p className="mt-3 text-sm font-medium">{title}</p>
          <p className="mt-1 text-sm text-muted-foreground text-pretty">
            {description}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
