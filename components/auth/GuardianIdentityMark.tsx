import {
  BRAND_MASTER_DARK_PATH,
  BRAND_MASTER_LIGHT_PATH,
} from "@/lib/copy/portal-brand";
import type { GuardianMode } from "./types";

type Props = {
  mode: GuardianMode;
  /** brand header mark vs chamber emblem */
  surface?: "brand" | "emblem";
  className?: string;
};

/**
 * Theme-aware IAM identity mark (`iam-dark` / `iam-light`).
 * Brand/emblem layer only — morpho iso remains the cinematic scene.
 */
export function GuardianIdentityMark({
  mode,
  surface = "brand",
  className,
}: Props) {
  const src = mode === "day" ? BRAND_MASTER_LIGHT_PATH : BRAND_MASTER_DARK_PATH;
  const imgClass =
    surface === "emblem"
      ? "access-vault__emblem-img"
      : "guardian-auth__brand-mark-img";

  return (
    // eslint-disable-next-line @next/next/no-img-element -- brand master PNG; theme swap via mode
    <img
      src={src}
      alt=""
      width={512}
      height={512}
      draggable={false}
      className={className ?? imgClass}
      data-guardian-identity={mode}
      data-guardian-identity-surface={surface}
    />
  );
}
