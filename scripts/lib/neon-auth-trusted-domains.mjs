/**
 * Neon Auth trusted-domain helpers for N15 ops scripts (read-only parse/match).
 * No secrets — origins only.
 */

/** @param {string} value */
export function normalizeOrigin(value) {
	const trimmed = String(value ?? "")
		.trim()
		.replace(/\/+$/, "");
	if (!trimmed) {
		return "";
	}
	try {
		const url = new URL(
			trimmed.includes("://") ? trimmed : `https://${trimmed}`,
		);
		const port =
			url.port &&
			!(
				(url.protocol === "https:" && url.port === "443") ||
				(url.protocol === "http:" && url.port === "80")
			)
				? `:${url.port}`
				: "";
		return `${url.protocol}//${url.hostname.toLowerCase()}${port}`;
	} catch {
		return trimmed.toLowerCase().replace(/\/+$/, "");
	}
}

/**
 * @param {unknown} listJson
 * @returns {string[]}
 */
export function extractTrustedOrigins(listJson) {
	const rows = Array.isArray(listJson)
		? listJson
		: Array.isArray(listJson?.domains)
			? listJson.domains
			: Array.isArray(listJson?.data)
				? listJson.data
				: [];
	const origins = [];
	for (const row of rows) {
		const raw =
			typeof row === "string"
				? row
				: (row?.domain ?? row?.origin ?? row?.url ?? "");
		const normalized = normalizeOrigin(raw);
		if (normalized) {
			origins.push(normalized);
		}
	}
	return [...new Set(origins)];
}

/**
 * Exact origin match, or Neon-style host wildcard (`https://*.vercel.app`).
 * @param {string} candidateOrigin
 * @param {string[]} trustedOrigins
 */
export function isOriginTrusted(candidateOrigin, trustedOrigins) {
	const target = normalizeOrigin(candidateOrigin);
	if (!target) {
		return false;
	}
	for (const trusted of trustedOrigins) {
		if (trusted === target) {
			return true;
		}
		if (!trusted.includes("*")) {
			continue;
		}
		try {
			const trustedUrl = new URL(trusted);
			const targetUrl = new URL(target);
			if (trustedUrl.protocol !== targetUrl.protocol) {
				continue;
			}
			const pattern = trustedUrl.hostname
				.replace(/\./g, "\\.")
				.replace(/\*/g, "[^.]+");
			if (new RegExp(`^${pattern}$`, "i").test(targetUrl.hostname)) {
				return true;
			}
		} catch {
			// ignore malformed trusted entries
		}
	}
	return false;
}

/** Local-dev origins required for Neon Auth localhost sign-in. */
export const REQUIRED_LOCAL_ORIGINS = [
	"http://localhost:3000",
	"http://127.0.0.1:3000",
];

/**
 * @param {{ appUrl: string; trustedOrigins: string[] }} input
 */
export function evaluateTrustedDomains({ appUrl, trustedOrigins }) {
	const issues = [];
	const appOrigin = normalizeOrigin(appUrl);
	if (!appOrigin) {
		issues.push({
			code: "APP_URL_MISSING",
			message: "APP_URL missing or invalid — cannot assert trusted domain",
		});
	} else if (!isOriginTrusted(appOrigin, trustedOrigins)) {
		issues.push({
			code: "APP_URL_NOT_TRUSTED",
			message: `production APP_URL origin not in Neon Auth trusted domains: ${appOrigin}`,
		});
	}

	const localOk = REQUIRED_LOCAL_ORIGINS.some((origin) =>
		isOriginTrusted(origin, trustedOrigins),
	);
	if (!localOk) {
		issues.push({
			code: "LOCAL_ORIGIN_NOT_TRUSTED",
			message:
				"local-dev origin missing — add http://localhost:3000 (or http://127.0.0.1:3000) via neon neon-auth domain add",
		});
	}

	return {
		ok: issues.length === 0,
		appOrigin,
		trustedOrigins,
		localOk,
		issues,
		detail: issues.length
			? issues.map((i) => i.message).join("; ")
			: `APP_URL ${appOrigin} trusted · local origin present · ${trustedOrigins.length} domain(s)`,
	};
}
