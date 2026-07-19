/**
 * Operator URL constants (Target under `app/(operator)/admin`).
 * Coarse shell gate: `requireRole('operator')` on the route-group layout (ARCH-022).
 *
 * `/admin` is the operator post-login home; the governed `@afenda/auth`
 * resolver (`OPERATOR_HOME_PATH`) is the SSOT. A drift-guard test pins this
 * constant to that resolver value so the landing path cannot diverge.
 */

export const OPERATOR_ADMIN_PATH = "/admin";

export const OPERATOR_SHELL_PATHS = [OPERATOR_ADMIN_PATH] as const;
