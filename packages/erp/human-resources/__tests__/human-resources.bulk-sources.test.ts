import { errorResult } from "@afenda/errors";
import { describe, expect, it, vi } from "vitest";
import {
	createMemoryBulkCheckpointPort,
	type HumanResourcesBulkSourceDependencies,
	runAssignmentBulkImport,
	runAttendanceBulkImport,
	runCompensationBulkImport,
	runEmployeeBulkImport,
	runLearningAssignmentBulkImport,
	runLeaveEntitlementBulkImport,
} from "../src/bulk";

const employeeId = "00000000-0000-4000-8000-000000000101";
const employmentId = "00000000-0000-4000-8000-000000000102";
const positionId = "00000000-0000-4000-8000-000000000103";
const policyId = "00000000-0000-4000-8000-000000000104";
const courseId = "00000000-0000-4000-8000-000000000105";

function request<Entity extends string, Row>(
	entityType: Entity,
	rows: Array<{ sourceReference: string; payload: Row }>,
	mode: "dry_run" | "commit" = "commit",
) {
	return {
		organizationId: "org-source-pipeline",
		actorUserId: "actor-source-pipeline",
		correlationId: `corr-${entityType}`,
		batchId: `batch-${entityType}`,
		entityType,
		mode,
		idempotencyKey: `bulk-${entityType}`,
		rows,
	};
}

function dependencies(
	commands: HumanResourcesBulkSourceDependencies["commands"],
): HumanResourcesBulkSourceDependencies {
	return {
		checkpoints: createMemoryBulkCheckpointPort(),
		commandOptions: { store: undefined },
		commands,
	};
}

describe("Human Resources source-specific bulk pipelines", () => {
	it("validates employee rows in dry-run mode without calling the command", async () => {
		const create = vi.fn(async () => errorResult.ok({ id: employeeId }));
		const result = await runEmployeeBulkImport(
			request(
				"employee",
				[
					{
						sourceReference: "employee-1",
						payload: { employeeNumber: "E-001", legalName: "Ada Example" },
					},
					{
						sourceReference: "employee-2",
						payload: { employeeNumber: "", legalName: "Invalid" },
					},
				],
				"dry_run",
			),
			dependencies({ createEmployee: create }),
		);

		expect(result.ok).toBe(true);
		if (!result.ok) {
			return;
		}
		expect(result.data.totals).toEqual({
			accepted: 1,
			rejected: 1,
			pending: 0,
		});
		expect(result.data.rows[1]).toMatchObject({
			status: "rejected",
			issues: [{ code: "INVALID_ROW", field: "employeeNumber" }],
		});
		expect(create).not.toHaveBeenCalled();
	});

	it("partially rejects assignments and stamps command context", async () => {
		const create = vi.fn(async () => errorResult.ok({ id: positionId }));
		const result = await runAssignmentBulkImport(
			request("assignment", [
				{
					sourceReference: "assignment-1",
					payload: {
						employmentId,
						positionId,
						legalEntityKey: "LE-1",
						businessUnitKey: "BU-1",
						locationKey: "LOC-1",
						costCentreKey: "CC-1",
						projectKey: "PRJ-1",
						startsOn: "2026-01-01",
					},
				},
				{
					sourceReference: "assignment-2",
					payload: {
						employmentId: "not-an-id",
						positionId,
						legalEntityKey: "LE-1",
						businessUnitKey: "BU-1",
						locationKey: "LOC-1",
						costCentreKey: "CC-1",
						projectKey: "PRJ-1",
						startsOn: "2026-01-01",
					},
				},
			]),
			dependencies({ createAssignment: create }),
		);

		expect(result.ok).toBe(true);
		if (!result.ok) {
			return;
		}
		expect(result.data.status).toBe("completed_with_rejections");
		expect(create).toHaveBeenCalledOnce();
		expect(create).toHaveBeenCalledWith(
			expect.objectContaining({
				organizationId: "org-source-pipeline",
				actorUserId: "actor-source-pipeline",
				correlationId: "corr-assignment",
			}),
			expect.anything(),
			expect.objectContaining({
				sourceReference: "assignment-1",
				idempotencyKey: "bulk-assignment:assignment-1",
			}),
		);
	});

	it("replays a completed leave-entitlement batch without a second command", async () => {
		const grant = vi.fn(async () => errorResult.ok({ id: policyId }));
		const input = request("leave_entitlement", [
			{
				sourceReference: "leave-1",
				payload: {
					employeeId,
					employmentId,
					policyId,
					periodStart: "2026-01-01",
					periodEnd: "2026-12-31",
					openingQuantity: "20",
				},
			},
		]);
		const deps = dependencies({ grantLeaveEntitlement: grant });
		const first = await runLeaveEntitlementBulkImport(input, deps);
		const replay = await runLeaveEntitlementBulkImport(input, deps);

		expect(first.ok).toBe(true);
		expect(replay).toEqual(first);
		expect(grant).toHaveBeenCalledOnce();
		expect(grant).toHaveBeenCalledWith(
			expect.objectContaining({
				idempotencyKey: "bulk-leave_entitlement:leave-1",
			}),
			expect.anything(),
			expect.anything(),
		);
	});

	it("stamps attendance source reference and row idempotency", async () => {
		const record = vi.fn(async () => errorResult.ok({ id: employeeId }));
		const result = await runAttendanceBulkImport(
			request("attendance", [
				{
					sourceReference: "device-event-77",
					payload: {
						employeeId,
						employmentId,
						eventType: "clock_in",
						occurredAt: "2026-07-28T01:00:00.000Z",
						sourceTimezone: "UTC",
						localWorkDate: "2026-07-28",
						source: "import",
					},
				},
			]),
			dependencies({ recordAttendanceEvent: record }),
		);

		expect(result.ok).toBe(true);
		expect(record).toHaveBeenCalledWith(
			expect.objectContaining({
				sourceReference: "device-event-77",
				idempotencyKey: "bulk-attendance:device-event-77",
				organizationId: "org-source-pipeline",
			}),
			expect.anything(),
			expect.anything(),
		);
	});

	it("maps compensation command conflicts to a row rejection and continues", async () => {
		const create = vi.fn(async (input: { reason: string }) =>
			input.reason === "duplicate"
				? errorResult.fail("CONFLICT", {
						publicMessage: "Compensation already exists",
					})
				: errorResult.ok({ id: employeeId }),
		);
		const base = {
			employeeId,
			employmentId,
			baseAmount: "5000.00",
			currencyCode: "USD",
			payFrequency: "monthly" as const,
			effectiveFrom: "2026-01-01",
		};
		const result = await runCompensationBulkImport(
			request("compensation", [
				{
					sourceReference: "comp-1",
					payload: { ...base, reason: "duplicate" },
				},
				{
					sourceReference: "comp-2",
					payload: { ...base, reason: "annual review" },
				},
			]),
			dependencies({ createEmployeeCompensation: create }),
		);

		expect(result.ok).toBe(true);
		if (!result.ok) {
			return;
		}
		expect(result.data.rows.map((row) => row.status)).toEqual([
			"rejected",
			"accepted",
		]);
		expect(result.data.rows[0]).toMatchObject({
			issues: [{ code: "CONFLICT" }],
		});
		expect(create).toHaveBeenCalledTimes(2);
	});

	it("validates learning assignments and preserves deterministic replay", async () => {
		const assign = vi.fn(async () => errorResult.ok({ id: courseId }));
		const input = request("learning_assignment", [
			{
				sourceReference: "learning-1",
				payload: { employeeId, courseId, dueOn: "2026-12-01" },
			},
			{
				sourceReference: "learning-2",
				payload: { employeeId, courseId: "invalid-course" },
			},
		]);
		const deps = dependencies({ assignLearning: assign });
		const first = await runLearningAssignmentBulkImport(input, deps);
		const replay = await runLearningAssignmentBulkImport(input, deps);

		expect(first.ok).toBe(true);
		if (!first.ok) {
			return;
		}
		expect(first.data.status).toBe("completed_with_rejections");
		expect(replay).toEqual(first);
		expect(assign).toHaveBeenCalledOnce();
	});
});
