import { describe, expect, it } from "vitest";
import { runSequential } from "../src/kernel/execution/run-sequential";
import {
	createHrLocalRecoveryDrills,
	type LocalRecoveryDrillEvidence,
	runLocalRecoveryDrill,
} from "../src/testing/recovery/index";

describe("HR local recovery-drill verification", () => {
	it("executes all eight injected-failure recovery drills", async () => {
		const drills = createHrLocalRecoveryDrills();
		expect(drills.map((drill) => drill.name)).toEqual([
			"migration_forward_repair",
			"stuck_outbox_dead_letter",
			"payroll_handoff_recovery",
			"attendance_cursor_recovery",
			"privacy_incident_containment",
			"effective_dated_correction",
			"tenant_leakage_fail_closed",
			"rollback_compatibility",
		]);
		const evidence: LocalRecoveryDrillEvidence[] = [];
		await runSequential(drills, async (drill) => {
			evidence.push(await runLocalRecoveryDrill(drill));
		});
		expect(evidence).toHaveLength(8);
		for (const result of evidence) {
			expect(result.scope).toBe("local_recovery_drill_only");
			expect(result.passed).toBe(true);
			expect(result.injectedFailure.length).toBeGreaterThan(0);
			expect(result.expectedControl.length).toBeGreaterThan(0);
			expect(Object.keys(result.details).length).toBeGreaterThan(0);
		}
	});

	it("fails the executable harness when a recovery control does not hold", async () => {
		await expect(
			runLocalRecoveryDrill({
				name: "failure-control",
				injectedFailure: "deterministic control failure",
				expectedControl: "harness rejects failed drill",
				execute: async () => ({
					passed: false,
					details: { controlHeld: false },
				}),
			}),
		).rejects.toThrow("Local recovery drill failed");
	});
});
