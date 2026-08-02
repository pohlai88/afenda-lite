import { randomUUID } from "node:crypto";
import { HUMAN_RESOURCES_EMPLOYEE_REHIRED_EVENT } from "@afenda/events/schemas";
import { describe, expect, it } from "vitest";
import type { MemoryHumanResourcesStore } from "../src/composition/adapters/memory/store";
import { transferAssignment } from "../src/features/employment-lifecycle/transfer";
import { createPosition } from "../src/features/organization/position";
import { assignPrimaryReportingLine } from "../src/features/organization/reporting-line";
import {
	assignEmploymentCalendar,
	createWorkCalendar,
} from "../src/features/time/calendar";
import {
	createAssignment,
	endAssignment,
	getAssignmentAsOf,
} from "../src/features/workforce-records/employment/assignment";
import { withDefaultAssignmentLineage } from "../src/features/workforce-records/employment/assignment-lineage-map";
import {
	createEmployee,
	listEmployees,
	updateEmployee,
} from "../src/features/workforce-records/employment/employee";
import {
	amendEmployment,
	correctEmployment,
	createEmployment,
	getEmploymentAsOf,
	listEmploymentStatusHistory,
} from "../src/features/workforce-records/employment/employment";
import {
	correctEmploymentContract,
	createEmploymentContract,
	endEmploymentContract,
	getCurrentEmploymentContract,
	getEmploymentContract,
	getEmploymentContractAsOf,
	listEmploymentContracts,
	supersedeEmploymentContract,
} from "../src/features/workforce-records/employment/employment-contract";
import {
	amendEmploymentContract,
	renewEmploymentContract,
} from "../src/features/workforce-records/employment/employment-contract-management";
import {
	hireEmployment,
	reactivateEmployment,
	rehireEmployment,
	suspendEmployment,
	terminateEmployment,
} from "../src/features/workforce-records/employment/employment-management";
import { resolveEmployeeOrgContextAsOf } from "../src/features/workforce-records/employment/org-context";
import { HUMAN_RESOURCES_PERMISSION_CODES } from "../src/kernel/authorization/permissions";
import {
	HUMAN_RESOURCES_ERROR_ASSIGNMENT_OUTSIDE_EMPLOYMENT_RANGE,
	HUMAN_RESOURCES_ERROR_CONFLICT,
	HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
	HUMAN_RESOURCES_ERROR_DUPLICATE,
	HUMAN_RESOURCES_ERROR_FORBIDDEN,
	HUMAN_RESOURCES_ERROR_INVALID_INPUT,
	HUMAN_RESOURCES_ERROR_INVALID_STATE_TRANSITION,
	HUMAN_RESOURCES_ERROR_MULTIPLE_PRIMARY_ASSIGNMENTS,
	HUMAN_RESOURCES_ERROR_NOT_FOUND,
	HUMAN_RESOURCES_ERROR_REHIRE_REQUIRES_ENDED_EMPLOYMENT,
	HUMAN_RESOURCES_ERROR_STALE_VERSION,
} from "../src/kernel/execution/error-codes";
import { parseHumanResourcesAssignmentId } from "../src/kernel/identity/brands";
import {
	createMemoryHumanResourcesStore,
	createMemoryOrganizationDimensionDirectory,
} from "../src/testing/index";
import { TEST_ORGANIZATION_DIMENSION_KEYS } from "./helpers/command-options";
import { createFailingOrganizationDimensionDirectory } from "./helpers/failing-organization-dimension-directory";
import { helperAssert as assert } from "./helpers/helper-assert";
import { createGrantingHumanResourcesAuthorization } from "./helpers/memory-authorization";
import { createMemoryMutationPorts } from "./helpers/memory-ports";
import { humanResourcesCodeFromResult } from "./helpers/result-details";
import { seedDepartmentAndJob } from "./helpers/seed-department-and-job";

const ORG_A = "org-a";
const ORG_B = "org-b";
const ACTOR = "user-actor-1";

function harness() {
	const store = createMemoryHumanResourcesStore();
	const ports = createMemoryMutationPorts();
	const authorization = createGrantingHumanResourcesAuthorization([
		...HUMAN_RESOURCES_PERMISSION_CODES,
	]);
	return {
		store,
		ports,
		authorization,
		organizationDimensions: createMemoryOrganizationDimensionDirectory(),
	};
}

describe("@afenda/human-resources core operations", () => {
	describe("updateEmployee", () => {
		it("updates an employee successfully", async () => {
			const ready = harness();
			const created = await createEmployee(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-create-1",
					idempotencyKey: "idem-create-1",
					employeeNumber: "E-100",
					legalName: "Original Name",
				},
				ready,
			);
			expect(created.ok).toBe(true);
			if (!created.ok) {
				return;
			}

			const updated = await updateEmployee(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-update-1",
					employeeId: created.data.id,
					legalName: "Updated Name",
					expectedVersion: 1,
				},
				ready,
			);
			expect(updated.ok).toBe(true);
			if (updated.ok) {
				expect(updated.data.legalName).toBe("Updated Name");
				expect(updated.data.version).toBe(2);
			}
		});

		it("rejects malformed input", async () => {
			const ready = harness();
			const result = await updateEmployee(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-malformed-1",
					employeeId: "" as never,
					legalName: "",
					expectedVersion: 1,
				},
				ready,
			);
			expect(result.ok).toBe(false);
			if (!result.ok) {
				expect(humanResourcesCodeFromResult(result)).toBe(
					HUMAN_RESOURCES_ERROR_INVALID_INPUT,
				);
			}
		});

		it("rejects unauthorized actor", async () => {
			const ready = harness();
			ready.authorization = createGrantingHumanResourcesAuthorization([]);
			const created = await createEmployee(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-create-1",
					idempotencyKey: "idem-create-1",
					employeeNumber: "E-101",
					legalName: "Name",
				},
				harness(),
			);
			expect(created.ok).toBe(true);
			if (!created.ok) {
				return;
			}

			const updated = await updateEmployee(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-update-1",
					employeeId: created.data.id,
					legalName: "Updated",
					expectedVersion: 1,
				},
				ready,
			);
			expect(updated.ok).toBe(false);
			if (!updated.ok) {
				expect(humanResourcesCodeFromResult(updated)).toBe(
					HUMAN_RESOURCES_ERROR_FORBIDDEN,
				);
			}
		});

		it("rejects missing employee", async () => {
			const ready = harness();
			const updated = await updateEmployee(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-update-1",
					employeeId: "00000000-0000-0000-0000-000000000000" as never,
					legalName: "Updated",
					expectedVersion: 1,
				},
				ready,
			);
			expect(updated.ok).toBe(false);
			if (!updated.ok) {
				expect(humanResourcesCodeFromResult(updated)).toBe(
					HUMAN_RESOURCES_ERROR_NOT_FOUND,
				);
			}
		});

		it("rejects cross-org access", async () => {
			const ready = harness();
			const created = await createEmployee(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-create-1",
					idempotencyKey: "idem-create-1",
					employeeNumber: "E-102",
					legalName: "Name",
				},
				ready,
			);
			expect(created.ok).toBe(true);
			if (!created.ok) {
				return;
			}

			const updated = await updateEmployee(
				{
					organizationId: ORG_B,
					actorUserId: ACTOR,
					correlationId: "corr-update-1",
					employeeId: created.data.id,
					legalName: "Updated",
					expectedVersion: 1,
				},
				ready,
			);
			expect(updated.ok).toBe(false);
			if (!updated.ok) {
				expect(humanResourcesCodeFromResult(updated)).toBe(
					HUMAN_RESOURCES_ERROR_NOT_FOUND,
				);
			}
		});

		it("rejects stale expectedVersion", async () => {
			const ready = harness();
			const created = await createEmployee(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-create-1",
					idempotencyKey: "idem-create-1",
					employeeNumber: "E-103",
					legalName: "Name",
				},
				ready,
			);
			expect(created.ok).toBe(true);
			if (!created.ok) {
				return;
			}

			const updated = await updateEmployee(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-update-1",
					employeeId: created.data.id,
					legalName: "Updated",
					expectedVersion: 99,
				},
				ready,
			);
			expect(updated.ok).toBe(false);
			if (!updated.ok) {
				expect(humanResourcesCodeFromResult(updated)).toBe(
					HUMAN_RESOURCES_ERROR_STALE_VERSION,
				);
			}
		});
	});

	describe("listEmployees", () => {
		it("lists employees successfully", async () => {
			const ready = harness();
			await createEmployee(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-1",
					idempotencyKey: "idem-1",
					employeeNumber: "E-200",
					legalName: "Alice",
				},
				ready,
			);
			await createEmployee(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-2",
					idempotencyKey: "idem-2",
					employeeNumber: "E-201",
					legalName: "Bob",
				},
				ready,
			);

			const list = await listEmployees(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-list-1",
					page: 1,
					pageSize: 10,
				},
				ready,
			);
			expect(list.ok).toBe(true);
			if (list.ok) {
				expect(list.data.employees).toHaveLength(2);
				expect(list.data.totalCount).toBe(2);
			}
		});

		it("rejects unauthorized actor", async () => {
			const ready = harness();
			ready.authorization = createGrantingHumanResourcesAuthorization([]);

			const list = await listEmployees(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-1",
					page: 1,
					pageSize: 10,
				},
				ready,
			);
			expect(list.ok).toBe(false);
			if (!list.ok) {
				expect(humanResourcesCodeFromResult(list)).toBe(
					HUMAN_RESOURCES_ERROR_FORBIDDEN,
				);
			}
		});

		it("filters by organization", async () => {
			const ready = harness();
			await createEmployee(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-1",
					idempotencyKey: "idem-1",
					employeeNumber: "E-300",
					legalName: "Alice",
				},
				ready,
			);
			await createEmployee(
				{
					organizationId: ORG_B,
					actorUserId: ACTOR,
					correlationId: "corr-2",
					idempotencyKey: "idem-2",
					employeeNumber: "E-301",
					legalName: "Bob",
				},
				ready,
			);

			const listA = await listEmployees(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-list-1",
					page: 1,
					pageSize: 10,
				},
				ready,
			);
			expect(listA.ok).toBe(true);
			if (listA.ok) {
				expect(listA.data.employees).toHaveLength(1);
				expect(listA.data.employees[0]?.organizationId).toBe(ORG_A);
			}
		});
	});

	describe("createEmployment", () => {
		it("creates an employment successfully", async () => {
			const ready = harness();
			const employee = await createEmployee(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-1",
					idempotencyKey: "idem-1",
					employeeNumber: "E-400",
					legalName: "Name",
				},
				ready,
			);
			expect(employee.ok).toBe(true);
			if (!employee.ok) {
				return;
			}

			const employment = await createEmployment(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-2",
					employeeId: employee.data.id,
					startsOn: "2025-01-01",
					endsOn: null,
				},
				ready,
			);
			expect(employment.ok).toBe(true);
			if (employment.ok) {
				expect(employment.data.status).toBe("active");
				expect(employment.data.startsOn).toBe("2025-01-01");
			}
		});

		it("rejects malformed input", async () => {
			const ready = harness();
			const result = await createEmployment(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-1",
					employeeId: "" as never,
					startsOn: "",
					endsOn: null,
				},
				ready,
			);
			expect(result.ok).toBe(false);
			if (!result.ok) {
				expect(humanResourcesCodeFromResult(result)).toBe(
					HUMAN_RESOURCES_ERROR_INVALID_INPUT,
				);
			}
		});

		it("rejects unauthorized actor", async () => {
			const ready = harness();
			const employee = await createEmployee(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-1",
					idempotencyKey: "idem-1",
					employeeNumber: "E-401",
					legalName: "Name",
				},
				harness(),
			);
			expect(employee.ok).toBe(true);
			if (!employee.ok) {
				return;
			}

			ready.authorization = createGrantingHumanResourcesAuthorization([]);
			const employment = await createEmployment(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-2",
					employeeId: employee.data.id,
					startsOn: "2025-01-01",
					endsOn: null,
				},
				ready,
			);
			expect(employment.ok).toBe(false);
			if (!employment.ok) {
				expect(humanResourcesCodeFromResult(employment)).toBe(
					HUMAN_RESOURCES_ERROR_FORBIDDEN,
				);
			}
		});

		it("rejects missing employee", async () => {
			const ready = harness();
			const employment = await createEmployment(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-missing-employee",
					employeeId: "00000000-0000-4000-8000-000000000001" as never,
					startsOn: "2025-01-01",
					endsOn: null,
				},
				ready,
			);
			expect(employment.ok).toBe(false);
			if (!employment.ok) {
				expect(employment.code).toBe("NOT_FOUND");
			}
		});

		it("rejects cross-org employee reference", async () => {
			const ready = harness();
			const employee = await createEmployee(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-xorg-1",
					idempotencyKey: "idem-xorg-1",
					employeeNumber: "E-XORG",
					legalName: "Name",
				},
				ready,
			);
			expect(employee.ok).toBe(true);
			if (!employee.ok) {
				return;
			}

			const employment = await createEmployment(
				{
					organizationId: ORG_B,
					actorUserId: ACTOR,
					correlationId: "corr-xorg-2",
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

		it("rejects duplicate open employment", async () => {
			const ready = harness();
			const employee = await createEmployee(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-1",
					idempotencyKey: "idem-1",
					employeeNumber: "E-402",
					legalName: "Name",
				},
				ready,
			);
			expect(employee.ok).toBe(true);
			if (!employee.ok) {
				return;
			}

			const first = await createEmployment(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-2",
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
					correlationId: "corr-3",
					employeeId: employee.data.id,
					startsOn: "2025-06-01",
					endsOn: null,
				},
				ready,
			);
			expect(second.ok).toBe(false);
			if (!second.ok) {
				expect(humanResourcesCodeFromResult(second)).toBe(
					HUMAN_RESOURCES_ERROR_REHIRE_REQUIRES_ENDED_EMPLOYMENT,
				);
			}
		});

		it("rejects invalid date range (endsOn before startsOn)", async () => {
			const ready = harness();
			const employee = await createEmployee(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-1",
					idempotencyKey: "idem-1",
					employeeNumber: "E-403",
					legalName: "Name",
				},
				ready,
			);
			expect(employee.ok).toBe(true);
			if (!employee.ok) {
				return;
			}

			const employment = await createEmployment(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-2",
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
	});

	describe("amendEmployment", () => {
		it("amends employment status successfully", async () => {
			const ready = harness();
			const employee = await createEmployee(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-1",
					idempotencyKey: "idem-1",
					employeeNumber: "E-500",
					legalName: "Name",
				},
				ready,
			);
			expect(employee.ok).toBe(true);
			if (!employee.ok) {
				return;
			}

			const employment = await createEmployment(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-2",
					employeeId: employee.data.id,
					startsOn: "2025-01-01",
					endsOn: null,
				},
				ready,
			);
			expect(employment.ok).toBe(true);
			if (!employment.ok) {
				return;
			}

			const amended = await amendEmployment(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-3",
					employmentId: employment.data.id,
					status: "notice",
					expectedVersion: 1,
				},
				ready,
			);
			expect(amended.ok).toBe(true);
			if (amended.ok) {
				expect(amended.data.status).toBe("notice");
				expect(amended.data.version).toBe(2);
			}
		});

		it("transitions active→notice→terminated successfully", async () => {
			const ready = harness();
			const employee = await createEmployee(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-1",
					idempotencyKey: "idem-1",
					employeeNumber: "E-501",
					legalName: "Name",
				},
				ready,
			);
			expect(employee.ok).toBe(true);
			if (!employee.ok) {
				return;
			}

			const employment = await createEmployment(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-2",
					employeeId: employee.data.id,
					startsOn: "2025-01-01",
					endsOn: null,
				},
				ready,
			);
			expect(employment.ok).toBe(true);
			if (!employment.ok) {
				return;
			}
			expect(employment.data.status).toBe("active");

			const notice = await amendEmployment(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-3",
					employmentId: employment.data.id,
					status: "notice",
					expectedVersion: 1,
				},
				ready,
			);
			expect(notice.ok).toBe(true);
			if (!notice.ok) {
				return;
			}
			expect(notice.data.status).toBe("notice");

			const terminated = await amendEmployment(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-4",
					employmentId: employment.data.id,
					status: "terminated",
					expectedVersion: 2,
				},
				ready,
			);
			expect(terminated.ok).toBe(true);
			if (terminated.ok) {
				expect(terminated.data.status).toBe("terminated");
				expect(terminated.data.endsOn).toBe("2025-01-01");
			}

			const rehire = await createEmployment(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-rehire",
					employeeId: employee.data.id,
					startsOn: "2025-07-01",
					endsOn: null,
				},
				ready,
			);
			expect(rehire.ok).toBe(true);
		});

		it("rejects terminated→active transition", async () => {
			const ready = harness();
			const employee = await createEmployee(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-1",
					idempotencyKey: "idem-1",
					employeeNumber: "E-502",
					legalName: "Name",
				},
				ready,
			);
			expect(employee.ok).toBe(true);
			if (!employee.ok) {
				return;
			}

			const employment = await createEmployment(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-2",
					employeeId: employee.data.id,
					startsOn: "2025-01-01",
					endsOn: null,
				},
				ready,
			);
			expect(employment.ok).toBe(true);
			if (!employment.ok) {
				return;
			}

			const terminated = await amendEmployment(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-3",
					employmentId: employment.data.id,
					status: "terminated",
					expectedVersion: 1,
				},
				ready,
			);
			expect(terminated.ok).toBe(true);
			if (!terminated.ok) {
				return;
			}

			const reactivate = await amendEmployment(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-4",
					employmentId: employment.data.id,
					status: "active",
					expectedVersion: 2,
				},
				ready,
			);
			expect(reactivate.ok).toBe(false);
			if (!reactivate.ok) {
				expect(humanResourcesCodeFromResult(reactivate)).toBe(
					HUMAN_RESOURCES_ERROR_INVALID_STATE_TRANSITION,
				);
			}
		});

		it("rejects stale expectedVersion", async () => {
			const ready = harness();
			const employee = await createEmployee(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-1",
					idempotencyKey: "idem-1",
					employeeNumber: "E-503",
					legalName: "Name",
				},
				ready,
			);
			expect(employee.ok).toBe(true);
			if (!employee.ok) {
				return;
			}

			const employment = await createEmployment(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-2",
					employeeId: employee.data.id,
					startsOn: "2025-01-01",
					endsOn: null,
				},
				ready,
			);
			expect(employment.ok).toBe(true);
			if (!employment.ok) {
				return;
			}

			const amended = await amendEmployment(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-3",
					employmentId: employment.data.id,
					status: "notice",
					expectedVersion: 99,
				},
				ready,
			);
			expect(amended.ok).toBe(false);
			if (!amended.ok) {
				expect(humanResourcesCodeFromResult(amended)).toBe(
					HUMAN_RESOURCES_ERROR_STALE_VERSION,
				);
			}
		});
	});

	describe("employment management (Slice 5.4)", () => {
		async function seedEmployee(
			ready: ReturnType<typeof harness>,
			suffix: string,
		) {
			return await createEmployee(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: `corr-s54-emp-${suffix}`,
					idempotencyKey: `idem-s54-emp-${suffix}`,
					employeeNumber: `E-S54-${suffix}`,
					legalName: "Slice 5.4",
				},
				ready,
			);
		}

		it("hires via hireEmployment alias", async () => {
			const ready = harness();
			const employee = await seedEmployee(ready, "hire");
			expect(employee.ok).toBe(true);
			if (!employee.ok) {
				return;
			}

			const hired = await hireEmployment(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-s54-hire",
					employeeId: employee.data.id,
					startsOn: "2025-01-01",
					endsOn: null,
				},
				ready,
			);
			expect(hired.ok).toBe(true);
			if (hired.ok) {
				expect(hired.data.status).toBe("active");
			}
		});

		it("blocks rehire while open employment with REHIRE_REQUIRES_ENDED_EMPLOYMENT", async () => {
			const ready = harness();
			const employee = await seedEmployee(ready, "block-rehire");
			expect(employee.ok).toBe(true);
			if (!employee.ok) {
				return;
			}

			const first = await createEmployment(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-s54-first",
					employeeId: employee.data.id,
					startsOn: "2025-01-01",
					endsOn: null,
				},
				ready,
			);
			expect(first.ok).toBe(true);
			if (!first.ok) {
				return;
			}

			const blocked = await rehireEmployment(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-s54-blocked",
					employeeId: employee.data.id,
					startsOn: "2025-06-01",
					endsOn: null,
				},
				ready,
			);
			expect(blocked.ok).toBe(false);
			if (!blocked.ok) {
				expect(humanResourcesCodeFromResult(blocked)).toBe(
					HUMAN_RESOURCES_ERROR_REHIRE_REQUIRES_ENDED_EMPLOYMENT,
				);
			}
		});

		it("rehires after termination with preserved prior history", async () => {
			const ready = harness();
			const employee = await seedEmployee(ready, "rehire");
			expect(employee.ok).toBe(true);
			if (!employee.ok) {
				return;
			}

			const first = await createEmployment(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-s54-first-tenure",
					employeeId: employee.data.id,
					startsOn: "2024-01-01",
					endsOn: null,
				},
				ready,
			);
			expect(first.ok).toBe(true);
			if (!first.ok) {
				return;
			}

			const terminated = await terminateEmployment(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-s54-term",
					employmentId: first.data.id,
					expectedVersion: 1,
				},
				ready,
			);
			expect(terminated.ok).toBe(true);
			if (!terminated.ok) {
				return;
			}

			const priorHistory = await listEmploymentStatusHistory(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-s54-prior-history",
					employmentId: first.data.id,
				},
				ready,
			);
			expect(priorHistory.ok).toBe(true);
			if (!priorHistory.ok) {
				return;
			}
			expect(priorHistory.data.history.length).toBeGreaterThan(0);

			const rehired = await rehireEmployment(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-s54-rehire",
					employeeId: employee.data.id,
					startsOn: "2025-07-01",
					endsOn: null,
				},
				ready,
			);
			expect(rehired.ok).toBe(true);
			if (!rehired.ok) {
				return;
			}
			expect(rehired.data.id).not.toBe(first.data.id);
			expect(rehired.data.status).toBe("active");
		});

		it("suspends active employment and reactivates from notice", async () => {
			const ready = harness();
			const employee = await seedEmployee(ready, "suspend");
			expect(employee.ok).toBe(true);
			if (!employee.ok) {
				return;
			}

			const employment = await createEmployment(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-s54-create",
					employeeId: employee.data.id,
					startsOn: "2025-01-01",
					endsOn: null,
				},
				ready,
			);
			expect(employment.ok).toBe(true);
			if (!employment.ok) {
				return;
			}

			const suspended = await suspendEmployment(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-s54-suspend",
					employmentId: employment.data.id,
					effectiveOn: "2025-03-01",
					expectedVersion: 1,
				},
				ready,
			);
			expect(suspended.ok).toBe(true);
			if (!suspended.ok) {
				return;
			}
			expect(suspended.data.status).toBe("notice");

			const reactivated = await reactivateEmployment(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-s54-reactivate",
					employmentId: employment.data.id,
					effectiveOn: "2025-04-01",
					expectedVersion: 2,
				},
				ready,
			);
			expect(reactivated.ok).toBe(true);
			if (reactivated.ok) {
				expect(reactivated.data.status).toBe("active");
			}

			const history = await listEmploymentStatusHistory(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-s54-suspend-history",
					employmentId: employment.data.id,
					asOf: "2025-03-15",
				},
				ready,
			);
			expect(history.ok).toBe(true);
			if (history.ok) {
				expect(history.data.statusAsOf?.status).toBe("notice");
			}
		});

		it("terminates via terminateEmployment with future-dated effectiveOn", async () => {
			const ready = harness();
			const employee = await seedEmployee(ready, "terminate");
			expect(employee.ok).toBe(true);
			if (!employee.ok) {
				return;
			}

			const employment = await createEmployment(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-s54-term-create",
					employeeId: employee.data.id,
					startsOn: "2025-01-01",
					endsOn: null,
				},
				ready,
			);
			expect(employment.ok).toBe(true);
			if (!employment.ok) {
				return;
			}

			const terminated = await terminateEmployment(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-s54-term-future",
					employmentId: employment.data.id,
					effectiveOn: "2025-12-31",
					expectedVersion: 1,
				},
				ready,
			);
			expect(terminated.ok).toBe(true);
			if (terminated.ok) {
				expect(terminated.data.status).toBe("terminated");
			}
		});
	});

	describe("employment historical truth (Slice 4.3)", () => {
		it("allows future-dated create and resolves getEmploymentAsOf by tenure range", async () => {
			const ready = harness();
			const employee = await createEmployee(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-future-emp",
					idempotencyKey: "idem-future-emp",
					employeeNumber: "E-FUTURE",
					legalName: "Future Hire",
				},
				ready,
			);
			expect(employee.ok).toBe(true);
			if (!employee.ok) {
				return;
			}

			const employment = await createEmployment(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-future-create",
					employeeId: employee.data.id,
					startsOn: "2026-01-01",
					endsOn: null,
				},
				ready,
			);
			expect(employment.ok).toBe(true);
			if (!employment.ok) {
				return;
			}
			expect(employment.data.status).toBe("active");

			const beforeStart = await getEmploymentAsOf(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-future-before",
					employeeId: employee.data.id,
					asOf: "2025-12-31",
				},
				ready,
			);
			expect(beforeStart.ok).toBe(true);
			if (beforeStart.ok) {
				expect(beforeStart.data).toBeNull();
			}

			const onStart = await getEmploymentAsOf(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-future-on",
					employeeId: employee.data.id,
					asOf: "2026-01-01",
				},
				ready,
			);
			expect(onStart.ok).toBe(true);
			if (onStart.ok) {
				expect(onStart.data?.id).toBe(employment.data.id);
			}
		});

		it("appends lifecycle history when employment is terminated", async () => {
			const ready = harness();
			const employee = await createEmployee(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-term-emp",
					idempotencyKey: "idem-term-emp",
					employeeNumber: "E-TERM-HIST",
					legalName: "Terminate Hist",
				},
				ready,
			);
			expect(employee.ok).toBe(true);
			if (!employee.ok) {
				return;
			}

			const employment = await createEmployment(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-term-create",
					employeeId: employee.data.id,
					startsOn: "2025-01-01",
					endsOn: null,
				},
				ready,
			);
			expect(employment.ok).toBe(true);
			if (!employment.ok) {
				return;
			}

			const terminated = await amendEmployment(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-term-amend",
					employmentId: employment.data.id,
					status: "terminated",
					endsOn: "2025-06-30",
					expectedVersion: 1,
				},
				ready,
			);
			expect(terminated.ok).toBe(true);
			if (!terminated.ok) {
				return;
			}

			const history = await listEmploymentStatusHistory(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-term-history",
					employmentId: employment.data.id,
				},
				ready,
			);
			expect(history.ok).toBe(true);
			if (!history.ok) {
				return;
			}
			expect(
				history.data.history.some(
					(row) => row.changeKind === "create" && row.toStatus === "active",
				),
			).toBe(true);
			expect(
				history.data.history.some(
					(row) =>
						row.changeKind === "lifecycle" &&
						row.fromStatus === "active" &&
						row.toStatus === "terminated",
				),
			).toBe(true);
		});

		it("emits employee.rehired when creating employment after a closed tenure", async () => {
			const ready = harness();
			const employee = await createEmployee(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-rehire-emp",
					idempotencyKey: "idem-rehire-emp",
					employeeNumber: "E-REHIRE",
					legalName: "Rehire",
				},
				ready,
			);
			expect(employee.ok).toBe(true);
			if (!employee.ok) {
				return;
			}

			const first = await createEmployment(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-rehire-first",
					employeeId: employee.data.id,
					startsOn: "2024-01-01",
					endsOn: null,
				},
				ready,
			);
			expect(first.ok).toBe(true);
			if (!first.ok) {
				return;
			}

			const terminated = await amendEmployment(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-rehire-term",
					employmentId: first.data.id,
					status: "terminated",
					endsOn: "2024-12-31",
					expectedVersion: 1,
				},
				ready,
			);
			expect(terminated.ok).toBe(true);
			if (!terminated.ok) {
				return;
			}

			ready.ports.outbox.calls.length = 0;

			const rehire = await createEmployment(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-rehire-second",
					employeeId: employee.data.id,
					startsOn: "2025-07-01",
					endsOn: null,
				},
				ready,
			);
			expect(rehire.ok).toBe(true);
			if (!rehire.ok) {
				return;
			}
			expect(rehire.data.id).not.toBe(first.data.id);
			expect(
				ready.ports.outbox.calls.some(
					(call) => call.type === HUMAN_RESOURCES_EMPLOYEE_REHIRED_EVENT,
				),
			).toBe(true);
		});

		it("rejects overlapping employment ranges on create and correct", async () => {
			const ready = harness();
			const employee = await createEmployee(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-overlap-emp",
					idempotencyKey: "idem-overlap-emp",
					employeeNumber: "E-OVERLAP",
					legalName: "Overlap",
				},
				ready,
			);
			expect(employee.ok).toBe(true);
			if (!employee.ok) {
				return;
			}

			const closed = await createEmployment(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-overlap-first",
					employeeId: employee.data.id,
					startsOn: "2025-01-01",
					endsOn: "2025-06-30",
				},
				ready,
			);
			expect(closed.ok).toBe(true);
			if (!closed.ok) {
				return;
			}

			const overlappingCreate = await createEmployment(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-overlap-create",
					employeeId: employee.data.id,
					startsOn: "2025-03-01",
					endsOn: null,
				},
				ready,
			);
			expect(overlappingCreate.ok).toBe(false);
			if (!overlappingCreate.ok) {
				expect(humanResourcesCodeFromResult(overlappingCreate)).toBe(
					HUMAN_RESOURCES_ERROR_CONFLICT,
				);
			}

			const terminated = await amendEmployment(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-overlap-term",
					employmentId: closed.data.id,
					status: "terminated",
					endsOn: "2025-06-30",
					expectedVersion: 1,
				},
				ready,
			);
			expect(terminated.ok).toBe(true);
			if (!terminated.ok) {
				return;
			}

			const second = await createEmployment(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-overlap-second",
					employeeId: employee.data.id,
					startsOn: "2025-07-01",
					endsOn: null,
				},
				ready,
			);
			expect(second.ok).toBe(true);
			if (!second.ok) {
				return;
			}

			const overlappingCorrect = await correctEmployment(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-overlap-correct",
					employmentId: second.data.id,
					startsOn: "2025-06-01",
					reason: "Backdated start overlaps prior tenure",
					expectedVersion: 1,
				},
				ready,
			);
			expect(overlappingCorrect.ok).toBe(false);
			if (!overlappingCorrect.ok) {
				expect(humanResourcesCodeFromResult(overlappingCorrect)).toBe(
					HUMAN_RESOURCES_ERROR_CONFLICT,
				);
			}
		});

		it("rejects terminated→active via correctEmployment", async () => {
			const ready = harness();
			const employee = await createEmployee(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-correct-emp",
					idempotencyKey: "idem-correct-emp",
					employeeNumber: "E-CORRECT-ILLEGAL",
					legalName: "Correct Illegal",
				},
				ready,
			);
			expect(employee.ok).toBe(true);
			if (!employee.ok) {
				return;
			}

			const employment = await createEmployment(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-correct-create",
					employeeId: employee.data.id,
					startsOn: "2025-01-01",
					endsOn: null,
				},
				ready,
			);
			expect(employment.ok).toBe(true);
			if (!employment.ok) {
				return;
			}

			const terminated = await amendEmployment(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-correct-term",
					employmentId: employment.data.id,
					status: "terminated",
					endsOn: "2025-06-30",
					expectedVersion: 1,
				},
				ready,
			);
			expect(terminated.ok).toBe(true);
			if (!terminated.ok) {
				return;
			}

			const reopen = await correctEmployment(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-correct-reopen",
					employmentId: employment.data.id,
					status: "active",
					reason: "Attempt reopen",
					expectedVersion: 2,
				},
				ready,
			);
			expect(reopen.ok).toBe(false);
			if (!reopen.ok) {
				expect(humanResourcesCodeFromResult(reopen)).toBe(
					HUMAN_RESOURCES_ERROR_INVALID_STATE_TRANSITION,
				);
			}
		});

		it("correctEmployment appends correction history with reason", async () => {
			const ready = harness();
			const employee = await createEmployee(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-retro-emp",
					idempotencyKey: "idem-retro-emp",
					employeeNumber: "E-RETRO",
					legalName: "Retro",
				},
				ready,
			);
			expect(employee.ok).toBe(true);
			if (!employee.ok) {
				return;
			}

			const employment = await createEmployment(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-retro-create",
					employeeId: employee.data.id,
					startsOn: "2025-01-01",
					endsOn: null,
				},
				ready,
			);
			expect(employment.ok).toBe(true);
			if (!employment.ok) {
				return;
			}

			const corrected = await correctEmployment(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-retro-correct",
					employmentId: employment.data.id,
					startsOn: "2024-12-15",
					reason: "Payroll records show earlier start",
					effectiveOn: "2024-12-15",
					expectedVersion: 1,
				},
				ready,
			);
			expect(corrected.ok).toBe(true);
			if (!corrected.ok) {
				return;
			}
			expect(corrected.data.startsOn).toBe("2024-12-15");

			const history = await listEmploymentStatusHistory(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-retro-history",
					employmentId: employment.data.id,
				},
				ready,
			);
			expect(history.ok).toBe(true);
			if (!history.ok) {
				return;
			}
			const correction = history.data.history.find(
				(row) => row.changeKind === "correction",
			);
			expect(correction).toBeDefined();
			expect(correction?.reason).toBe("Payroll records show earlier start");
			expect(correction?.startsOnSnapshot).toBe("2024-12-15");
		});

		it("listEmploymentStatusHistory statusAsOf returns prior lifecycle state", async () => {
			const ready = harness();
			const employee = await createEmployee(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-asof-emp",
					idempotencyKey: "idem-asof-emp",
					employeeNumber: "E-ASOF",
					legalName: "As Of",
				},
				ready,
			);
			expect(employee.ok).toBe(true);
			if (!employee.ok) {
				return;
			}

			const employment = await createEmployment(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-asof-create",
					employeeId: employee.data.id,
					startsOn: "2025-01-01",
					endsOn: null,
				},
				ready,
			);
			expect(employment.ok).toBe(true);
			if (!employment.ok) {
				return;
			}

			const notice = await amendEmployment(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-asof-notice",
					employmentId: employment.data.id,
					status: "notice",
					effectiveOn: "2025-03-01",
					expectedVersion: 1,
				},
				ready,
			);
			expect(notice.ok).toBe(true);
			if (!notice.ok) {
				return;
			}

			const terminated = await amendEmployment(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-asof-term",
					employmentId: employment.data.id,
					status: "terminated",
					effectiveOn: "2025-06-01",
					endsOn: "2025-06-01",
					expectedVersion: 2,
				},
				ready,
			);
			expect(terminated.ok).toBe(true);
			if (!terminated.ok) {
				return;
			}

			const history = await listEmploymentStatusHistory(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-asof-history",
					employmentId: employment.data.id,
					asOf: "2025-04-01",
				},
				ready,
			);
			expect(history.ok).toBe(true);
			if (!history.ok) {
				return;
			}
			expect(history.data.statusAsOf).toEqual({
				status: "notice",
				startsOn: "2025-01-01",
				endsOn: null,
				effectiveOn: "2025-03-01",
			});
		});
	});

	describe("createEmploymentContract", () => {
		it("creates a contract successfully", async () => {
			const ready = harness();
			const employee = await createEmployee(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-1",
					idempotencyKey: "idem-1",
					employeeNumber: "E-600",
					legalName: "Name",
				},
				ready,
			);
			expect(employee.ok).toBe(true);
			if (!employee.ok) {
				return;
			}

			const employment = await createEmployment(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-2",
					employeeId: employee.data.id,
					startsOn: "2025-01-01",
					endsOn: null,
				},
				ready,
			);
			expect(employment.ok).toBe(true);
			if (!employment.ok) {
				return;
			}

			const contract = await createEmploymentContract(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-3",
					employmentId: employment.data.id,
					referenceCode: "CONTRACT-001",
					startsOn: "2025-01-01",
					endsOn: null,
					reasonCode: "initial",
				},
				ready,
			);
			expect(contract.ok).toBe(true);
			if (contract.ok) {
				expect(contract.data.referenceCode).toBe("CONTRACT-001");
			}
		});

		it("rejects duplicate contract referenceCode", async () => {
			const ready = harness();
			const employee = await createEmployee(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-1",
					idempotencyKey: "idem-1",
					employeeNumber: "E-601",
					legalName: "Name",
				},
				ready,
			);
			expect(employee.ok).toBe(true);
			if (!employee.ok) {
				return;
			}

			const employment = await createEmployment(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-2",
					employeeId: employee.data.id,
					startsOn: "2025-01-01",
					endsOn: null,
				},
				ready,
			);
			expect(employment.ok).toBe(true);
			if (!employment.ok) {
				return;
			}

			const first = await createEmploymentContract(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-3",
					employmentId: employment.data.id,
					referenceCode: "CONTRACT-DUP",
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
					correlationId: "corr-4",
					employmentId: employment.data.id,
					referenceCode: "CONTRACT-DUP",
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

		it("rejects invalid date range", async () => {
			const ready = harness();
			const employee = await createEmployee(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-1",
					idempotencyKey: "idem-1",
					employeeNumber: "E-602",
					legalName: "Name",
				},
				ready,
			);
			expect(employee.ok).toBe(true);
			if (!employee.ok) {
				return;
			}

			const employment = await createEmployment(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-2",
					employeeId: employee.data.id,
					startsOn: "2025-01-01",
					endsOn: null,
				},
				ready,
			);
			expect(employment.ok).toBe(true);
			if (!employment.ok) {
				return;
			}

			const contract = await createEmploymentContract(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-3",
					employmentId: employment.data.id,
					referenceCode: "CONTRACT-002",
					startsOn: "2025-12-31",
					endsOn: "2025-01-01",
					reasonCode: "initial",
				},
				ready,
			);
			expect(contract.ok).toBe(false);
			if (!contract.ok) {
				expect(humanResourcesCodeFromResult(contract)).toBe(
					HUMAN_RESOURCES_ERROR_INVALID_INPUT,
				);
			}
		});
	});

	describe("employment contract historical truth", () => {
		async function seedEmployment(
			ready: ReturnType<typeof harness>,
			startsOn = "2026-01-01",
			endsOn: string | null = null,
		) {
			const employee = await createEmployee(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-s44-emp",
					idempotencyKey: "idem-s44-emp",
					employeeNumber: "E-S44",
					legalName: "Contract Truth",
				},
				ready,
			);
			assert.strictEqual(employee.ok, true);
			if (!employee.ok) {
				return null;
			}
			const employment = await createEmployment(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-s44-employment",
					employeeId: employee.data.id,
					startsOn,
					endsOn,
				},
				ready,
			);
			assert.strictEqual(employment.ok, true);
			if (!employment.ok) {
				return null;
			}
			return { employee: employee.data, employment: employment.data };
		}

		it("resolves future contract as-of before start as null", async () => {
			const ready = harness();
			const seeded = await seedEmployment(ready);
			if (!seeded) {
				return;
			}
			const created = await createEmploymentContract(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-s44-future",
					employmentId: seeded.employment.id,
					referenceCode: "CONTRACT-FUTURE",
					startsOn: "2026-06-01",
					endsOn: null,
					reasonCode: "initial",
				},
				ready,
			);
			expect(created.ok).toBe(true);
			if (!created.ok) {
				return;
			}

			const beforeStart = await getEmploymentContractAsOf(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-s44-asof-before",
					employmentId: seeded.employment.id,
					asOf: "2026-05-31",
				},
				ready,
			);
			expect(beforeStart.ok).toBe(true);
			if (beforeStart.ok) {
				expect(beforeStart.data).toBeNull();
			}
		});

		it("corrects contract with reason and source reference", async () => {
			const ready = harness();
			const seeded = await seedEmployment(ready);
			if (!seeded) {
				return;
			}
			const created = await createEmploymentContract(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-s44-create",
					employmentId: seeded.employment.id,
					referenceCode: "CONTRACT-CORRECT",
					startsOn: "2026-01-01",
					endsOn: "2026-12-31",
					reasonCode: "initial",
				},
				ready,
			);
			expect(created.ok).toBe(true);
			if (!created.ok) {
				return;
			}

			const corrected = await correctEmploymentContract(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-s44-correct",
					employmentContractId: created.data.id,
					startsOn: "2026-01-15",
					reasonCode: "date.correction",
					sourceReference: "HR-EVID-001",
					expectedVersion: 1,
				},
				ready,
			);
			expect(corrected.ok).toBe(true);
			if (corrected.ok) {
				expect(corrected.data.startsOn).toBe("2026-01-15");
				expect(corrected.data.reasonCode).toBe("date.correction");
				expect(corrected.data.sourceReference).toBe("HR-EVID-001");
				expect(corrected.data.version).toBe(2);
			}
		});

		it("supersedes contract preserving predecessor lineage", async () => {
			const ready = harness();
			const seeded = await seedEmployment(ready);
			if (!seeded) {
				return;
			}
			const created = await createEmploymentContract(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-s44-sup-create",
					employmentId: seeded.employment.id,
					referenceCode: "CONTRACT-SUPERSEDE",
					startsOn: "2026-01-01",
					endsOn: null,
					reasonCode: "initial",
				},
				ready,
			);
			expect(created.ok).toBe(true);
			if (!created.ok) {
				return;
			}

			const superseded = await supersedeEmploymentContract(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-s44-supersede",
					employmentContractId: created.data.id,
					startsOn: "2026-07-01",
					endsOn: "2026-12-31",
					reasonCode: "renewal",
					sourceReference: "CONTRACT-2026-B",
					expectedVersion: 1,
				},
				ready,
			);
			expect(superseded.ok).toBe(true);
			if (!superseded.ok) {
				return;
			}
			expect(superseded.data.superseded.lineageStatus).toBe("superseded");
			expect(superseded.data.superseded.endsOn).toBe("2026-06-30");
			expect(superseded.data.superseded.supersededByContractId).toBe(
				superseded.data.successor.id,
			);
			expect(superseded.data.successor.supersedesContractId).toBe(
				superseded.data.superseded.id,
			);
			expect(superseded.data.successor.lineageStatus).toBe("active");
		});

		it("rejects overlapping active contracts", async () => {
			const ready = harness();
			const seeded = await seedEmployment(ready);
			if (!seeded) {
				return;
			}
			const first = await createEmploymentContract(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-s44-overlap-1",
					employmentId: seeded.employment.id,
					referenceCode: "CONTRACT-A",
					startsOn: "2026-01-01",
					endsOn: "2026-12-31",
					reasonCode: "initial",
				},
				ready,
			);
			expect(first.ok).toBe(true);
			if (!first.ok) {
				return;
			}

			const overlap = await createEmploymentContract(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-s44-overlap-2",
					employmentId: seeded.employment.id,
					referenceCode: "CONTRACT-B",
					startsOn: "2026-06-01",
					endsOn: null,
					reasonCode: "initial",
				},
				ready,
			);
			expect(overlap.ok).toBe(false);
			if (!overlap.ok) {
				expect(humanResourcesCodeFromResult(overlap)).toBe(
					HUMAN_RESOURCES_ERROR_CONFLICT,
				);
			}
		});

		it("allows sequential non-overlapping contracts", async () => {
			const ready = harness();
			const seeded = await seedEmployment(ready);
			if (!seeded) {
				return;
			}
			const first = await createEmploymentContract(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-s44-seq-1",
					employmentId: seeded.employment.id,
					referenceCode: "CONTRACT-SEQ-A",
					startsOn: "2026-01-01",
					endsOn: "2026-06-30",
					reasonCode: "initial",
				},
				ready,
			);
			expect(first.ok).toBe(true);
			if (!first.ok) {
				return;
			}

			const second = await createEmploymentContract(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-s44-seq-2",
					employmentId: seeded.employment.id,
					referenceCode: "CONTRACT-SEQ-B",
					startsOn: "2026-07-01",
					endsOn: null,
					reasonCode: "renewal",
				},
				ready,
			);
			expect(second.ok).toBe(true);
		});

		it("rejects contract outside employment tenure", async () => {
			const ready = harness();
			const seeded = await seedEmployment(ready, "2026-01-01", "2026-06-30");
			if (!seeded) {
				return;
			}
			const outside = await createEmploymentContract(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-s44-outside",
					employmentId: seeded.employment.id,
					referenceCode: "CONTRACT-OUT",
					startsOn: "2026-01-01",
					endsOn: "2026-12-31",
					reasonCode: "initial",
				},
				ready,
			);
			expect(outside.ok).toBe(false);
			if (!outside.ok) {
				expect(humanResourcesCodeFromResult(outside)).toBe(
					HUMAN_RESOURCES_ERROR_INVALID_INPUT,
				);
			}
		});

		it("resolves contract as-of on boundary dates", async () => {
			const ready = harness();
			const seeded = await seedEmployment(ready);
			if (!seeded) {
				return;
			}
			const created = await createEmploymentContract(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-s44-boundary",
					employmentId: seeded.employment.id,
					referenceCode: "CONTRACT-BOUNDARY",
					startsOn: "2026-01-01",
					endsOn: "2026-12-31",
					reasonCode: "initial",
				},
				ready,
			);
			expect(created.ok).toBe(true);
			if (!created.ok) {
				return;
			}

			const atStart = await getEmploymentContractAsOf(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-s44-asof-start",
					employmentId: seeded.employment.id,
					asOf: "2026-01-01",
				},
				ready,
			);
			expect(atStart.ok).toBe(true);
			if (atStart.ok) {
				expect(atStart.data?.id).toBe(created.data.id);
			}

			const atEnd = await getEmploymentContractAsOf(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-s44-asof-end",
					employmentId: seeded.employment.id,
					asOf: "2026-12-31",
				},
				ready,
			);
			expect(atEnd.ok).toBe(true);
			if (atEnd.ok) {
				expect(atEnd.data?.id).toBe(created.data.id);
			}
		});

		it("rejects correct without required source reference", async () => {
			const ready = harness();
			const seeded = await seedEmployment(ready);
			if (!seeded) {
				return;
			}
			const created = await createEmploymentContract(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-s44-no-source-create",
					employmentId: seeded.employment.id,
					referenceCode: "CONTRACT-NO-SOURCE",
					startsOn: "2026-01-01",
					endsOn: null,
					reasonCode: "initial",
				},
				ready,
			);
			expect(created.ok).toBe(true);
			if (!created.ok) {
				return;
			}

			const corrected = await correctEmploymentContract(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-s44-no-source-correct",
					employmentContractId: created.data.id,
					startsOn: "2026-01-15",
					reasonCode: "date.correction",
					expectedVersion: 1,
				},
				ready,
			);
			expect(corrected.ok).toBe(false);
		});

		it("rejects overlapping correct on active contract", async () => {
			const ready = harness();
			const seeded = await seedEmployment(ready);
			if (!seeded) {
				return;
			}
			const first = await createEmploymentContract(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-s44-overlap-correct-1",
					employmentId: seeded.employment.id,
					referenceCode: "CONTRACT-OC-A",
					startsOn: "2026-01-01",
					endsOn: "2026-06-30",
					reasonCode: "initial",
				},
				ready,
			);
			expect(first.ok).toBe(true);
			if (!first.ok) {
				return;
			}

			const second = await createEmploymentContract(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-s44-overlap-correct-2",
					employmentId: seeded.employment.id,
					referenceCode: "CONTRACT-OC-B",
					startsOn: "2026-07-01",
					endsOn: null,
					reasonCode: "renewal",
				},
				ready,
			);
			expect(second.ok).toBe(true);
			if (!second.ok) {
				return;
			}

			const overlappingCorrect = await correctEmploymentContract(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-s44-overlap-correct",
					employmentContractId: second.data.id,
					startsOn: "2026-06-01",
					reasonCode: "date.correction",
					sourceReference: "HR-EVID-OVERLAP",
					expectedVersion: 1,
				},
				ready,
			);
			expect(overlappingCorrect.ok).toBe(false);
			if (!overlappingCorrect.ok) {
				expect(humanResourcesCodeFromResult(overlappingCorrect)).toBe(
					HUMAN_RESOURCES_ERROR_CONFLICT,
				);
			}
		});
	});

	describe("employment contract management (Slice 5.5)", () => {
		async function seedEmployment(ready: ReturnType<typeof harness>) {
			const employee = await createEmployee(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-s55-emp",
					idempotencyKey: "idem-s55-emp",
					employeeNumber: "E-S55",
					legalName: "Contract Management",
				},
				ready,
			);
			assert.strictEqual(employee.ok, true);
			if (!employee.ok) {
				return null;
			}
			const employment = await createEmployment(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-s55-employment",
					employeeId: employee.data.id,
					startsOn: "2026-01-01",
					endsOn: null,
				},
				ready,
			);
			assert.strictEqual(employment.ok, true);
			if (!employment.ok) {
				return null;
			}
			return { employee: employee.data, employment: employment.data };
		}

		it("amends contract via amendEmploymentContract alias", async () => {
			const ready = harness();
			const seeded = await seedEmployment(ready);
			if (!seeded) {
				return;
			}
			const created = await createEmploymentContract(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-s55-amend-create",
					employmentId: seeded.employment.id,
					referenceCode: "CONTRACT-AMEND",
					startsOn: "2026-01-01",
					endsOn: "2026-12-31",
					reasonCode: "initial",
				},
				ready,
			);
			expect(created.ok).toBe(true);
			if (!created.ok) {
				return;
			}

			const amended = await amendEmploymentContract(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-s55-amend",
					employmentContractId: created.data.id,
					referenceCode: "CONTRACT-AMEND-V2",
					reasonCode: "terms.amendment",
					sourceReference: "HR-AMEND-001",
					expectedVersion: 1,
				},
				ready,
			);
			expect(amended.ok).toBe(true);
			if (amended.ok) {
				expect(amended.data.referenceCode).toBe("CONTRACT-AMEND-V2");
				expect(amended.data.version).toBe(2);
			}
		});

		it("renews contract via renewEmploymentContract alias (supersede)", async () => {
			const ready = harness();
			const seeded = await seedEmployment(ready);
			if (!seeded) {
				return;
			}
			const created = await createEmploymentContract(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-s55-renew-create",
					employmentId: seeded.employment.id,
					referenceCode: "CONTRACT-RENEW",
					startsOn: "2026-01-01",
					endsOn: null,
					reasonCode: "initial",
				},
				ready,
			);
			expect(created.ok).toBe(true);
			if (!created.ok) {
				return;
			}

			const renewed = await renewEmploymentContract(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-s55-renew",
					employmentContractId: created.data.id,
					startsOn: "2027-01-01",
					endsOn: "2027-12-31",
					reasonCode: "renewal",
					sourceReference: "CONTRACT-2027",
					expectedVersion: 1,
				},
				ready,
			);
			expect(renewed.ok).toBe(true);
			if (!renewed.ok) {
				return;
			}
			expect(renewed.data.superseded.lineageStatus).toBe("superseded");
			expect(renewed.data.successor.lineageStatus).toBe("active");
			expect(renewed.data.successor.supersedesContractId).toBe(
				renewed.data.superseded.id,
			);
		});

		it("ends contract non-destructively with endsOn", async () => {
			const ready = harness();
			const seeded = await seedEmployment(ready);
			if (!seeded) {
				return;
			}
			const created = await createEmploymentContract(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-s55-end-create",
					employmentId: seeded.employment.id,
					referenceCode: "CONTRACT-END",
					startsOn: "2026-01-01",
					endsOn: null,
					reasonCode: "initial",
				},
				ready,
			);
			expect(created.ok).toBe(true);
			if (!created.ok) {
				return;
			}

			const ended = await endEmploymentContract(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-s55-end",
					employmentContractId: created.data.id,
					endsOn: "2026-06-30",
					reasonCode: "contract.end",
					sourceReference: "HR-END-001",
					expectedVersion: 1,
				},
				ready,
			);
			expect(ended.ok).toBe(true);
			if (!ended.ok) {
				return;
			}
			expect(ended.data.endsOn).toBe("2026-06-30");
			expect(ended.data.lineageStatus).toBe("active");
			expect(ended.data.version).toBe(2);

			const atEnd = await getEmploymentContractAsOf(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-s55-end-asof-boundary",
					employmentId: seeded.employment.id,
					asOf: "2026-06-30",
				},
				ready,
			);
			expect(atEnd.ok).toBe(true);
			if (atEnd.ok) {
				expect(atEnd.data?.id).toBe(created.data.id);
			}

			const afterEnd = await getEmploymentContractAsOf(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-s55-end-asof-after",
					employmentId: seeded.employment.id,
					asOf: "2026-07-01",
				},
				ready,
			);
			expect(afterEnd.ok).toBe(true);
			if (afterEnd.ok) {
				expect(afterEnd.data).toBeNull();
			}
		});

		it("rejects end on superseded contract", async () => {
			const ready = harness();
			const seeded = await seedEmployment(ready);
			if (!seeded) {
				return;
			}
			const created = await createEmploymentContract(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-s55-end-sup-create",
					employmentId: seeded.employment.id,
					referenceCode: "CONTRACT-END-SUP",
					startsOn: "2026-01-01",
					endsOn: null,
					reasonCode: "initial",
				},
				ready,
			);
			expect(created.ok).toBe(true);
			if (!created.ok) {
				return;
			}

			const superseded = await supersedeEmploymentContract(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-s55-end-sup-supersede",
					employmentContractId: created.data.id,
					startsOn: "2026-07-01",
					endsOn: null,
					reasonCode: "renewal",
					sourceReference: "CONTRACT-B",
					expectedVersion: 1,
				},
				ready,
			);
			expect(superseded.ok).toBe(true);
			if (!superseded.ok) {
				return;
			}

			const endAttempt = await endEmploymentContract(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-s55-end-sup-end",
					employmentContractId: superseded.data.superseded.id,
					endsOn: "2026-06-30",
					reasonCode: "contract.end",
					sourceReference: "HR-END-002",
					expectedVersion: superseded.data.superseded.version,
				},
				ready,
			);
			expect(endAttempt.ok).toBe(false);
			if (!endAttempt.ok) {
				expect(humanResourcesCodeFromResult(endAttempt)).toBe(
					HUMAN_RESOURCES_ERROR_CONFLICT,
				);
			}
		});

		it("rejects stale expectedVersion on end", async () => {
			const ready = harness();
			const seeded = await seedEmployment(ready);
			if (!seeded) {
				return;
			}
			const created = await createEmploymentContract(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-s55-stale-end-create",
					employmentId: seeded.employment.id,
					referenceCode: "CONTRACT-STALE-END",
					startsOn: "2026-01-01",
					endsOn: null,
					reasonCode: "initial",
				},
				ready,
			);
			expect(created.ok).toBe(true);
			if (!created.ok) {
				return;
			}

			const stale = await endEmploymentContract(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-s55-stale-end",
					employmentContractId: created.data.id,
					endsOn: "2026-06-30",
					reasonCode: "contract.end",
					sourceReference: "HR-END-003",
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
		});

		it("rejects stale expectedVersion on correct", async () => {
			const ready = harness();
			const seeded = await seedEmployment(ready);
			if (!seeded) {
				return;
			}
			const created = await createEmploymentContract(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-s55-stale-correct-create",
					employmentId: seeded.employment.id,
					referenceCode: "CONTRACT-STALE-CORRECT",
					startsOn: "2026-01-01",
					endsOn: null,
					reasonCode: "initial",
				},
				ready,
			);
			expect(created.ok).toBe(true);
			if (!created.ok) {
				return;
			}

			const stale = await correctEmploymentContract(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-s55-stale-correct",
					employmentContractId: created.data.id,
					reasonCode: "date.correction",
					sourceReference: "HR-EVID-STALE",
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
		});

		it("resolves current contract via getCurrentEmploymentContract", async () => {
			const ready = harness();
			const seeded = await seedEmployment(ready);
			if (!seeded) {
				return;
			}
			const created = await createEmploymentContract(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-s55-current-create",
					employmentId: seeded.employment.id,
					referenceCode: "CONTRACT-CURRENT",
					startsOn: "2026-01-01",
					endsOn: "2026-12-31",
					reasonCode: "initial",
				},
				ready,
			);
			expect(created.ok).toBe(true);
			if (!created.ok) {
				return;
			}

			const [current, asOf] = await Promise.all([
				getCurrentEmploymentContract(
					{
						organizationId: ORG_A,
						actorUserId: ACTOR,
						correlationId: "corr-s55-current",
						employmentId: seeded.employment.id,
						asOf: "2026-06-01",
					},
					ready,
				),
				getEmploymentContractAsOf(
					{
						organizationId: ORG_A,
						actorUserId: ACTOR,
						correlationId: "corr-s55-current-asof",
						employmentId: seeded.employment.id,
						asOf: "2026-06-01",
					},
					ready,
				),
			]);
			expect(current.ok).toBe(true);
			expect(asOf.ok).toBe(true);
			if (current.ok && asOf.ok) {
				expect(current.data?.id).toBe(asOf.data?.id);
				expect(current.data?.id).toBe(created.data.id);
			}
		});

		it("lists employment contract lineage history", async () => {
			const ready = harness();
			const seeded = await seedEmployment(ready);
			if (!seeded) {
				return;
			}
			const created = await createEmploymentContract(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-s55-list-create",
					employmentId: seeded.employment.id,
					referenceCode: "CONTRACT-LIST",
					startsOn: "2026-01-01",
					endsOn: null,
					reasonCode: "initial",
				},
				ready,
			);
			expect(created.ok).toBe(true);
			if (!created.ok) {
				return;
			}

			const renewed = await renewEmploymentContract(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-s55-list-renew",
					employmentContractId: created.data.id,
					startsOn: "2027-01-01",
					endsOn: null,
					reasonCode: "renewal",
					sourceReference: "CONTRACT-2027",
					expectedVersion: 1,
				},
				ready,
			);
			expect(renewed.ok).toBe(true);
			if (!renewed.ok) {
				return;
			}

			const listed = await listEmploymentContracts(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-s55-list",
					employmentId: seeded.employment.id,
				},
				ready,
			);
			expect(listed.ok).toBe(true);
			if (listed.ok) {
				expect(listed.data).toHaveLength(2);
				expect(listed.data[0]?.id).toBe(created.data.id);
				expect(listed.data[0]?.lineageStatus).toBe("superseded");
				expect(listed.data[1]?.id).toBe(renewed.data.successor.id);
				expect(listed.data[1]?.lineageStatus).toBe("active");
			}
		});

		it("rejects stale expectedVersion on supersede", async () => {
			const ready = harness();
			const seeded = await seedEmployment(ready);
			if (!seeded) {
				return;
			}
			const created = await createEmploymentContract(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-s55-stale-supersede-create",
					employmentId: seeded.employment.id,
					referenceCode: "CONTRACT-STALE-SUPERSEDE",
					startsOn: "2026-01-01",
					endsOn: null,
					reasonCode: "initial",
				},
				ready,
			);
			expect(created.ok).toBe(true);
			if (!created.ok) {
				return;
			}

			const stale = await supersedeEmploymentContract(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-s55-stale-supersede",
					employmentContractId: created.data.id,
					startsOn: "2027-01-01",
					endsOn: null,
					reasonCode: "renewal",
					sourceReference: "CONTRACT-2027-STALE",
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
		});

		it("loads contract by id via getEmploymentContract", async () => {
			const ready = harness();
			const seeded = await seedEmployment(ready);
			if (!seeded) {
				return;
			}
			const created = await createEmploymentContract(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-s55-get-create",
					employmentId: seeded.employment.id,
					referenceCode: "CONTRACT-GET",
					startsOn: "2026-01-01",
					endsOn: null,
					reasonCode: "initial",
				},
				ready,
			);
			expect(created.ok).toBe(true);
			if (!created.ok) {
				return;
			}

			const loaded = await getEmploymentContract(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-s55-get",
					employmentContractId: created.data.id,
				},
				ready,
			);
			expect(loaded.ok).toBe(true);
			if (loaded.ok) {
				expect(loaded.data.id).toBe(created.data.id);
				expect(loaded.data.referenceCode).toBe("CONTRACT-GET");
			}
		});
	});

	describe("assignment historical truth", () => {
		const STANDARD_WEEK = [0, 1, 2, 3, 4, 5, 6].map((dayOfWeek) => ({
			dayOfWeek: dayOfWeek as 0 | 1 | 2 | 3 | 4 | 5 | 6,
			isWorkingDay: dayOfWeek >= 1 && dayOfWeek <= 5,
			standardStartTime: dayOfWeek >= 1 && dayOfWeek <= 5 ? "09:00" : null,
			standardEndTime: dayOfWeek >= 1 && dayOfWeek <= 5 ? "17:00" : null,
			standardMinutes: dayOfWeek >= 1 && dayOfWeek <= 5 ? 480 : null,
		}));

		async function seedAssignmentEmployment(ready: ReturnType<typeof harness>) {
			const employee = await createEmployee(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-s45-emp",
					idempotencyKey: "idem-s45-emp",
					employeeNumber: "E-S45",
					legalName: "Assignment Truth",
				},
				ready,
			);
			assert.strictEqual(employee.ok, true);
			if (!employee.ok) {
				return null;
			}

			const manager = await createEmployee(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-s45-mgr",
					idempotencyKey: "idem-s45-mgr",
					employeeNumber: "M-S45",
					legalName: "Manager One",
				},
				ready,
			);
			assert.strictEqual(manager.ok, true);
			if (!manager.ok) {
				return null;
			}

			const employment = await createEmployment(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-s45-employment",
					employeeId: employee.data.id,
					startsOn: "2026-01-01",
					endsOn: null,
				},
				ready,
			);
			assert.strictEqual(employment.ok, true);
			if (!employment.ok) {
				return null;
			}

			const seeded = await seedDepartmentAndJob(ready, {
				organizationId: ORG_A,
				actorUserId: ACTOR,
			});
			if (!seeded) {
				return null;
			}

			const position = await createPosition(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-s45-pos-a",
					code: "POS-S45-A",
					title: "Role A",
					status: "active",
					...seeded,
				},
				ready,
			);
			assert.strictEqual(position.ok, true);
			if (!position.ok) {
				return null;
			}

			const positionB = await createPosition(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-s45-pos-b",
					code: "POS-S45-B",
					title: "Role B",
					status: "active",
					...seeded,
				},
				ready,
			);
			assert.strictEqual(positionB.ok, true);
			if (!positionB.ok) {
				return null;
			}

			return {
				employee: employee.data,
				manager: manager.data,
				employment: employment.data,
				position: position.data,
				positionB: positionB.data,
			};
		}

		it("resolves future assignment as-of before start as null", async () => {
			const ready = harness();
			const seeded = await seedAssignmentEmployment(ready);
			if (!seeded) {
				return;
			}

			const first = await createAssignment(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-s45-first",
					employmentId: seeded.employment.id,
					positionId: seeded.position.id,
					...TEST_ORGANIZATION_DIMENSION_KEYS,
					startsOn: "2026-01-01",
					endsOn: "2026-05-31",
				},
				ready,
			);
			expect(first.ok).toBe(true);
			if (!first.ok) {
				return;
			}

			const future = await createAssignment(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-s45-future",
					employmentId: seeded.employment.id,
					positionId: seeded.position.id,
					...TEST_ORGANIZATION_DIMENSION_KEYS,
					startsOn: "2026-06-01",
					endsOn: null,
				},
				ready,
			);
			expect(future.ok).toBe(true);
			if (!future.ok) {
				return;
			}

			const beforeStart = await getAssignmentAsOf(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-s45-asof-before",
					employmentId: seeded.employment.id,
					asOf: "2026-05-15",
				},
				ready,
			);
			expect(beforeStart.ok).toBe(true);
			if (beforeStart.ok) {
				expect(beforeStart.data?.id).toBe(first.data.id);
			}

			const gap = await getAssignmentAsOf(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-s45-asof-gap",
					employmentId: seeded.employment.id,
					asOf: "2026-06-01",
				},
				ready,
			);
			expect(gap.ok).toBe(true);
			if (gap.ok) {
				expect(gap.data?.id).toBe(future.data.id);
			}
		});

		it("honors inclusive assignment as-of boundaries", async () => {
			const ready = harness();
			const seeded = await seedAssignmentEmployment(ready);
			if (!seeded) {
				return;
			}

			const bounded = await createAssignment(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-s45-boundary",
					employmentId: seeded.employment.id,
					positionId: seeded.position.id,
					...TEST_ORGANIZATION_DIMENSION_KEYS,
					startsOn: "2026-01-01",
					endsOn: "2026-06-30",
				},
				ready,
			);
			expect(bounded.ok).toBe(true);
			if (!bounded.ok) {
				return;
			}

			const atStart = await getAssignmentAsOf(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-s45-boundary-start",
					employmentId: seeded.employment.id,
					asOf: "2026-01-01",
				},
				ready,
			);
			expect(atStart.ok).toBe(true);
			if (atStart.ok) {
				expect(atStart.data?.id).toBe(bounded.data.id);
			}

			const atEnd = await getAssignmentAsOf(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-s45-boundary-end",
					employmentId: seeded.employment.id,
					asOf: "2026-06-30",
				},
				ready,
			);
			expect(atEnd.ok).toBe(true);
			if (atEnd.ok) {
				expect(atEnd.data?.id).toBe(bounded.data.id);
			}

			const afterEnd = await getAssignmentAsOf(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-s45-boundary-after",
					employmentId: seeded.employment.id,
					asOf: "2026-07-01",
				},
				ready,
			);
			expect(afterEnd.ok).toBe(true);
			if (afterEnd.ok) {
				expect(afterEnd.data).toBeNull();
			}
		});

		it("returns NOT_FOUND for org context during assignment gap", async () => {
			const ready = harness();
			const seeded = await seedAssignmentEmployment(ready);
			if (!seeded) {
				return;
			}

			const first = await createAssignment(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-s45-gap-first",
					employmentId: seeded.employment.id,
					positionId: seeded.position.id,
					...TEST_ORGANIZATION_DIMENSION_KEYS,
					startsOn: "2026-01-01",
					endsOn: "2026-05-31",
				},
				ready,
			);
			expect(first.ok).toBe(true);
			if (!first.ok) {
				return;
			}

			const second = await createAssignment(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-s45-gap-second",
					employmentId: seeded.employment.id,
					positionId: seeded.position.id,
					...TEST_ORGANIZATION_DIMENSION_KEYS,
					startsOn: "2026-07-01",
					endsOn: null,
				},
				ready,
			);
			expect(second.ok).toBe(true);
			if (!second.ok) {
				return;
			}

			const gapAssignment = await getAssignmentAsOf(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-s45-gap-asof",
					employmentId: seeded.employment.id,
					asOf: "2026-06-15",
				},
				ready,
			);
			expect(gapAssignment.ok).toBe(true);
			if (gapAssignment.ok) {
				expect(gapAssignment.data).toBeNull();
			}

			const gapOrgContext = await resolveEmployeeOrgContextAsOf(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-s45-gap-org",
					employeeId: seeded.employee.id,
					asOf: "2026-06-15",
				},
				ready,
			);
			expect(gapOrgContext.ok).toBe(false);
			if (!gapOrgContext.ok) {
				expect(humanResourcesCodeFromResult(gapOrgContext)).toBe(
					HUMAN_RESOURCES_ERROR_NOT_FOUND,
				);
			}
		});

		it("wires transfer lineage on predecessor and successor rows", async () => {
			const ready = harness();
			const seeded = await seedAssignmentEmployment(ready);
			if (!seeded) {
				return;
			}

			const open = await createAssignment(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-s45-open",
					employmentId: seeded.employment.id,
					positionId: seeded.position.id,
					...TEST_ORGANIZATION_DIMENSION_KEYS,
					startsOn: "2026-01-01",
					endsOn: null,
				},
				ready,
			);
			expect(open.ok).toBe(true);
			if (!open.ok) {
				return;
			}

			const transfer = await transferAssignment(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-s45-transfer",
					idempotencyKey: "idem-s45-transfer",
					employmentId: seeded.employment.id,
					toPositionId: seeded.positionB.id,
					...TEST_ORGANIZATION_DIMENSION_KEYS,
					effectiveOn: "2026-03-01",
					reason: "Promotion",
				},
				ready,
			);
			expect(transfer.ok).toBe(true);
			if (!transfer.ok) {
				return;
			}

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
			if (
				!(predecessor.ok && successor.ok && predecessor.data && successor.data)
			) {
				return;
			}
			expect(predecessor.data.endsOn).toBe("2026-02-28");
			expect(predecessor.data.successorAssignmentId).toBe(successor.data.id);
			expect(predecessor.data.transferMovementId).toBe(transfer.data.id);
			expect(successor.data.predecessorAssignmentId).toBe(predecessor.data.id);
			expect(successor.data.transferMovementId).toBe(transfer.data.id);
			expect(successor.data.startsOn).toBe("2026-03-01");

			const onTransferDay = await getAssignmentAsOf(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-s45-transfer-day",
					employmentId: seeded.employment.id,
					asOf: "2026-03-01",
				},
				ready,
			);
			expect(onTransferDay.ok).toBe(true);
			if (onTransferDay.ok) {
				expect(onTransferDay.data?.id).toBe(successor.data.id);
			}
		});

		it("rejects overlapping closed assignment ranges", async () => {
			const ready = harness();
			const seeded = await seedAssignmentEmployment(ready);
			if (!seeded) {
				return;
			}

			const first = await createAssignment(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-s45-overlap-1",
					employmentId: seeded.employment.id,
					positionId: seeded.position.id,
					...TEST_ORGANIZATION_DIMENSION_KEYS,
					startsOn: "2026-01-01",
					endsOn: "2026-06-30",
				},
				ready,
			);
			expect(first.ok).toBe(true);
			if (!first.ok) {
				return;
			}

			const overlap = await createAssignment(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-s45-overlap-2",
					employmentId: seeded.employment.id,
					positionId: seeded.position.id,
					...TEST_ORGANIZATION_DIMENSION_KEYS,
					startsOn: "2026-06-01",
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
		});

		it("rejects ambiguous overlapping assignments at as-of", async () => {
			const ready = harness();
			const seeded = await seedAssignmentEmployment(ready);
			if (!seeded) {
				return;
			}

			const first = await createAssignment(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-s45-ambig-1",
					employmentId: seeded.employment.id,
					positionId: seeded.position.id,
					...TEST_ORGANIZATION_DIMENSION_KEYS,
					startsOn: "2026-01-01",
					endsOn: null,
				},
				ready,
			);
			expect(first.ok).toBe(true);
			if (!first.ok) {
				return;
			}

			const duplicateId = parseHumanResourcesAssignmentId(randomUUID());
			expect(duplicateId.ok).toBe(true);
			if (!duplicateId.ok) {
				return;
			}

			const memoryStore = ready.store as MemoryHumanResourcesStore;
			memoryStore.state.core.assignments.set(
				duplicateId.data,
				withDefaultAssignmentLineage({
					...first.data,
					id: duplicateId.data,
					startsOn: "2026-02-01",
					endsOn: null,
					version: 1,
				}),
			);

			const ambiguous = await getAssignmentAsOf(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-s45-ambig-asof",
					employmentId: seeded.employment.id,
					asOf: "2026-03-01",
				},
				ready,
			);
			expect(ambiguous.ok).toBe(false);
			if (!ambiguous.ok) {
				expect(humanResourcesCodeFromResult(ambiguous)).toBe(
					HUMAN_RESOURCES_ERROR_MULTIPLE_PRIMARY_ASSIGNMENTS,
				);
			}
		});

		it("freezes manager and calendar snapshots for historical org context", async () => {
			const ready = harness();
			const seeded = await seedAssignmentEmployment(ready);
			if (!seeded) {
				return;
			}

			await assignPrimaryReportingLine(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-s45-reporting",
					employeeId: seeded.employee.id,
					managerEmployeeId: seeded.manager.id,
					startsOn: "2026-01-01",
				},
				ready,
			);

			const calendar = await createWorkCalendar(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-s45-cal",
					idempotencyKey: "idem-s45-cal",
					code: "CAL-S45",
					name: "Slice 4.5 Calendar",
					timezone: "UTC",
					calendarVersion: "v1",
					workWeek: STANDARD_WEEK,
					standardHoursPerDay: "8.00",
					effectiveFrom: "2026-01-01",
				},
				ready,
			);
			expect(calendar.ok).toBe(true);
			if (!calendar.ok) {
				return;
			}

			await assignEmploymentCalendar(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-s45-cal-assign",
					employeeId: seeded.employee.id,
					employmentId: seeded.employment.id,
					calendarId: calendar.data.id,
					effectiveFrom: "2026-01-01",
				},
				ready,
			);

			const assignment = await createAssignment(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-s45-snapshot",
					employmentId: seeded.employment.id,
					positionId: seeded.position.id,
					...TEST_ORGANIZATION_DIMENSION_KEYS,
					startsOn: "2026-01-01",
					endsOn: null,
				},
				ready,
			);
			expect(assignment.ok).toBe(true);
			if (!assignment.ok) {
				return;
			}
			expect(assignment.data.managerEmployeeIdSnapshot).toBe(seeded.manager.id);
			expect(assignment.data.workCalendarIdSnapshot).toBe(calendar.data.id);

			const managerTwo = await createEmployee(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-s45-mgr2",
					idempotencyKey: "idem-s45-mgr2",
					employeeNumber: "M-S45-2",
					legalName: "Manager Two",
				},
				ready,
			);
			expect(managerTwo.ok).toBe(true);
			if (!managerTwo.ok) {
				return;
			}

			await assignPrimaryReportingLine(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-s45-reporting-2",
					employeeId: seeded.employee.id,
					managerEmployeeId: managerTwo.data.id,
					startsOn: "2026-07-01",
				},
				ready,
			);

			const calendarTwo = await createWorkCalendar(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-s45-cal-2",
					idempotencyKey: "idem-s45-cal-2",
					code: "CAL-S45-2",
					name: "Slice 4.5 Calendar 2",
					timezone: "UTC",
					calendarVersion: "v1",
					workWeek: STANDARD_WEEK,
					standardHoursPerDay: "8.00",
					effectiveFrom: "2026-07-01",
				},
				ready,
			);
			expect(calendarTwo.ok).toBe(true);
			if (!calendarTwo.ok) {
				return;
			}

			await assignEmploymentCalendar(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-s45-cal-assign-2",
					employeeId: seeded.employee.id,
					employmentId: seeded.employment.id,
					calendarId: calendarTwo.data.id,
					effectiveFrom: "2026-07-01",
				},
				ready,
			);

			const orgContext = await resolveEmployeeOrgContextAsOf(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-s45-org-freeze",
					employeeId: seeded.employee.id,
					asOf: "2026-03-15",
				},
				ready,
			);
			expect(orgContext.ok).toBe(true);
			if (orgContext.ok) {
				expect(orgContext.data.managerEmployeeId).toBe(seeded.manager.id);
				expect(orgContext.data.workCalendarId).toBe(calendar.data.id);
				expect(orgContext.data.legalEntityKey).toBe("LE-TEST");
			}
		});
	});

	describe("Slice 5.6 — assignment management", () => {
		async function seedSlice56Employment(ready: ReturnType<typeof harness>) {
			const employee = await createEmployee(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-s56-emp",
					idempotencyKey: "idem-s56-emp",
					employeeNumber: "E-S56",
					legalName: "Slice 5.6 Employee",
				},
				ready,
			);
			assert.strictEqual(employee.ok, true);
			if (!employee.ok) {
				return null;
			}

			const employment = await createEmployment(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-s56-employment",
					employeeId: employee.data.id,
					startsOn: "2026-01-01",
					endsOn: null,
				},
				ready,
			);
			assert.strictEqual(employment.ok, true);
			if (!employment.ok) {
				return null;
			}

			const seeded = await seedDepartmentAndJob(ready, {
				organizationId: ORG_A,
				actorUserId: ACTOR,
			});
			if (!seeded) {
				return null;
			}

			const position = await createPosition(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-s56-pos",
					code: "POS-S56",
					title: "Slice 5.6 Role",
					status: "active",
					...seeded,
				},
				ready,
			);
			assert.strictEqual(position.ok, true);
			if (!position.ok) {
				return null;
			}

			return {
				employee: employee.data,
				employment: employment.data,
				position: position.data,
			};
		}

		it("rejects assignment outside employment range", async () => {
			const ready = harness();
			const seeded = await seedSlice56Employment(ready);
			if (!seeded) {
				return;
			}

			const outside = await createAssignment(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-s56-outside",
					employmentId: seeded.employment.id,
					positionId: seeded.position.id,
					...TEST_ORGANIZATION_DIMENSION_KEYS,
					startsOn: "2025-12-01",
					endsOn: null,
				},
				ready,
			);
			expect(outside.ok).toBe(false);
			if (!outside.ok) {
				expect(humanResourcesCodeFromResult(outside)).toBe(
					HUMAN_RESOURCES_ERROR_ASSIGNMENT_OUTSIDE_EMPLOYMENT_RANGE,
				);
			}
		});

		it("rejects create when organization dimensions cannot be resolved", async () => {
			const ready = harness();
			const seeded = await seedSlice56Employment(ready);
			if (!seeded) {
				return;
			}

			const rejected = await createAssignment(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-s56-dim-create",
					employmentId: seeded.employment.id,
					positionId: seeded.position.id,
					...TEST_ORGANIZATION_DIMENSION_KEYS,
					startsOn: "2026-01-01",
					endsOn: null,
				},
				{
					...ready,
					organizationDimensions: createFailingOrganizationDimensionDirectory(),
				},
			);
			expect(rejected.ok).toBe(false);
			if (!rejected.ok) {
				expect(humanResourcesCodeFromResult(rejected)).toBe(
					HUMAN_RESOURCES_ERROR_NOT_FOUND,
				);
			}
		});

		it("rejects transfer when organization dimensions cannot be resolved", async () => {
			const ready = harness();
			const seeded = await seedSlice56Employment(ready);
			if (!seeded) {
				return;
			}

			const open = await createAssignment(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-s56-open",
					employmentId: seeded.employment.id,
					positionId: seeded.position.id,
					...TEST_ORGANIZATION_DIMENSION_KEYS,
					startsOn: "2026-01-01",
					endsOn: null,
				},
				ready,
			);
			expect(open.ok).toBe(true);
			if (!open.ok) {
				return;
			}

			const positionB = await createPosition(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-s56-pos-b",
					code: "POS-S56-B",
					title: "Slice 5.6 Role B",
					status: "active",
					departmentId: seeded.position.departmentId,
					jobId: seeded.position.jobId,
				},
				ready,
			);
			expect(positionB.ok).toBe(true);
			if (!positionB.ok) {
				return;
			}

			const rejected = await transferAssignment(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-s56-dim-transfer",
					idempotencyKey: "idem-s56-dim-transfer",
					employmentId: seeded.employment.id,
					toPositionId: positionB.data.id,
					...TEST_ORGANIZATION_DIMENSION_KEYS,
					effectiveOn: "2026-03-01",
					reason: "Dimension reject test",
				},
				{
					...ready,
					organizationDimensions: createFailingOrganizationDimensionDirectory(),
				},
			);
			expect(rejected.ok).toBe(false);
			if (!rejected.ok) {
				expect(humanResourcesCodeFromResult(rejected)).toBe(
					HUMAN_RESOURCES_ERROR_NOT_FOUND,
				);
			}
		});

		it("resolves primary assignment at as-of via the canonical query", async () => {
			const ready = harness();
			const seeded = await seedSlice56Employment(ready);
			if (!seeded) {
				return;
			}

			const open = await createAssignment(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-s56-primary",
					employmentId: seeded.employment.id,
					positionId: seeded.position.id,
					...TEST_ORGANIZATION_DIMENSION_KEYS,
					startsOn: "2026-01-01",
					endsOn: null,
				},
				ready,
			);
			expect(open.ok).toBe(true);
			if (!open.ok) {
				return;
			}

			const primary = await getAssignmentAsOf(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-s56-primary-asof",
					employmentId: seeded.employment.id,
					asOf: "2026-03-15",
				},
				ready,
			);
			expect(primary.ok).toBe(true);
			if (primary.ok) {
				expect(primary.data?.id).toBe(open.data.id);
			}
		});
	});

	describe("createPosition", () => {
		it("creates a position successfully", async () => {
			const ready = harness();
			const seeded = await seedDepartmentAndJob(ready, {
				organizationId: ORG_A,
				actorUserId: ACTOR,
			});
			expect(seeded).not.toBeNull();
			if (!seeded) {
				return;
			}

			const position = await createPosition(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-1",
					code: "POS-001",
					title: "Software Engineer",
					status: "active",
					...seeded,
				},
				ready,
			);
			expect(position.ok).toBe(true);
			if (position.ok) {
				expect(position.data.code).toBe("POS-001");
				expect(position.data.status).toBe("active");
			}
		});

		it("rejects malformed input", async () => {
			const ready = harness();
			const seeded = await seedDepartmentAndJob(ready, {
				organizationId: ORG_A,
				actorUserId: ACTOR,
			});
			expect(seeded).not.toBeNull();
			if (!seeded) {
				return;
			}

			const position = await createPosition(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-1",
					code: "",
					title: "",
					status: "invalid" as never,
					...seeded,
				},
				ready,
			);
			expect(position.ok).toBe(false);
			if (!position.ok) {
				expect(humanResourcesCodeFromResult(position)).toBe(
					HUMAN_RESOURCES_ERROR_INVALID_INPUT,
				);
			}
		});

		it("rejects unauthorized actor", async () => {
			const ready = harness();
			const seeded = await seedDepartmentAndJob(ready, {
				organizationId: ORG_A,
				actorUserId: ACTOR,
			});
			expect(seeded).not.toBeNull();
			if (!seeded) {
				return;
			}

			ready.authorization = createGrantingHumanResourcesAuthorization([]);
			const position = await createPosition(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-1",
					code: "POS-002",
					title: "Position",
					status: "active",
					...seeded,
				},
				ready,
			);
			expect(position.ok).toBe(false);
			if (!position.ok) {
				expect(humanResourcesCodeFromResult(position)).toBe(
					HUMAN_RESOURCES_ERROR_FORBIDDEN,
				);
			}
		});
	});

	describe("createAssignment", () => {
		it("creates an assignment successfully", async () => {
			const ready = harness();
			const employee = await createEmployee(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-1",
					idempotencyKey: "idem-1",
					employeeNumber: "E-700",
					legalName: "Name",
				},
				ready,
			);
			expect(employee.ok).toBe(true);
			if (!employee.ok) {
				return;
			}

			const employment = await createEmployment(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-2",
					employeeId: employee.data.id,
					startsOn: "2025-01-01",
					endsOn: null,
				},
				ready,
			);
			expect(employment.ok).toBe(true);
			if (!employment.ok) {
				return;
			}

			const seeded = await seedDepartmentAndJob(ready, {
				organizationId: ORG_A,
				actorUserId: ACTOR,
			});
			expect(seeded).not.toBeNull();
			if (!seeded) {
				return;
			}

			const position = await createPosition(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-3",
					code: "POS-100",
					title: "Role",
					status: "active",
					...seeded,
				},
				ready,
			);
			expect(position.ok).toBe(true);
			if (!position.ok) {
				return;
			}

			const assignment = await createAssignment(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-4",
					employmentId: employment.data.id,
					positionId: position.data.id,
					...TEST_ORGANIZATION_DIMENSION_KEYS,
					startsOn: "2025-01-01",
					endsOn: null,
				},
				ready,
			);
			expect(assignment.ok).toBe(true);
			if (assignment.ok) {
				expect(assignment.data.positionId).toBe(position.data.id);
			}
		});

		it("rejects duplicate open assignment", async () => {
			const ready = harness();
			const employee = await createEmployee(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-1",
					idempotencyKey: "idem-1",
					employeeNumber: "E-701",
					legalName: "Name",
				},
				ready,
			);
			expect(employee.ok).toBe(true);
			if (!employee.ok) {
				return;
			}

			const employment = await createEmployment(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-2",
					employeeId: employee.data.id,
					startsOn: "2025-01-01",
					endsOn: null,
				},
				ready,
			);
			expect(employment.ok).toBe(true);
			if (!employment.ok) {
				return;
			}

			const seeded = await seedDepartmentAndJob(ready, {
				organizationId: ORG_A,
				actorUserId: ACTOR,
			});
			expect(seeded).not.toBeNull();
			if (!seeded) {
				return;
			}

			const position = await createPosition(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-3",
					code: "POS-101",
					title: "Role",
					status: "active",
					...seeded,
				},
				ready,
			);
			expect(position.ok).toBe(true);
			if (!position.ok) {
				return;
			}

			const first = await createAssignment(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-4",
					employmentId: employment.data.id,
					positionId: position.data.id,
					...TEST_ORGANIZATION_DIMENSION_KEYS,
					startsOn: "2025-01-01",
					endsOn: null,
				},
				ready,
			);
			expect(first.ok).toBe(true);

			const second = await createAssignment(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-5",
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
		});

		it("rejects closed position", async () => {
			const ready = harness();
			const employee = await createEmployee(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-1",
					idempotencyKey: "idem-1",
					employeeNumber: "E-702",
					legalName: "Name",
				},
				ready,
			);
			expect(employee.ok).toBe(true);
			if (!employee.ok) {
				return;
			}

			const employment = await createEmployment(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-2",
					employeeId: employee.data.id,
					startsOn: "2025-01-01",
					endsOn: null,
				},
				ready,
			);
			expect(employment.ok).toBe(true);
			if (!employment.ok) {
				return;
			}

			const seeded = await seedDepartmentAndJob(ready, {
				organizationId: ORG_A,
				actorUserId: ACTOR,
			});
			expect(seeded).not.toBeNull();
			if (!seeded) {
				return;
			}

			const position = await createPosition(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-3",
					code: "POS-102",
					title: "Closed Role",
					status: "closed",
					...seeded,
				},
				ready,
			);
			expect(position.ok).toBe(true);
			if (!position.ok) {
				return;
			}

			const assignment = await createAssignment(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-4",
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
	});

	describe("endAssignment", () => {
		it("ends an assignment successfully", async () => {
			const ready = harness();
			const employee = await createEmployee(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-1",
					idempotencyKey: "idem-1",
					employeeNumber: "E-800",
					legalName: "Name",
				},
				ready,
			);
			expect(employee.ok).toBe(true);
			if (!employee.ok) {
				return;
			}

			const employment = await createEmployment(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-2",
					employeeId: employee.data.id,
					startsOn: "2025-01-01",
					endsOn: null,
				},
				ready,
			);
			expect(employment.ok).toBe(true);
			if (!employment.ok) {
				return;
			}

			const seeded = await seedDepartmentAndJob(ready, {
				organizationId: ORG_A,
				actorUserId: ACTOR,
			});
			expect(seeded).not.toBeNull();
			if (!seeded) {
				return;
			}

			const position = await createPosition(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-3",
					code: "POS-200",
					title: "Role",
					status: "active",
					...seeded,
				},
				ready,
			);
			expect(position.ok).toBe(true);
			if (!position.ok) {
				return;
			}

			const assignment = await createAssignment(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-4",
					employmentId: employment.data.id,
					positionId: position.data.id,
					...TEST_ORGANIZATION_DIMENSION_KEYS,
					startsOn: "2025-01-01",
					endsOn: null,
				},
				ready,
			);
			expect(assignment.ok).toBe(true);
			if (!assignment.ok) {
				return;
			}

			const ended = await endAssignment(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-5",
					assignmentId: assignment.data.id,
					endsOn: "2025-12-31",
					expectedVersion: 1,
				},
				ready,
			);
			expect(ended.ok).toBe(true);
			if (ended.ok) {
				expect(ended.data.endsOn).toBe("2025-12-31");
				expect(ended.data.version).toBe(2);
			}
		});

		it("rejects stale expectedVersion", async () => {
			const ready = harness();
			const employee = await createEmployee(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-1",
					idempotencyKey: "idem-1",
					employeeNumber: "E-801",
					legalName: "Name",
				},
				ready,
			);
			expect(employee.ok).toBe(true);
			if (!employee.ok) {
				return;
			}

			const employment = await createEmployment(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-2",
					employeeId: employee.data.id,
					startsOn: "2025-01-01",
					endsOn: null,
				},
				ready,
			);
			expect(employment.ok).toBe(true);
			if (!employment.ok) {
				return;
			}

			const seeded = await seedDepartmentAndJob(ready, {
				organizationId: ORG_A,
				actorUserId: ACTOR,
			});
			expect(seeded).not.toBeNull();
			if (!seeded) {
				return;
			}

			const position = await createPosition(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-3",
					code: "POS-201",
					title: "Role",
					status: "active",
					...seeded,
				},
				ready,
			);
			expect(position.ok).toBe(true);
			if (!position.ok) {
				return;
			}

			const assignment = await createAssignment(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-4",
					employmentId: employment.data.id,
					positionId: position.data.id,
					...TEST_ORGANIZATION_DIMENSION_KEYS,
					startsOn: "2025-01-01",
					endsOn: null,
				},
				ready,
			);
			expect(assignment.ok).toBe(true);
			if (!assignment.ok) {
				return;
			}

			const ended = await endAssignment(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-5",
					assignmentId: assignment.data.id,
					endsOn: "2025-12-31",
					expectedVersion: 99,
				},
				ready,
			);
			expect(ended.ok).toBe(false);
			if (!ended.ok) {
				expect(humanResourcesCodeFromResult(ended)).toBe(
					HUMAN_RESOURCES_ERROR_STALE_VERSION,
				);
			}
		});

		it("supersedes an ended assignment with a new open assignment", async () => {
			const ready = harness();
			const employee = await createEmployee(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-super-1",
					idempotencyKey: "idem-super-1",
					employeeNumber: "E-802",
					legalName: "Name",
				},
				ready,
			);
			expect(employee.ok).toBe(true);
			if (!employee.ok) {
				return;
			}

			const employment = await createEmployment(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-super-2",
					employeeId: employee.data.id,
					startsOn: "2025-01-01",
					endsOn: null,
				},
				ready,
			);
			expect(employment.ok).toBe(true);
			if (!employment.ok) {
				return;
			}

			const seeded = await seedDepartmentAndJob(ready, {
				organizationId: ORG_A,
				actorUserId: ACTOR,
			});
			expect(seeded).not.toBeNull();
			if (!seeded) {
				return;
			}

			const positionA = await createPosition(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-super-3",
					code: "POS-SUPER-A",
					title: "Role A",
					status: "active",
					...seeded,
				},
				ready,
			);
			expect(positionA.ok).toBe(true);
			if (!positionA.ok) {
				return;
			}

			const positionB = await createPosition(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-super-4",
					code: "POS-SUPER-B",
					title: "Role B",
					status: "active",
					...seeded,
				},
				ready,
			);
			expect(positionB.ok).toBe(true);
			if (!positionB.ok) {
				return;
			}

			const first = await createAssignment(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-super-5",
					employmentId: employment.data.id,
					positionId: positionA.data.id,
					...TEST_ORGANIZATION_DIMENSION_KEYS,
					startsOn: "2025-01-01",
					endsOn: null,
				},
				ready,
			);
			expect(first.ok).toBe(true);
			if (!first.ok) {
				return;
			}

			const ended = await endAssignment(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-super-6",
					assignmentId: first.data.id,
					endsOn: "2025-06-30",
					expectedVersion: 1,
				},
				ready,
			);
			expect(ended.ok).toBe(true);

			const next = await createAssignment(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-super-7",
					employmentId: employment.data.id,
					positionId: positionB.data.id,
					...TEST_ORGANIZATION_DIMENSION_KEYS,
					startsOn: "2025-07-01",
					endsOn: null,
				},
				ready,
			);
			expect(next.ok).toBe(true);
			if (next.ok) {
				expect(next.data.positionId).toBe(positionB.data.id);
				expect(next.data.endsOn).toBeNull();
			}
		});
	});
});
