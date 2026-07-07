import Image from "next/image";
import Link from "next/link";
import {
  BRAND_ICON_ALT,
  BRAND_ICON_HEIGHT,
  BRAND_ICON_PATH,
  BRAND_ICON_WIDTH,
} from "@/lib/portal-brand";
import { PORTAL_NAME } from "@/lib/portal-copy";
import { cn } from "@/lib/utils";

type PortalBrandMarkSize = "xs" | "sm" | "md" | "lg" | "hero";

const sizeConfig: Record<
  PortalBrandMarkSize,
  { className: string; width: number; height: number; sizes: string }
> = {
  xs: { className: "size-8", width: 32, height: 32, sizes: "32px" },
  sm: { className: "size-10", width: 40, height: 40, sizes: "40px" },
  md: { className: "size-14", width: 56, height: 56, sizes: "56px" },
  lg: { className: "size-20", width: 80, height: 80, sizes: "80px" },
  hero: {
    className: "size-28 sm:size-32 lg:size-36",
    width: 144,
    height: 144,
    sizes: "(max-width: 640px) 112px, (max-width: 1024px) 128px, 144px",
  },
};

export function PortalBrandMark({
  size = "md",
  priority = false,
  className,
}: {
  size?: PortalBrandMarkSize;
  priority?: boolean;
  className?: string;
}) {
  const config = sizeConfig[size];

  return (
    <Image
      src={BRAND_ICON_PATH}
      alt={BRAND_ICON_ALT}
      width={config.width}
      height={config.height}
      sizes={config.sizes}
      priority={priority}
      className={cn(
        "shrink-0 rounded-full object-cover ring-1 ring-border/60",
        config.className,
        className,
      )}
    />
  );
}

export function PortalBrandLogo({
  href = "/",
  size = "sm",
  priority = false,
  showName = false,
  className,
  nameClassName,
}: {
  href?: string | null;
  size?: PortalBrandMarkSize;
  priority?: boolean;
  showName?: boolean;
  className?: string;
  nameClassName?: string;
}) {
  const content = (
    <>
      <PortalBrandMark size={size} priority={priority} />
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

/** Intrinsic dimensions for metadata and layout reservation. */
export const portalBrandIntrinsicSize = {
  width: BRAND_ICON_WIDTH,
  height: BRAND_ICON_HEIGHT,
} as const;
