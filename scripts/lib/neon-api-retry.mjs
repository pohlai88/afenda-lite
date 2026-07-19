/**
 * Transient Neon API / CLI failure classification + retry helper.
 * Used by validate:neon-env (pre-push) so network blips do not fail the gate.
 */

/** @type {ReadonlySet<number>} */
export const TRANSIENT_NEON_HTTP_STATUSES = new Set([
	408, 429, 500, 502, 503, 504,
]);

const TRANSIENT_MESSAGE_PATTERNS = [
	/could not reach the neon api/i,
	/fetch failed/i,
	/network\s*(error|request failed)?/i,
	/econnreset/i,
	/econnrefused/i,
	/etimedout/i,
	/enotfound/i,
	/socket hang up/i,
	/und_err_connect_timeout/i,
	/und_err_headers_timeout/i,
	/und_err_socket/i,
	/temporarily unavailable/i,
	/gateway timeout/i,
	/bad gateway/i,
	/service unavailable/i,
	/too many requests/i,
	/rate.?limit/i,
];

/**
 * @param {{ message?: string; status?: number }} input
 * @returns {boolean}
 */
export function isTransientNeonFailure(input) {
	const status = input.status;
	if (typeof status === "number" && TRANSIENT_NEON_HTTP_STATUSES.has(status)) {
		return true;
	}
	const message = input.message ?? "";
	if (!message) return false;
	return TRANSIENT_MESSAGE_PATTERNS.some((re) => re.test(message));
}

/**
 * @param {number} ms
 * @returns {Promise<void>}
 */
export function sleep(ms) {
	return new Promise((resolve) => {
		setTimeout(resolve, ms);
	});
}

/**
 * @template T
 * @param {() => Promise<T> | T} operation
 * @param {{
 *   attempts?: number;
 *   baseDelayMs?: number;
 *   isTransient?: (error: unknown) => boolean;
 *   onRetry?: (info: { attempt: number; attempts: number; error: unknown; delayMs: number }) => void;
 * }} [options]
 * @returns {Promise<T>}
 */
export async function withNeonRetries(operation, options = {}) {
	const attempts = options.attempts ?? 4;
	const baseDelayMs = options.baseDelayMs ?? 400;
	const isTransient =
		options.isTransient ??
		((error) => {
			if (error && typeof error === "object") {
				const status =
					"status" in error && typeof error.status === "number"
						? error.status
						: undefined;
				const message =
					error instanceof Error
						? error.message
						: "message" in error && typeof error.message === "string"
							? error.message
							: String(error);
				const stderr =
					"stderr" in error && error.stderr != null ? String(error.stderr) : "";
				return isTransientNeonFailure({
					status,
					message: `${message}\n${stderr}`.trim(),
				});
			}
			return isTransientNeonFailure({ message: String(error) });
		});

	let lastError;
	for (let attempt = 1; attempt <= attempts; attempt += 1) {
		try {
			return await operation();
		} catch (error) {
			lastError = error;
			const retryable = isTransient(error) && attempt < attempts;
			if (!retryable) throw error;
			const delayMs = baseDelayMs * 2 ** (attempt - 1);
			options.onRetry?.({ attempt, attempts, error, delayMs });
			await sleep(delayMs);
		}
	}
	throw lastError;
}
