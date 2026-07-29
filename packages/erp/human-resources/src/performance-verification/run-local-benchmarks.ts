import { createHrLocalBenchmarkWorkloads, runLocalBenchmark } from "./index";

const CONTROLLED_WARMUP_RUNS = 3;
const CONTROLLED_SAMPLE_RUNS = 9;

const workloads = await createHrLocalBenchmarkWorkloads();
const evidence = [];

for (const workload of workloads) {
	evidence.push(
		await runLocalBenchmark(workload, {
			warmupRuns: CONTROLLED_WARMUP_RUNS,
			sampleRuns: CONTROLLED_SAMPLE_RUNS,
			enforceThreshold: true,
		}),
	);
}

for (const result of evidence) {
	console.log(
		[
			result.workload,
			`p50=${result.p50Ms.toFixed(3)}ms`,
			`p95=${result.p95Ms.toFixed(3)}ms`,
			`max=${result.maxMs.toFixed(3)}ms`,
			`threshold=${result.thresholdP95Ms}ms`,
			`samples=${result.sampleRuns}`,
			`warmups=${result.warmupRuns}`,
			`fixture=${result.fixtureSize}`,
		].join(" "),
	);
}
