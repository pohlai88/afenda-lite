export type GuardianMode = "day" | "night";

export type GuardianState =
  | "idle"
  | "typing"
  | "loading"
  | "success"
  | "error"
  | "locked"
  | "warning";

export type GuardianCopy = {
  eyebrow?: string;
  headline: string;
  subheadline?: string;
  proofline?: string;
};

export type GuardianAssetSet = {
  owlDay: string;
  owlNight: string;
  owlDayGhost?: string;
  owlNightGhost?: string;
  shield?: string;
};
