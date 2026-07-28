import { describe, expect, it } from "vitest";

import { createMemoryHrObservabilityRecorder } from "../src/observability";
import { HumanResourcesParityObservabilityReporter } from "../src/testing/parity-observability-reporter";

describe("HR parity observability reporter", () => {
	it("emits one Drizzle integration signal when the parity gate fails", async () => {
		const recorder = createMemoryHrObservabilityRecorder();
		const reporter = new HumanResourcesParityObservabilityReporter(recorder);

		await reporter.onTestRunEnd([], [], "failed");

		expect(recorder.metrics).toEqual([
			{
				name: "hr.parity.failure.total",
				kind: "counter",
				value: 1,
				labels: { area: "integration", adapter: "drizzle" },
			},
		]);
		expect(recorder.events).toEqual([
			expect.objectContaining({
				name: "hr.parity.failed",
				severity: "error",
				attributes: { area: "integration", adapter: "drizzle" },
			}),
		]);
	});

	it("does not emit a failure signal when the parity gate passes", async () => {
		const recorder = createMemoryHrObservabilityRecorder();
		const reporter = new HumanResourcesParityObservabilityReporter(recorder);

		await reporter.onTestRunEnd([], [], "passed");

		expect(recorder.metrics).toEqual([]);
		expect(recorder.events).toEqual([]);
	});

	it("emits a failure signal for an unhandled runner error", async () => {
		const recorder = createMemoryHrObservabilityRecorder();
		const reporter = new HumanResourcesParityObservabilityReporter(recorder);

		await reporter.onTestRunEnd(
			[],
			[new Error("runner failed")],
			"interrupted",
		);

		expect(recorder.metrics).toHaveLength(1);
		expect(recorder.events).toHaveLength(1);
	});

	it("ignores Vitest reporter options passed to the constructor", () => {
		expect(
			() => new HumanResourcesParityObservabilityReporter({} as never),
		).not.toThrow();
	});
});
