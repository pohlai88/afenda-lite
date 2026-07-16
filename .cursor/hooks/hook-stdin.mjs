/**
 * Timed stdin JSON reader for Cursor hooks.
 *
 * `readFileSync(0)` waits for EOF forever. When Cursor leaves stdin open after
 * the payload (or runs hooks with an empty open pipe), failClosed hooks return
 * no JSON and the edit is denied.
 *
 * Strategy: finish on end, idle quiet after last chunk, firstByte timeout, maxMs.
 */

/**
 * @param {{ idleMs?: number, maxMs?: number, firstByteMs?: number }} [options]
 * @returns {Promise<Record<string, unknown>>}
 */
export async function readHookPayload(options = {}) {
	const idleMs = options.idleMs ?? 50;
	const maxMs = options.maxMs ?? 3000;
	const firstByteMs = options.firstByteMs ?? 250;

	const raw = await readStdinRaw({ idleMs, maxMs, firstByteMs });
	const trimmed = raw.trim();
	if (!trimmed) {
		return {};
	}
	try {
		const parsed = JSON.parse(trimmed);
		return parsed && typeof parsed === "object"
			? /** @type {Record<string, unknown>} */ (parsed)
			: {};
	} catch {
		return {};
	}
}

/**
 * @param {{ idleMs: number, maxMs: number, firstByteMs: number }} options
 * @returns {Promise<string>}
 */
function readStdinRaw(options) {
	const { idleMs, maxMs, firstByteMs } = options;
	const { stdin } = process;

	return new Promise((resolve) => {
		if (stdin.destroyed || stdin.readableEnded) {
			resolve("");
			return;
		}

		if (stdin.isTTY) {
			resolve("");
			return;
		}

		let data = "";
		let gotData = false;
		let settled = false;
		/** @type {ReturnType<typeof setTimeout> | undefined} */
		let idleTimer;
		/** @type {ReturnType<typeof setTimeout> | undefined} */
		let maxTimer;
		/** @type {ReturnType<typeof setTimeout> | undefined} */
		let firstByteTimer;

		const finish = () => {
			if (settled) {
				return;
			}
			settled = true;
			if (idleTimer !== undefined) clearTimeout(idleTimer);
			if (maxTimer !== undefined) clearTimeout(maxTimer);
			if (firstByteTimer !== undefined) clearTimeout(firstByteTimer);
			stdin.off("data", onData);
			stdin.off("end", onEnd);
			stdin.off("error", onError);
			try {
				stdin.pause();
			} catch {
				/* ignore */
			}
			resolve(data);
		};

		const onData = (chunk) => {
			gotData = true;
			if (firstByteTimer !== undefined) {
				clearTimeout(firstByteTimer);
				firstByteTimer = undefined;
			}
			data += typeof chunk === "string" ? chunk : String(chunk);
			if (idleTimer !== undefined) clearTimeout(idleTimer);
			idleTimer = setTimeout(finish, idleMs);
		};

		const onEnd = () => finish();
		const onError = () => finish();

		firstByteTimer = setTimeout(() => {
			if (!gotData) finish();
		}, firstByteMs);
		maxTimer = setTimeout(finish, maxMs);

		stdin.setEncoding("utf8");
		stdin.on("data", onData);
		stdin.on("end", onEnd);
		stdin.on("error", onError);
		stdin.resume();
	});
}
