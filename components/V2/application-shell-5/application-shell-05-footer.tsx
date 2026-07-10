"use client";

import type { ReactElement } from "react";

import { cn } from "@/lib/utils";

import { ApplicationShell05Breadcrumb } from "./application-shell-05-breadcrumb";
import { applicationShell05AnchorLink } from "./shell-render-link";
import type {
  ApplicationShell05Breadcrumb as BreadcrumbItem,
  ApplicationShell05FooterConfig,
  ApplicationShell05LinkRenderProps,
} from "./types";

export function ApplicationShell05Footer({
  leading,
  breadcrumbs,
  className,
  renderLink = applicationShell05AnchorLink,
}: ApplicationShell05FooterConfig & {
  className?: string;
  renderLink?: (props: ApplicationShell05LinkRenderProps) => ReactElement;
}) {
  const items = breadcrumbs ?? [];
  if (!leading && items.length === 0) {
    return null;
  }

  return (
    <footer className={cn("text-muted-foreground py-3", className)} data-slot="app-shell-footer">
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 sm:gap-4 sm:px-6">
        {leading ? <div className="shrink-0">{leading}</div> : null}
        {items.length > 0 ? (
          <div className="min-w-0 flex-1">
            <ApplicationShell05Breadcrumb items={items} renderLink={renderLink} />
          </div>
        ) : null}
      </div>
    </footer>
  );
}
