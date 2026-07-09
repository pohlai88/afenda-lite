import type { GuardianAssetSet, GuardianMode, GuardianState } from "./types";

type Props = {
  mode: GuardianMode;
  state: GuardianState;
  assets: GuardianAssetSet;
};

export function OwlScene({ mode, state, assets }: Props) {
  return (
    <div className="owl-scene" data-mode={mode} data-state={state} aria-hidden="true">
      <div className="owl-scene__atmosphere owl-scene__atmosphere--day" />
      <div className="owl-scene__atmosphere owl-scene__atmosphere--night" />

      <img
        className="owl-scene__owl"
        src={assets.owlNight}
        alt=""
        draggable={false}
      />

      <div className="owl-scene__geometry owl-scene__geometry--outer" />
      <div className="owl-scene__geometry owl-scene__geometry--inner" />
      <div className="owl-scene__particles" />
      <div className="owl-scene__vignette" />
    </div>
  );
}
