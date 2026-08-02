import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const adapterSource = readFileSync(
	path.resolve(
		import.meta.dirname,
		"../src/features/time/adapters/time.drizzle.ts",
	),
	"utf8",
);

describe("time persistence transaction boundary", () => {
	it("forbids post-commit audit, outbox, and compensation paths", () => {
		for (const leakedBoundary of [
			"ports.audit.record",
			"ports.outbox.append",
			"await audit(",
			"await emitOutbox(",
			"restoreAttendanceSession",
			"restoreShiftAssignmentPublication",
			"recomputeTimesheetTotals",
		]) {
			expect(adapterSource).not.toContain(leakedBoundary);
		}
	});

	it("uses the canonical atomic persistence projections", () => {
		expect(adapterSource).toContain("runTimeTransaction");
		expect(adapterSource).toContain("buildTimeAuditInsert");
		expect(adapterSource).toContain("buildTimeOutboxInsert");
		expect(adapterSource).toContain("buildDetectedAttendanceExceptionInsert");
	});
});
