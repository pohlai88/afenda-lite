import { describe, expect, it } from "vitest";

import {
	createAssignment,
	endAssignment,
} from "../src/core/assignment";
import {
	createEmployee,
	listEmployees,
	updateEmployee,
} from "../src/core/employee";
import {
	amendEmployment,
	createEmployment,
} from "../src/core/employment";
import { createEmploymentContract } from "../src/core/employment-contract";
import { createPosition } from "../src/organization/position";
import {
	HUMAN_RESOURCES_ERROR_CONFLICT,
	HUMAN_RESOURCES_ERROR_DUPLICATE,
	HUMAN_RESOURCES_ERROR_FORBIDDEN,
	HUMAN_RESOURCES_ERROR_INVALID_INPUT,
	HUMAN_RESOURCES_ERROR_INVALID_STATE_TRANSITION,
	HUMAN_RESOURCES_ERROR_NOT_FOUND,
	HUMAN_RESOURCES_ERROR_STALE_VERSION,
	HUMAN_RESOURCES_ERROR_UNAUTHORIZED,
} from "../src/error-codes";
import {
	HUMAN_RESOURCES_PERMISSION_CODES,
	HUMAN_RESOURCES_PERMISSION_EMPLOYEE_READ,
	HUMAN_RESOURCES_PERMISSION_EMPLOYEE_WRITE,
	HUMAN_RESOURCES_PERMISSION_EMPLOYMENT_WRITE,
	HUMAN_RESOURCES_PERMISSION_POSITION_WRITE,
} from "../src/permissions";
import { createMemoryHumanResourcesStore } from "../src/testing";
import { createGrantingHumanResourcesAuthorization } from "./helpers/memory-authorization";
import { createMemoryMutationPorts } from "./helpers/memory-ports";
import { humanResourcesCodeFromResult } from "./helpers/result-details";

const ORG_A = "org-a";
const ORG_B = "org-b";
const ACTOR = "user-actor-1";

function harness() {
	const store = createMemoryHumanResourcesStore();
	const ports = createMemoryMutationPorts();
	const authorization = createGrantingHumanResourcesAuthorization([
		...HUMAN_RESOURCES_PERMISSION_CODES,
	]);
	return { store, ports, authorization };
}

describe("@afenda/human-resources workforce operations", () => {
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
			if (!created.ok) return;

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
			if (!created.ok) return;

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
			if (!created.ok) return;

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
			if (!created.ok) return;

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
			if (!employee.ok) return;

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
			if (!employee.ok) return;

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
			if (!employee.ok) return;

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
					HUMAN_RESOURCES_ERROR_CONFLICT,
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
			if (!employee.ok) return;

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
					HUMAN_RESOURCES_ERROR_INVALID_STATE_TRANSITION,
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
			if (!employee.ok) return;

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
			if (!employment.ok) return;

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
			if (!employee.ok) return;

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
			if (!employment.ok) return;
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
			if (!notice.ok) return;
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
			}
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
			if (!employee.ok) return;

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
			if (!employment.ok) return;

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
			if (!terminated.ok) return;

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
			expect(employee.ok) .toBe(true);
			if (!employee.ok) return;

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
			if (!employment.ok) return;

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
			if (!employee.ok) return;

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
			if (!employment.ok) return;

			const contract = await createEmploymentContract(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-3",
					employmentId: employment.data.id,
					referenceCode: "CONTRACT-001",
					startsOn: "2025-01-01",
					endsOn: null,
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
			if (!employee.ok) return;

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
			if (!employment.ok) return;

			const first = await createEmploymentContract(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-3",
					employmentId: employment.data.id,
					referenceCode: "CONTRACT-DUP",
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
					correlationId: "corr-4",
			employmentId: employment.data.id,
			referenceCode: "CONTRACT-DUP",
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
			if (!employee.ok) return;

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
			if (!employment.ok) return;

			const contract = await createEmploymentContract(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-3",
			employmentId: employment.data.id,
			referenceCode: "CONTRACT-002",
			startsOn: "2025-12-31",
			endsOn: "2025-01-01",
		},
		ready,
	);
	expect(contract.ok).toBe(false);
	if (!contract.ok) {
		expect(humanResourcesCodeFromResult(contract)).toBe(
			HUMAN_RESOURCES_ERROR_INVALID_STATE_TRANSITION,
		);
	}
		});
	});

	describe("createPosition", () => {
		it("creates a position successfully", async () => {
			const ready = harness();
			const position = await createPosition(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-1",
					code: "POS-001",
					title: "Software Engineer",
					status: "active",
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
			const position = await createPosition(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-1",
					code: "",
					title: "",
					status: "invalid" as never,
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
			ready.authorization = createGrantingHumanResourcesAuthorization([]);
			const position = await createPosition(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-1",
					code: "POS-002",
					title: "Position",
					status: "active",
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
			if (!employee.ok) return;

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
			if (!employment.ok) return;

			const position = await createPosition(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-3",
					code: "POS-100",
					title: "Role",
					status: "active",
				},
				ready,
			);
			expect(position.ok).toBe(true);
			if (!position.ok) return;

		const assignment = await createAssignment(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-4",
				employmentId: employment.data.id,
				positionId: position.data.id,
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
			if (!employee.ok) return;

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
			if (!employment.ok) return;

			const position = await createPosition(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-3",
					code: "POS-101",
					title: "Role",
					status: "active",
				},
				ready,
			);
			expect(position.ok).toBe(true);
			if (!position.ok) return;

			const first = await createAssignment(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-4",
					employmentId: employment.data.id,
					positionId: position.data.id,
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

		it("rejects inactive position", async () => {
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
			if (!employee.ok) return;

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
			if (!employment.ok) return;

			const position = await createPosition(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-3",
					code: "POS-102",
					title: "Inactive Role",
					status: "inactive",
				},
				ready,
			);
			expect(position.ok).toBe(true);
			if (!position.ok) return;

			const assignment = await createAssignment(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-4",
			employmentId: employment.data.id,
			positionId: position.data.id,
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
			if (!employee.ok) return;

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
			if (!employment.ok) return;

			const position = await createPosition(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-3",
					code: "POS-200",
					title: "Role",
					status: "active",
				},
				ready,
			);
			expect(position.ok).toBe(true);
			if (!position.ok) return;

			const assignment = await createAssignment(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-4",
					employmentId: employment.data.id,
					positionId: position.data.id,
					startsOn: "2025-01-01",
					endsOn: null,
				},
				ready,
			);
			expect(assignment.ok).toBe(true);
			if (!assignment.ok) return;

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
			if (!employee.ok) return;

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
			if (!employment.ok) return;

			const position = await createPosition(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-3",
					code: "POS-201",
					title: "Role",
					status: "active",
				},
				ready,
			);
			expect(position.ok).toBe(true);
			if (!position.ok) return;

			const assignment = await createAssignment(
				{
					organizationId: ORG_A,
					actorUserId: ACTOR,
					correlationId: "corr-4",
					employmentId: employment.data.id,
					positionId: position.data.id,
					startsOn: "2025-01-01",
					endsOn: null,
				},
				ready,
			);
			expect(assignment.ok).toBe(true);
			if (!assignment.ok) return;

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
	});
});
