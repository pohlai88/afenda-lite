/**
 * Allowlisted screen ids that can mount a real RSC composition when shape is live.
 * Not a second product inventory — shape map is SSOT for actual condition.
 */

export const PLAYGROUND_STATIC_COMPOSITION_IDS = [
  "admin-dashboard",
  "admin-clients",
  "admin-users-list",
  "admin-users-view",
  "admin-survey-detail",
  "dynamic-dashboard-id",
  "client-home-login",
] as const;

export type PlaygroundStaticCompositionId =
  (typeof PLAYGROUND_STATIC_COMPOSITION_IDS)[number];

export function isPlaygroundStaticCompositionId(
  screenId: string,
): screenId is PlaygroundStaticCompositionId {
  return (PLAYGROUND_STATIC_COMPOSITION_IDS as readonly string[]).includes(
    screenId,
  );
}
