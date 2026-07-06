import { portalCopy } from "@/lib/portal-copy";
import { LockIcon, ScrollTextIcon, ShieldIcon } from "lucide-react";

const pillarIcons = [ShieldIcon, LockIcon, ScrollTextIcon] as const;

export function PortalTrustNotice() {
  const { trust } = portalCopy;

  return (
    <ul className="space-y-3 rounded-lg border bg-muted/30 p-4 text-sm">
      {trust.pillars.map((pillar, index) => {
        const Icon = pillarIcons[index] ?? ShieldIcon;

        return (
          <li key={pillar.title} className="flex gap-3">
            <Icon
              aria-hidden="true"
              className="mt-0.5 size-4 shrink-0 text-primary"
            />
            <div>
              <p className="font-medium text-foreground">{pillar.title}</p>
              <div className="portal-prose">
                <p>{pillar.detail}</p>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
