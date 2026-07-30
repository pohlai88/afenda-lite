import type { HrObservabilityPort } from "../observability/ports";
import { recordHrParityFailure } from "../observability/recorder";

type ParityTestRunEndReason = "passed" | "interrupted" | "failed";

function createJsonLineParityRecorder(): HrObservabilityPort {
	return {
		recordMetric(observation) {
			process.stderr.write(
				`${JSON.stringify({ source: "hr-parity-runner", ...observation })}\n`,
			);
		},
		recordEvent(event) {
			process.stderr.write(
				`${JSON.stringify({ source: "hr-parity-runner", ...event })}\n`,
			);
		},
	};
}

/** Emits one low-cardinality failure signal for the dedicated live Drizzle parity gate. */
class HumanResourcesParityObservabilityReporter {
	readonly recorder: HrObservabilityPort;

	constructor(recorder?: HrObservabilityPort) {
		this.recorder =
			recorder !== undefined &&
			typeof recorder.recordMetric === "function" &&
			typeof recorder.recordEvent === "function"
				? recorder
				: createJsonLineParityRecorder();
	}

	async onTestRunEnd(
		_testModules: readonly unknown[],
		unhandledErrors: readonly unknown[],
		reason: ParityTestRunEndReason,
	): Promise<void> {
		if (reason !== "failed" && unhandledErrors.length === 0) {
			return;
		}
		await recordHrParityFailure(
			{ area: "integration", adapter: "drizzle" },
			{
				recorder: this.recorder,
				clock: { now: () => new Date() },
			},
		);
	}
}

export default HumanResourcesParityObservabilityReporter;
