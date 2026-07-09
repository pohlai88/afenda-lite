import type { GuardianAssetSet, GuardianMode, GuardianState } from "./types";
import {
  BRAND_DRAMATIC_OWL_BACKGROUND_HEIGHT,
  BRAND_DRAMATIC_OWL_BACKGROUND_WIDTH,
} from "@/lib/copy/portal-brand";

type Props = {
  mode: GuardianMode;
  state: GuardianState;
  assets: GuardianAssetSet;
};

/**
 * Owl scene owns all owl PNG layers.
 * Production morpho: one hero iso + one night fade-ghost (same PNG, offset CSS echo).
 */
export function OwlScene({ mode, state, assets }: Props) {
  const owlSrc = assets.owlNight;
  const nightGhostSrc = assets.owlNightGhost ?? assets.owlNight;

  return (
    <div className="owl-scene" data-mode={mode} data-state={state} aria-hidden="true">
      <div className="owl-scene__atmosphere owl-scene__atmosphere--day" />
      <div className="owl-scene__atmosphere owl-scene__atmosphere--night" />

      {/* Fade ghost behind hero — night only; offset larger than hero so it reads as depth */}
      <img
        className="owl-scene__ghost owl-scene__ghost--night owl-scene__ghost--morpho"
        src={nightGhostSrc}
        alt=""
        width={BRAND_DRAMATIC_OWL_BACKGROUND_WIDTH}
        height={BRAND_DRAMATIC_OWL_BACKGROUND_HEIGHT}
        draggable={false}
      />

      <img
        className="owl-scene__owl owl-scene__owl--morpho"
        src={owlSrc}
        alt=""
        width={BRAND_DRAMATIC_OWL_BACKGROUND_WIDTH}
        height={BRAND_DRAMATIC_OWL_BACKGROUND_HEIGHT}
        draggable={false}
      />

      {assets.owlDayGhost && (
        <img
          className="owl-scene__ghost owl-scene__ghost--day"
          src={assets.owlDayGhost}
          alt=""
          width={BRAND_DRAMATIC_OWL_BACKGROUND_WIDTH}
          height={BRAND_DRAMATIC_OWL_BACKGROUND_HEIGHT}
          draggable={false}
        />
      )}

      <div className="owl-scene__geometry owl-scene__geometry--outer" />
      <div className="owl-scene__geometry owl-scene__geometry--inner" />
      <div className="owl-scene__particles" />
      <div className="owl-scene__vignette" />
      {/* Paper / film grain — rides above atmosphere; does not fight Fade Owl plate exchange */}
      <div className="owl-scene__grain" />
    </div>
  );
}
