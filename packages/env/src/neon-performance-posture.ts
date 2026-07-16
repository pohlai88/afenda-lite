/**
 * Neon DB performance posture targets + read-only API evaluation (N4).
 * Living authority: ARCH-023 · RB-001 · ARCH-025.
 * Does not raise CU, change suspend/retention/connection limits, or mutate schema.
 *
 * Branch id mirrors `APPROVED_NEON_BRANCH_ID` in neon-contract (kept local so
 * `validate-neon-env` can strip-types-load this file without nested ESM resolution).
 */

/** Must stay equal to `APPROVED_NEON_BRANCH_ID` (enforced in tests). */
export const PERFORMANCE_PROD_BRANCH_ID = "br-tiny-hill-ao82jp6f" as const;

/** Autoscaling min CU — measure latency before any raise (RB-001 · ARCH-023). */
export const TARGET_AUTOSCALING_MIN_CU = 0.25 as const;

/** Autoscaling max CU — spike headroom; do not raise without evidence. */
export const TARGET_AUTOSCALING_MAX_CU = 2 as const;

/** Scale-to-zero off for user-facing prod (`suspend_timeout_seconds=0`). */
export const TARGET_SUSPEND_TIMEOUT_SECONDS = 0 as const;

/**
 * Single-probe `SELECT 1` latency ceiling for validate:neon-env (ms).
 * Baseline recording only — not a soak/load SLA. Fail closed on probe error;
 * warn-class threshold for unexpected cold-path blowups.
 */
export const MAX_SELECT1_LATENCY_MS = 5_000 as const;

/** Alert when total active + idle sessions consume this share of max_connections. */
export const MAX_CONNECTION_USAGE_PERCENT = 80 as const;

export type NeonPerformanceIssue = {
	check: string;
	message: string;
};

export type NeonPerformanceCheckResult = {
	ok: boolean;
	issues: NeonPerformanceIssue[];
	detail: string;
};

export type NeonEndpointComputeInput = {
	id?: string | null;
	branch_id?: string | null;
	type?: string | null;
	autoscaling_limit_min_cu?: number | null;
	autoscaling_limit_max_cu?: number | null;
	suspend_timeout_seconds?: number | null;
	/** Non-pooled compute host (never logged). */
	host?: string | null;
	/** Pooled hostname when present (Neon Proxy `-pooler` host). */
	hosts?: {
		read_write_pooled_host?: string | null;
	} | null;
};

export function formatNeonPerformanceIssues(
	issues: NeonPerformanceIssue[],
): string {
	return issues.map((issue) => `${issue.check}: ${issue.message}`).join("; ");
}

/**
 * Derive pooled host evidence without requiring a secret-bearing URL.
 * Prefer API `hosts.read_write_pooled_host`; else insert `-pooler` into `host`.
 */
export function resolvePooledHostEvidence(
	endpoint: NeonEndpointComputeInput,
): string | null {
	const fromHosts = endpoint.hosts?.read_write_pooled_host;
	if (fromHosts != null && fromHosts.length > 0) {
		return fromHosts;
	}
	const host = endpoint.host;
	if (host == null || host.length === 0) {
		return null;
	}
	if (host.includes("-pooler")) {
		return host;
	}
	const dot = host.indexOf(".");
	if (dot <= 0) {
		return null;
	}
	return `${host.slice(0, dot)}-pooler${host.slice(dot)}`;
}

function cuEqual(actual: number | null | undefined, expected: number): boolean {
	if (actual == null || Number.isNaN(actual)) {
		return false;
	}
	return Math.abs(actual - expected) < 1e-9;
}

/**
 * Evaluate default read-write endpoint compute posture for the production branch.
 * Does not mutate Neon settings.
 */
export function evaluateComputeAutoscaling(
	endpoint: NeonEndpointComputeInput,
	options: { expectedBranchId?: string } = {},
): NeonPerformanceCheckResult {
	const expectedBranchId =
		options.expectedBranchId ?? PERFORMANCE_PROD_BRANCH_ID;
	const issues: NeonPerformanceIssue[] = [];

	if (endpoint.branch_id !== expectedBranchId) {
		issues.push({
			check: "endpoint.branch_id",
			message: `expected ${expectedBranchId}, got ${String(endpoint.branch_id)}`,
		});
	}

	if (endpoint.type != null && endpoint.type !== "read_write") {
		issues.push({
			check: "endpoint.type",
			message: `expected read_write, got ${String(endpoint.type)}`,
		});
	}

	if (!cuEqual(endpoint.autoscaling_limit_min_cu, TARGET_AUTOSCALING_MIN_CU)) {
		issues.push({
			check: "autoscaling_limit_min_cu",
			message: `expected ${TARGET_AUTOSCALING_MIN_CU}, got ${String(endpoint.autoscaling_limit_min_cu)}`,
		});
	}

	if (!cuEqual(endpoint.autoscaling_limit_max_cu, TARGET_AUTOSCALING_MAX_CU)) {
		issues.push({
			check: "autoscaling_limit_max_cu",
			message: `expected ${TARGET_AUTOSCALING_MAX_CU}, got ${String(endpoint.autoscaling_limit_max_cu)}`,
		});
	}

	if (endpoint.suspend_timeout_seconds !== TARGET_SUSPEND_TIMEOUT_SECONDS) {
		issues.push({
			check: "suspend_timeout_seconds",
			message: `expected ${TARGET_SUSPEND_TIMEOUT_SECONDS}, got ${String(endpoint.suspend_timeout_seconds)}`,
		});
	}

	const detail = `endpoint=${endpoint.id ?? "unknown"} min_cu=${String(endpoint.autoscaling_limit_min_cu)} max_cu=${String(endpoint.autoscaling_limit_max_cu)} suspend_s=${String(endpoint.suspend_timeout_seconds)}`;

	if (issues.length > 0) {
		return { ok: false, issues, detail };
	}
	return { ok: true, issues: [], detail };
}

/**
 * Confirm Neon exposes a pooled host for the endpoint (ops evidence).
 * Product fail-closed pooler remains `DATABASE_URL` containing `-pooler`.
 * Never returns the hostname in `detail` (redaction).
 */
export function evaluateEndpointPoolerHost(
	endpoint: NeonEndpointComputeInput,
): NeonPerformanceCheckResult {
	const pooled = resolvePooledHostEvidence(endpoint);
	if (pooled?.includes("-pooler")) {
		return {
			ok: true,
			issues: [],
			detail: "pooled host evidence present (host redacted)",
		};
	}
	return {
		ok: false,
		issues: [
			{
				check: "hosts.read_write_pooled_host",
				message: "expected pooled host containing -pooler",
			},
		],
		detail: "pooled host missing or not pooler-shaped",
	};
}

/**
 * Pick the default read-write endpoint for a branch from a Neon endpoints list.
 */
export function selectBranchReadWriteEndpoint(
	endpoints: NeonEndpointComputeInput[],
	expectedBranchId: string = PERFORMANCE_PROD_BRANCH_ID,
): NeonEndpointComputeInput | null {
	const forBranch = endpoints.filter(
		(ep) => ep.branch_id === expectedBranchId && ep.type === "read_write",
	);
	return forBranch[0] ?? null;
}

/**
 * Evaluate a single timed SELECT 1 probe (ms). Connection failure → not ok.
 * Values above MAX_SELECT1_LATENCY_MS fail (guardrail, not soak SLA).
 */
export function evaluateSelect1Latency(
	latencyMs: number | null | undefined,
	options: { maxMs?: number } = {},
): NeonPerformanceCheckResult {
	const maxMs = options.maxMs ?? MAX_SELECT1_LATENCY_MS;
	if (latencyMs == null || Number.isNaN(latencyMs) || latencyMs < 0) {
		return {
			ok: false,
			issues: [
				{
					check: "select1.latency_ms",
					message: "probe missing or invalid — cannot record baseline",
				},
			],
			detail: "latency probe unavailable",
		};
	}
	if (latencyMs > maxMs) {
		return {
			ok: false,
			issues: [
				{
					check: "select1.latency_ms",
					message: `probe ${latencyMs}ms exceeds ${maxMs}ms guardrail`,
				},
			],
			detail: `latencyMs=${latencyMs} (above ${maxMs}ms)`,
		};
	}
	return {
		ok: true,
		issues: [],
		detail: `latencyMs=${Math.round(latencyMs)} (single SELECT 1; not a soak)`,
	};
}

/**
 * Evaluate a read-only pg_stat_activity snapshot against max_connections.
 * The monitor records aggregate counts only — never users, queries, or tenants.
 */
export function evaluateConnectionPressure(
	input: {
		maxConnections?: number | null;
		activeConnections?: number | null;
		idleConnections?: number | null;
	},
	options: { maxUsagePercent?: number } = {},
): NeonPerformanceCheckResult {
	const maxUsagePercent =
		options.maxUsagePercent ?? MAX_CONNECTION_USAGE_PERCENT;
	const { maxConnections, activeConnections, idleConnections } = input;
	const values = [maxConnections, activeConnections, idleConnections];

	if (
		values.some(
			(value) =>
				value == null ||
				!Number.isFinite(value) ||
				value < 0 ||
				!Number.isInteger(value),
		) ||
		maxConnections === 0
	) {
		return {
			ok: false,
			issues: [
				{
					check: "connections.pressure",
					message: "connection snapshot missing or invalid",
				},
			],
			detail: "connection pressure unavailable",
		};
	}

	const used = (activeConnections ?? 0) + (idleConnections ?? 0);
	const usagePercent = (used / (maxConnections ?? 1)) * 100;
	const detail = `connections=${used}/${maxConnections} active=${activeConnections} idle=${idleConnections} usage=${usagePercent.toFixed(1)}%`;

	if (usagePercent >= maxUsagePercent) {
		return {
			ok: false,
			issues: [
				{
					check: "connections.pressure",
					message: `usage ${usagePercent.toFixed(1)}% meets or exceeds ${maxUsagePercent}% guardrail`,
				},
			],
			detail,
		};
	}

	return { ok: true, issues: [], detail };
}
