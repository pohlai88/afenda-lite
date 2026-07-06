import type { ReactNode } from "react";
import Link from "next/link";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { SidebarTrigger } from "@/components/ui/sidebar";

export type DashboardBreadcrumb = {
  label: string;
  href?: string;
};

export function DashboardPageHeader({
  breadcrumbs,
  actions,
  showSidebarTrigger = true,
}: {
  breadcrumbs: DashboardBreadcrumb[];
  actions?: ReactNode;
  showSidebarTrigger?: boolean;
}) {
  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
      {showSidebarTrigger ? (
        <SidebarTrigger className="-ml-1" />
      ) : (
        <Skeleton
          className="-ml-1 size-8 shrink-0 rounded-md"
          aria-hidden
        />
      )}
      <Separator
        orientation="vertical"
        className="mr-2 data-[orientation=vertical]:h-4"
      />
      <Breadcrumb className="min-w-0 flex-1">
        <BreadcrumbList>
          {breadcrumbs.map((item, index) => {
            const isLast = index === breadcrumbs.length - 1;

            return (
              <span key={`${item.label}-${index}`} className="contents">
                {index > 0 ? (
                  <BreadcrumbSeparator className="hidden md:block" />
                ) : null}
                <BreadcrumbItem className={index === 0 ? "hidden md:block" : ""}>
                  {isLast || !item.href ? (
                    <BreadcrumbPage className="max-w-[40vw] truncate">
                      {item.label}
                    </BreadcrumbPage>
                  ) : (
                    <BreadcrumbLink
                      className="max-w-[40vw] truncate"
                      render={<Link href={item.href} />}
                    >
                      {item.label}
                    </BreadcrumbLink>
                  )}
                </BreadcrumbItem>
              </span>
            );
          })}
        </BreadcrumbList>
      </Breadcrumb>
      {actions ? (
        <div className="flex shrink-0 items-center gap-2">{actions}</div>
      ) : null}
    </header>
  );
}
