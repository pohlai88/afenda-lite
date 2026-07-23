/**
 * Memory vs Drizzle parity for lifecycle transfer + termination (HR-05).
 */

import { and, db, eq, inArray, platformDomainEvent } from "@afenda/db";
import {
	HUMAN_RESOURCES_EMPLOYEE_TERMINATED_EVENT,
	HUMAN_RESOURCES_EMPLOYEE_TRANSFERRED_EVENT,
} from "@afenda/events/schemas";
import { resolveDatabaseUrlForTests } from "@afenda/testing/require-database-for-ci";
import { afterAll, describe, expect, it } from "vitest";

import { createAssignment } from "../src/core/assignment";
import { createEmployee } from "../src/core/employee";
import { createEmployment } from "../src/core/employment";
import { finalizeTermination } from "../src/lifecycle/termination";
import { transferAssignment } from "../src/lifecycle/transfer";
import { createPosition } from "../src/organization/position";
import { cleanupHumanResourcesNeonOrgs } from "./helpers/neon-cleanup";
import {
	createHrParityHarness,
	seedDepartmentAndJob,
	type WorkforceStoreAdapter,
} from "./helpers/hr-parity-harness";

const { hasDatabase } = resolveDatabaseUrlForTests();

function uniqueSuffix(adapter: WorkforceStoreAdapter): string {
	return `${adapter}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

describe.runIf(hasDatabase)("human-resources lifecycle parity", () => {
	const neonOrgs: string[] = [];

	afterAll(async () => {
		await cleanupHumanResourcesNeonOrgs(neonOrgs);
	});

	for (const adapter of ["memory", "drizzle"] as const) {
		it(`${adapter}: transfer then finalizeTermination emit workforce events`, async () => {
			const ready = createHrParityHarness(adapter);
			const suffix = uniqueSuffix(adapter);
			const organizationId = `org-life-parity-${suffix}`;
			neonOrgs.push(organizationId);
			const actorUserId = "user-life-parity";

			const employee = await createEmployee(
				{
					organizationId,
					actorUserId,
					correlationId: `corr-emp-${suffix}`,
					idempotencyKey: `idem-emp-${suffix}`,
					employeeNumber: `E-${suffix}`.slice(0, 32),
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
					code: `PA-${suffix}`.slice(0, 32),
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
					code: `PB-${suffix}`.slice(0, 32),
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
					effectiveOn: "2025-03-01",
					reason: "Parity transfer",
				},
				ready,
			);
			expect(transfer.ok).toBe(true);
			if (!transfer.ok) return;

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
