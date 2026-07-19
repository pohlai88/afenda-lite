import { headers } from "next/headers";

/**
 * Truncation limits for privileged audit attribution.
 * Keep numeric parity with `@afenda/admin/audit` MAX_RBAC_AUDIT_* — this module
 * must not import `@afenda/admin` (prelogin Path A reaches here via auth-credentials).
 */
const MAX_ATTRIBUTION_IP_ADDRESS_LENGTH = 128;
const MAX_ATTRIBUTION_USER_AGENT_LENGTH = 512;

export type RequestAttribution = {
	ipAddress: string | undefined;
	userAgent: string | undefined;
};

function truncate(value: string, max: number): string {
	return value.length <= max ? value : value.slice(0, max);
}

/**
 * Best-effort HTTP attribution for privileged audit writes.
 * Prefers `x-forwarded-for` (first hop) then `x-real-ip`.
 */
export async function readRequestAttribution(): Promise<RequestAttribution> {
	const h = await headers();
	const forwarded = h.get("x-forwarded-for");
	const firstForwarded = forwarded?.split(",")[0]?.trim();
	const realIp = h.get("x-real-ip")?.trim();
	const rawIp = firstForwarded || realIp || undefined;
	const rawUa = h.get("user-agent")?.trim() || undefined;

	return {
		ipAddress: rawIp
			? truncate(rawIp, MAX_ATTRIBUTION_IP_ADDRESS_LENGTH)
			: undefined,
		userAgent: rawUa
			? truncate(rawUa, MAX_ATTRIBUTION_USER_AGENT_LENGTH)
			: undefined,
	};
}
