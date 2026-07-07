import { portalCopy } from "@/lib/portal-copy";
import { cn } from "@/lib/utils";
import { LockIcon, ScrollTextIcon, ShieldIcon } from "lucide-react";

const pillarIcons = [ShieldIcon, LockIcon, ScrollTextIcon] as const;

export function PortalTrustNotice({
  variant = "default",
}: {
  variant?: "default" | "inverse";
}) {
  const { trust } = portalCopy;
  const isInverse = variant === "inverse";

  return (
    <ul
      className={cn(
        "space-y-3 rounded-lg border p-4 text-sm",
        isInverse
          ? "border-terminal-foreground/15 bg-terminal-foreground/5"
          : "border-border bg-muted/30",
      )}
    >
      {trust.pillars.map((pillar, index) => {
        const Icon = pillarIcons[index] ?? ShieldIcon;

        return (
          <li key={pillar.title} className="flex gap-3">
            <Icon
              aria-hidden="true"
              className={cn(
                "mt-0.5 size-4 shrink-0",
                isInverse ? "text-terminal-foreground" : "text-primary",
              )}
            />
            <div>
              <p
                className={cn(
                  "font-medium",
                  isInverse ? "text-terminal-foreground" : "text-foreground",
                )}
              >
                {pillar.title}
              </p>
              <div className={isInverse ? "text-terminal-foreground/75" : undefined}>
                <div className="portal-prose">
                  <p>{pillar.detail}</p>
                </div>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
