import type { ReactNode } from "react";

export function PortalSection({
  title,
  description,
  children,
  action,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border pb-3">
        <div className="min-w-0">
          <h2 className="portal-subsection-title">{title}</h2>
          {description ? (
            <p className="portal-page-description mt-0.5">{description}</p>
          ) : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
