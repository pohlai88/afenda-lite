import Image from "next/image";
import {
  BRAND_COMP_OWL_DARK_PATH,
  BRAND_COMP_OWL_LIGHT_PATH,
} from "@/lib/copy/portal-brand";
import type { PortalAtmosphereTheme } from "./contracts/portal-theme.contract";
import { cn } from "@/lib/utils";

export interface PortalCompLaptopOwlProps {
  readonly showOwl?: boolean;
  readonly theme: PortalAtmosphereTheme;
}

/**
 * Comp-laptop owl base unit — removebg PNG per theme; atmosphere is CSS-only (PortalCelestialDeco).
 *
 * Storybook / comp-laptop fixture only. Production auth keeps `PortalGuardianOwl preset="sharp"`.
 */
export function PortalCompLaptopOwl({
  showOwl = true,
  theme,
}: PortalCompLaptopOwlProps) {
  if (!showOwl) {
    return null;
  }

  const src =
    theme === "dark" ? BRAND_COMP_OWL_DARK_PATH : BRAND_COMP_OWL_LIGHT_PATH;

  return (
    <div
      aria-hidden="true"
      className={cn("portal-guardian-owl", "portal-guardian-owl--comp-base")}
      data-portal-guardian-owl=""
      data-portal-guardian-owl-preset="comp-base"
    >
      <div aria-hidden="true" className="portal-guardian-owl__frame">
        <Image
          alt=""
          aria-hidden="true"
          className={cn(
            "portal-guardian-owl__image",
            theme === "dark"
              ? "portal-guardian-owl__image--dark"
              : "portal-guardian-owl__image--light",
          )}
          data-portal-guardian-owl-theme={theme}
          draggable={false}
          fill
          priority
          sizes="(min-width: 1024px) 46vw, 92vw"
          src={src}
        />
      </div>
    </div>
  );
}
