/**
 * Memory vs Drizzle semantic parity for workforce mutations.
 *
 * Memory cases always run. Drizzle cases hit live Neon and skip cleanly when
 * DATABASE_URL is absent (local). CI / REQUIRE_DATABASE_TESTS=1 fail-closed via
 * `./helpers/database-gate` → `@afenda/testing/require-database-for-ci`.
 */

import { and, db, eq, platformAuditLog, platformDomainEvent } from "@afenda/db";
import {
	HUMAN_RESOURCES_EMPLOYEE_CREATED_EVENT,
	HUMAN_RESOURCES_EMPLOYEE_REHIRED_EVENT,
	HUMAN_RESOURCES_EMPLOYMENT_STARTED_EVENT,
} from "@afenda/events/schemas";
import { afterAll, describe, expect, it } from "vitest";
import { createAssignment, endAssignment, getAssignmentAsOf } from "../src/core/assignment";
import { createEmployee, updateEmployee } from "../src/core/employee";
import {
	amendEmployment,
	correctEmployment,
	createEmployment,
	getEmployment,
	getEmploymentAsOf,
	listEmploymentStatusHistory,
} from "../src/core/employment";
import {
	correctEmploymentContract,
	createEmploymentContract,
	getEmploymentContractAsOf,
	supersedeEmploymentContract,
} from "../src/core/employment-contract";
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
import { transferAssignment } from "../src/lifecycle/transfer";
import { TEST_ORGANIZATION_DIMENSION_KEYS } from "./helpers/command-options";
import { runDrizzleParity } from "./helpers/database-gate";
import {
	createHrParityHarness,
	seedDepartmentAndJob,
	type WorkforceStoreAdapter,
} from "./helpers/hr-parity-harness";
import { createMemoryMutationPorts } from "./helpers/memory-ports";
import { createNeonOrgTracker } from "./helpers/neon-cleanup";
import { humanResourcesCodeFromResult } from "./helpers/result-details";

function uniqueSuffix(adapter: WorkforceStoreAdapter): string {
	return `${adapter}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function defineCoreParitySuite(adapter: WorkforceStoreAdapter): void {
	const suffix = uniqueSuffix(adapter);
	const neonOrgs = createNeonOrgTracker();
	const ORG_A = neonOrgs.trackOrg(`org-hr-parity-a-${suffix}`);
	const ORG_B = neonOrgs.trackOrg(`org-hr-parity-b-${suffix}`);
	const ACTOR = `user-hr-parity-${suffix}`;

	afterAll(async () => {
		if (adapter === "drizzle") {
			await neonOrgs.cleanup();
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
				endsOn: "2025-06-30",
				reasonCode: "initial",
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
				startsOn: "2025-07-01",
				endsOn: null,
				reasonCode: "renewal",
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

	it("employment historical truth parity: as-of, overlap, correction, status history", async () => {
		const ready = createHrParityHarness(adapter);
		const employee = await createEmployee(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: `corr-s43-emp-${suffix}`,
				idempotencyKey: `idem-s43-emp-${suffix}`,
				employeeNumber: `E-S43-${suffix}`,
				legalName: "Slice 4.3",
			},
			ready,
		);
		expect(employee.ok).toBe(true);
		if (!employee.ok) return;

		const future = await createEmployment(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: `corr-s43-future-${suffix}`,
				employeeId: employee.data.id,
				startsOn: "2026-01-01",
				endsOn: null,
			},
			ready,
		);
		expect(future.ok).toBe(true);
		if (!future.ok) return;

		const beforeStart = await getEmploymentAsOf(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: `corr-s43-before-${suffix}`,
				employeeId: employee.data.id,
				asOf: "2025-12-31",
			},
			ready,
		);
		expect(beforeStart.ok).toBe(true);
		if (beforeStart.ok) {
			expect(beforeStart.data).toBeNull();
		}

		const overlapCreate = await createEmployment(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: `corr-s43-overlap-${suffix}`,
				employeeId: employee.data.id,
				startsOn: "2025-12-01",
				endsOn: null,
			},
			ready,
		);
		expect(overlapCreate.ok).toBe(false);
		if (!overlapCreate.ok) {
			expect(humanResourcesCodeFromResult(overlapCreate)).toBe(
				HUMAN_RESOURCES_ERROR_CONFLICT,
			);
		}

		const terminated = await amendEmployment(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: `corr-s43-term-${suffix}`,
				employmentId: future.data.id,
				status: "terminated",
				endsOn: "2026-06-30",
				expectedVersion: 1,
			},
			ready,
		);
		expect(terminated.ok).toBe(true);
		if (!terminated.ok) return;

		if (adapter === "memory") {
			ready.ports.outbox.calls.length = 0;
		}

		const rehire = await createEmployment(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: `corr-s43-rehire-${suffix}`,
				employeeId: employee.data.id,
				startsOn: "2026-07-01",
				endsOn: null,
			},
			ready,
		);
		expect(rehire.ok).toBe(true);
		if (!rehire.ok) return;

		if (adapter === "memory") {
			expect(
				ready.ports.outbox.calls.some(
					(call) => call.type === HUMAN_RESOURCES_EMPLOYEE_REHIRED_EVENT,
				),
			).toBe(true);
		}

		const corrected = await correctEmployment(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: `corr-s43-correct-${suffix}`,
				employmentId: rehire.data.id,
				startsOn: "2026-07-15",
				reason: "Contract evidence",
				effectiveOn: "2026-07-15",
				expectedVersion: 1,
			},
			ready,
		);
		expect(corrected.ok).toBe(true);
		if (!corrected.ok) return;
		expect(corrected.data.startsOn).toBe("2026-07-15");

		const overlappingCorrect = await correctEmployment(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: `corr-s43-overlap-correct-${suffix}`,
				employmentId: rehire.data.id,
				startsOn: "2026-06-15",
				reason: "Would overlap prior tenure",
				expectedVersion: 2,
			},
			ready,
		);
		expect(overlappingCorrect.ok).toBe(false);
		if (!overlappingCorrect.ok) {
			expect(humanResourcesCodeFromResult(overlappingCorrect)).toBe(
				HUMAN_RESOURCES_ERROR_CONFLICT,
			);
		}

		const notice = await amendEmployment(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: `corr-s43-notice-${suffix}`,
				employmentId: rehire.data.id,
				status: "notice",
				effectiveOn: "2026-08-01",
				expectedVersion: 2,
			},
			ready,
		);
		expect(notice.ok).toBe(true);
		if (!notice.ok) return;

		const history = await listEmploymentStatusHistory(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: `corr-s43-history-${suffix}`,
				employmentId: rehire.data.id,
				asOf: "2026-08-15",
			},
			ready,
		);
		expect(history.ok).toBe(true);
		if (!history.ok) return;
		expect(history.data.statusAsOf?.status).toBe("notice");
		expect(
			history.data.history.some((row) => row.changeKind === "correction"),
		).toBe(true);
	});

	it("employment contract historical truth parity: as-of, overlap, correction, supersession", async () => {
		const ready = createHrParityHarness(adapter);
		const employee = await createEmployee(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: `corr-s44-emp-${suffix}`,
				idempotencyKey: `idem-s44-emp-${suffix}`,
				employeeNumber: `E-S44-${suffix}`,
				legalName: "Slice 4.4",
			},
			ready,
		);
		expect(employee.ok).toBe(true);
		if (!employee.ok) return;

		const employment = await createEmployment(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: `corr-s44-employment-${suffix}`,
				employeeId: employee.data.id,
				startsOn: "2026-01-01",
				endsOn: null,
			},
			ready,
		);
		expect(employment.ok).toBe(true);
		if (!employment.ok) return;

		const future = await createEmploymentContract(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: `corr-s44-future-${suffix}`,
				employmentId: employment.data.id,
				referenceCode: `CONTRACT-FUTURE-${suffix}`,
				startsOn: "2026-06-01",
				endsOn: null,
				reasonCode: "initial",
			},
			ready,
		);
		expect(future.ok).toBe(true);
		if (!future.ok) return;

		const beforeStart = await getEmploymentContractAsOf(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: `corr-s44-before-${suffix}`,
				employmentId: employment.data.id,
				asOf: "2026-05-31",
			},
			ready,
		);
		expect(beforeStart.ok).toBe(true);
		if (beforeStart.ok) {
			expect(beforeStart.data).toBeNull();
		}

		const overlapCreate = await createEmploymentContract(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: `corr-s44-overlap-${suffix}`,
				employmentId: employment.data.id,
				referenceCode: `CONTRACT-OVERLAP-${suffix}`,
				startsOn: "2026-06-15",
				endsOn: null,
				reasonCode: "initial",
			},
			ready,
		);
		expect(overlapCreate.ok).toBe(false);
		if (!overlapCreate.ok) {
			expect(humanResourcesCodeFromResult(overlapCreate)).toBe(
				HUMAN_RESOURCES_ERROR_CONFLICT,
			);
		}

		const corrected = await correctEmploymentContract(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: `corr-s44-correct-${suffix}`,
				employmentContractId: future.data.id,
				startsOn: "2026-06-15",
				reasonCode: "date.correction",
				sourceReference: "HR-EVID-S44",
				expectedVersion: 1,
			},
			ready,
		);
		expect(corrected.ok).toBe(true);
		if (!corrected.ok) return;
		expect(corrected.data.startsOn).toBe("2026-06-15");
		expect(corrected.data.version).toBe(2);

		const superseded = await supersedeEmploymentContract(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: `corr-s44-supersede-${suffix}`,
				employmentContractId: corrected.data.id,
				startsOn: "2027-01-01",
				endsOn: "2027-12-31",
				reasonCode: "renewal",
				sourceReference: "CONTRACT-2027",
				expectedVersion: 2,
			},
			ready,
		);
		expect(superseded.ok).toBe(true);
		if (!superseded.ok) return;
		expect(superseded.data.superseded.lineageStatus).toBe("superseded");
		expect(superseded.data.superseded.endsOn).toBe("2026-12-31");
		expect(superseded.data.successor.lineageStatus).toBe("active");

		const atStart = await getEmploymentContractAsOf(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: `corr-s44-asof-start-${suffix}`,
				employmentId: employment.data.id,
				asOf: "2026-06-15",
			},
			ready,
		);
		expect(atStart.ok).toBe(true);
		if (atStart.ok) {
			expect(atStart.data?.id).toBe(corrected.data.id);
		}

		const atEnd = await getEmploymentContractAsOf(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: `corr-s44-asof-end-${suffix}`,
				employmentId: employment.data.id,
				asOf: "2026-12-31",
			},
			ready,
		);
		expect(atEnd.ok).toBe(true);
		if (atEnd.ok) {
			expect(atEnd.data?.id).toBe(corrected.data.id);
		}
	});

	it("assignment historical truth parity: as-of, overlap, transfer lineage", async () => {
		const ready = createHrParityHarness(adapter);
		const employee = await createEmployee(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: `corr-s45-emp-${suffix}`,
				idempotencyKey: `idem-s45-emp-${suffix}`,
				employeeNumber: `E-S45-${suffix}`,
				legalName: "Slice 4.5",
			},
			ready,
		);
		expect(employee.ok).toBe(true);
		if (!employee.ok) return;

		const employment = await createEmployment(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: `corr-s45-employment-${suffix}`,
				employeeId: employee.data.id,
				startsOn: "2026-01-01",
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

		const positionA = await createPosition(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: `corr-s45-pos-a-${suffix}`,
				code: `POS-S45-A-${suffix}`,
				title: "Role A",
				status: "active",
				...seeded,
			},
			ready,
		);
		expect(positionA.ok).toBe(true);
		if (!positionA.ok) return;

		const positionB = await createPosition(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: `corr-s45-pos-b-${suffix}`,
				code: `POS-S45-B-${suffix}`,
				title: "Role B",
				status: "active",
				...seeded,
			},
			ready,
		);
		expect(positionB.ok).toBe(true);
		if (!positionB.ok) return;

		const closed = await createAssignment(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: `corr-s45-closed-${suffix}`,
				employmentId: employment.data.id,
				positionId: positionA.data.id,
				...TEST_ORGANIZATION_DIMENSION_KEYS,
				startsOn: "2026-01-01",
				endsOn: "2026-05-31",
			},
			ready,
		);
		expect(closed.ok).toBe(true);
		if (!closed.ok) return;

		const future = await createAssignment(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: `corr-s45-future-${suffix}`,
				employmentId: employment.data.id,
				positionId: positionA.data.id,
				...TEST_ORGANIZATION_DIMENSION_KEYS,
				startsOn: "2026-06-01",
				endsOn: null,
			},
			ready,
		);
		expect(future.ok).toBe(true);
		if (!future.ok) return;

		const beforeFuture = await getAssignmentAsOf(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: `corr-s45-before-${suffix}`,
				employmentId: employment.data.id,
				asOf: "2026-05-15",
			},
			ready,
		);
		expect(beforeFuture.ok).toBe(true);
		if (beforeFuture.ok) {
			expect(beforeFuture.data?.id).toBe(closed.data.id);
		}

		const overlap = await createAssignment(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: `corr-s45-overlap-${suffix}`,
				employmentId: employment.data.id,
				positionId: positionA.data.id,
				...TEST_ORGANIZATION_DIMENSION_KEYS,
				startsOn: "2026-06-15",
				endsOn: null,
			},
			ready,
		);
		expect(overlap.ok).toBe(false);
		if (!overlap.ok) {
			expect(humanResourcesCodeFromResult(overlap)).toBe(
				HUMAN_RESOURCES_ERROR_CONFLICT,
			);
		}

		const transfer = await transferAssignment(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: `corr-s45-transfer-${suffix}`,
				idempotencyKey: `idem-s45-transfer-${suffix}`,
				employmentId: employment.data.id,
				toPositionId: positionB.data.id,
				...TEST_ORGANIZATION_DIMENSION_KEYS,
				effectiveOn: "2026-08-01",
				reason: "Parity transfer",
			},
			ready,
		);
		expect(transfer.ok).toBe(true);
		if (!transfer.ok) return;

		const predecessor = await ready.store.getAssignmentById({
			organizationId: ORG_A,
			assignmentId: transfer.data.fromAssignmentId,
		});
		const successor = await ready.store.getAssignmentById({
			organizationId: ORG_A,
			assignmentId: transfer.data.toAssignmentId,
		});
		expect(predecessor.ok).toBe(true);
		expect(successor.ok).toBe(true);
		if (!predecessor.ok || !successor.ok || !predecessor.data || !successor.data) {
			return;
		}
		expect(predecessor.data.successorAssignmentId).toBe(successor.data.id);
		expect(predecessor.data.transferMovementId).toBe(transfer.data.id);
		expect(successor.data.predecessorAssignmentId).toBe(predecessor.data.id);
		expect(successor.data.transferMovementId).toBe(transfer.data.id);

		const onTransferDay = await getAssignmentAsOf(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: `corr-s45-transfer-day-${suffix}`,
				employmentId: employment.data.id,
				asOf: "2026-08-01",
			},
			ready,
		);
		expect(onTransferDay.ok).toBe(true);
		if (onTransferDay.ok) {
			expect(onTransferDay.data?.id).toBe(successor.data.id);
		}
	});
}

describe("@afenda/human-resources core Memory parity", () => {
	defineCoreParitySuite("memory");
});

describe.skipIf(!runDrizzleParity)(
	"@afenda/human-resources core Drizzle Neon parity",
	() => {
		defineCoreParitySuite("drizzle");
	},
);
