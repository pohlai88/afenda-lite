import { randomUUID } from "node:crypto";

import { fail, ok, type Result } from "@afenda/errors/result";
import {
	HUMAN_RESOURCES_EMPLOYEE_CREATED_EVENT,
	HUMAN_RESOURCES_EMPLOYEE_TERMINATED_EVENT,
	HUMAN_RESOURCES_EMPLOYMENT_CHANGED_EVENT,
	HUMAN_RESOURCES_EMPLOYMENT_STARTED_EVENT,
} from "@afenda/events/schemas";

import {
	type HumanResourcesAssignmentId,
	type HumanResourcesEmployeeId,
	type HumanResourcesEmploymentContractId,
	type HumanResourcesEmploymentId,
	type HumanResourcesPositionId,
	parseHumanResourcesAssignmentId,
	parseHumanResourcesEmployeeId,
	parseHumanResourcesEmploymentContractId,
	parseHumanResourcesEmploymentId,
} from "../../brands";
import {
	HUMAN_RESOURCES_ERROR_CONFLICT,
	HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
	HUMAN_RESOURCES_ERROR_DUPLICATE,
	HUMAN_RESOURCES_ERROR_INVALID_INPUT,
	HUMAN_RESOURCES_ERROR_NOT_FOUND,
	humanResourcesErrorDetails,
} from "../../error-codes";
import type { MutationPorts } from "../../ports";
import { assertExpectedVersion } from "../../shared/concurrency";
import { assertActivePosition } from "../../shared/domain-guards";
import {
	assertValidDateRange,
	type EmploymentStatus,
	employmentStatusSchema,
} from "../../shared/employment-status";
import { mapEmployeeNumberDuplicate } from "../../shared/persistence-errors";
import type {
	AssignmentCreateRecord,
	EmployeeCreateRecord,
	EmploymentContractCreateRecord,
	EmploymentCreateRecord,
	HumanResourcesStore,
	IdempotentEmployeeRecord,
} from "../../store";
import type {
	Employee,
	EmployeeListPage,
	Employment,
	EmploymentContract,
	WorkAssignment,
} from "../../types";
import type { OrganizationMemoryState } from "./organization";
import { idempotencyMapKey } from "./shared";

function cloneEmployee(employee: Employee): Employee {
	return { ...employee };
}

function mapEmployee(
	id: HumanResourcesEmployeeId,
	record: EmployeeCreateRecord,
	now: Date,
): Employee {
	return {
		id,
		organizationId: record.organizationId,
		employeeNumber: record.employeeNumber,
		legalName: record.legalName,
		version: 1,
		createdBy: record.createdBy,
		updatedBy: record.createdBy,
		createdAt: now,
		updatedAt: now,
	};
}

export type CoreMemoryState = {
	employees: Map<HumanResourcesEmployeeId, Employee>;
	idempotencyByKey: Map<string, IdempotentEmployeeRecord>;
	employments: Map<HumanResourcesEmploymentId, Employment>;
	contracts: Map<string, EmploymentContract>;
	assignments: Map<HumanResourcesAssignmentId, WorkAssignment>;
};

export type MemoryCoreMethods = Pick<
	HumanResourcesStore,
	| "getEmployeeById"
	| "findEmployeeByIdempotencyKey"
	| "createEmployee"
	| "updateEmployee"
	| "listEmployees"
	| "getEmploymentById"
	| "findOpenEmploymentByEmployee"
	| "createEmployment"
	| "amendEmployment"
	| "getEmploymentContractById"
	| "findContractByEmploymentAndCode"
	| "createEmploymentContract"
	| "countOpenAssignmentsForPosition"
	| "getAssignmentById"
	| "findOpenAssignmentByEmployment"
	| "createAssignment"
	| "endAssignment"
>;

export type CoreMemoryHost = Pick<HumanResourcesStore, "getPositionById">;

export function createCoreMemoryState(): CoreMemoryState {
	return {
		employees: new Map(),
		idempotencyByKey: new Map(),
		employments: new Map(),
		contracts: new Map(),
		assignments: new Map(),
	};
}

export function resetCoreMemoryState(state: CoreMemoryState): void {
	state.employees.clear();
	state.idempotencyByKey.clear();
	state.employments.clear();
	state.contracts.clear();
	state.assignments.clear();
}

export function createMemoryCoreMethods(
	state: CoreMemoryState,
	org: OrganizationMemoryState,
): MemoryCoreMethods & ThisType<CoreMemoryHost & MemoryCoreMethods> {
	return {
		async getEmployeeById(input: {
			organizationId: string;
			employeeId: HumanResourcesEmployeeId;
		}): Promise<Result<Employee | null>> {
			const employee = state.employees.get(input.employeeId);
			if (employee === undefined) {
				return ok(null);
			}
			if (employee.organizationId !== input.organizationId) {
				return ok(null);
			}
			return ok(cloneEmployee(employee));
		},

		async findEmployeeByIdempotencyKey(input: {
			organizationId: string;
			idempotencyKey: string;
		}): Promise<Result<IdempotentEmployeeRecord | null>> {
			const record = state.idempotencyByKey.get(
				idempotencyMapKey(input.organizationId, input.idempotencyKey),
			);
			if (record === undefined) {
				return ok(null);
			}
			return ok({
				employee: cloneEmployee(record.employee),
				createRequestFingerprint: record.createRequestFingerprint,
			});
		},

		async createEmployee(
			record: EmployeeCreateRecord,
			ports: MutationPorts,
			meta: { correlationId: string },
		): Promise<Result<Employee>> {
			const existingByKey = await this.findEmployeeByIdempotencyKey({
				organizationId: record.organizationId,
				idempotencyKey: record.createIdempotencyKey,
			});
			if (!existingByKey.ok) {
				return existingByKey;
			}
			if (existingByKey.data !== null) {
				return ok(cloneEmployee(existingByKey.data.employee));
			}

			for (const employee of state.employees.values()) {
				if (
					employee.organizationId === record.organizationId &&
					employee.employeeNumber.toUpperCase() ===
						record.normalizedEmployeeNumber
				) {
					return mapEmployeeNumberDuplicate();
				}
			}

			const idResult = parseHumanResourcesEmployeeId(randomUUID());
			if (!idResult.ok) {
				return idResult;
			}

			const now = new Date();
			const employee = mapEmployee(idResult.data, record, now);
			state.employees.set(employee.id, employee);
			state.idempotencyByKey.set(
				idempotencyMapKey(record.organizationId, record.createIdempotencyKey),
				{
					employee: cloneEmployee(employee),
					createRequestFingerprint: record.createRequestFingerprint,
				},
			);

			const audit = await ports.audit.record({
				organizationId: employee.organizationId,
				actorUserId: employee.createdBy,
				correlationId: meta.correlationId,
				entity: "hr_employee",
				entityId: employee.id,
				action: "CREATE",
				changes: [],
			});
			if (!audit.ok) {
				state.employees.delete(employee.id);
				state.idempotencyByKey.delete(
					idempotencyMapKey(record.organizationId, record.createIdempotencyKey),
				);
				return audit;
			}

			const outbox = await ports.outbox.append({
				organizationId: employee.organizationId,
				actorUserId: employee.createdBy,
				correlationId: meta.correlationId,
				type: HUMAN_RESOURCES_EMPLOYEE_CREATED_EVENT,
				payload: {
					organizationId: employee.organizationId,
					entityType: "hr_employee",
					entityId: employee.id,
					actorId: employee.createdBy,
					correlationId: meta.correlationId,
				},
			});
			if (!outbox.ok) {
				state.employees.delete(employee.id);
				state.idempotencyByKey.delete(
					idempotencyMapKey(record.organizationId, record.createIdempotencyKey),
				);
				return outbox;
			}

			return ok(cloneEmployee(employee));
		},

		async updateEmployee(
			input: {
				organizationId: string;
				employeeId: HumanResourcesEmployeeId;
				legalName: string;
				expectedVersion: number;
				actorUserId: string;
			},
			ports: MutationPorts,
			meta: { correlationId: string },
		): Promise<Result<Employee>> {
			const employee = state.employees.get(input.employeeId);
			if (!employee || employee.organizationId !== input.organizationId) {
				return fail(
					"NOT_FOUND",
					"Employee not found",
					humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_NOT_FOUND),
				);
			}

			const versionCheck = assertExpectedVersion(
				employee.version,
				input.expectedVersion,
			);
			if (!versionCheck.ok) {
				return versionCheck;
			}

			const now = new Date();
			const updated: Employee = {
				...employee,
				legalName: input.legalName,
				version: employee.version + 1,
				updatedBy: input.actorUserId,
				updatedAt: now,
			};

			state.employees.set(input.employeeId, updated);

			const audit = await ports.audit.record({
				organizationId: updated.organizationId,
				actorUserId: input.actorUserId,
				correlationId: meta.correlationId,
				entity: "hr_employee",
				entityId: updated.id,
				action: "UPDATE",
				changes: [],
			});
			if (!audit.ok) {
				state.employees.set(input.employeeId, employee);
				return audit;
			}

			return ok(cloneEmployee(updated));
		},

		async listEmployees(input: {
			organizationId: string;
			page: number;
			pageSize: number;
			employeeNumberPrefix?: string;
			legalNamePrefix?: string;
			employmentStatus?: string;
		}): Promise<Result<EmployeeListPage>> {
			let filtered = Array.from(state.employees.values()).filter(
				(e) => e.organizationId === input.organizationId,
			);

			if (input.employeeNumberPrefix) {
				const prefix = input.employeeNumberPrefix.toUpperCase();
				filtered = filtered.filter((e) =>
					e.employeeNumber.toUpperCase().startsWith(prefix),
				);
			}

			if (input.legalNamePrefix) {
				const prefix = input.legalNamePrefix.toUpperCase();
				filtered = filtered.filter((e) =>
					e.legalName.toUpperCase().startsWith(prefix),
				);
			}

			if (input.employmentStatus) {
				const employeeIds = Array.from(state.employments.values())
					.filter(
						(emp) =>
							emp.organizationId === input.organizationId &&
							emp.status === input.employmentStatus,
					)
					.map((emp) => emp.employeeId);
				filtered = filtered.filter((e) => employeeIds.includes(e.id));
			}

			filtered.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());

			const totalCount = filtered.length;
			const start = (input.page - 1) * input.pageSize;
			const employees = filtered
				.slice(start, start + input.pageSize)
				.map(cloneEmployee);

			return ok({
				employees,
				totalCount,
				page: input.page,
				pageSize: input.pageSize,
			});
		},

		// Employment methods
		async getEmploymentById(input: {
			organizationId: string;
			employmentId: HumanResourcesEmploymentId;
		}): Promise<Result<Employment | null>> {
			const employment = state.employments.get(input.employmentId);
			if (!employment || employment.organizationId !== input.organizationId) {
				return ok(null);
			}
			return ok({ ...employment });
		},

		async findOpenEmploymentByEmployee(input: {
			organizationId: string;
			employeeId: HumanResourcesEmployeeId;
		}): Promise<Result<Employment | null>> {
			for (const employment of state.employments.values()) {
				if (
					employment.organizationId === input.organizationId &&
					employment.employeeId === input.employeeId &&
					employment.endsOn === null
				) {
					return ok({ ...employment });
				}
			}
			return ok(null);
		},

		async createEmployment(
			record: EmploymentCreateRecord,
			ports: MutationPorts,
			meta: { correlationId: string },
		): Promise<Result<Employment>> {
			const employee = state.employees.get(record.employeeId);
			if (!employee || employee.organizationId !== record.organizationId) {
				return fail(
					"NOT_FOUND",
					"Employee not found",
					humanResourcesErrorDetails(
						HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
					),
				);
			}

			const dateCheck = assertValidDateRange(record.startsOn, record.endsOn);
			if (!dateCheck.ok) {
				return dateCheck;
			}

			const existingOpen = await this.findOpenEmploymentByEmployee({
				organizationId: record.organizationId,
				employeeId: record.employeeId,
			});
			if (!existingOpen.ok) {
				return existingOpen;
			}
			if (existingOpen.data !== null) {
				return fail(
					"CONFLICT",
					"Employee already has an open employment",
					humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_CONFLICT),
				);
			}

			const idResult = parseHumanResourcesEmploymentId(randomUUID());
			if (!idResult.ok) {
				return idResult;
			}

			const now = new Date();
			const employment: Employment = {
				id: idResult.data,
				organizationId: record.organizationId,
				employeeId: record.employeeId,
				status: "active",
				startsOn: record.startsOn,
				endsOn: record.endsOn,
				version: 1,
				createdBy: record.createdBy,
				updatedBy: record.createdBy,
				createdAt: now,
				updatedAt: now,
			};

			state.employments.set(employment.id, employment);

			const audit = await ports.audit.record({
				organizationId: employment.organizationId,
				actorUserId: employment.createdBy,
				correlationId: meta.correlationId,
				entity: "hr_employment",
				entityId: employment.id,
				action: "CREATE",
				changes: [],
			});
			if (!audit.ok) {
				state.employments.delete(employment.id);
				return audit;
			}

			const outbox = await ports.outbox.append({
				organizationId: employment.organizationId,
				actorUserId: employment.createdBy,
				correlationId: meta.correlationId,
				type: HUMAN_RESOURCES_EMPLOYMENT_STARTED_EVENT,
				payload: {
					organizationId: employment.organizationId,
					entityType: "hr_employment",
					entityId: employment.id,
					actorId: employment.createdBy,
					correlationId: meta.correlationId,
				},
			});
			if (!outbox.ok) {
				state.employments.delete(employment.id);
				return outbox;
			}

			return ok({ ...employment });
		},

		async amendEmployment(
			input: {
				organizationId: string;
				employmentId: HumanResourcesEmploymentId;
				status?: EmploymentStatus;
				startsOn?: string;
				endsOn?: string | null;
				expectedVersion: number;
				actorUserId: string;
			},
			ports: MutationPorts,
			meta: { correlationId: string },
		): Promise<Result<Employment>> {
			const employment = state.employments.get(input.employmentId);
			if (!employment || employment.organizationId !== input.organizationId) {
				return fail(
					"NOT_FOUND",
					"Employment not found",
					humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_NOT_FOUND),
				);
			}

			const versionCheck = assertExpectedVersion(
				employment.version,
				input.expectedVersion,
			);
			if (!versionCheck.ok) {
				return versionCheck;
			}

			const newStartsOn = input.startsOn ?? employment.startsOn;
			const newEndsOn =
				input.endsOn !== undefined ? input.endsOn : employment.endsOn;
			const nextStatus = input.status ?? employment.status;
			const parsedStatus = employmentStatusSchema.safeParse(nextStatus);
			if (!parsedStatus.success) {
				return fail(
					"BAD_REQUEST",
					"Invalid employment status",
					humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_INVALID_INPUT),
				);
			}

			const dateCheck = assertValidDateRange(newStartsOn, newEndsOn);
			if (!dateCheck.ok) {
				return dateCheck;
			}

			const now = new Date();
			const updated: Employment = {
				...employment,
				status: parsedStatus.data,
				startsOn: newStartsOn,
				endsOn: newEndsOn,
				version: employment.version + 1,
				updatedBy: input.actorUserId,
				updatedAt: now,
			};

			state.employments.set(input.employmentId, updated);

			const audit = await ports.audit.record({
				organizationId: updated.organizationId,
				actorUserId: input.actorUserId,
				correlationId: meta.correlationId,
				entity: "hr_employment",
				entityId: updated.id,
				action: "UPDATE",
				changes: [],
			});
			if (!audit.ok) {
				state.employments.set(input.employmentId, employment);
				return audit;
			}

			const outbox = await ports.outbox.append({
				organizationId: updated.organizationId,
				actorUserId: input.actorUserId,
				correlationId: meta.correlationId,
				type: HUMAN_RESOURCES_EMPLOYMENT_CHANGED_EVENT,
				payload: {
					organizationId: updated.organizationId,
					entityType: "hr_employment",
					entityId: updated.id,
					actorId: input.actorUserId,
					correlationId: meta.correlationId,
				},
			});
			if (!outbox.ok) {
				state.employments.set(input.employmentId, employment);
				return outbox;
			}

			if (
				parsedStatus.data === "terminated" &&
				employment.status !== "terminated"
			) {
				const terminated = await ports.outbox.append({
					organizationId: updated.organizationId,
					actorUserId: input.actorUserId,
					correlationId: meta.correlationId,
					type: HUMAN_RESOURCES_EMPLOYEE_TERMINATED_EVENT,
					payload: {
						organizationId: updated.organizationId,
						entityType: "hr_employee",
						entityId: updated.employeeId,
						actorId: input.actorUserId,
						correlationId: meta.correlationId,
					},
				});
				if (!terminated.ok) {
					state.employments.set(input.employmentId, employment);
					return terminated;
				}
			}

			return ok({ ...updated });
		},

		// Employment Contract methods
		async getEmploymentContractById(input: {
			organizationId: string;
			employmentContractId: HumanResourcesEmploymentContractId;
		}): Promise<Result<EmploymentContract | null>> {
			const contract = state.contracts.get(input.employmentContractId);
			if (!contract || contract.organizationId !== input.organizationId) {
				return ok(null);
			}
			return ok({ ...contract });
		},

		async findContractByEmploymentAndCode(input: {
			organizationId: string;
			employmentId: HumanResourcesEmploymentId;
			referenceCode: string;
		}): Promise<Result<EmploymentContract | null>> {
			for (const contract of state.contracts.values()) {
				if (
					contract.organizationId === input.organizationId &&
					contract.employmentId === input.employmentId &&
					contract.referenceCode === input.referenceCode
				) {
					return ok({ ...contract });
				}
			}
			return ok(null);
		},

		async createEmploymentContract(
			record: EmploymentContractCreateRecord,
			ports: MutationPorts,
			meta: { correlationId: string },
		): Promise<Result<EmploymentContract>> {
			const employment = state.employments.get(record.employmentId);
			if (!employment || employment.organizationId !== record.organizationId) {
				return fail(
					"NOT_FOUND",
					"Employment not found",
					humanResourcesErrorDetails(
						HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
					),
				);
			}

			if (employment.employeeId !== record.employeeId) {
				return fail(
					"BAD_REQUEST",
					"Employee does not match employment",
					humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_INVALID_INPUT),
				);
			}

			const dateCheck = assertValidDateRange(record.startsOn, record.endsOn);
			if (!dateCheck.ok) {
				return dateCheck;
			}

			const existing = await this.findContractByEmploymentAndCode({
				organizationId: record.organizationId,
				employmentId: record.employmentId,
				referenceCode: record.referenceCode,
			});
			if (!existing.ok) {
				return existing;
			}
			if (existing.data !== null) {
				return fail(
					"CONFLICT",
					"Contract with this reference code already exists",
					humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_DUPLICATE),
				);
			}

			const idResult = parseHumanResourcesEmploymentContractId(randomUUID());
			if (!idResult.ok) {
				return idResult;
			}

			const now = new Date();
			const contract: EmploymentContract = {
				id: idResult.data,
				organizationId: record.organizationId,
				employmentId: record.employmentId,
				employeeId: record.employeeId,
				referenceCode: record.referenceCode,
				startsOn: record.startsOn,
				endsOn: record.endsOn,
				version: 1,
				createdBy: record.createdBy,
				updatedBy: record.createdBy,
				createdAt: now,
				updatedAt: now,
			};

			state.contracts.set(contract.id, contract);

			const audit = await ports.audit.record({
				organizationId: contract.organizationId,
				actorUserId: contract.createdBy,
				correlationId: meta.correlationId,
				entity: "hr_employment_contract",
				entityId: contract.id,
				action: "CREATE",
				changes: [],
			});
			if (!audit.ok) {
				state.contracts.delete(contract.id);
				return audit;
			}

			const outbox = await ports.outbox.append({
				organizationId: contract.organizationId,
				actorUserId: contract.createdBy,
				correlationId: meta.correlationId,
				type: HUMAN_RESOURCES_EMPLOYMENT_CHANGED_EVENT,
				payload: {
					organizationId: contract.organizationId,
					entityType: "hr_employment_contract",
					entityId: contract.id,
					actorId: contract.createdBy,
					correlationId: meta.correlationId,
				},
			});
			if (!outbox.ok) {
				state.contracts.delete(contract.id);
				return outbox;
			}

			return ok({ ...contract });
		},

		// Department methods

		async countOpenAssignmentsForPosition(input: {
			organizationId: string;
			positionId: HumanResourcesPositionId;
		}): Promise<Result<number>> {
			let count = 0;
			for (const assignment of state.assignments.values()) {
				if (
					assignment.organizationId === input.organizationId &&
					assignment.positionId === input.positionId &&
					assignment.endsOn === null
				) {
					count += 1;
				}
			}
			return ok(count);
		},

		// Assignment methods
		async getAssignmentById(input: {
			organizationId: string;
			assignmentId: HumanResourcesAssignmentId;
		}): Promise<Result<WorkAssignment | null>> {
			const assignment = state.assignments.get(input.assignmentId);
			if (!assignment || assignment.organizationId !== input.organizationId) {
				return ok(null);
			}
			return ok({ ...assignment });
		},

		async findOpenAssignmentByEmployment(input: {
			organizationId: string;
			employmentId: HumanResourcesEmploymentId;
		}): Promise<Result<WorkAssignment | null>> {
			for (const assignment of state.assignments.values()) {
				if (
					assignment.organizationId === input.organizationId &&
					assignment.employmentId === input.employmentId &&
					assignment.endsOn === null
				) {
					return ok({ ...assignment });
				}
			}
			return ok(null);
		},

		async createAssignment(
			record: AssignmentCreateRecord,
			ports: MutationPorts,
			meta: { correlationId: string },
		): Promise<Result<WorkAssignment>> {
			const employment = state.employments.get(record.employmentId);
			if (!employment || employment.organizationId !== record.organizationId) {
				return fail(
					"NOT_FOUND",
					"Employment not found",
					humanResourcesErrorDetails(
						HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
					),
				);
			}

			if (employment.employeeId !== record.employeeId) {
				return fail(
					"BAD_REQUEST",
					"Employee does not match employment",
					humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_INVALID_INPUT),
				);
			}

			const position = org.positions.get(record.positionId);
			if (!position || position.organizationId !== record.organizationId) {
				return fail(
					"NOT_FOUND",
					"Position not found",
					humanResourcesErrorDetails(
						HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
					),
				);
			}

			const activeCheck = assertActivePosition(position.status);
			if (!activeCheck.ok) {
				return activeCheck;
			}

			const dateCheck = assertValidDateRange(record.startsOn, record.endsOn);
			if (!dateCheck.ok) {
				return dateCheck;
			}

			const existingOpen = await this.findOpenAssignmentByEmployment({
				organizationId: record.organizationId,
				employmentId: record.employmentId,
			});
			if (!existingOpen.ok) {
				return existingOpen;
			}
			if (existingOpen.data !== null) {
				return fail(
					"CONFLICT",
					"Employment already has an open assignment",
					humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_CONFLICT),
				);
			}

			const idResult = parseHumanResourcesAssignmentId(randomUUID());
			if (!idResult.ok) {
				return idResult;
			}

			const now = new Date();
			const assignment: WorkAssignment = {
				id: idResult.data,
				organizationId: record.organizationId,
				employmentId: record.employmentId,
				employeeId: record.employeeId,
				positionId: record.positionId,
				startsOn: record.startsOn,
				endsOn: record.endsOn,
				version: 1,
				createdBy: record.createdBy,
				updatedBy: record.createdBy,
				createdAt: now,
				updatedAt: now,
			};

			state.assignments.set(assignment.id, assignment);

			const audit = await ports.audit.record({
				organizationId: assignment.organizationId,
				actorUserId: assignment.createdBy,
				correlationId: meta.correlationId,
				entity: "hr_work_assignment",
				entityId: assignment.id,
				action: "CREATE",
				changes: [],
			});
			if (!audit.ok) {
				state.assignments.delete(assignment.id);
				return audit;
			}

			return ok({ ...assignment });
		},

		async endAssignment(
			input: {
				organizationId: string;
				assignmentId: HumanResourcesAssignmentId;
				endsOn: string;
				expectedVersion: number;
				actorUserId: string;
			},
			ports: MutationPorts,
			meta: { correlationId: string },
		): Promise<Result<WorkAssignment>> {
			const assignment = state.assignments.get(input.assignmentId);
			if (!assignment || assignment.organizationId !== input.organizationId) {
				return fail(
					"NOT_FOUND",
					"Assignment not found",
					humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_NOT_FOUND),
				);
			}

			const versionCheck = assertExpectedVersion(
				assignment.version,
				input.expectedVersion,
			);
			if (!versionCheck.ok) {
				return versionCheck;
			}

			const dateCheck = assertValidDateRange(assignment.startsOn, input.endsOn);
			if (!dateCheck.ok) {
				return dateCheck;
			}

			const now = new Date();
			const updated: WorkAssignment = {
				...assignment,
				endsOn: input.endsOn,
				version: assignment.version + 1,
				updatedBy: input.actorUserId,
				updatedAt: now,
			};

			state.assignments.set(input.assignmentId, updated);

			const audit = await ports.audit.record({
				organizationId: updated.organizationId,
				actorUserId: input.actorUserId,
				correlationId: meta.correlationId,
				entity: "hr_work_assignment",
				entityId: updated.id,
				action: "UPDATE",
				changes: [],
			});
			if (!audit.ok) {
				state.assignments.set(input.assignmentId, assignment);
				return audit;
			}

			return ok({ ...updated });
		},

		// Reporting line methods
	};
}
