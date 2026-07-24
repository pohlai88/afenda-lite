/**
 * Memory vs Drizzle semantic parity for workforce mutations.
 *
 * Memory cases always run. Drizzle cases hit live Neon and skip cleanly when
 * DATABASE_URL is absent (local). CI / REQUIRE_DATABASE_TESTS=1 fail-closed via
 * `@afenda/testing/require-database-for-ci`.
 */

import { and, db, eq, platformAuditLog, platformDomainEvent } from "@afenda/db";
import {
	HUMAN_RESOURCES_EMPLOYEE_CREATED_EVENT,
	HUMAN_RESOURCES_EMPLOYMENT_STARTED_EVENT,
} from "@afenda/events/schemas";
import { resolveDatabaseUrlForTests } from "@afenda/testing/require-database-for-ci";
import { afterAll, describe, expect, it } from "vitest";

import { createAssignment, endAssignment } from "../src/core/assignment";
import { createEmployee, updateEmployee } from "../src/core/employee";
import {
	amendEmployment,
	createEmployment,
	getEmployment,
} from "../src/core/employment";
import { createEmploymentContract } from "../src/core/employment-contract";
import {
	HUMAN_RESOURCES_ERROR_CONFLICT,
	HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
	HUMAN_RESOURCES_ERROR_DUPLICATE,
	HUMAN_RESOURCES_ERROR_INVALID_INPUT,
	HUMAN_RESOURCES_ERROR_INVALID_STATE_TRANSITION,
	HUMAN_RESOURCES_ERROR_NOT_FOUND,
	HUMAN_RESOURCES_ERROR_STALE_VERSION,
} from "../src/error-codes";
import { createPosition } from "../src/organization/position";
import { TEST_ORGANIZATION_DIMENSION_KEYS } from "./helpers/command-options";
import {
	createHrParityHarness,
	seedDepartmentAndJob,
	type WorkforceStoreAdapter,
} from "./helpers/hr-parity-harness";
import { createMemoryMutationPorts } from "./helpers/memory-ports";
import { cleanupHumanResourcesNeonOrgs } from "./helpers/neon-cleanup";
import { humanResourcesCodeFromResult } from "./helpers/result-details";

const { hasDatabase } = resolveDatabaseUrlForTests();

function uniqueSuffix(adapter: WorkforceStoreAdapter): string {
	return `${adapter}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function defineCoreParitySuite(adapter: WorkforceStoreAdapter): void {
	const suffix = uniqueSuffix(adapter);
	const ORG_A = `org-hr-parity-a-${suffix}`;
	const ORG_B = `org-hr-parity-b-${suffix}`;
	const ACTOR = `user-hr-parity-${suffix}`;
	const orgIds = [ORG_A, ORG_B] as const;

	afterAll(async () => {
		if (adapter === "drizzle") {
			await cleanupHumanResourcesNeonOrgs(orgIds);
		}
	});

	it("rejects cross-org employment parent", async () => {
		const ready = createHrParityHarness(adapter);
		const employee = await createEmployee(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: `corr-xorg-${suffix}`,
				idempotencyKey: `idem-xorg-${suffix}`,
				employeeNumber: `E-XORG-${suffix}`,
				legalName: "Cross Org",
			},
			ready,
		);
		expect(employee.ok).toBe(true);
		if (!employee.ok) return;

		const employment = await createEmployment(
			{
				organizationId: ORG_B,
				actorUserId: ACTOR,
				correlationId: `corr-xorg-emp-${suffix}`,
				employeeId: employee.data.id,
				startsOn: "2025-01-01",
				endsOn: null,
			},
			ready,
		);
		expect(employment.ok).toBe(false);
		if (!employment.ok) {
			expect(employment.code).toBe("NOT_FOUND");
			expect(humanResourcesCodeFromResult(employment)).toBe(
				HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
			);
		}
	});

	it("rejects closed position on assignment create", async () => {
		const ready = createHrParityHarness(adapter);
		const employee = await createEmployee(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: `corr-inact-1-${suffix}`,
				idempotencyKey: `idem-inact-1-${suffix}`,
				employeeNumber: `E-INACT-${suffix}`,
				legalName: "Closed Position",
			},
			ready,
		);
		expect(employee.ok).toBe(true);
		if (!employee.ok) return;

		const employment = await createEmployment(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: `corr-inact-2-${suffix}`,
				employeeId: employee.data.id,
				startsOn: "2025-01-01",
				endsOn: null,
			},
			ready,
		);
		expect(employment.ok).toBe(true);
		if (!employment.ok) return;

		const seeded = await seedDepartmentAndJob(ready, {
			organizationId: ORG_A,
			actorUserId: ACTOR,
		});
		expect(seeded).not.toBeNull();
		if (!seeded) return;

		const position = await createPosition(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: `corr-inact-3-${suffix}`,
				code: `POS-INACT-${suffix}`,
				title: "Closed Role",
				status: "closed",
				...seeded,
			},
			ready,
		);
		expect(position.ok).toBe(true);
		if (!position.ok) return;

		const assignment = await createAssignment(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: `corr-inact-4-${suffix}`,
				employmentId: employment.data.id,
				positionId: position.data.id,
				...TEST_ORGANIZATION_DIMENSION_KEYS,
				startsOn: "2025-01-01",
				endsOn: null,
			},
			ready,
		);
		expect(assignment.ok).toBe(false);
		if (!assignment.ok) {
			expect(humanResourcesCodeFromResult(assignment)).toBe(
				HUMAN_RESOURCES_ERROR_INVALID_STATE_TRANSITION,
			);
		}
	});

	it("terminate closes ends_on and allows a new open employment", async () => {
		const ready = createHrParityHarness(adapter);
		const employee = await createEmployee(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: `corr-term-1-${suffix}`,
				idempotencyKey: `idem-term-1-${suffix}`,
				employeeNumber: `E-TERM-${suffix}`,
				legalName: "Terminate Close",
			},
			ready,
		);
		expect(employee.ok).toBe(true);
		if (!employee.ok) return;

		const employment = await createEmployment(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: `corr-term-2-${suffix}`,
				employeeId: employee.data.id,
				startsOn: "2025-01-01",
				endsOn: null,
			},
			ready,
		);
		expect(employment.ok).toBe(true);
		if (!employment.ok) return;

		const terminated = await amendEmployment(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: `corr-term-3-${suffix}`,
				employmentId: employment.data.id,
				status: "terminated",
				expectedVersion: 1,
			},
			ready,
		);
		expect(terminated.ok).toBe(true);
		if (!terminated.ok) return;
		expect(terminated.data.status).toBe("terminated");
		expect(terminated.data.endsOn).toBe("2025-01-01");

		const rehire = await createEmployment(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: `corr-term-4-${suffix}`,
				employeeId: employee.data.id,
				startsOn: "2025-07-01",
				endsOn: null,
			},
			ready,
		);
		expect(rehire.ok).toBe(true);
	});

	it("distinguishes stale version from not-found on employee update", async () => {
		const ready = createHrParityHarness(adapter);
		const employee = await createEmployee(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: `corr-ver-1-${suffix}`,
				idempotencyKey: `idem-ver-1-${suffix}`,
				employeeNumber: `E-VER-${suffix}`,
				legalName: "Versioned",
			},
			ready,
		);
		expect(employee.ok).toBe(true);
		if (!employee.ok) return;

		const stale = await updateEmployee(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: `corr-ver-2-${suffix}`,
				employeeId: employee.data.id,
				legalName: "Stale",
				expectedVersion: 99,
			},
			ready,
		);
		expect(stale.ok).toBe(false);
		if (!stale.ok) {
			expect(humanResourcesCodeFromResult(stale)).toBe(
				HUMAN_RESOURCES_ERROR_STALE_VERSION,
			);
		}

		const missing = await updateEmployee(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: `corr-ver-3-${suffix}`,
				employeeId: "00000000-0000-4000-8000-000000000099" as never,
				legalName: "Missing",
				expectedVersion: 1,
			},
			ready,
		);
		expect(missing.ok).toBe(false);
		if (!missing.ok) {
			expect(humanResourcesCodeFromResult(missing)).toBe(
				HUMAN_RESOURCES_ERROR_NOT_FOUND,
			);
		}
	});

	it("rejects open employment unique conflict", async () => {
		const ready = createHrParityHarness(adapter);
		const employee = await createEmployee(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: `corr-open-1-${suffix}`,
				idempotencyKey: `idem-open-1-${suffix}`,
				employeeNumber: `E-OPEN-${suffix}`,
				legalName: "Open Unique",
			},
			ready,
		);
		expect(employee.ok).toBe(true);
		if (!employee.ok) return;

		const first = await createEmployment(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: `corr-open-2-${suffix}`,
				employeeId: employee.data.id,
				startsOn: "2025-01-01",
				endsOn: null,
			},
			ready,
		);
		expect(first.ok).toBe(true);

		const second = await createEmployment(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: `corr-open-3-${suffix}`,
				employeeId: employee.data.id,
				startsOn: "2025-06-01",
				endsOn: null,
			},
			ready,
		);
		expect(second.ok).toBe(false);
		if (!second.ok) {
			expect(humanResourcesCodeFromResult(second)).toBe(
				HUMAN_RESOURCES_ERROR_CONFLICT,
			);
		}
	});

	it("rejects open assignment unique conflict", async () => {
		const ready = createHrParityHarness(adapter);
		const employee = await createEmployee(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: `corr-asg-1-${suffix}`,
				idempotencyKey: `idem-asg-1-${suffix}`,
				employeeNumber: `E-ASG-${suffix}`,
				legalName: "Assignment Unique",
			},
			ready,
		);
		expect(employee.ok).toBe(true);
		if (!employee.ok) return;

		const employment = await createEmployment(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: `corr-asg-2-${suffix}`,
				employeeId: employee.data.id,
				startsOn: "2025-01-01",
				endsOn: null,
			},
			ready,
		);
		expect(employment.ok).toBe(true);
		if (!employment.ok) return;

		const seeded = await seedDepartmentAndJob(ready, {
			organizationId: ORG_A,
			actorUserId: ACTOR,
		});
		expect(seeded).not.toBeNull();
		if (!seeded) return;

		const position = await createPosition(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: `corr-asg-3-${suffix}`,
				code: `POS-ASG-${suffix}`,
				title: "Role",
				status: "active",
				...seeded,
			},
			ready,
		);
		expect(position.ok).toBe(true);
		if (!position.ok) return;

		const first = await createAssignment(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: `corr-asg-4-${suffix}`,
				employmentId: employment.data.id,
				positionId: position.data.id,
				...TEST_ORGANIZATION_DIMENSION_KEYS,
				startsOn: "2025-01-01",
				endsOn: null,
			},
			ready,
		);
		expect(first.ok).toBe(true);
		if (!first.ok) return;

		const second = await createAssignment(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: `corr-asg-5-${suffix}`,
				employmentId: employment.data.id,
				positionId: position.data.id,
				...TEST_ORGANIZATION_DIMENSION_KEYS,
				startsOn: "2025-06-01",
				endsOn: null,
			},
			ready,
		);
		expect(second.ok).toBe(false);
		if (!second.ok) {
			expect(humanResourcesCodeFromResult(second)).toBe(
				HUMAN_RESOURCES_ERROR_CONFLICT,
			);
		}

		const ended = await endAssignment(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: `corr-asg-6-${suffix}`,
				assignmentId: first.data.id,
				endsOn: "2025-05-31",
				expectedVersion: 1,
			},
			ready,
		);
		expect(ended.ok).toBe(true);
	});

	it("rejects invalid employment date range", async () => {
		const ready = createHrParityHarness(adapter);
		const employee = await createEmployee(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: `corr-date-1-${suffix}`,
				idempotencyKey: `idem-date-1-${suffix}`,
				employeeNumber: `E-DATE-${suffix}`,
				legalName: "Date Range",
			},
			ready,
		);
		expect(employee.ok).toBe(true);
		if (!employee.ok) return;

		const employment = await createEmployment(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: `corr-date-2-${suffix}`,
				employeeId: employee.data.id,
				startsOn: "2025-12-31",
				endsOn: "2025-01-01",
			},
			ready,
		);
		expect(employment.ok).toBe(false);
		if (!employment.ok) {
			expect(humanResourcesCodeFromResult(employment)).toBe(
				HUMAN_RESOURCES_ERROR_INVALID_INPUT,
			);
		}
	});

	it("rejects duplicate employment-contract referenceCode", async () => {
		const ready = createHrParityHarness(adapter);
		const employee = await createEmployee(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: `corr-ctr-1-${suffix}`,
				idempotencyKey: `idem-ctr-1-${suffix}`,
				employeeNumber: `E-CTR-${suffix}`,
				legalName: "Contract Dup",
			},
			ready,
		);
		expect(employee.ok).toBe(true);
		if (!employee.ok) return;

		const employment = await createEmployment(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: `corr-ctr-2-${suffix}`,
				employeeId: employee.data.id,
				startsOn: "2025-01-01",
				endsOn: null,
			},
			ready,
		);
		expect(employment.ok).toBe(true);
		if (!employment.ok) return;

		const code = `CONTRACT-${suffix}`;
		const first = await createEmploymentContract(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: `corr-ctr-3-${suffix}`,
				employmentId: employment.data.id,
				referenceCode: code,
				startsOn: "2025-01-01",
				endsOn: null,
			},
			ready,
		);
		expect(first.ok).toBe(true);

		const second = await createEmploymentContract(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: `corr-ctr-4-${suffix}`,
				employmentId: employment.data.id,
				referenceCode: code,
				startsOn: "2025-01-01",
				endsOn: null,
			},
			ready,
		);
		expect(second.ok).toBe(false);
		if (!second.ok) {
			expect(humanResourcesCodeFromResult(second)).toBe(
				HUMAN_RESOURCES_ERROR_DUPLICATE,
			);
		}
	});

	it("keeps mutation + audit + outbox in one TX", async () => {
		const correlationId = `corr-tx-${suffix}`;
		const ready = createHrParityHarness(adapter);

		if (adapter === "memory") {
			const failing = createHrParityHarness("memory");
			failing.ports = createMemoryMutationPorts({ outboxFailAfter: 0 });
			const rolledBack = await createEmployee(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: `${correlationId}-fail`,
					idempotencyKey: `idem-tx-fail-${suffix}`,
					employeeNumber: `E-TX-FAIL-${suffix}`,
					legalName: "TX Fail",
				},
				failing,
			);
			expect(rolledBack.ok).toBe(false);

			const replay = await createEmployee(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: `${correlationId}-ok`,
					idempotencyKey: `idem-tx-fail-${suffix}`,
					employeeNumber: `E-TX-FAIL-${suffix}`,
					legalName: "TX Fail",
				},
				ready,
			);
			expect(replay.ok).toBe(true);
			expect(ready.ports.audit.calls.length).toBeGreaterThanOrEqual(1);
			expect(ready.ports.outbox.calls.length).toBeGreaterThanOrEqual(1);
			expect(
				ready.ports.outbox.calls.some(
					(call) => call.type === HUMAN_RESOURCES_EMPLOYEE_CREATED_EVENT,
				),
			).toBe(true);
			return;
		}

		const created = await createEmployee(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId,
				idempotencyKey: `idem-tx-ok-${suffix}`,
				employeeNumber: `E-TX-OK-${suffix}`,
				legalName: "TX Ok",
			},
			ready,
		);
		expect(created.ok).toBe(true);
		if (!created.ok) return;

		const employment = await createEmployment(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: `${correlationId}-emp`,
				employeeId: created.data.id,
				startsOn: "2025-01-01",
				endsOn: null,
			},
			ready,
		);
		expect(employment.ok).toBe(true);
		if (!employment.ok) return;

		const audits = await db
			.select()
			.from(platformAuditLog)
			.where(
				and(
					eq(platformAuditLog.organizationId, ORG_A),
					eq(platformAuditLog.correlationId, correlationId),
				),
			);
		expect(audits.length).toBeGreaterThanOrEqual(1);
		expect(audits.some((row) => row.entity === "hr_employee")).toBe(true);

		const events = await db
			.select()
			.from(platformDomainEvent)
			.where(
				and(
					eq(platformDomainEvent.organizationId, ORG_A),
					eq(platformDomainEvent.correlationId, `${correlationId}-emp`),
				),
			);
		expect(events.length).toBeGreaterThanOrEqual(1);
		expect(
			events.some(
				(row) => row.type === HUMAN_RESOURCES_EMPLOYMENT_STARTED_EVENT,
			),
		).toBe(true);

		const current = await getEmployment(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: `${correlationId}-get`,
				employmentId: employment.data.id,
			},
			ready,
		);
		expect(current.ok).toBe(true);
		if (current.ok) {
			expect(current.data.status).toBe("active");
			expect(current.data.version).toBe(1);
		}
	});
}

describe("@afenda/human-resources core Memory parity", () => {
	defineCoreParitySuite("memory");
});

describe.skipIf(!hasDatabase)(
	"@afenda/human-resources core Drizzle Neon parity",
	() => {
		defineCoreParitySuite("drizzle");
	},
);
