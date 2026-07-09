export type GuardianMode = "day" | "night";

export type GuardianState =
  | "idle"
  | "typing"
  | "loading"
  | "success"
  | "error"
  | "locked"
  | "warning";

/**
 * Sky-cycle default is readable sentences.
 * Classic stacked lockup remains available for experiments; prod uses sentence.
 */
export type GuardianEditorialVariant = "classic" | "sentence";

export type GuardianCopy = {
  /** Defaults to `"sentence"` for sky-cycle. */
  variant?: GuardianEditorialVariant;
  eyebrow?: string;
  headline: string;
  subheadline?: string;
  proofline?: string;
  /** Legacy classic lockup fields — unused by sky-cycle poster. */
  truth?: string;
  connector?: string;
  protected?: string;
};

/**
 * Guardian Auth facade assets.
 * Production (morpho): `owlDay` / `owlNight` / `owlNightGhost` share `guardian-dramatic-iso.png`.
 * `OwlScene` renders one morpho hero + one night fade-ghost (offset CSS echo).
 */
export type GuardianAssetSet = {
  owlDay: string;
  owlNight: string;
  /** Optional day soft-ghost (reference kit). */
  owlDayGhost?: string;
  /** Night fade-ghost — production wires same morpho PNG; CSS owns opacity/blur/offset. */
  owlNightGhost?: string;
  /** Optional emblem PNG — unused; GuardianShield is CSS-only. */
  shield?: string;
};
