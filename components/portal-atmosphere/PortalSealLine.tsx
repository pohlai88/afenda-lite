import { ShieldCheckIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DEFAULT_PORTAL_EDITORIAL_COPY,
  type PortalEditorialCopy,
} from "./contracts/portal-editorial.contract";
import { resolvePortalSealText } from "./contracts/portal-seal.contract";

export interface PortalSealLineProps {
  readonly copy?: PortalEditorialCopy;
  /** PA-P10 adapter may hide the seal without removing brand slot composition. */
  readonly showSeal?: boolean;
  readonly className?: string;
}

/** Decorative institutional seal line — subordinate to editorial hero (PA-P5). */
export function PortalSealLine({
  copy = DEFAULT_PORTAL_EDITORIAL_COPY,
  showSeal = true,
  className,
}: PortalSealLineProps) {
  const sealText = resolvePortalSealText(copy);

  if (!showSeal || sealText.length === 0) {
    return null;
  }

  return (
    <div
      className={cn("portal-seal-line", className)}
      aria-hidden="true"
      data-portal-seal-line=""
    >
      <ShieldCheckIcon
        className="portal-seal-line__icon"
        aria-hidden="true"
      />

      <span className="portal-seal-line__text">{sealText}</span>
    </div>
  );
}
