import { env } from "@afenda/env";
import { headers } from "next/headers";

/**
 * Origin for Neon Auth UI `baseURL` (password-reset / callback links).
 * Prefer the live request host so localhost/preview resets are not forced to
 * production `APP_URL` (portal Neon Auth password-reset wiring).
 */
export async function resolveAuthUiOrigin(): Promise<string> {
	const h = await headers();
	const host = firstHeaderValue(h.get("x-forwarded-host") ?? h.get("host"));
	const proto = firstHeaderValue(h.get("x-forwarded-proto")) ?? "https";

	if (host) {
		return `${proto}://${host}`;
	}

	return new URL(env.APP_URL).origin;
}

function firstHeaderValue(value: string | null): string | undefined {
	if (!value) {
		return undefined;
	}
	const first = value.split(",")[0]?.trim();
	return first && first.length > 0 ? first : undefined;
}
