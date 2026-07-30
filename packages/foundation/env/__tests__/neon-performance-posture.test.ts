/**
 * @afenda/env
 * Contract: ENV-NEON-PERFORMANCE-TESTS
 * Protected: changes require local pre-edit token and compatibility checks.
 */

import { describe, expect, it } from "vitest";

import { APPROVED_NEON_BRANCH_ID } from "../src/neon-contract";
import {
	evaluateComputeAutoscaling,
	evaluateConnectionPressure,
	evaluateEndpointPoolerHost,
	evaluateSelect1Latency,
	formatNeonPerformanceIssues,
	MAX_CONNECTION_USAGE_PERCENT,
	MAX_SELECT1_LATENCY_MS,
	PERFORMANCE_PROD_BRANCH_ID,
	resolvePooledHostEvidence,
	selectBranchReadWriteEndpoint,
	TARGET_AUTOSCALING_MAX_CU,
	TARGET_AUTOSCALING_MIN_CU,
	TARGET_SUSPEND_TIMEOUT_SECONDS,
} from "../src/neon-performance-posture";

const MATCHING_ENDPOINT = {
	id: "ep-rw",
	branch_id: PERFORMANCE_PROD_BRANCH_ID,
	type: "read_write",
	autoscaling_limit_min_cu: TARGET_AUTOSCALING_MIN_CU,
	autoscaling_limit_max_cu: TARGET_AUTOSCALING_MAX_CU,
	suspend_timeout_seconds: TARGET_SUSPEND_TIMEOUT_SECONDS,
	hosts: {
		read_write_pooled_host: "EP-X-POOLER.example.neon.tech.",
	},
} as const;

describe("@afenda/env neon-performance-posture", () => {
	it("keeps performance branch id aligned with N1 contract", () => {
		expect(PERFORMANCE_PROD_BRANCH_ID).toBe(APPROVED_NEON_BRANCH_ID);
	});

	it("exports Living CU / suspend / latency guardrail targets", () => {
		expect(TARGET_AUTOSCALING_MIN_CU).toBe(0.25);
		expect(TARGET_AUTOSCALING_MAX_CU).toBe(2);
		expect(TARGET_SUSPEND_TIMEOUT_SECONDS).toBe(0);
		expect(MAX_SELECT1_LATENCY_MS).toBe(5000);
		expect(MAX_CONNECTION_USAGE_PERCENT).toBe(80);
	});

	it("requires explicit pooled host evidence without printing hosts", () => {
		expect(resolvePooledHostEvidence(MATCHING_ENDPOINT)).toBe(
			"ep-x-pooler.example.neon.tech",
		);
		expect(evaluateEndpointPoolerHost(MATCHING_ENDPOINT).ok).toBe(true);
		expect(
			evaluateEndpointPoolerHost({
				...MATCHING_ENDPOINT,
				hosts: {
					read_write_pooled_host: "example-pooler.invalid",
				},
			}).ok,
		).toBe(true);
		expect(
			evaluateEndpointPoolerHost({
				...MATCHING_ENDPOINT,
				hosts: {
					read_write_pooled_host: "pooler.example.com",
				},
			}).ok,
		).toBe(false);
		expect(
			evaluateEndpointPoolerHost({
				...MATCHING_ENDPOINT,
				hosts: {
					read_write_pooled_host: "ep-x.example.neon.tech",
				},
			}).ok,
		).toBe(false);
		expect(
			evaluateEndpointPoolerHost({
				...MATCHING_ENDPOINT,
				hosts: null,
			}).ok,
		).toBe(false);
		expect(
			evaluateEndpointPoolerHost({
				...MATCHING_ENDPOINT,
				hosts: { read_write_pooled_host: "" },
			}).ok,
		).toBe(false);
		expect(
			evaluateEndpointPoolerHost({
				...MATCHING_ENDPOINT,
				host: "ep-x.example.neon.tech",
				hosts: null,
			}).ok,
		).toBe(false);
		expect(
			evaluateEndpointPoolerHost({
				...MATCHING_ENDPOINT,
				host: "ep-x-pooler.example.neon.tech",
				hosts: null,
			}).ok,
		).toBe(false);
		expect(evaluateEndpointPoolerHost(MATCHING_ENDPOINT).detail).not.toMatch(
			/ep-x/i,
		);
	});

	it("selects exactly one branch read_write endpoint", () => {
		const selected = selectBranchReadWriteEndpoint([
			{
				id: "ep-ro",
				branch_id: PERFORMANCE_PROD_BRANCH_ID,
				type: "read_only",
			},
			MATCHING_ENDPOINT,
			{
				id: "ep-other",
				branch_id: "br-other",
				type: "read_write",
			},
			{
				id: "ep-missing-type",
				branch_id: PERFORMANCE_PROD_BRANCH_ID,
			},
		]);
		expect(selected.ok).toBe(true);
		if (selected.ok) {
			expect(selected.endpoint.id).toBe("ep-rw");
		}
		expect(selectBranchReadWriteEndpoint([]).ok).toBe(false);
		expect(
			selectBranchReadWriteEndpoint([
				{ ...MATCHING_ENDPOINT, branch_id: "br-x" },
			]).ok,
		).toBe(false);
		expect(
			selectBranchReadWriteEndpoint([
				MATCHING_ENDPOINT,
				{ ...MATCHING_ENDPOINT, id: "ep-rw-2" },
			]).ok,
		).toBe(false);
		expect(selectBranchReadWriteEndpoint([], "").issues[0]?.check).toBe(
			"expected_branch_id",
		);
	});

	it("evaluates compute posture strictly", () => {
		const matching = evaluateComputeAutoscaling(MATCHING_ENDPOINT);
		expect(matching.ok).toBe(true);
		expect(matching.detail).toContain("branch_match=true");
		expect(matching.detail).not.toContain("endpoint=");
		expect(matching.detail).not.toContain("ep-rw");
		expect(matching.detail).not.toContain(PERFORMANCE_PROD_BRANCH_ID);
		expect(
			evaluateComputeAutoscaling({ ...MATCHING_ENDPOINT, type: undefined }).ok,
		).toBe(false);
		expect(
			evaluateComputeAutoscaling({ ...MATCHING_ENDPOINT, branch_id: "br-x" })
				.ok,
		).toBe(false);
		expect(
			evaluateComputeAutoscaling({
				...MATCHING_ENDPOINT,
				autoscaling_limit_min_cu: 0.5,
			}).ok,
		).toBe(false);
		expect(
			evaluateComputeAutoscaling({
				...MATCHING_ENDPOINT,
				autoscaling_limit_max_cu: 4,
			}).ok,
		).toBe(false);
		expect(
			evaluateComputeAutoscaling({
				...MATCHING_ENDPOINT,
				suspend_timeout_seconds: 300,
			}).ok,
		).toBe(false);
		expect(
			evaluateComputeAutoscaling(MATCHING_ENDPOINT, { expectedBranchId: "" })
				.ok,
		).toBe(false);
	});

	it("evaluates select-1 latency guardrails", () => {
		expect(evaluateSelect1Latency(MAX_SELECT1_LATENCY_MS).ok).toBe(true);
		expect(evaluateSelect1Latency(null).ok).toBe(false);
		expect(evaluateSelect1Latency(Number.NaN).ok).toBe(false);
		expect(evaluateSelect1Latency(Number.POSITIVE_INFINITY).ok).toBe(false);
		expect(evaluateSelect1Latency(-1).ok).toBe(false);
		expect(evaluateSelect1Latency(1, { maxMs: 0 }).ok).toBe(false);
		expect(evaluateSelect1Latency(MAX_SELECT1_LATENCY_MS + 1).ok).toBe(false);
	});

	it("evaluates aggregate connection pressure", () => {
		expect(
			evaluateConnectionPressure({
				maxConnections: 100,
				activeConnections: 10,
				idleConnections: 20,
			}).ok,
		).toBe(true);
		expect(
			evaluateConnectionPressure({
				maxConnections: 100,
				activeConnections: 60,
				idleConnections: 20,
			}).ok,
		).toBe(false);
		expect(
			evaluateConnectionPressure({
				maxConnections: 100,
				activeConnections: 101,
				idleConnections: 0,
			}).issues[0]?.check,
		).toBe("connections.snapshot_consistency");
		expect(
			evaluateConnectionPressure({
				maxConnections: 0,
				activeConnections: 0,
				idleConnections: 0,
			}).ok,
		).toBe(false);
		expect(
			evaluateConnectionPressure({
				maxConnections: 100.5,
				activeConnections: 0,
				idleConnections: 0,
			}).ok,
		).toBe(false);
		expect(
			evaluateConnectionPressure({
				maxConnections: 100,
				activeConnections: -1,
				idleConnections: 0,
			}).ok,
		).toBe(false);
		expect(
			evaluateConnectionPressure({
				maxConnections: 100,
				activeConnections: null,
				idleConnections: 0,
			}).ok,
		).toBe(false);
		expect(
			evaluateConnectionPressure(
				{ maxConnections: 100, activeConnections: 1, idleConnections: 0 },
				{ maxUsagePercent: 101 },
			).ok,
		).toBe(false);
	});

	it("formats performance issues without secret-bearing values", () => {
		expect(
			formatNeonPerformanceIssues([
				{ check: "endpoint.selection", message: "no read_write endpoint" },
			]),
		).toBe("endpoint.selection: no read_write endpoint");
	});
});
