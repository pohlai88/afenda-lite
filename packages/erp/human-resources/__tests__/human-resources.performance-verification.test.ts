import { describe, expect, it } from "vitest";
import { runSequential } from "../src/kernel/execution/run-sequential";
import {
	createHrLocalBenchmarkWorkloads,
	type LocalBenchmarkEvidence,
	runLocalBenchmark,
} from "../src/testing/performance/index";

describe("HR local performance verification", () => {
	it("executes all eight deterministic workloads and reports local threshold evidence", async () => {
		const workloads = await createHrLocalBenchmarkWorkloads();
		expect(workloads.map((workload) => workload.name)).toEqual([
			"employee_lists",
			"case_lists",
			"timesheet_generation",
			"attendance_import",
			"bulk_employee_import",
			"workforce_variance",
			"payroll_handoff_delivery",
			"large_tenant_isolation",
		]);
		const evidence: LocalBenchmarkEvidence[] = [];
		await runSequential(workloads, async (workload) => {
			evidence.push(
				await runLocalBenchmark(workload, {
					warmupRuns: 1,
					sampleRuns: 3,
					enforceThreshold: false,
				}),
			);
		});
		expect(evidence).toHaveLength(8);
		for (const result of evidence) {
			expect(result).toMatchObject({
				scope: "local_verification_only",
				warmupRuns: 1,
				sampleRuns: 3,
			});
			expect(result.thresholdP95Ms).toBeGreaterThan(0);
			expect(result.p95Ms).toBeGreaterThanOrEqual(0);
			expect(result.maxMs).toBeGreaterThanOrEqual(result.p50Ms);
			expect(result.fixtureSize).toBeGreaterThan(0);
			expect(result.checksum).toBeGreaterThan(0);
		}
	});

	it("fails verification when a workload exceeds its explicit threshold", async () => {
		await expect(
			runLocalBenchmark(
				{
					name: "threshold_guard",
					description: "Harness threshold failure control",
					implementation: "real_domain_kernel",
					fixtureSize: 1,
					thresholdP95Ms: Number.MIN_VALUE,
					run: () => 1,
				},
				{ warmupRuns: 0, sampleRuns: 3, enforceThreshold: true },
			),
		).rejects.toThrow("exceeded");
	});

	it("uses only real HR package paths for Phase 13 workloads", async () => {
		const workloads = await createHrLocalBenchmarkWorkloads();
		expect(
			workloads.every(
				(workload) =>
					workload.implementation === "real_memory_api" ||
					workload.implementation === "real_domain_kernel",
			),
		).toBe(true);
	});
});
