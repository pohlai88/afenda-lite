import Link from "next/link";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

export type PortalBreadcrumb = {
  label: string;
  href?: string;
};

export function PortalBreadcrumbList({
  items,
  hideFirstOnMobile = false,
  maxWidthClass = "max-w-[40vw]",
}: {
  items: PortalBreadcrumb[];
  hideFirstOnMobile?: boolean;
  maxWidthClass?: string;
}) {
  return (
    <Breadcrumb className="min-w-0 flex-1" aria-label="Page trail">
      <BreadcrumbList>
        {items.map((item, index) => {
          const isLast = index === items.length - 1;

          return (
            <span key={`${item.label}-${index}`} className="contents">
              {index > 0 ? (
                <BreadcrumbSeparator
                  className={hideFirstOnMobile ? "hidden md:block" : undefined}
                />
              ) : null}
              <BreadcrumbItem
                className={
                  hideFirstOnMobile && index === 0 ? "hidden md:block" : undefined
                }
              >
                {isLast || !item.href ? (
                  <BreadcrumbPage className={`truncate ${maxWidthClass}`}>
                    {item.label}
                  </BreadcrumbPage>
                ) : (
                  <BreadcrumbLink
                    className={`truncate ${maxWidthClass}`}
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
  );
}
