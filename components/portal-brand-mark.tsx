import Image from "next/image";
import Link from "next/link";
import {
  BRAND_CONTEXT,
  BRAND_ICON_ALT,
  type BrandContext,
} from "@/lib/portal-brand";
import { PORTAL_NAME } from "@/lib/portal-copy";
import { cn } from "@/lib/utils";

type BrandMarkProps = {
  context?: BrandContext;
  priority?: boolean;
  className?: string;
};

/** Brand image tuned per surface (sidebar, toolbar, hero, etc.). */
export function BrandMark({
  context = "toolbar",
  priority = false,
  className,
}: BrandMarkProps) {
  const { asset, className: contextClass, decorative } = BRAND_CONTEXT[context];

  return (
    <Image
      src={asset.path}
      alt={decorative ? "" : BRAND_ICON_ALT}
      width={asset.width}
      height={asset.height}
      sizes={asset.sizes}
      priority={priority}
      aria-hidden={decorative || undefined}
      className={cn(contextClass, className)}
    />
  );
}

/**
 * shadcn sidebar header icon — `size-8` rounded-lg shell with centered mark.
 * Use as the first child of `SidebarMenuButton size="lg"`.
 */
export function SidebarBrandIcon({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "center size-8 shrink-0 overflow-hidden rounded-lg bg-sidebar-primary text-sidebar-primary-foreground",
        className,
      )}
    >
      <BrandMark context="sidebar" />
    </div>
  );
}

/** Inner mark for team-switcher / dropdown rows (parent supplies the shell). */
export function SidebarBrandMark({ className }: { className?: string }) {
  return <BrandMark context="sidebar" className={className} />;
}

/** Linked logo + optional portal name. */
export function BrandLogo({
  href = "/",
  context = "toolbar",
  priority = false,
  showName = false,
  className,
  nameClassName,
}: {
  href?: string | null;
  context?: BrandContext;
  priority?: boolean;
  showName?: boolean;
  className?: string;
  nameClassName?: string;
}) {
  const content = (
    <>
      <BrandMark context={context} priority={priority} />
      {showName ? (
        <span
          translate="no"
          className={cn(
            "truncate text-sm font-semibold tracking-wide",
            nameClassName,
          )}
        >
          {PORTAL_NAME}
        </span>
      ) : null}
    </>
  );

  const wrapperClass = cn(
    "inline-flex min-w-0 items-center gap-2.5",
    showName && "touch-manipulation",
    className,
  );

  if (href) {
    return (
      <Link
        href={href}
        className={cn(
          wrapperClass,
          "rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring",
        )}
        aria-label={`${PORTAL_NAME} home`}
      >
        {content}
      </Link>
    );
  }

  return <div className={wrapperClass}>{content}</div>;
}
