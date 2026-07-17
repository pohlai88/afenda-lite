/**
 * User-facing error copy for Next.js error boundaries (GUIDE-017 · N12).
 * Never pass `Error.message`, stack traces, or package internals to the UI.
 */

export const GLOBAL_ERROR_PUBLIC_MESSAGE =
	"Unexpected application error. Try again or contact an admin." as const;

/**
 * Prefer the segment fallback. Returns that string unchanged so callers cannot
 * accidentally substitute `error.message` at the call site.
 */
export function publicErrorCopy(fallbackMessage: string): string {
	const trimmed = fallbackMessage.trim();
	return trimmed.length > 0 ? trimmed : GLOBAL_ERROR_PUBLIC_MESSAGE;
}
