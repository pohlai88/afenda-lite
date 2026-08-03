/**
 * @afenda/env
 * Contract: ENV-EXPORTS-PERFORMANCE
 * Protected: changes require local pre-edit token and compatibility checks.
 *
 * Public entrypoint: `@afenda/env/performance`.
 *
 * Read-only Neon performance posture evaluators for operations tooling. This
 * entrypoint evaluates supplied evidence only — it neither reads the
 * environment nor mutates Neon configuration.
 */

export {
	evaluateComputeAutoscaling,
	evaluateConnectionPressure,
	evaluateEndpointPoolerHost,
	evaluateSelect1Latency,
	formatNeonPerformanceIssues,
	MAX_CONNECTION_USAGE_PERCENT,
	MAX_SELECT1_LATENCY_MS,
	type NeonEndpointComputeInput,
	type NeonPerformanceCheckResult,
	type NeonPerformanceIssue,
	PERFORMANCE_PROD_BRANCH_ID,
	resolvePooledHostEvidence,
	selectBranchReadWriteEndpoint,
	TARGET_AUTOSCALING_MAX_CU,
	TARGET_AUTOSCALING_MIN_CU,
	TARGET_SUSPEND_TIMEOUT_SECONDS,
} from "./neon-performance-posture";
