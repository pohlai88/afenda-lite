/**
 * Memory vs Drizzle parity for lifecycle transfer + termination (HR-05).
 */

import { and, db, eq, inArray, platformDomainEvent } from "@afenda/db";
import {
	HUMAN_RESOURCES_EMPLOYEE_TERMINATED_EVENT,
	HUMAN_RESOURCES_EMPLOYEE_TRANSFERRED_EVENT,
} from "@afenda/events/schemas";
import { afterAll, describe, expect, it } from "vitest";
import { createAssignment } from "../src/core/assignment";
import { createEmployee } from "../src/core/employee";
import { createEmployment } from "../src/core/employment";
import { finalizeTermination } from "../src/lifecycle/termination";
import { transferAssignment } from "../src/lifecycle/transfer";
import { createPosition } from "../src/organization/position";
import { isoDateTimeSchema } from "../src/schemas/common";
import { TEST_ORGANIZATION_DIMENSION_KEYS } from "./helpers/command-options";
import { runDrizzleParity } from "./helpers/database-gate";
import {
	createHrParityHarness,
	seedDepartmentAndJob,
	type WorkforceStoreAdapter,
} from "./helpers/hr-parity-harness";
import { createNeonOrgTracker } from "./helpers/neon-cleanup";

function uniqueSuffix(adapter: WorkforceStoreAdapter): string {
	return `${adapter}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

describe.runIf(runDrizzleParity)("human-resources lifecycle parity", () => {
	const neonOrgs = createNeonOrgTracker();

	afterAll(async () => {
		await neonOrgs.cleanup();
	});

	for (const adapter of ["memory", "drizzle"] as const) {
		it(`${adapter}: transfer then finalizeTermination emit workforce events`, async () => {
			const ready = createHrParityHarness(adapter);
			const suffix = uniqueSuffix(adapter);
			const organizationId = neonOrgs.trackOrg(`org-life-parity-${suffix}`);
			const actorUserId = "user-life-parity";

			const employee = await createEmployee(
				{
					organizationId,
					actorUserId,
					correlationId: `corr-emp-${suffix}`,
					idempotencyKey: `idem-emp-${suffix}`,
					employeeNumber: `E-${suffix}`.slice(0, 64),
					legalName: "Parity Worker",
				},
				ready,
			);
			expect(employee.ok).toBe(true);
			if (!employee.ok) return;

			const employment = await createEmployment(
				{
					organizationId,
					actorUserId,
					correlationId: `corr-employment-${suffix}`,
					employeeId: employee.data.id,
					startsOn: "2025-01-01",
				},
				ready,
			);
			expect(employment.ok).toBe(true);
			if (!employment.ok) return;

			const orgSeed = await seedDepartmentAndJob(ready, {
				organizationId,
				actorUserId,
			});
			expect(orgSeed).not.toBeNull();
			if (!orgSeed) return;

			const positionA = await createPosition(
				{
					organizationId,
					actorUserId,
					correlationId: `corr-pos-a-${suffix}`,
					code: `PA-${suffix}`.slice(0, 64),
					title: "Role A",
					departmentId: orgSeed.departmentId,
					jobId: orgSeed.jobId,
				},
				ready,
			);
			expect(positionA.ok).toBe(true);
			if (!positionA.ok) return;

			const positionB = await createPosition(
				{
					organizationId,
					actorUserId,
					correlationId: `corr-pos-b-${suffix}`,
					code: `PB-${suffix}`.slice(0, 64),
					title: "Role B",
					departmentId: orgSeed.departmentId,
					jobId: orgSeed.jobId,
				},
				ready,
			);
			expect(positionB.ok).toBe(true);
			if (!positionB.ok) return;

			const assignment = await createAssignment(
				{
					organizationId,
					actorUserId,
					correlationId: `corr-asg-${suffix}`,
					employmentId: employment.data.id,
					positionId: positionA.data.id,
					...TEST_ORGANIZATION_DIMENSION_KEYS,
					startsOn: "2025-01-01",
				},
				ready,
			);
			expect(assignment.ok).toBe(true);
			if (!assignment.ok) return;

			const transfer = await transferAssignment(
				{
					organizationId,
					actorUserId,
					correlationId: `corr-xfer-${suffix}`,
					idempotencyKey: `idem-xfer-${suffix}`,
					employmentId: employment.data.id,
					toPositionId: positionB.data.id,
					...TEST_ORGANIZATION_DIMENSION_KEYS,
					effectiveOn: "2025-03-01",
					reason: "Parity transfer",
				},
				ready,
			);
			expect(transfer.ok).toBe(true);
			if (!transfer.ok) return;
			expect(isoDateTimeSchema.safeParse(transfer.data.createdAt).success).toBe(
				true,
			);
			expect(isoDateTimeSchema.safeParse(transfer.data.updatedAt).success).toBe(
				true,
			);
			const replay = await transferAssignment(
				{
					organizationId,
					actorUserId,
					correlationId: `corr-xfer-replay-${suffix}`,
					idempotencyKey: `idem-xfer-${suffix}`,
					employmentId: employment.data.id,
					toPositionId: positionB.data.id,
					...TEST_ORGANIZATION_DIMENSION_KEYS,
					effectiveOn: "2025-03-01",
					reason: "Parity transfer",
				},
				ready,
			);
			expect(replay).toEqual(transfer);
			if (replay.ok) {
				expect(replay.data.createdAt).toBe(transfer.data.createdAt);
				expect(replay.data.updatedAt).toBe(transfer.data.updatedAt);
			}

			const previousAssignment = await ready.store.getAssignmentById({
				organizationId,
				assignmentId: transfer.data.fromAssignmentId,
			});
			expect(previousAssignment.ok).toBe(true);
			if (previousAssignment.ok && previousAssignment.data) {
				expect(previousAssignment.data.endsOn).toBe("2025-02-28");
			}
			const successorAssignment = await ready.store.getAssignmentById({
				organizationId,
				assignmentId: transfer.data.toAssignmentId,
			});
			expect(successorAssignment.ok).toBe(true);
			if (successorAssignment.ok && successorAssignment.data) {
				expect(successorAssignment.data.startsOn).toBe("2025-03-01");
				expect(
					successorAssignment.data.organizationDimensions?.legal_entity.key,
				).toBe(TEST_ORGANIZATION_DIMENSION_KEYS.legalEntityKey);
			}

			const termination = await finalizeTermination(
				{
					organizationId,
					actorUserId,
					correlationId: `corr-term-${suffix}`,
					idempotencyKey: `idem-term-${suffix}`,
					employmentId: employment.data.id,
					reasonCode: "resignation",
					reasonDetail: "Parity exit",
					effectiveOn: "2025-04-01",
				},
				ready,
			);
			expect(termination.ok).toBe(true);
			if (!termination.ok) return;

			if (adapter === "memory") {
				const eventTypes = ready.ports.outbox.calls.map((call) => call.type);
				expect(eventTypes).toContain(
					HUMAN_RESOURCES_EMPLOYEE_TRANSFERRED_EVENT,
				);
				expect(eventTypes).toContain(HUMAN_RESOURCES_EMPLOYEE_TERMINATED_EVENT);
				return;
			}

			const events = await db
				.select()
				.from(platformDomainEvent)
				.where(
					and(
						eq(platformDomainEvent.organizationId, organizationId),
						inArray(platformDomainEvent.type, [
							HUMAN_RESOURCES_EMPLOYEE_TRANSFERRED_EVENT,
							HUMAN_RESOURCES_EMPLOYEE_TERMINATED_EVENT,
						]),
					),
				);
			expect(
				events.some(
					(row) => row.type === HUMAN_RESOURCES_EMPLOYEE_TRANSFERRED_EVENT,
				),
			).toBe(true);
			expect(
				events.some(
					(row) => row.type === HUMAN_RESOURCES_EMPLOYEE_TERMINATED_EVENT,
				),
			).toBe(true);
		});
	}
});
