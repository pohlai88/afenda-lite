import { describe, expect, it } from "vitest";

import { APPROVED_NEON_BRANCH_ID } from "../src/neon-contract";
import {
	evaluateComputeAutoscaling,
	evaluateConnectionPressure,
	evaluateEndpointPoolerHost,
	evaluateSelect1Latency,
	MAX_CONNECTION_USAGE_PERCENT,
	MAX_SELECT1_LATENCY_MS,
	PERFORMANCE_PROD_BRANCH_ID,
	selectBranchReadWriteEndpoint,
	TARGET_AUTOSCALING_MAX_CU,
	TARGET_AUTOSCALING_MIN_CU,
	TARGET_SUSPEND_TIMEOUT_SECONDS,
} from "../src/neon-performance-posture";

describe("@afenda/env neon-performance-posture", () => {
	it("keeps performance branch id aligned with N1 contract", () => {
		expect(PERFORMANCE_PROD_BRANCH_ID).toBe(APPROVED_NEON_BRANCH_ID);
	});

	it("exports Living CU / suspend / latency guardrail targets", () => {
		expect(TARGET_AUTOSCALING_MIN_CU).toBe(0.25);
		expect(TARGET_AUTOSCALING_MAX_CU).toBe(2);
		expect(TARGET_SUSPEND_TIMEOUT_SECONDS).toBe(0);
		expect(MAX_SELECT1_LATENCY_MS).toBe(5_000);
		expect(MAX_CONNECTION_USAGE_PERCENT).toBe(80);
	});

	it("passes when endpoint matches 0.25–2 CU and suspend 0", () => {
		expect(
			evaluateComputeAutoscaling({
				id: "ep-test",
				branch_id: PERFORMANCE_PROD_BRANCH_ID,
				type: "read_write",
				autoscaling_limit_min_cu: 0.25,
				autoscaling_limit_max_cu: 2,
				suspend_timeout_seconds: 0,
			}).ok,
		).toBe(true);
	});

	it("fails on CU or suspend drift", () => {
		expect(
			evaluateComputeAutoscaling({
				id: "ep-test",
				branch_id: PERFORMANCE_PROD_BRANCH_ID,
				type: "read_write",
				autoscaling_limit_min_cu: 0.5,
				autoscaling_limit_max_cu: 2,
				suspend_timeout_seconds: 0,
			}).ok,
		).toBe(false);
		expect(
			evaluateComputeAutoscaling({
				id: "ep-test",
				branch_id: PERFORMANCE_PROD_BRANCH_ID,
				type: "read_write",
				autoscaling_limit_min_cu: 0.25,
				autoscaling_limit_max_cu: 4,
				suspend_timeout_seconds: 0,
			}).ok,
		).toBe(false);
		expect(
			evaluateComputeAutoscaling({
				id: "ep-test",
				branch_id: PERFORMANCE_PROD_BRANCH_ID,
				type: "read_write",
				autoscaling_limit_min_cu: 0.25,
				autoscaling_limit_max_cu: 2,
				suspend_timeout_seconds: 300,
			}).ok,
		).toBe(false);
	});

	it("requires pooled host shape without printing hosts", () => {
		expect(
			evaluateEndpointPoolerHost({
				hosts: {
					read_write_pooled_host: "ep-x-pooler.example.neon.tech",
				},
			}).ok,
		).toBe(true);
		expect(
			evaluateEndpointPoolerHost({
				host: "ep-x.example.neon.tech",
			}).ok,
		).toBe(true);
		expect(
			evaluateEndpointPoolerHost({
				hosts: { read_write_pooled_host: "ep-x.example.neon.tech" },
			}).ok,
		).toBe(false);
		const pass = evaluateEndpointPoolerHost({
			hosts: {
				read_write_pooled_host: "ep-secret-pooler.example.neon.tech",
			},
		});
		expect(pass.detail).not.toMatch(/ep-secret/);
	});

	it("selects the branch read_write endpoint", () => {
		const selected = selectBranchReadWriteEndpoint([
			{
				id: "ep-ro",
				branch_id: PERFORMANCE_PROD_BRANCH_ID,
				type: "read_only",
			},
			{
				id: "ep-rw",
				branch_id: PERFORMANCE_PROD_BRANCH_ID,
				type: "read_write",
				autoscaling_limit_min_cu: 0.25,
			},
			{
				id: "ep-other",
				branch_id: "br-other",
				type: "read_write",
			},
		]);
		expect(selected?.id).toBe("ep-rw");
	});

	it("records select-1 latency within guardrail", () => {
		expect(evaluateSelect1Latency(42).ok).toBe(true);
		expect(evaluateSelect1Latency(null).ok).toBe(false);
		expect(evaluateSelect1Latency(MAX_SELECT1_LATENCY_MS + 1).ok).toBe(false);
	});

	it("alerts when connection usage reaches the aggregate guardrail", () => {
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
	});

	it("fails closed when connection evidence is invalid", () => {
		expect(
			evaluateConnectionPressure({
				maxConnections: 0,
				activeConnections: 0,
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
	});
});
