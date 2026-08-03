/**
 * @afenda/env
 * Contract: ENV-NEON-IDENTITY
 * Protected: changes require local pre-edit token and compatibility checks.
 *
 * Canonical Neon Cloud infrastructure identity — the single semantic owner.
 *
 * Every module that needs the approved organization, project, or branch
 * imports it from here. Posture modules must not restate these literals: a
 * derived value makes contradictory authorities unrepresentable, whereas an
 * equality test only detects drift after it has been written.
 *
 * This module has no imports and reads no environment. It is safe to load from
 * any entrypoint, evaluator, or operational script.
 */

/** Afenda-Lite Neon Cloud organization. */
export const APPROVED_NEON_ORG_ID = "org-fragrant-lake-90358173" as const;

/** Afenda-Lite Neon Cloud project. */
export const APPROVED_NEON_PROJECT_ID = "young-hat-54755363" as const;

/** Single production branch — see the branch policy in AGENTS.md. */
export const APPROVED_NEON_BRANCH_ID = "br-tiny-hill-ao82jp6f" as const;
