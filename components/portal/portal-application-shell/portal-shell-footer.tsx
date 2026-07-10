import {
  BRAND_ICON_ALT,
  BRAND_MASTER_DARK_PATH,
  BRAND_MASTER_LIGHT_PATH,
  BRAND_RENDER_SIZE,
  PORTAL_BRAND_SHELL,
} from "@/lib/copy/portal-brand";
import { cn } from "@/lib/utils";

export function FooterIdentityMark({ className }: { className?: string }) {
  const shellClass = cn(PORTAL_BRAND_SHELL.chromeShell, className);
  const imgClass = PORTAL_BRAND_SHELL.imgBase;

  return (
    <span role="img" aria-label={BRAND_ICON_ALT} className="inline-flex shrink-0">
      <span className={shellClass} data-brand-shell="footer">
        <img
          src={BRAND_MASTER_LIGHT_PATH}
          alt=""
          width={BRAND_RENDER_SIZE}
          height={BRAND_RENDER_SIZE}
          decoding="sync"
          aria-hidden
          className={cn(imgClass, "dark:hidden")}
        />
        <img
          src={BRAND_MASTER_DARK_PATH}
          alt=""
          width={BRAND_RENDER_SIZE}
          height={BRAND_RENDER_SIZE}
          decoding="sync"
          aria-hidden
          className={cn(imgClass, "hidden dark:block")}
        />
      </span>
    </span>
  );
}
