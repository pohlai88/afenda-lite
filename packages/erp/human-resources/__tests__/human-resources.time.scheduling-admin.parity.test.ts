/**
 * Slice 7.7 — shift / scheduling close matrix (memory / Drizzle).
 */

import { afterAll, describe, expect, it } from "vitest";

import { HUMAN_RESOURCES_ERROR_CONFLICT } from "../src/error-codes";
import {
	assignShift,
	cancelShiftAssignment,
	changeShiftAssignment,
	getScheduledShiftForEmployeeDate,
	listShiftAssignments,
	publishShiftAssignment,
} from "../src/time/scheduling";
import {
	activateShift,
	addShiftBreak,
	createShift,
	listShiftBreaks,
	removeShiftBreak,
	supersedeShift,
	updateShift,
} from "../src/time/shift";
import { runDrizzleParity } from "./helpers/database-gate";
import {
	createHrParityHarness,
	type WorkforceStoreAdapter,
} from "./helpers/hr-parity-harness";
import { createNeonOrgTracker } from "./helpers/neon-cleanup";
import { humanResourcesCodeFromResult } from "./helpers/result-details";
import {
	seedActiveShift,
	seedDraftShift,
	seedParityEmployeeEmployment,
	uniqueSuffix,
} from "./helpers/time-parity-shared";

const CORRELATION_TAG = "77";

function defineSchedulingAdminParitySuite(
	adapter: WorkforceStoreAdapter,
): void {
	const suffix = uniqueSuffix(adapter);
	const neonOrgs = createNeonOrgTracker();
	const ORG = neonOrgs.trackOrg(`org-hr-sched-admin-77-${suffix}`);
	const ACTOR = `user-hr-sched-admin-77-${suffix}`;

	afterAll(async () => {
		if (adapter === "drizzle") {
			await neonOrgs.cleanup();
		}
	});

	it("administers shift definition: create, update draft, activate, supersede with break clone", async () => {
		const ready = createHrParityHarness(adapter);

		const shift = await createShift(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-77-def-create-${suffix}`,
				idempotencyKey: `idem-77-def-create-${suffix}`,
				code: `DEF-${suffix}`.slice(0, 64),
				name: "Day Shift v1",
				shiftKind: "fixed",
				startLocal: "09:00",
				endLocal: "17:00",
				expectedMinutes: 480,
				effectiveFrom: "2025-01-01",
			},
			ready,
		);
		expect(shift.ok).toBe(true);
		if (!shift.ok) {
			return;
		}
		expect(shift.data.status).toBe("draft");
		expect(shift.data.isOvernight).toBe(false);

		const updated = await updateShift(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-77-def-update-${suffix}`,
				shiftId: shift.data.id,
				name: "Day Shift v1 updated",
				expectedVersion: shift.data.version,
			},
			ready,
		);
		expect(updated.ok).toBe(true);
		if (!updated.ok) {
			return;
		}
		expect(updated.data.name).toBe("Day Shift v1 updated");

		const shiftBreak = await addShiftBreak(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-77-def-break-${suffix}`,
				shiftId: updated.data.id,
				breakOrder: 1,
				durationMinutes: 60,
				startOffsetMinutes: 240,
				label: "Meal",
			},
			ready,
		);
		expect(shiftBreak.ok).toBe(true);

		const activated = await activateShift(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-77-def-activate-${suffix}`,
				shiftId: updated.data.id,
				expectedVersion: updated.data.version,
			},
			ready,
		);
		expect(activated.ok).toBe(true);
		if (!activated.ok) {
			return;
		}
		expect(activated.data.status).toBe("active");

		const supersession = await supersedeShift(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-77-def-supersede-${suffix}`,
				idempotencyKey: `idem-77-def-supersede-${suffix}`,
				shiftId: activated.data.id,
				expectedVersion: activated.data.version,
				name: "Day Shift v2",
				effectiveFrom: "2025-08-01",
				endLocal: "16:30",
				expectedMinutes: 450,
			},
			ready,
		);
		expect(supersession.ok).toBe(true);
		if (!supersession.ok) {
			return;
		}
		expect(supersession.data.superseded).toMatchObject({
			id: activated.data.id,
			status: "superseded",
			effectiveTo: "2025-07-31",
		});
		expect(supersession.data.successor).toMatchObject({
			status: "active",
			effectiveFrom: "2025-08-01",
			supersedesShiftId: activated.data.id,
		});

		const clonedBreaks = await listShiftBreaks(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-77-def-cloned-breaks-${suffix}`,
				shiftId: supersession.data.successor.id,
			},
			ready,
		);
		expect(clonedBreaks.ok).toBe(true);
		if (!clonedBreaks.ok) {
			return;
		}
		expect(clonedBreaks.data).toHaveLength(1);
		expect(clonedBreaks.data[0]?.durationMinutes).toBe(60);
	});

	it("administers shift breaks: add, list ordered, remove", async () => {
		const ready = createHrParityHarness(adapter);
		const shift = await seedDraftShift(ready, {
			organizationId: ORG,
			actorUserId: ACTOR,
			suffix,
			correlationTag: CORRELATION_TAG,
			code: "breaks",
		});

		const first = await addShiftBreak(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-77-br1-${suffix}`,
				shiftId: shift.id,
				breakOrder: 1,
				durationMinutes: 15,
				startOffsetMinutes: 120,
				label: "tea",
			},
			ready,
		);
		expect(first.ok).toBe(true);
		if (!first.ok) {
			return;
		}

		const second = await addShiftBreak(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-77-br2-${suffix}`,
				shiftId: shift.id,
				breakOrder: 2,
				durationMinutes: 45,
				startOffsetMinutes: 300,
				label: "meal",
			},
			ready,
		);
		expect(second.ok).toBe(true);
		if (!second.ok) {
			return;
		}

		const listed = await listShiftBreaks(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-77-br-list-${suffix}`,
				shiftId: shift.id,
			},
			ready,
		);
		expect(listed.ok).toBe(true);
		if (!listed.ok) {
			return;
		}
		expect(listed.data).toHaveLength(2);
		expect(listed.data.map((row) => row.breakOrder)).toEqual([1, 2]);

		const removed = await removeShiftBreak(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-77-br-remove-${suffix}`,
				breakId: first.data.id,
			},
			ready,
		);
		expect(removed.ok).toBe(true);

		const afterRemove = await listShiftBreaks(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-77-br-after-${suffix}`,
				shiftId: shift.id,
			},
			ready,
		);
		expect(afterRemove.ok).toBe(true);
		if (!afterRemove.ok) {
			return;
		}
		expect(afterRemove.data).toHaveLength(1);
		expect(afterRemove.data[0]?.breakOrder).toBe(2);
	});

	it("detects overnight shift, assigns, and publishes schedule", async () => {
		const ready = createHrParityHarness(adapter);
		const { employee, employment } = await seedParityEmployeeEmployment(ready, {
			organizationId: ORG,
			actorUserId: ACTOR,
			suffix: `${suffix}-overnight`,
			correlationTag: CORRELATION_TAG,
		});

		const shift = await createShift(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-77-night-${suffix}`,
				idempotencyKey: `idem-77-night-${suffix}`,
				code: `NIGHT-${suffix}`.slice(0, 64),
				name: "Night",
				shiftKind: "fixed",
				startLocal: "22:00",
				endLocal: "06:00",
				expectedMinutes: 480,
				effectiveFrom: "2025-01-01",
			},
			ready,
		);
		expect(shift.ok).toBe(true);
		if (!shift.ok) {
			return;
		}
		expect(shift.data.isOvernight).toBe(true);

		const activated = await activateShift(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-77-night-act-${suffix}`,
				shiftId: shift.data.id,
				expectedVersion: shift.data.version,
			},
			ready,
		);
		expect(activated.ok).toBe(true);
		if (!activated.ok) {
			return;
		}

		const assignment = await assignShift(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-77-night-assign-${suffix}`,
				idempotencyKey: `idem-77-night-assign-${suffix}`,
				employeeId: employee.id,
				employmentId: employment.id,
				shiftId: activated.data.id,
				scheduledDate: "2025-07-01",
				startsAt: "2025-07-01T14:00:00.000Z",
				endsAt: "2025-07-01T22:00:00.000Z",
				timezone: "Asia/Singapore",
			},
			ready,
		);
		expect(assignment.ok).toBe(true);
		if (!assignment.ok) {
			return;
		}
		expect(assignment.data.publicationStatus).toBe("planned");

		const published = await publishShiftAssignment(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-77-night-pub-${suffix}`,
				assignmentId: assignment.data.id,
				expectedVersion: assignment.data.version,
			},
			ready,
		);
		expect(published.ok).toBe(true);
		if (!published.ok) {
			return;
		}
		expect(published.data.publicationStatus).toBe("published");
	});

	it("cancels a planned shift assignment", async () => {
		const ready = createHrParityHarness(adapter);
		const { employee, employment } = await seedParityEmployeeEmployment(ready, {
			organizationId: ORG,
			actorUserId: ACTOR,
			suffix: `${suffix}-cancel`,
			correlationTag: CORRELATION_TAG,
		});
		const activeShift = await seedActiveShift(ready, {
			organizationId: ORG,
			actorUserId: ACTOR,
			suffix,
			correlationTag: CORRELATION_TAG,
			code: "cancel",
		});

		const assignment = await assignShift(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-77-cancel-assign-${suffix}`,
				idempotencyKey: `idem-77-cancel-assign-${suffix}`,
				employeeId: employee.id,
				employmentId: employment.id,
				shiftId: activeShift.id,
				scheduledDate: "2025-07-10",
				startsAt: "2025-07-10T01:00:00.000Z",
				endsAt: "2025-07-10T09:00:00.000Z",
				timezone: "Asia/Singapore",
			},
			ready,
		);
		expect(assignment.ok).toBe(true);
		if (!assignment.ok) {
			return;
		}
		expect(assignment.data.publicationStatus).toBe("planned");

		const cancelled = await cancelShiftAssignment(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-77-cancel-${suffix}`,
				assignmentId: assignment.data.id,
				expectedVersion: assignment.data.version,
			},
			ready,
		);
		expect(cancelled.ok).toBe(true);
		if (!cancelled.ok) {
			return;
		}
		expect(cancelled.data.publicationStatus).toBe("cancelled");
	});

	it("amends a published assignment via changeShiftAssignment", async () => {
		const ready = createHrParityHarness(adapter);
		const { employee, employment } = await seedParityEmployeeEmployment(ready, {
			organizationId: ORG,
			actorUserId: ACTOR,
			suffix: `${suffix}-amend`,
			correlationTag: CORRELATION_TAG,
		});
		const activeShift = await seedActiveShift(ready, {
			organizationId: ORG,
			actorUserId: ACTOR,
			suffix,
			correlationTag: CORRELATION_TAG,
			code: "amend",
		});

		const assignment = await assignShift(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-77-amend-assign-${suffix}`,
				idempotencyKey: `idem-77-amend-assign-${suffix}`,
				employeeId: employee.id,
				employmentId: employment.id,
				shiftId: activeShift.id,
				scheduledDate: "2025-07-16",
				startsAt: "2025-07-16T01:00:00.000Z",
				endsAt: "2025-07-16T09:00:00.000Z",
				timezone: "Asia/Singapore",
			},
			ready,
		);
		expect(assignment.ok).toBe(true);
		if (!assignment.ok) {
			return;
		}

		const published = await publishShiftAssignment(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-77-amend-pub-${suffix}`,
				assignmentId: assignment.data.id,
				expectedVersion: assignment.data.version,
			},
			ready,
		);
		expect(published.ok).toBe(true);
		if (!published.ok) {
			return;
		}

		const changed = await changeShiftAssignment(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-77-amend-change-${suffix}`,
				assignmentId: published.data.id,
				startsAt: "2025-07-16T02:00:00.000Z",
				endsAt: "2025-07-16T10:00:00.000Z",
				expectedVersion: published.data.version,
			},
			ready,
		);
		expect(changed.ok).toBe(true);
		if (!changed.ok) {
			return;
		}
		expect(changed.data.publicationStatus).toBe("changed");
		expect(changed.data.startsAt.toISOString()).toBe(
			"2025-07-16T02:00:00.000Z",
		);
		expect(changed.data.endsAt.toISOString()).toBe("2025-07-16T10:00:00.000Z");
	});

	it("queries employee schedule by date and lists assignments", async () => {
		const ready = createHrParityHarness(adapter);
		const { employee, employment } = await seedParityEmployeeEmployment(ready, {
			organizationId: ORG,
			actorUserId: ACTOR,
			suffix: `${suffix}-query`,
			correlationTag: CORRELATION_TAG,
		});
		const activeShift = await seedActiveShift(ready, {
			organizationId: ORG,
			actorUserId: ACTOR,
			suffix,
			correlationTag: CORRELATION_TAG,
			code: "query",
		});

		const assignment = await assignShift(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-77-query-assign-${suffix}`,
				idempotencyKey: `idem-77-query-assign-${suffix}`,
				employeeId: employee.id,
				employmentId: employment.id,
				shiftId: activeShift.id,
				scheduledDate: "2025-07-02",
				startsAt: "2025-07-02T01:00:00.000Z",
				endsAt: "2025-07-02T09:00:00.000Z",
				timezone: "Asia/Singapore",
				locationKey: "WH-A",
			},
			ready,
		);
		expect(assignment.ok).toBe(true);
		if (!assignment.ok) {
			return;
		}

		const published = await publishShiftAssignment(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-77-query-pub-${suffix}`,
				assignmentId: assignment.data.id,
				expectedVersion: assignment.data.version,
			},
			ready,
		);
		expect(published.ok).toBe(true);
		if (!published.ok) {
			return;
		}

		const scheduled = await getScheduledShiftForEmployeeDate(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-77-query-sched-${suffix}`,
				employeeId: employee.id,
				scheduledDate: "2025-07-02",
			},
			ready,
		);
		expect(scheduled.ok).toBe(true);
		if (!scheduled.ok) {
			return;
		}
		expect(scheduled.data?.id).toBe(published.data.id);
		expect(scheduled.data?.locationKey).toBe("WH-A");

		const listed = await listShiftAssignments(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-77-query-list-${suffix}`,
				employeeId: employee.id,
				scheduledDate: "2025-07-02",
			},
			ready,
		);
		expect(listed.ok).toBe(true);
		if (!listed.ok) {
			return;
		}
		expect(listed.data.some((row) => row.id === published.data.id)).toBe(true);
	});

	it("rejects overlapping shift assignments", async () => {
		const ready = createHrParityHarness(adapter);
		const { employee, employment } = await seedParityEmployeeEmployment(ready, {
			organizationId: ORG,
			actorUserId: ACTOR,
			suffix: `${suffix}-overlap`,
			correlationTag: CORRELATION_TAG,
		});
		const activeShift = await seedActiveShift(ready, {
			organizationId: ORG,
			actorUserId: ACTOR,
			suffix,
			correlationTag: CORRELATION_TAG,
			code: "overlap",
		});

		const first = await assignShift(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-77-overlap-first-${suffix}`,
				idempotencyKey: `idem-77-overlap-first-${suffix}`,
				employeeId: employee.id,
				employmentId: employment.id,
				shiftId: activeShift.id,
				scheduledDate: "2025-07-15",
				startsAt: "2025-07-15T01:00:00.000Z",
				endsAt: "2025-07-15T09:00:00.000Z",
				timezone: "Asia/Singapore",
			},
			ready,
		);
		expect(first.ok).toBe(true);
		if (!first.ok) {
			return;
		}

		const overlapping = await assignShift(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-77-overlap-second-${suffix}`,
				idempotencyKey: `idem-77-overlap-second-${suffix}`,
				employeeId: employee.id,
				employmentId: employment.id,
				shiftId: activeShift.id,
				scheduledDate: "2025-07-15",
				startsAt: "2025-07-15T08:00:00.000Z",
				endsAt: "2025-07-15T16:00:00.000Z",
				timezone: "Asia/Singapore",
			},
			ready,
		);
		expect(overlapping.ok).toBe(false);
		if (overlapping.ok) {
			return;
		}
		expect(humanResourcesCodeFromResult(overlapping)).toBe(
			HUMAN_RESOURCES_ERROR_CONFLICT,
		);
	});
}

describe("human-resources.time.scheduling-admin (memory)", () => {
	defineSchedulingAdminParitySuite("memory");
});

describe.runIf(runDrizzleParity)(
	"human-resources.time.scheduling-admin (drizzle)",
	() => {
		defineSchedulingAdminParitySuite("drizzle");
	},
);
