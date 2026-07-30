/**
 * @afenda/env
 * Contract: ENV-NEON-PERFORMANCE
 * Protected: changes require local pre-edit token and compatibility checks.
 *
 * Neon DB performance posture targets and read-only API evaluation (N4).
 *
 * Living authority: ARCH-023 · RB-001 · ARCH-025.
 *
 * This module evaluates evidence only. It does not change compute size,
 * autoscaling, suspend behavior, connection limits, retention, or schema.
 *
 * The production branch ID mirrors `APPROVED_NEON_BRANCH_ID` from
 * `neon-contract.ts`. It remains local so `validate:neon-env` can load this
 * module without nested ESM resolution.
 */

/** Must equal `APPROVED_NEON_BRANCH_ID`; enforced by package tests. */
export const PERFORMANCE_PROD_BRANCH_ID = "br-tiny-hill-ao82jp6f" as const;
const TRAILING_DOT_PATTERN = /\.$/;

/** Autoscaling minimum CU. Raise only with measured evidence. */
export const TARGET_AUTOSCALING_MIN_CU = 0.25 as const;

/** Autoscaling maximum CU for bounded spike headroom. */
export const TARGET_AUTOSCALING_MAX_CU = 2 as const;

/** User-facing production must not scale to zero. */
export const TARGET_SUSPEND_TIMEOUT_SECONDS = 0 as const;

/**
 * Maximum acceptable latency for a single `SELECT 1` validation probe.
 *
 * This is a deployment guardrail, not a workload SLA or soak-test result.
 */
export const MAX_SELECT1_LATENCY_MS = 5000 as const;

/**
 * Connection-pressure guardrail as a percentage of `max_connections`.
 *
 * The check fails when usage meets or exceeds this threshold.
 */
export const MAX_CONNECTION_USAGE_PERCENT = 80 as const;

export type NeonPerformanceIssue = Readonly<{
	check: string;
	message: string;
}>;

export type NeonPerformanceCheckResult = Readonly<{
	ok: boolean;
	issues: readonly NeonPerformanceIssue[];
	detail: string;
}>;

export type NeonEndpointComputeInput = Readonly<{
	id?: string | null;
	branch_id?: string | null;
	type?: string | null;
	autoscaling_limit_min_cu?: number | null;
	autoscaling_limit_max_cu?: number | null;
	suspend_timeout_seconds?: number | null;
	/** Direct compute hostname returned by Neon. Never returned in details. */
	host?: string | null;
	/** Explicit pooled hostname evidence returned by Neon. */
	hosts?: Readonly<{
		read_write_pooled_host?: string | null;
	}> | null;
}>;

export function formatNeonPerformanceIssues(
	issues: readonly NeonPerformanceIssue[],
): string {
	return issues.map((issue) => `${issue.check}: ${issue.message}`).join("; ");
}

function normalizeHostname(hostname: string): string {
	return hostname.trim().toLowerCase().replace(TRAILING_DOT_PATTERN, "");
}

function isPoolerHostname(hostname: string): boolean {
	const normalized = normalizeHostname(hostname);
	return normalized.split(".").some((label) => label.endsWith("-pooler"));
}

function isFiniteNonNegativeNumber(
	value: number | null | undefined,
): value is number {
	return (
		value !== null &&
		value !== undefined &&
		Number.isFinite(value) &&
		value >= 0
	);
}

function isFinitePositiveNumber(
	value: number | null | undefined,
): value is number {
	return (
		value !== null && value !== undefined && Number.isFinite(value) && value > 0
	);
}

function isNonNegativeInteger(
	value: number | null | undefined,
): value is number {
	return isFiniteNonNegativeNumber(value) && Number.isInteger(value);
}

function cuEqual(actual: number | null | undefined, expected: number): boolean {
	if (
		!(isFiniteNonNegativeNumber(actual) && isFiniteNonNegativeNumber(expected))
	) {
		return false;
	}
	return Math.abs(actual - expected) < 1e-9;
}

/**
 * Return explicit pooled-host evidence supplied by Neon.
 *
 * This intentionally does not derive a pooled hostname from a direct host.
 */
export function resolvePooledHostEvidence(
	endpoint: NeonEndpointComputeInput,
): string | null {
	const pooledHost = endpoint.hosts?.read_write_pooled_host;
	if (
		pooledHost === null ||
		pooledHost === undefined ||
		pooledHost.trim().length === 0
	) {
		return null;
	}
	return normalizeHostname(pooledHost);
}

export function evaluateComputeAutoscaling(
	endpoint: NeonEndpointComputeInput,
	options: Readonly<{ expectedBranchId?: string }> = {},
): NeonPerformanceCheckResult {
	const expectedBranchId =
		options.expectedBranchId ?? PERFORMANCE_PROD_BRANCH_ID;
	const issues: NeonPerformanceIssue[] = [];

	if (expectedBranchId.trim().length === 0) {
		issues.push({
			check: "expected_branch_id",
			message: "expected branch ID must not be empty",
		});
	}
	if (endpoint.branch_id !== expectedBranchId) {
		issues.push({
			check: "endpoint.branch_id",
			message: `expected ${expectedBranchId}, got ${String(endpoint.branch_id)}`,
		});
	}
	if (endpoint.type !== "read_write") {
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

	const detail =
		`branch_match=${String(endpoint.branch_id === expectedBranchId)} ` +
		`type=${endpoint.type ?? "unknown"} ` +
		`min_cu=${String(endpoint.autoscaling_limit_min_cu)} ` +
		`max_cu=${String(endpoint.autoscaling_limit_max_cu)} ` +
		`suspend_s=${String(endpoint.suspend_timeout_seconds)}`;

	return { ok: issues.length === 0, issues, detail };
}

/**
 * Confirm that Neon explicitly exposes a pooled read-write hostname.
 *
 * The hostname itself is never returned in result detail.
 */
export function evaluateEndpointPoolerHost(
	endpoint: NeonEndpointComputeInput,
): NeonPerformanceCheckResult {
	const pooledHost = resolvePooledHostEvidence(endpoint);
	if (pooledHost !== null && isPoolerHostname(pooledHost)) {
		return {
			ok: true,
			issues: [],
			detail:
				"explicit pooled read-write host evidence present (hostname redacted)",
		};
	}
	return {
		ok: false,
		issues: [
			{
				check: "hosts.read_write_pooled_host",
				message:
					"expected explicit Neon pooled read-write host evidence with a hostname label ending in '-pooler'",
			},
		],
		detail: "explicit pooled read-write host evidence is missing or invalid",
	};
}

export type BranchReadWriteEndpointSelection =
	| Readonly<{
			ok: true;
			endpoint: NeonEndpointComputeInput;
			issues: readonly [];
	  }>
	| Readonly<{
			ok: false;
			endpoint: null;
			issues: readonly NeonPerformanceIssue[];
	  }>;

export function selectBranchReadWriteEndpoint(
	endpoints: readonly NeonEndpointComputeInput[],
	expectedBranchId: string = PERFORMANCE_PROD_BRANCH_ID,
): BranchReadWriteEndpointSelection {
	if (expectedBranchId.trim().length === 0) {
		return {
			ok: false,
			endpoint: null,
			issues: [
				{
					check: "expected_branch_id",
					message: "expected branch ID must not be empty",
				},
			],
		};
	}

	const matches = endpoints.filter(
		(endpoint) =>
			endpoint.branch_id === expectedBranchId && endpoint.type === "read_write",
	);
	if (matches.length === 0) {
		return {
			ok: false,
			endpoint: null,
			issues: [
				{
					check: "endpoint.selection",
					message: `no read_write endpoint found for branch ${expectedBranchId}`,
				},
			],
		};
	}
	if (matches.length > 1) {
		return {
			ok: false,
			endpoint: null,
			issues: [
				{
					check: "endpoint.selection",
					message: `expected exactly one read_write endpoint for branch ${expectedBranchId}, found ${matches.length}`,
				},
			],
		};
	}

	const [selectedEndpoint] = matches;
	if (selectedEndpoint === undefined) {
		return {
			ok: false,
			endpoint: null,
			issues: [
				{
					check: "endpoint.selection",
					message: "endpoint selection produced no result",
				},
			],
		};
	}
	return { ok: true, endpoint: selectedEndpoint, issues: [] };
}

export function evaluateSelect1Latency(
	latencyMs: number | null | undefined,
	options: Readonly<{ maxMs?: number }> = {},
): NeonPerformanceCheckResult {
	const maxMs = options.maxMs ?? MAX_SELECT1_LATENCY_MS;
	if (!isFinitePositiveNumber(maxMs)) {
		return {
			ok: false,
			issues: [
				{
					check: "select1.max_latency_ms",
					message:
						"maximum latency threshold must be a finite number greater than zero",
				},
			],
			detail: "latency threshold invalid",
		};
	}
	if (!isFiniteNonNegativeNumber(latencyMs)) {
		return {
			ok: false,
			issues: [
				{
					check: "select1.latency_ms",
					message: "probe result is missing, non-finite, or negative",
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
			detail: `latencyMs=${Math.round(latencyMs)} thresholdMs=${maxMs} status=above_guardrail`,
		};
	}
	return {
		ok: true,
		issues: [],
		detail: `latencyMs=${Math.round(latencyMs)} thresholdMs=${maxMs} probe=single_select_1`,
	};
}

export type NeonConnectionPressureInput = Readonly<{
	maxConnections?: number | null;
	activeConnections?: number | null;
	idleConnections?: number | null;
}>;

export function evaluateConnectionPressure(
	input: NeonConnectionPressureInput,
	options: Readonly<{ maxUsagePercent?: number }> = {},
): NeonPerformanceCheckResult {
	const maxUsagePercent =
		options.maxUsagePercent ?? MAX_CONNECTION_USAGE_PERCENT;
	if (
		!Number.isFinite(maxUsagePercent) ||
		maxUsagePercent <= 0 ||
		maxUsagePercent > 100
	) {
		return {
			ok: false,
			issues: [
				{
					check: "connections.max_usage_percent",
					message:
						"usage threshold must be greater than zero and no greater than 100",
				},
			],
			detail: "connection-pressure threshold invalid",
		};
	}

	const { maxConnections, activeConnections, idleConnections } = input;
	if (
		!isNonNegativeInteger(maxConnections) ||
		maxConnections === 0 ||
		!isNonNegativeInteger(activeConnections) ||
		!isNonNegativeInteger(idleConnections)
	) {
		return {
			ok: false,
			issues: [
				{
					check: "connections.pressure",
					message:
						"connection snapshot must contain positive max_connections and non-negative integer active and idle counts",
				},
			],
			detail: "connection pressure unavailable",
		};
	}

	const used = activeConnections + idleConnections;
	const usagePercent = (used / maxConnections) * 100;
	const detail =
		`connections=${used}/${maxConnections} ` +
		`active=${activeConnections} ` +
		`idle=${idleConnections} ` +
		`usage=${usagePercent.toFixed(1)}% ` +
		`threshold=${maxUsagePercent}%`;

	if (used > maxConnections) {
		return {
			ok: false,
			issues: [
				{
					check: "connections.snapshot_consistency",
					message: `observed ${used} active and idle sessions exceeds max_connections=${maxConnections}`,
				},
			],
			detail,
		};
	}
	if (usagePercent >= maxUsagePercent) {
		return {
			ok: false,
			issues: [
				{
					check: "connections.pressure",
					message: `usage ${usagePercent.toFixed(1)}% meets or exceeds the ${maxUsagePercent}% guardrail`,
				},
			],
			detail,
		};
	}

	return { ok: true, issues: [], detail };
}
