import { performance } from "node:perf_hooks";

export type LocalBenchmarkImplementation =
	| "real_memory_api"
	| "real_domain_kernel";

export interface LocalBenchmarkWorkload {
	description: string;
	fixtureSize: number;
	implementation: LocalBenchmarkImplementation;
	name: string;
	run: () => Promise<number> | number;
	thresholdP95Ms: number;
}

export interface LocalBenchmarkEvidence {
	checksum: number;
	description: string;
	fixtureSize: number;
	implementation: LocalBenchmarkImplementation;
	maxMs: number;
	meanMs: number;
	p50Ms: number;
	p95Ms: number;
	passed: boolean;
	sampleRuns: number;
	scope: "local_verification_only";
	thresholdP95Ms: number;
	warmupRuns: number;
	workload: string;
}

function percentile(sorted: readonly number[], ratio: number): number {
	const index = Math.min(
		sorted.length - 1,
		Math.max(0, Math.ceil(sorted.length * ratio) - 1),
	);
	return sorted[index] ?? 0;
}

export async function runLocalBenchmark(
	workload: LocalBenchmarkWorkload,
	options: {
		warmupRuns?: number;
		sampleRuns?: number;
		enforceThreshold?: boolean;
	} = {},
): Promise<LocalBenchmarkEvidence> {
	const warmupRuns = options.warmupRuns ?? 2;
	const sampleRuns = options.sampleRuns ?? 7;
	const enforceThreshold = options.enforceThreshold ?? true;
	if (warmupRuns < 0 || !Number.isInteger(warmupRuns)) {
		throw new Error("Benchmark warmup runs must be a non-negative integer");
	}
	if (sampleRuns < 3 || !Number.isInteger(sampleRuns)) {
		throw new Error(
			"Benchmark sample runs must be an integer of at least three",
		);
	}
	if (
		!Number.isFinite(workload.thresholdP95Ms) ||
		workload.thresholdP95Ms <= 0
	) {
		throw new Error("Benchmark threshold must be positive and finite");
	}
	let checksum = 0;
	for (let index = 0; index < warmupRuns; index += 1) {
		// biome-ignore lint/performance/noAwaitInLoops: Warmups must run serially to isolate each benchmark invocation.
		checksum += await workload.run();
	}
	const durations: number[] = [];
	for (let index = 0; index < sampleRuns; index += 1) {
		const startedAt = performance.now();
		// biome-ignore lint/performance/noAwaitInLoops: Concurrent samples would measure contention instead of operation latency.
		checksum += await workload.run();
		durations.push(performance.now() - startedAt);
	}
	if (!Number.isFinite(checksum)) {
		throw new Error("Benchmark checksum is invalid");
	}
	const sorted = [...durations].sort((left, right) => left - right);
	const p95Ms = percentile(sorted, 0.95);
	const evidence: LocalBenchmarkEvidence = {
		scope: "local_verification_only",
		workload: workload.name,
		description: workload.description,
		implementation: workload.implementation,
		fixtureSize: workload.fixtureSize,
		warmupRuns,
		sampleRuns,
		thresholdP95Ms: workload.thresholdP95Ms,
		p50Ms: percentile(sorted, 0.5),
		p95Ms,
		maxMs: sorted.at(-1) ?? 0,
		meanMs: durations.reduce((sum, value) => sum + value, 0) / durations.length,
		checksum,
		passed: p95Ms <= workload.thresholdP95Ms,
	};
	if (enforceThreshold && !evidence.passed) {
		throw new Error(
			`Local benchmark ${workload.name} p95 ${p95Ms.toFixed(3)}ms exceeded ${workload.thresholdP95Ms}ms`,
		);
	}
	return evidence;
}
