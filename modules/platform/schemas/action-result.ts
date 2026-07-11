/**
 * Shared Server Action result contract (doc/api/03-error-contract.md).
 * Prefer return ActionResult for expected failures; throw only for unexpected bugs.
 */

export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; code: string; message: string; details?: unknown };

export function actionOk<T>(data: T): ActionResult<T> {
  return { ok: true, data };
}

export function actionFail<T = never>(
  code: string,
  message: string,
  details?: unknown,
): ActionResult<T> {
  return details === undefined
    ? { ok: false, code, message }
    : { ok: false, code, message, details };
}
