"use client";

import type { ReactElement } from "react";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { cn } from "@/lib/utils";

import { applicationShell05AnchorLink } from "./shell-render-link";
import type {
  ApplicationShell05Breadcrumb as ShellBreadcrumbItem,
  ApplicationShell05LinkRenderProps,
} from "./types";

export function ApplicationShell05Breadcrumb({
  items,
  className,
  renderLink = applicationShell05AnchorLink,
}: {
  items: ShellBreadcrumbItem[];
  className?: string;
  renderLink?: (props: ApplicationShell05LinkRenderProps) => ReactElement;
}) {
  if (items.length === 0) {
    return null;
  }

  return (
    <Breadcrumb className={cn("text-sm text-muted-foreground", className)} aria-label="Page trail">
      <BreadcrumbList>
        {items.map((item, index) => {
          const isLast = index === items.length - 1;

          return (
            <span key={`${item.label}-${index}`} className="contents">
              {index > 0 ? <BreadcrumbSeparator /> : null}
              <BreadcrumbItem>
                {isLast || !item.href ? (
                  <BreadcrumbPage className="truncate">{item.label}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink className="truncate" render={renderLink({ href: item.href })}>
                    {item.label}
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </span>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
