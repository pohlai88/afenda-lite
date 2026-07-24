import { describe, expect, it } from "vitest";

import { dryRunAttendanceImport } from "../src/time/attendance/dry-run";

const EMPLOYEE_ID = "00000000-0000-4000-8000-000000000001";

function input() {
	return {
		organizationId: "org-1",
		actorUserId: "actor-1",
		correlationId: "corr-1",
		idempotencyKey: "attendance-import-1",
		batchId: "batch-1",
		sourceKey: "clock",
		events: [
			{
				employeeId: EMPLOYEE_ID,
				eventType: "clock_in",
				occurredAt: "2026-07-24T01:00:00.000Z",
				sourceTimezone: "Asia/Kuala_Lumpur",
				localWorkDate: "2026-07-24",
				sourceReference: "row-1",
			},
			{
				employeeId: EMPLOYEE_ID,
				eventType: "clock_out",
				occurredAt: "2026-07-24T09:00:00.000Z",
				sourceTimezone: "Invalid/Timezone",
				localWorkDate: "2026-07-24",
				sourceReference: "row-2",
			},
			{
				employeeId: EMPLOYEE_ID,
				eventType: "clock_out",
				occurredAt: "2026-07-24T09:00:00.000Z",
				sourceTimezone: "Asia/Kuala_Lumpur",
				localWorkDate: "2026-07-24",
				sourceReference: "row-1",
			},
		],
	};
}

describe("dryRunAttendanceImport", () => {
	it("returns row-level acceptance, rejection, and a stable reconciliation key", () => {
		const first = dryRunAttendanceImport(input());
		const second = dryRunAttendanceImport(input());

		expect(first.ok).toBe(true);
		expect(second.ok).toBe(true);
		if (!first.ok || !second.ok) return;
		expect(first.data.mode).toBe("dry_run");
		expect(first.data.totals).toEqual({ accepted: 1, rejected: 2 });
		expect(first.data.rows.map((row) => row.status)).toEqual([
			"accepted",
			"rejected",
			"rejected",
		]);
		expect(first.data.reconciliationKey).toBe(second.data.reconciliationKey);
	});

	it("requires explicit rows so validation never mutates or fetches a source", () => {
		const result = dryRunAttendanceImport({
			...input(),
			events: undefined,
			cursor: "source-cursor",
		});
		expect(result.ok).toBe(false);
	});
});
