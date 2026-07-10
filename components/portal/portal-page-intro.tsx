import type { ReactNode } from "react";
import { PortalEyebrow } from "@/components/portal/portal-eyebrow";

export function PortalPageIntro({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="space-y-3">
      <PortalEyebrow>{eyebrow}</PortalEyebrow>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="portal-page-title">{title}</h1>
          {description ? (
            <p className="portal-page-description">{description}</p>
          ) : null}
        </div>
        {actions ? <div className="shrink-0">{actions}</div> : null}
      </div>
    </header>
  );
}
