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
	type HumanResourcesDepartmentId,
	type HumanResourcesEmployeeId,
	type HumanResourcesEmploymentContractId,
	type HumanResourcesEmploymentId,
	type HumanResourcesJobId,
	type HumanResourcesPositionId,
	type HumanResourcesReportingLineId,
	parseHumanResourcesAssignmentId,
	parseHumanResourcesDepartmentId,
	parseHumanResourcesEmployeeId,
	parseHumanResourcesEmploymentContractId,
	parseHumanResourcesEmploymentId,
	parseHumanResourcesJobId,
	parseHumanResourcesPositionId,
	parseHumanResourcesReportingLineId,
} from "./brands";
import {
	HUMAN_RESOURCES_ERROR_CONFLICT,
	HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
	HUMAN_RESOURCES_ERROR_DUPLICATE,
	HUMAN_RESOURCES_ERROR_INVALID_INPUT,
	HUMAN_RESOURCES_ERROR_NOT_FOUND,
	humanResourcesErrorDetails,
} from "./error-codes";
import type { MutationPorts } from "./ports";
import { assertExpectedVersion } from "./shared/concurrency";
import {
	assertActivePosition,
	conflict,
	invalidInput,
	notFound,
} from "./shared/domain-guards";
import {
	assertValidDateRange,
	type DepartmentStatus,
	type EmploymentStatus,
	employmentStatusSchema,
	type JobStatus,
	type PositionStatus,
	positionStatusSchema,
} from "./shared/employment-status";
import {
	assertActiveDepartment,
	assertActiveJob,
	assertDepartmentParentAcyclic,
	assertDepartmentStatusTransition,
	assertJobStatusTransition,
	assertNoPrimaryReportingOverlap,
	assertPositionStatusTransition,
	assertReportingLineAcyclic,
	buildBoundedDepartmentTree,
} from "./shared/organization-guards";
import { mapEmployeeNumberDuplicate } from "./shared/persistence-errors";
import type {
	AssignmentCreateRecord,
	DepartmentCreateRecord,
	EmployeeCreateRecord,
	EmploymentContractCreateRecord,
	EmploymentCreateRecord,
	HumanResourcesStore,
	IdempotentEmployeeRecord,
	JobCreateRecord,
	PositionCreateRecord,
	ReportingLineCreateRecord,
} from "./store";
import type {
	Department,
	Employee,
	EmployeeListPage,
	Employment,
	EmploymentContract,
	Job,
	OrganizationTreePage,
	Position,
	ReportingLine,
	WorkAssignment,
} from "./types";

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

/** In-memory Human Resources store for Vitest domain tests. */
export class MemoryHumanResourcesStore implements HumanResourcesStore {
	private readonly employees = new Map<string, Employee>();
	private readonly idempotencyByKey = new Map<
		string,
		IdempotentEmployeeRecord
	>();
	private readonly employments = new Map<string, Employment>();
	private readonly contracts = new Map<string, EmploymentContract>();
	private readonly departments = new Map<string, Department>();
	private readonly jobs = new Map<string, Job>();
	private readonly positions = new Map<string, Position>();
	private readonly assignments = new Map<string, WorkAssignment>();
	private readonly reportingLines = new Map<string, ReportingLine>();

	private idempotencyMapKey(organizationId: string, idempotencyKey: string) {
		return `${organizationId}:${idempotencyKey}`;
	}

	/** Clear all in-memory state for test isolation. */
	reset(): void {
		this.employees.clear();
		this.idempotencyByKey.clear();
		this.employments.clear();
		this.contracts.clear();
		this.departments.clear();
		this.jobs.clear();
		this.positions.clear();
		this.assignments.clear();
		this.reportingLines.clear();
	}

	// Employee methods
	async getEmployeeById(input: {
		organizationId: string;
		employeeId: HumanResourcesEmployeeId;
	}): Promise<Result<Employee | null>> {
		const employee = this.employees.get(input.employeeId);
		if (employee === undefined) {
			return ok(null);
		}
		if (employee.organizationId !== input.organizationId) {
			return ok(null);
		}
		return ok(cloneEmployee(employee));
	}

	async findEmployeeByIdempotencyKey(input: {
		organizationId: string;
		idempotencyKey: string;
	}): Promise<Result<IdempotentEmployeeRecord | null>> {
		const record = this.idempotencyByKey.get(
			this.idempotencyMapKey(input.organizationId, input.idempotencyKey),
		);
		if (record === undefined) {
			return ok(null);
		}
		return ok({
			employee: cloneEmployee(record.employee),
			createRequestFingerprint: record.createRequestFingerprint,
		});
	}

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

		for (const employee of this.employees.values()) {
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
		this.employees.set(employee.id, employee);
		this.idempotencyByKey.set(
			this.idempotencyMapKey(
				record.organizationId,
				record.createIdempotencyKey,
			),
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
			this.employees.delete(employee.id);
			this.idempotencyByKey.delete(
				this.idempotencyMapKey(
					record.organizationId,
					record.createIdempotencyKey,
				),
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
			this.employees.delete(employee.id);
			this.idempotencyByKey.delete(
				this.idempotencyMapKey(
					record.organizationId,
					record.createIdempotencyKey,
				),
			);
			return outbox;
		}

		return ok(cloneEmployee(employee));
	}

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
		const employee = this.employees.get(input.employeeId);
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

		this.employees.set(input.employeeId, updated);

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
			this.employees.set(input.employeeId, employee);
			return audit;
		}

		return ok(cloneEmployee(updated));
	}

	async listEmployees(input: {
		organizationId: string;
		page: number;
		pageSize: number;
		employeeNumberPrefix?: string;
		legalNamePrefix?: string;
		employmentStatus?: string;
	}): Promise<Result<EmployeeListPage>> {
		let filtered = Array.from(this.employees.values()).filter(
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
			const employeeIds = Array.from(this.employments.values())
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
	}

	// Employment methods
	async getEmploymentById(input: {
		organizationId: string;
		employmentId: HumanResourcesEmploymentId;
	}): Promise<Result<Employment | null>> {
		const employment = this.employments.get(input.employmentId);
		if (!employment || employment.organizationId !== input.organizationId) {
			return ok(null);
		}
		return ok({ ...employment });
	}

	async findOpenEmploymentByEmployee(input: {
		organizationId: string;
		employeeId: HumanResourcesEmployeeId;
	}): Promise<Result<Employment | null>> {
		for (const employment of this.employments.values()) {
			if (
				employment.organizationId === input.organizationId &&
				employment.employeeId === input.employeeId &&
				employment.endsOn === null
			) {
				return ok({ ...employment });
			}
		}
		return ok(null);
	}

	async createEmployment(
		record: EmploymentCreateRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<Employment>> {
		const employee = this.employees.get(record.employeeId);
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

		this.employments.set(employment.id, employment);

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
			this.employments.delete(employment.id);
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
			this.employments.delete(employment.id);
			return outbox;
		}

		return ok({ ...employment });
	}

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
		const employment = this.employments.get(input.employmentId);
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

		this.employments.set(input.employmentId, updated);

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
			this.employments.set(input.employmentId, employment);
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
			this.employments.set(input.employmentId, employment);
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
				this.employments.set(input.employmentId, employment);
				return terminated;
			}
		}

		return ok({ ...updated });
	}

	// Employment Contract methods
	async getEmploymentContractById(input: {
		organizationId: string;
		employmentContractId: HumanResourcesEmploymentContractId;
	}): Promise<Result<EmploymentContract | null>> {
		const contract = this.contracts.get(input.employmentContractId);
		if (!contract || contract.organizationId !== input.organizationId) {
			return ok(null);
		}
		return ok({ ...contract });
	}

	async findContractByEmploymentAndCode(input: {
		organizationId: string;
		employmentId: HumanResourcesEmploymentId;
		referenceCode: string;
	}): Promise<Result<EmploymentContract | null>> {
		for (const contract of this.contracts.values()) {
			if (
				contract.organizationId === input.organizationId &&
				contract.employmentId === input.employmentId &&
				contract.referenceCode === input.referenceCode
			) {
				return ok({ ...contract });
			}
		}
		return ok(null);
	}

	async createEmploymentContract(
		record: EmploymentContractCreateRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<EmploymentContract>> {
		const employment = this.employments.get(record.employmentId);
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

		this.contracts.set(contract.id, contract);

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
			this.contracts.delete(contract.id);
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
			this.contracts.delete(contract.id);
			return outbox;
		}

		return ok({ ...contract });
	}

	// Department methods
	async getDepartmentById(input: {
		organizationId: string;
		departmentId: HumanResourcesDepartmentId;
	}): Promise<Result<Department | null>> {
		const department = this.departments.get(input.departmentId);
		if (!department || department.organizationId !== input.organizationId) {
			return ok(null);
		}
		return ok({ ...department });
	}

	async findDepartmentByCode(input: {
		organizationId: string;
		code: string;
	}): Promise<Result<Department | null>> {
		for (const department of this.departments.values()) {
			if (
				department.organizationId === input.organizationId &&
				department.code === input.code
			) {
				return ok({ ...department });
			}
		}
		return ok(null);
	}

	async createDepartment(
		record: DepartmentCreateRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<Department>> {
		const existing = await this.findDepartmentByCode({
			organizationId: record.organizationId,
			code: record.code,
		});
		if (!existing.ok) {
			return existing;
		}
		if (existing.data !== null) {
			return fail(
				"CONFLICT",
				"Department with this code already exists",
				humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_DUPLICATE),
			);
		}

		if (record.parentDepartmentId !== null) {
			const parent = this.departments.get(record.parentDepartmentId);
			if (!parent || parent.organizationId !== record.organizationId) {
				return notFound(
					"Parent department not found",
					HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
				);
			}
			const activeParent = assertActiveDepartment(parent.status);
			if (!activeParent.ok) {
				return activeParent;
			}
		}

		const idResult = parseHumanResourcesDepartmentId(randomUUID());
		if (!idResult.ok) {
			return idResult;
		}

		const now = new Date();
		const department: Department = {
			id: idResult.data,
			organizationId: record.organizationId,
			code: record.code,
			name: record.name,
			parentDepartmentId: record.parentDepartmentId,
			status: record.status,
			version: 1,
			createdBy: record.createdBy,
			updatedBy: record.createdBy,
			createdAt: now,
			updatedAt: now,
		};

		this.departments.set(department.id, department);

		const audit = await ports.audit.record({
			organizationId: department.organizationId,
			actorUserId: department.createdBy,
			correlationId: meta.correlationId,
			entity: "hr_department",
			entityId: department.id,
			action: "CREATE",
			changes: [],
		});
		if (!audit.ok) {
			this.departments.delete(department.id);
			return audit;
		}

		return ok({ ...department });
	}

	async updateDepartment(
		input: {
			organizationId: string;
			departmentId: HumanResourcesDepartmentId;
			name?: string;
			parentDepartmentId?: HumanResourcesDepartmentId | null;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<Department>> {
		const department = this.departments.get(input.departmentId);
		if (!department || department.organizationId !== input.organizationId) {
			return notFound("Department not found");
		}

		const versionCheck = assertExpectedVersion(
			department.version,
			input.expectedVersion,
		);
		if (!versionCheck.ok) {
			return versionCheck;
		}

		const nextName = input.name !== undefined ? input.name : department.name;
		const nextParent =
			input.parentDepartmentId !== undefined
				? input.parentDepartmentId
				: department.parentDepartmentId;

		if (nextParent !== null) {
			const parent = this.departments.get(nextParent);
			if (!parent || parent.organizationId !== input.organizationId) {
				return notFound(
					"Parent department not found",
					HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
				);
			}
			const activeParent = assertActiveDepartment(parent.status);
			if (!activeParent.ok) {
				return activeParent;
			}
		}

		const cycleCheck = assertDepartmentParentAcyclic({
			departmentId: input.departmentId,
			proposedParentId: nextParent,
			getParentId: (id) => {
				const dept = this.departments.get(id);
				if (!dept || dept.organizationId !== input.organizationId) {
					return undefined;
				}
				return dept.parentDepartmentId;
			},
		});
		if (!cycleCheck.ok) {
			return cycleCheck;
		}

		const now = new Date();
		const updated: Department = {
			...department,
			name: nextName,
			parentDepartmentId: nextParent,
			version: department.version + 1,
			updatedBy: input.actorUserId,
			updatedAt: now,
		};

		this.departments.set(input.departmentId, updated);

		const audit = await ports.audit.record({
			organizationId: updated.organizationId,
			actorUserId: input.actorUserId,
			correlationId: meta.correlationId,
			entity: "hr_department",
			entityId: updated.id,
			action: "UPDATE",
			changes: [],
		});
		if (!audit.ok) {
			this.departments.set(input.departmentId, department);
			return audit;
		}

		return ok({ ...updated });
	}

	async setDepartmentStatus(
		input: {
			organizationId: string;
			departmentId: HumanResourcesDepartmentId;
			status: DepartmentStatus;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<Department>> {
		const department = this.departments.get(input.departmentId);
		if (!department || department.organizationId !== input.organizationId) {
			return notFound("Department not found");
		}

		const versionCheck = assertExpectedVersion(
			department.version,
			input.expectedVersion,
		);
		if (!versionCheck.ok) {
			return versionCheck;
		}

		const transition = assertDepartmentStatusTransition(
			department.status,
			input.status,
		);
		if (!transition.ok) {
			return transition;
		}

		if (input.status === "archived") {
			const childCount = await this.countActiveChildDepartments({
				organizationId: input.organizationId,
				parentDepartmentId: input.departmentId,
			});
			if (!childCount.ok) {
				return childCount;
			}
			if (childCount.data > 0) {
				return conflict(
					"Cannot archive department with active child departments",
				);
			}

			const positionCount =
				await this.countActiveOrFrozenPositionsForDepartment({
					organizationId: input.organizationId,
					departmentId: input.departmentId,
				});
			if (!positionCount.ok) {
				return positionCount;
			}
			if (positionCount.data > 0) {
				return conflict(
					"Cannot archive department with active or frozen positions",
				);
			}
		}

		const now = new Date();
		const updated: Department = {
			...department,
			status: input.status,
			version: department.version + 1,
			updatedBy: input.actorUserId,
			updatedAt: now,
		};

		this.departments.set(input.departmentId, updated);

		const audit = await ports.audit.record({
			organizationId: updated.organizationId,
			actorUserId: input.actorUserId,
			correlationId: meta.correlationId,
			entity: "hr_department",
			entityId: updated.id,
			action: "UPDATE",
			changes: [],
		});
		if (!audit.ok) {
			this.departments.set(input.departmentId, department);
			return audit;
		}

		return ok({ ...updated });
	}

	async listDepartments(input: {
		organizationId: string;
		page: number;
		pageSize: number;
		status?: DepartmentStatus;
		parentDepartmentId?: HumanResourcesDepartmentId | null;
	}): Promise<Result<{ departments: Department[]; totalCount: number }>> {
		let filtered = Array.from(this.departments.values()).filter(
			(d) => d.organizationId === input.organizationId,
		);

		if (input.status !== undefined) {
			filtered = filtered.filter((d) => d.status === input.status);
		}
		if (input.parentDepartmentId !== undefined) {
			filtered = filtered.filter(
				(d) => d.parentDepartmentId === input.parentDepartmentId,
			);
		}

		filtered.sort((a, b) => a.code.localeCompare(b.code));

		const totalCount = filtered.length;
		const start = (input.page - 1) * input.pageSize;
		const departments = filtered
			.slice(start, start + input.pageSize)
			.map((d) => ({ ...d }));

		return ok({ departments, totalCount });
	}

	async listAllDepartments(input: {
		organizationId: string;
	}): Promise<Result<Department[]>> {
		const departments = Array.from(this.departments.values())
			.filter((d) => d.organizationId === input.organizationId)
			.map((d) => ({ ...d }));
		departments.sort((a, b) => a.code.localeCompare(b.code));
		return ok(departments);
	}

	// Job methods
	async getJobById(input: {
		organizationId: string;
		jobId: HumanResourcesJobId;
	}): Promise<Result<Job | null>> {
		const job = this.jobs.get(input.jobId);
		if (!job || job.organizationId !== input.organizationId) {
			return ok(null);
		}
		return ok({ ...job });
	}

	async findJobByCode(input: {
		organizationId: string;
		code: string;
	}): Promise<Result<Job | null>> {
		for (const job of this.jobs.values()) {
			if (
				job.organizationId === input.organizationId &&
				job.code === input.code
			) {
				return ok({ ...job });
			}
		}
		return ok(null);
	}

	async createJob(
		record: JobCreateRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<Job>> {
		const existing = await this.findJobByCode({
			organizationId: record.organizationId,
			code: record.code,
		});
		if (!existing.ok) {
			return existing;
		}
		if (existing.data !== null) {
			return fail(
				"CONFLICT",
				"Job with this code already exists",
				humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_DUPLICATE),
			);
		}

		const idResult = parseHumanResourcesJobId(randomUUID());
		if (!idResult.ok) {
			return idResult;
		}

		const now = new Date();
		const job: Job = {
			id: idResult.data,
			organizationId: record.organizationId,
			code: record.code,
			title: record.title,
			status: record.status,
			version: 1,
			createdBy: record.createdBy,
			updatedBy: record.createdBy,
			createdAt: now,
			updatedAt: now,
		};

		this.jobs.set(job.id, job);

		const audit = await ports.audit.record({
			organizationId: job.organizationId,
			actorUserId: job.createdBy,
			correlationId: meta.correlationId,
			entity: "hr_job",
			entityId: job.id,
			action: "CREATE",
			changes: [],
		});
		if (!audit.ok) {
			this.jobs.delete(job.id);
			return audit;
		}

		return ok({ ...job });
	}

	async updateJob(
		input: {
			organizationId: string;
			jobId: HumanResourcesJobId;
			title: string;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<Job>> {
		const job = this.jobs.get(input.jobId);
		if (!job || job.organizationId !== input.organizationId) {
			return notFound("Job not found");
		}

		const versionCheck = assertExpectedVersion(
			job.version,
			input.expectedVersion,
		);
		if (!versionCheck.ok) {
			return versionCheck;
		}

		const now = new Date();
		const updated: Job = {
			...job,
			title: input.title,
			version: job.version + 1,
			updatedBy: input.actorUserId,
			updatedAt: now,
		};

		this.jobs.set(input.jobId, updated);

		const audit = await ports.audit.record({
			organizationId: updated.organizationId,
			actorUserId: input.actorUserId,
			correlationId: meta.correlationId,
			entity: "hr_job",
			entityId: updated.id,
			action: "UPDATE",
			changes: [],
		});
		if (!audit.ok) {
			this.jobs.set(input.jobId, job);
			return audit;
		}

		return ok({ ...updated });
	}

	async setJobStatus(
		input: {
			organizationId: string;
			jobId: HumanResourcesJobId;
			status: JobStatus;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<Job>> {
		const job = this.jobs.get(input.jobId);
		if (!job || job.organizationId !== input.organizationId) {
			return notFound("Job not found");
		}

		const versionCheck = assertExpectedVersion(
			job.version,
			input.expectedVersion,
		);
		if (!versionCheck.ok) {
			return versionCheck;
		}

		const transition = assertJobStatusTransition(job.status, input.status);
		if (!transition.ok) {
			return transition;
		}

		if (input.status === "archived") {
			const positionCount = await this.countActiveOrFrozenPositionsForJob({
				organizationId: input.organizationId,
				jobId: input.jobId,
			});
			if (!positionCount.ok) {
				return positionCount;
			}
			if (positionCount.data > 0) {
				return conflict("Cannot archive job with active or frozen positions");
			}
		}

		const now = new Date();
		const updated: Job = {
			...job,
			status: input.status,
			version: job.version + 1,
			updatedBy: input.actorUserId,
			updatedAt: now,
		};

		this.jobs.set(input.jobId, updated);

		const audit = await ports.audit.record({
			organizationId: updated.organizationId,
			actorUserId: input.actorUserId,
			correlationId: meta.correlationId,
			entity: "hr_job",
			entityId: updated.id,
			action: "UPDATE",
			changes: [],
		});
		if (!audit.ok) {
			this.jobs.set(input.jobId, job);
			return audit;
		}

		return ok({ ...updated });
	}

	async listJobs(input: {
		organizationId: string;
		page: number;
		pageSize: number;
		status?: JobStatus;
	}): Promise<Result<{ jobs: Job[]; totalCount: number }>> {
		let filtered = Array.from(this.jobs.values()).filter(
			(j) => j.organizationId === input.organizationId,
		);

		if (input.status !== undefined) {
			filtered = filtered.filter((j) => j.status === input.status);
		}

		filtered.sort((a, b) => a.code.localeCompare(b.code));

		const totalCount = filtered.length;
		const start = (input.page - 1) * input.pageSize;
		const jobs = filtered
			.slice(start, start + input.pageSize)
			.map((j) => ({ ...j }));

		return ok({ jobs, totalCount });
	}

	// Position methods
	async getPositionById(input: {
		organizationId: string;
		positionId: HumanResourcesPositionId;
	}): Promise<Result<Position | null>> {
		const position = this.positions.get(input.positionId);
		if (!position || position.organizationId !== input.organizationId) {
			return ok(null);
		}
		return ok({ ...position });
	}

	async findPositionByCode(input: {
		organizationId: string;
		code: string;
	}): Promise<Result<Position | null>> {
		for (const position of this.positions.values()) {
			if (
				position.organizationId === input.organizationId &&
				position.code === input.code
			) {
				return ok({ ...position });
			}
		}
		return ok(null);
	}

	async createPosition(
		record: PositionCreateRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<Position>> {
		const parsedStatus = positionStatusSchema.safeParse(record.status);
		if (!parsedStatus.success) {
			return fail(
				"BAD_REQUEST",
				"Invalid position status",
				humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_INVALID_INPUT),
			);
		}

		const department = this.departments.get(record.departmentId);
		if (!department || department.organizationId !== record.organizationId) {
			return notFound(
				"Department not found",
				HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
			);
		}
		const activeDepartment = assertActiveDepartment(department.status);
		if (!activeDepartment.ok) {
			return activeDepartment;
		}

		const job = this.jobs.get(record.jobId);
		if (!job || job.organizationId !== record.organizationId) {
			return notFound(
				"Job not found",
				HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
			);
		}
		const activeJob = assertActiveJob(job.status);
		if (!activeJob.ok) {
			return activeJob;
		}

		const existing = await this.findPositionByCode({
			organizationId: record.organizationId,
			code: record.code,
		});
		if (!existing.ok) {
			return existing;
		}
		if (existing.data !== null) {
			return fail(
				"CONFLICT",
				"Position with this code already exists",
				humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_DUPLICATE),
			);
		}

		const idResult = parseHumanResourcesPositionId(randomUUID());
		if (!idResult.ok) {
			return idResult;
		}

		const now = new Date();
		const position: Position = {
			id: idResult.data,
			organizationId: record.organizationId,
			code: record.code,
			title: record.title,
			departmentId: record.departmentId,
			jobId: record.jobId,
			status: parsedStatus.data,
			version: 1,
			createdBy: record.createdBy,
			updatedBy: record.createdBy,
			createdAt: now,
			updatedAt: now,
		};

		this.positions.set(position.id, position);

		const audit = await ports.audit.record({
			organizationId: position.organizationId,
			actorUserId: position.createdBy,
			correlationId: meta.correlationId,
			entity: "hr_position",
			entityId: position.id,
			action: "CREATE",
			changes: [],
		});
		if (!audit.ok) {
			this.positions.delete(position.id);
			return audit;
		}

		return ok({ ...position });
	}

	async updatePosition(
		input: {
			organizationId: string;
			positionId: HumanResourcesPositionId;
			title?: string;
			departmentId?: HumanResourcesDepartmentId;
			jobId?: HumanResourcesJobId;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<Position>> {
		const position = this.positions.get(input.positionId);
		if (!position || position.organizationId !== input.organizationId) {
			return notFound("Position not found");
		}

		const versionCheck = assertExpectedVersion(
			position.version,
			input.expectedVersion,
		);
		if (!versionCheck.ok) {
			return versionCheck;
		}

		const nextTitle = input.title !== undefined ? input.title : position.title;
		const nextDepartmentId =
			input.departmentId !== undefined
				? input.departmentId
				: position.departmentId;
		const nextJobId = input.jobId !== undefined ? input.jobId : position.jobId;

		if (nextDepartmentId === null || nextJobId === null) {
			return invalidInput("Position requires department and job");
		}

		if (input.departmentId !== undefined) {
			const department = this.departments.get(input.departmentId);
			if (!department || department.organizationId !== input.organizationId) {
				return notFound(
					"Department not found",
					HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
				);
			}
			const activeDepartment = assertActiveDepartment(department.status);
			if (!activeDepartment.ok) {
				return activeDepartment;
			}
		}

		if (input.jobId !== undefined) {
			const job = this.jobs.get(input.jobId);
			if (!job || job.organizationId !== input.organizationId) {
				return notFound(
					"Job not found",
					HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
				);
			}
			const activeJob = assertActiveJob(job.status);
			if (!activeJob.ok) {
				return activeJob;
			}
		}

		const now = new Date();
		const updated: Position = {
			...position,
			title: nextTitle,
			departmentId: nextDepartmentId,
			jobId: nextJobId,
			version: position.version + 1,
			updatedBy: input.actorUserId,
			updatedAt: now,
		};

		this.positions.set(input.positionId, updated);

		const audit = await ports.audit.record({
			organizationId: updated.organizationId,
			actorUserId: input.actorUserId,
			correlationId: meta.correlationId,
			entity: "hr_position",
			entityId: updated.id,
			action: "UPDATE",
			changes: [],
		});
		if (!audit.ok) {
			this.positions.set(input.positionId, position);
			return audit;
		}

		return ok({ ...updated });
	}

	async setPositionStatus(
		input: {
			organizationId: string;
			positionId: HumanResourcesPositionId;
			status: PositionStatus;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<Position>> {
		const position = this.positions.get(input.positionId);
		if (!position || position.organizationId !== input.organizationId) {
			return notFound("Position not found");
		}

		const versionCheck = assertExpectedVersion(
			position.version,
			input.expectedVersion,
		);
		if (!versionCheck.ok) {
			return versionCheck;
		}

		const transition = assertPositionStatusTransition(
			position.status,
			input.status,
		);
		if (!transition.ok) {
			return transition;
		}

		if (input.status === "frozen" || input.status === "closed") {
			const openCount = await this.countOpenAssignmentsForPosition({
				organizationId: input.organizationId,
				positionId: input.positionId,
			});
			if (!openCount.ok) {
				return openCount;
			}
			if (openCount.data > 0) {
				return conflict(
					"Cannot freeze or close position with open assignments",
				);
			}
		}

		const now = new Date();
		const updated: Position = {
			...position,
			status: input.status,
			version: position.version + 1,
			updatedBy: input.actorUserId,
			updatedAt: now,
		};

		this.positions.set(input.positionId, updated);

		const audit = await ports.audit.record({
			organizationId: updated.organizationId,
			actorUserId: input.actorUserId,
			correlationId: meta.correlationId,
			entity: "hr_position",
			entityId: updated.id,
			action: "UPDATE",
			changes: [],
		});
		if (!audit.ok) {
			this.positions.set(input.positionId, position);
			return audit;
		}

		return ok({ ...updated });
	}

	async listPositions(input: {
		organizationId: string;
		page: number;
		pageSize: number;
		status?: string;
		departmentId?: HumanResourcesDepartmentId;
		jobId?: HumanResourcesJobId;
	}): Promise<Result<{ positions: Position[]; totalCount: number }>> {
		let filtered = Array.from(this.positions.values()).filter(
			(p) => p.organizationId === input.organizationId,
		);

		if (input.status !== undefined) {
			filtered = filtered.filter((p) => p.status === input.status);
		}
		if (input.departmentId !== undefined) {
			filtered = filtered.filter((p) => p.departmentId === input.departmentId);
		}
		if (input.jobId !== undefined) {
			filtered = filtered.filter((p) => p.jobId === input.jobId);
		}

		filtered.sort((a, b) => a.title.localeCompare(b.title));

		const totalCount = filtered.length;
		const start = (input.page - 1) * input.pageSize;
		const positions = filtered
			.slice(start, start + input.pageSize)
			.map((p) => ({ ...p }));

		return ok({ positions, totalCount });
	}

	async countOpenAssignmentsForPosition(input: {
		organizationId: string;
		positionId: HumanResourcesPositionId;
	}): Promise<Result<number>> {
		let count = 0;
		for (const assignment of this.assignments.values()) {
			if (
				assignment.organizationId === input.organizationId &&
				assignment.positionId === input.positionId &&
				assignment.endsOn === null
			) {
				count += 1;
			}
		}
		return ok(count);
	}

	async countActiveOrFrozenPositionsForDepartment(input: {
		organizationId: string;
		departmentId: HumanResourcesDepartmentId;
	}): Promise<Result<number>> {
		let count = 0;
		for (const position of this.positions.values()) {
			if (
				position.organizationId === input.organizationId &&
				position.departmentId === input.departmentId &&
				(position.status === "active" || position.status === "frozen")
			) {
				count += 1;
			}
		}
		return ok(count);
	}

	async countActiveOrFrozenPositionsForJob(input: {
		organizationId: string;
		jobId: HumanResourcesJobId;
	}): Promise<Result<number>> {
		let count = 0;
		for (const position of this.positions.values()) {
			if (
				position.organizationId === input.organizationId &&
				position.jobId === input.jobId &&
				(position.status === "active" || position.status === "frozen")
			) {
				count += 1;
			}
		}
		return ok(count);
	}

	async countActiveChildDepartments(input: {
		organizationId: string;
		parentDepartmentId: HumanResourcesDepartmentId;
	}): Promise<Result<number>> {
		let count = 0;
		for (const department of this.departments.values()) {
			if (
				department.organizationId === input.organizationId &&
				department.parentDepartmentId === input.parentDepartmentId &&
				department.status === "active"
			) {
				count += 1;
			}
		}
		return ok(count);
	}

	// Assignment methods
	async getAssignmentById(input: {
		organizationId: string;
		assignmentId: HumanResourcesAssignmentId;
	}): Promise<Result<WorkAssignment | null>> {
		const assignment = this.assignments.get(input.assignmentId);
		if (!assignment || assignment.organizationId !== input.organizationId) {
			return ok(null);
		}
		return ok({ ...assignment });
	}

	async findOpenAssignmentByEmployment(input: {
		organizationId: string;
		employmentId: HumanResourcesEmploymentId;
	}): Promise<Result<WorkAssignment | null>> {
		for (const assignment of this.assignments.values()) {
			if (
				assignment.organizationId === input.organizationId &&
				assignment.employmentId === input.employmentId &&
				assignment.endsOn === null
			) {
				return ok({ ...assignment });
			}
		}
		return ok(null);
	}

	async createAssignment(
		record: AssignmentCreateRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<WorkAssignment>> {
		const employment = this.employments.get(record.employmentId);
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

		const position = this.positions.get(record.positionId);
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

		this.assignments.set(assignment.id, assignment);

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
			this.assignments.delete(assignment.id);
			return audit;
		}

		return ok({ ...assignment });
	}

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
		const assignment = this.assignments.get(input.assignmentId);
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

		this.assignments.set(input.assignmentId, updated);

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
			this.assignments.set(input.assignmentId, assignment);
			return audit;
		}

		return ok({ ...updated });
	}

	// Reporting line methods
	async getReportingLineById(input: {
		organizationId: string;
		reportingLineId: HumanResourcesReportingLineId;
	}): Promise<Result<ReportingLine | null>> {
		const line = this.reportingLines.get(input.reportingLineId);
		if (!line || line.organizationId !== input.organizationId) {
			return ok(null);
		}
		return ok({ ...line });
	}

	async listReportingLinesForEmployee(input: {
		organizationId: string;
		employeeId: HumanResourcesEmployeeId;
	}): Promise<Result<ReportingLine[]>> {
		const lines = Array.from(this.reportingLines.values())
			.filter(
				(line) =>
					line.organizationId === input.organizationId &&
					line.employeeId === input.employeeId,
			)
			.map((line) => ({ ...line }));
		lines.sort((a, b) => a.startsOn.localeCompare(b.startsOn));
		return ok(lines);
	}

	async findOpenPrimaryReportingLine(input: {
		organizationId: string;
		employeeId: HumanResourcesEmployeeId;
	}): Promise<Result<ReportingLine | null>> {
		for (const line of this.reportingLines.values()) {
			if (
				line.organizationId === input.organizationId &&
				line.employeeId === input.employeeId &&
				line.relationshipKind === "primary" &&
				line.endsOn === null
			) {
				return ok({ ...line });
			}
		}
		return ok(null);
	}

	async resolvePrimaryManager(input: {
		organizationId: string;
		employeeId: HumanResourcesEmployeeId;
		asOf: string;
	}): Promise<Result<ReportingLine | null>> {
		for (const line of this.reportingLines.values()) {
			if (
				line.organizationId === input.organizationId &&
				line.employeeId === input.employeeId &&
				line.relationshipKind === "primary" &&
				line.startsOn <= input.asOf &&
				(line.endsOn === null || line.endsOn >= input.asOf)
			) {
				return ok({ ...line });
			}
		}
		return ok(null);
	}

	async listDirectReports(input: {
		organizationId: string;
		managerEmployeeId: HumanResourcesEmployeeId;
		asOf: string;
		page: number;
		pageSize: number;
	}): Promise<Result<{ reportingLines: ReportingLine[]; totalCount: number }>> {
		const filtered = Array.from(this.reportingLines.values()).filter(
			(line) =>
				line.organizationId === input.organizationId &&
				line.managerEmployeeId === input.managerEmployeeId &&
				line.relationshipKind === "primary" &&
				line.startsOn <= input.asOf &&
				(line.endsOn === null || line.endsOn >= input.asOf),
		);

		filtered.sort((a, b) => a.startsOn.localeCompare(b.startsOn));

		const totalCount = filtered.length;
		const start = (input.page - 1) * input.pageSize;
		const reportingLines = filtered
			.slice(start, start + input.pageSize)
			.map((line) => ({ ...line }));

		return ok({ reportingLines, totalCount });
	}

	async assignPrimaryReportingLine(
		record: ReportingLineCreateRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<ReportingLine>> {
		const employee = this.employees.get(record.employeeId);
		if (!employee || employee.organizationId !== record.organizationId) {
			return notFound(
				"Employee not found",
				HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
			);
		}

		const manager = this.employees.get(record.managerEmployeeId);
		if (!manager || manager.organizationId !== record.organizationId) {
			return notFound(
				"Manager employee not found",
				HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
			);
		}

		const dateCheck = assertValidDateRange(record.startsOn, record.endsOn);
		if (!dateCheck.ok) {
			return dateCheck;
		}

		const openPrimary = await this.findOpenPrimaryReportingLine({
			organizationId: record.organizationId,
			employeeId: record.employeeId,
		});
		if (!openPrimary.ok) {
			return openPrimary;
		}
		if (openPrimary.data !== null) {
			return conflict("Employee already has an open primary reporting line");
		}

		const existingLines = await this.listReportingLinesForEmployee({
			organizationId: record.organizationId,
			employeeId: record.employeeId,
		});
		if (!existingLines.ok) {
			return existingLines;
		}

		const overlap = assertNoPrimaryReportingOverlap({
			candidateStartsOn: record.startsOn,
			candidateEndsOn: record.endsOn,
			existing: existingLines.data,
		});
		if (!overlap.ok) {
			return overlap;
		}

		const cycleCheck = assertReportingLineAcyclic({
			employeeId: record.employeeId,
			managerEmployeeId: record.managerEmployeeId,
			getOpenPrimaryManagerId: (employeeId) => {
				const emp = this.employees.get(employeeId);
				if (!emp || emp.organizationId !== record.organizationId) {
					return undefined;
				}
				for (const line of this.reportingLines.values()) {
					if (
						line.organizationId === record.organizationId &&
						line.employeeId === employeeId &&
						line.relationshipKind === "primary" &&
						line.endsOn === null
					) {
						return line.managerEmployeeId;
					}
				}
				return null;
			},
		});
		if (!cycleCheck.ok) {
			return cycleCheck;
		}

		const idResult = parseHumanResourcesReportingLineId(randomUUID());
		if (!idResult.ok) {
			return idResult;
		}

		const now = new Date();
		const reportingLine: ReportingLine = {
			id: idResult.data,
			organizationId: record.organizationId,
			employeeId: record.employeeId,
			managerEmployeeId: record.managerEmployeeId,
			relationshipKind: "primary",
			startsOn: record.startsOn,
			endsOn: record.endsOn,
			version: 1,
			createdBy: record.createdBy,
			updatedBy: record.createdBy,
			createdAt: now,
			updatedAt: now,
		};

		this.reportingLines.set(reportingLine.id, reportingLine);

		const audit = await ports.audit.record({
			organizationId: reportingLine.organizationId,
			actorUserId: reportingLine.createdBy,
			correlationId: meta.correlationId,
			entity: "hr_reporting_line",
			entityId: reportingLine.id,
			action: "CREATE",
			changes: [],
		});
		if (!audit.ok) {
			this.reportingLines.delete(reportingLine.id);
			return audit;
		}

		return ok({ ...reportingLine });
	}

	async closeReportingLine(
		input: {
			organizationId: string;
			reportingLineId: HumanResourcesReportingLineId;
			endsOn: string;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<ReportingLine>> {
		const line = this.reportingLines.get(input.reportingLineId);
		if (!line || line.organizationId !== input.organizationId) {
			return notFound("Reporting line not found");
		}

		const versionCheck = assertExpectedVersion(
			line.version,
			input.expectedVersion,
		);
		if (!versionCheck.ok) {
			return versionCheck;
		}

		if (line.endsOn !== null) {
			return conflict("Reporting line is already closed");
		}

		const dateCheck = assertValidDateRange(line.startsOn, input.endsOn);
		if (!dateCheck.ok) {
			return dateCheck;
		}

		const now = new Date();
		const updated: ReportingLine = {
			...line,
			endsOn: input.endsOn,
			version: line.version + 1,
			updatedBy: input.actorUserId,
			updatedAt: now,
		};

		this.reportingLines.set(input.reportingLineId, updated);

		const audit = await ports.audit.record({
			organizationId: updated.organizationId,
			actorUserId: input.actorUserId,
			correlationId: meta.correlationId,
			entity: "hr_reporting_line",
			entityId: updated.id,
			action: "UPDATE",
			changes: [],
		});
		if (!audit.ok) {
			this.reportingLines.set(input.reportingLineId, line);
			return audit;
		}

		return ok({ ...updated });
	}

	async replacePrimaryReportingLine(
		input: {
			organizationId: string;
			employeeId: HumanResourcesEmployeeId;
			managerEmployeeId: HumanResourcesEmployeeId;
			startsOn: string;
			endsOn: string | null;
			closePriorOn: string;
			createdBy: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<ReportingLine>> {
		const openPrimary = await this.findOpenPrimaryReportingLine({
			organizationId: input.organizationId,
			employeeId: input.employeeId,
		});
		if (!openPrimary.ok) {
			return openPrimary;
		}
		if (openPrimary.data === null) {
			return notFound("Open primary reporting line not found");
		}

		const prior = this.reportingLines.get(openPrimary.data.id);
		if (!prior || prior.organizationId !== input.organizationId) {
			return notFound("Open primary reporting line not found");
		}

		if (input.closePriorOn < prior.startsOn) {
			return invalidInput(
				"closePriorOn must be on or after the prior reporting line start date",
			);
		}

		const priorCloseDates = assertValidDateRange(
			prior.startsOn,
			input.closePriorOn,
		);
		if (!priorCloseDates.ok) {
			return priorCloseDates;
		}

		if (input.closePriorOn > input.startsOn) {
			return invalidInput(
				"closePriorOn must be on or before the new reporting line start date",
			);
		}

		const newDateCheck = assertValidDateRange(input.startsOn, input.endsOn);
		if (!newDateCheck.ok) {
			return newDateCheck;
		}

		const employee = this.employees.get(input.employeeId);
		if (!employee || employee.organizationId !== input.organizationId) {
			return notFound(
				"Employee not found",
				HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
			);
		}

		const manager = this.employees.get(input.managerEmployeeId);
		if (!manager || manager.organizationId !== input.organizationId) {
			return notFound(
				"Manager employee not found",
				HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
			);
		}

		const existingLines = await this.listReportingLinesForEmployee({
			organizationId: input.organizationId,
			employeeId: input.employeeId,
		});
		if (!existingLines.ok) {
			return existingLines;
		}

		// Prior line is closed in this atomic replace; exclude it from overlap.
		const otherPrimaries = existingLines.data.filter(
			(line) => line.id !== prior.id,
		);
		const overlap = assertNoPrimaryReportingOverlap({
			candidateStartsOn: input.startsOn,
			candidateEndsOn: input.endsOn,
			existing: otherPrimaries,
		});
		if (!overlap.ok) {
			return overlap;
		}

		const cycleCheck = assertReportingLineAcyclic({
			employeeId: input.employeeId,
			managerEmployeeId: input.managerEmployeeId,
			getOpenPrimaryManagerId: (employeeId) => {
				const emp = this.employees.get(employeeId);
				if (!emp || emp.organizationId !== input.organizationId) {
					return undefined;
				}
				if (employeeId === input.employeeId) {
					return null;
				}
				for (const line of this.reportingLines.values()) {
					if (
						line.organizationId === input.organizationId &&
						line.employeeId === employeeId &&
						line.relationshipKind === "primary" &&
						line.endsOn === null
					) {
						return line.managerEmployeeId;
					}
				}
				return null;
			},
		});
		if (!cycleCheck.ok) {
			return cycleCheck;
		}

		const idResult = parseHumanResourcesReportingLineId(randomUUID());
		if (!idResult.ok) {
			return idResult;
		}

		const now = new Date();
		const closedPrior: ReportingLine = {
			...prior,
			endsOn: input.closePriorOn,
			version: prior.version + 1,
			updatedBy: input.createdBy,
			updatedAt: now,
		};
		const reportingLine: ReportingLine = {
			id: idResult.data,
			organizationId: input.organizationId,
			employeeId: input.employeeId,
			managerEmployeeId: input.managerEmployeeId,
			relationshipKind: "primary",
			startsOn: input.startsOn,
			endsOn: input.endsOn,
			version: 1,
			createdBy: input.createdBy,
			updatedBy: input.createdBy,
			createdAt: now,
			updatedAt: now,
		};

		this.reportingLines.set(prior.id, closedPrior);
		this.reportingLines.set(reportingLine.id, reportingLine);

		const closeAudit = await ports.audit.record({
			organizationId: closedPrior.organizationId,
			actorUserId: input.createdBy,
			correlationId: meta.correlationId,
			entity: "hr_reporting_line",
			entityId: closedPrior.id,
			action: "UPDATE",
			changes: [],
		});
		if (!closeAudit.ok) {
			this.reportingLines.set(prior.id, prior);
			this.reportingLines.delete(reportingLine.id);
			return closeAudit;
		}

		const createAudit = await ports.audit.record({
			organizationId: reportingLine.organizationId,
			actorUserId: input.createdBy,
			correlationId: meta.correlationId,
			entity: "hr_reporting_line",
			entityId: reportingLine.id,
			action: "CREATE",
			changes: [],
		});
		if (!createAudit.ok) {
			this.reportingLines.set(prior.id, prior);
			this.reportingLines.delete(reportingLine.id);
			return createAudit;
		}

		return ok({ ...reportingLine });
	}

	async getOrganizationTree(input: {
		organizationId: string;
		rootDepartmentId: HumanResourcesDepartmentId | null;
		maxDepth: number;
		maxNodes: number;
	}): Promise<Result<OrganizationTreePage>> {
		const departments = await this.listAllDepartments({
			organizationId: input.organizationId,
		});
		if (!departments.ok) {
			return departments;
		}

		const tree = buildBoundedDepartmentTree({
			departments: departments.data,
			rootDepartmentId: input.rootDepartmentId,
			maxDepth: input.maxDepth,
			maxNodes: input.maxNodes,
		});

		return ok({
			nodes: tree.nodes,
			truncated: tree.truncated,
		});
	}
}

export function createMemoryHumanResourcesStore(): MemoryHumanResourcesStore {
	return new MemoryHumanResourcesStore();
}
