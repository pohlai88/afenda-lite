import type { GuardianAssetSet, GuardianMode, GuardianState } from "./types";
import {
  BRAND_DRAMATIC_OWL_BACKGROUND_HEIGHT,
  BRAND_DRAMATIC_OWL_BACKGROUND_WIDTH,
} from "@/lib/portal-brand";

type Props = {
  mode: GuardianMode;
  state: GuardianState;
  assets: GuardianAssetSet;
};

export function OwlScene({ mode, state, assets }: Props) {
  const owlSrc = assets.owlNight;

  return (
    <div className="owl-scene" data-mode={mode} data-state={state} aria-hidden="true">
      <div className="owl-scene__atmosphere owl-scene__atmosphere--day" />
      <div className="owl-scene__atmosphere owl-scene__atmosphere--night" />

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
          draggable={false}
        />
      )}

      {assets.owlNightGhost && (
        <img
          className="owl-scene__ghost owl-scene__ghost--night"
          src={assets.owlNightGhost}
          alt=""
          draggable={false}
        />
      )}

      <div className="owl-scene__geometry owl-scene__geometry--outer" />
      <div className="owl-scene__geometry owl-scene__geometry--inner" />
      <div className="owl-scene__particles" />
      <div className="owl-scene__vignette" />
    </div>
  );
}
