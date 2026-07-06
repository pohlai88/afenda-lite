import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function PortalEyebrow({
  children,
  className,
  variant = "soft",
}: {
  children: ReactNode;
  className?: string;
  variant?: "soft" | "solid";
}) {
  return (
    <Badge
      className={cn(
        variant === "solid"
          ? "bg-primary text-primary-foreground hover:bg-primary/90"
          : "bg-primary/10 text-primary hover:bg-primary/15",
        className,
      )}
    >
      {children}
    </Badge>
  );
}
