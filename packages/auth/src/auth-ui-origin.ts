import { headers } from "next/headers";

import { requireAppOrigin } from "./join-paths";

/**
 * Origin for Neon Auth UI `baseURL` (password-reset / callback links).
 * Prefer the live request host so localhost/preview resets are not forced to
 * production `APP_URL` (portal Neon Auth password-reset wiring).
 * Invite emails still use `requireAppOrigin()` / `buildInviteJoinUrl` — never this helper.
 */
export async function resolveAuthUiOrigin(): Promise<string> {
	const h = await headers();
	const host = firstHeaderValue(h.get("x-forwarded-host") ?? h.get("host"));
	const proto = firstHeaderValue(h.get("x-forwarded-proto")) ?? "https";

	if (host) {
		return `${proto}://${host}`;
	}

	return requireAppOrigin();
}

function firstHeaderValue(value: string | null): string | undefined {
	if (!value) {
		return undefined;
	}
	const first = value.split(",")[0]?.trim();
	return first && first.length > 0 ? first : undefined;
}
