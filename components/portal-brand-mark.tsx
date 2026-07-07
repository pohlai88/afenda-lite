import Link from "next/link";
import {
  BRAND_CONTEXT,
  BRAND_ICON_ALT,
  BRAND_RENDER_SIZE,
  PORTAL_BRAND_ICON,
  PORTAL_BRAND_SHELL,
  type BrandContext,
} from "@/lib/portal-brand";
import { PORTAL_NAME } from "@/lib/portal-copy";
import { cn } from "@/lib/utils";

type BrandMarkProps = {
  context?: BrandContext;
  className?: string;
  /** @deprecated Raw img chrome does not use next/image priority. */
  priority?: boolean;
};

/**
 * Legacy dual-img theme swap inside a fixed shell — no overflow, no overlap.
 * Shell clips; imgs are absolute + object-contain within padded inset.
 */
export function BrandThemeIcon({
  shellClassName,
  className,
  decorative = true,
  "data-brand-shell": dataBrandShell,
}: {
  shellClassName: string;
  className?: string;
  decorative?: boolean;
  "data-brand-shell"?: string;
}) {
  const shellClass = cn(shellClassName, className);
  const imgClass = PORTAL_BRAND_SHELL.imgBase;

  const shell = (
    <span
      className={shellClass}
      data-brand-shell={dataBrandShell}
      aria-hidden={decorative ? true : undefined}
    >
      <img
        src={PORTAL_BRAND_ICON.light.chrome512}
        alt=""
        width={BRAND_RENDER_SIZE}
        height={BRAND_RENDER_SIZE}
        decoding="sync"
        aria-hidden
        className={cn(imgClass, "dark:hidden")}
      />
      <img
        src={PORTAL_BRAND_ICON.dark.chrome512}
        alt=""
        width={BRAND_RENDER_SIZE}
        height={BRAND_RENDER_SIZE}
        decoding="sync"
        aria-hidden
        className={cn(imgClass, "hidden dark:block")}
      />
    </span>
  );

  if (decorative) {
    return shell;
  }

  return (
    <span role="img" aria-label={BRAND_ICON_ALT} className="inline-flex shrink-0">
      {shell}
    </span>
  );
}

/** Brand image tuned per surface (sidebar, toolbar, hero, etc.). */
export function BrandMark({
  context = "toolbar",
  className,
  priority: _priority,
}: BrandMarkProps) {
  const { shellClass, decorative } = BRAND_CONTEXT[context];

  return (
    <BrandThemeIcon
      shellClassName={shellClass}
      className={className}
      decorative={decorative}
      data-brand-shell={context}
    />
  );
}

/**
 * shadcn sidebar header icon — 32px shell, theme-aware.
 * Use as the first child of `SidebarMenuButton size="lg"`.
 */
export function SidebarBrandIcon({ className }: { className?: string }) {
  return (
    <BrandThemeIcon
      shellClassName={BRAND_CONTEXT.sidebar.shellClass}
      className={className}
      data-brand-shell="sidebar"
    />
  );
}

/** Inner mark for team-switcher / operator sidebar header (32px shell). */
export function SidebarBrandMark({ className }: { className?: string }) {
  return (
    <BrandThemeIcon
      shellClassName={BRAND_CONTEXT.sidebar.shellClass}
      className={className}
      data-brand-shell="sidebar"
    />
  );
}

/** Linked logo + optional portal name. */
export function BrandLogo({
  href = "/",
  context = "toolbar",
  showName = false,
  className,
  nameClassName,
  priority: _priority,
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
      <BrandMark context={context} />
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
