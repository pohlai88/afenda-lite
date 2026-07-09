import Image from "next/image";
import {
  BRAND_DRAMATIC_OWL_BACKGROUND_PATH,
  BRAND_SHARP_OWL_DARK_PATH,
  BRAND_SHARP_OWL_LIGHT_PATH,
  type PortalGuardianOwlPreset,
} from "@/lib/copy/portal-brand";
import type { PortalAtmosphereTheme } from "./contracts/portal-theme.contract";
import { cn } from "@/lib/utils";

export interface PortalGuardianOwlProps {
  /** PA-P10 adapter may disable the decorative owl without removing the layer slot. */
  readonly showOwl?: boolean;
  /** Dramatic painterly (legacy) vs sharp photoreal guardian from auth-hero-dual. */
  readonly preset?: PortalGuardianOwlPreset;
  /**
   * When set, only the matching sharp variant mounts (production auth).
   * Omit in Storybook so CSS can swap dark/light without remounting.
   */
  readonly theme?: PortalAtmosphereTheme;
}

/**
 * PA-P3 guardian owl — decorative z-2 layer only.
 * Entire subtree is aria-hidden with empty alt (PA-P9).
 */
export function PortalGuardianOwl({
  showOwl = true,
  preset = "sharp",
  theme,
}: PortalGuardianOwlProps) {
  if (!showOwl) {
    return null;
  }

  const isSharp = preset === "sharp";

  return (
    <div
      aria-hidden="true"
      className={cn(
        "portal-guardian-owl",
        isSharp && "portal-guardian-owl--sharp",
      )}
      data-portal-guardian-owl=""
      data-portal-guardian-owl-preset={preset}
    >
      <div aria-hidden="true" className="portal-guardian-owl__frame">
        {isSharp ? (
          theme ? (
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
              sizes="(max-width: 768px) 92vw, 42vw"
              src={
                theme === "dark"
                  ? BRAND_SHARP_OWL_DARK_PATH
                  : BRAND_SHARP_OWL_LIGHT_PATH
              }
            />
          ) : (
            <>
              <Image
                alt=""
                aria-hidden="true"
                className="portal-guardian-owl__image portal-guardian-owl__image--dark"
                data-portal-guardian-owl-theme="dark"
                draggable={false}
                fill
                sizes="(max-width: 768px) 92vw, 42vw"
                src={BRAND_SHARP_OWL_DARK_PATH}
              />
              <Image
                alt=""
                aria-hidden="true"
                className="portal-guardian-owl__image portal-guardian-owl__image--light"
                data-portal-guardian-owl-theme="light"
                draggable={false}
                fill
                sizes="(max-width: 768px) 92vw, 42vw"
                src={BRAND_SHARP_OWL_LIGHT_PATH}
              />
            </>
          )
        ) : (
          <Image
            alt=""
            aria-hidden="true"
            className="portal-guardian-owl__image"
            draggable={false}
            fill
            sizes="(max-width: 768px) 120vw, 58vw"
            src={BRAND_DRAMATIC_OWL_BACKGROUND_PATH}
          />
        )}
      </div>
    </div>
  );
}
