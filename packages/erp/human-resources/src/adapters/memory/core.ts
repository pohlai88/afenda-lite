import { randomUUID } from "node:crypto";
import { errorResult, type Result } from "@afenda/errors";
import {
	HUMAN_RESOURCES_ASSIGNMENT_CREATED_EVENT,
	HUMAN_RESOURCES_ASSIGNMENT_ENDED_EVENT,
	HUMAN_RESOURCES_EMPLOYEE_CREATED_EVENT,
	HUMAN_RESOURCES_EMPLOYEE_REHIRED_EVENT,
	HUMAN_RESOURCES_EMPLOYEE_TERMINATED_EVENT,
	HUMAN_RESOURCES_EMPLOYMENT_CHANGED_EVENT,
	HUMAN_RESOURCES_EMPLOYMENT_CONTRACT_CHANGED_EVENT,
	HUMAN_RESOURCES_EMPLOYMENT_CONTRACT_CREATED_EVENT,
	HUMAN_RESOURCES_EMPLOYMENT_CONTRACT_SUPERSEDED_EVENT,
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
import {
	assertAssignmentWithinEmployment,
	assertNoAssignmentOverlap,
	multiplePrimaryAssignmentsAtAsOf,
} from "../../shared/assignment-guards";
import { assertExpectedVersion } from "../../shared/concurrency";
import {
	assertActivePosition,
	rehireRequiresEndedEmployment,
} from "../../shared/domain-guards";
import { resolveUniqueEffectiveRangeRecordBy } from "../../shared/effective-range";
import { compareEmploymentContractsByLineage } from "../../shared/employment-contract-guards";
import {
	assertValidDateRange,
	type EmploymentStatus,
	employmentStatusSchema,
} from "../../shared/employment-status";
import type { HumanResourcesMutationMeta } from "../../shared/mutation-meta";
import { mapEmployeeNumberDuplicate } from "../../shared/persistence-errors";
import { runSequential, sequentialReturn } from "../../shared/run-sequential";
import type {
	AssignmentCreateRecord,
	EmployeeCreateRecord,
	EmploymentContractCreateRecord,
	EmploymentCreateRecord,
	EmploymentStatusHistoryAppendRecord,
	HumanResourcesStore,
	IdempotentEmployeeRecord,
	WorkforcePlanActualAssignment,
} from "../../store";
import type {
	Employee,
	EmployeeListPage,
	Employment,
	EmploymentContract,
	EmploymentStatusHistory,
	PositionOccupancyAsOf,
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

export interface CoreMemoryState {
	assignments: Map<HumanResourcesAssignmentId, WorkAssignment>;
	contracts: Map<string, EmploymentContract>;
	employees: Map<HumanResourcesEmployeeId, Employee>;
	employmentStatusHistory: Map<string, EmploymentStatusHistory>;
	employments: Map<HumanResourcesEmploymentId, Employment>;
	idempotencyByKey: Map<string, IdempotentEmployeeRecord>;
}

export type MemoryCoreMethods = Pick<
	HumanResourcesStore,
	| "getEmployeeById"
	| "findEmployeeByIdempotencyKey"
	| "createEmployee"
	| "updateEmployee"
	| "listEmployees"
	| "getEmploymentById"
	| "findOpenEmploymentByEmployee"
	| "findEmploymentByEmployeeAsOf"
	| "listEmploymentsByEmployee"
	| "listEmploymentStatusHistory"
	| "appendEmploymentStatusHistory"
	| "createEmployment"
	| "amendEmployment"
	| "correctEmployment"
	| "getEmploymentContractById"
	| "findContractByEmploymentAndCode"
	| "listActiveContractsByEmployment"
	| "listEmploymentContractsByEmployment"
	| "findEmploymentContractByEmploymentAsOf"
	| "createEmploymentContract"
	| "correctEmploymentContract"
	| "supersedeEmploymentContract"
	| "countOpenAssignmentsForPosition"
	| "resolvePositionOccupancyAsOf"
	| "getAssignmentById"
	| "findOpenAssignmentByEmployment"
	| "findAssignmentByEmploymentAsOf"
	| "listAssignmentsByEmployment"
	| "listWorkforcePlanActualAssignments"
	| "createAssignment"
	| "endAssignment"
>;

export type CoreMemoryHost = Pick<
	HumanResourcesStore,
	"getPositionById" | "listAssignmentsByEmployment"
>;

export function createCoreMemoryState(): CoreMemoryState {
	return {
		employees: new Map(),
		idempotencyByKey: new Map(),
		employments: new Map(),
		employmentStatusHistory: new Map(),
		contracts: new Map(),
		assignments: new Map(),
	};
}

export function resetCoreMemoryState(state: CoreMemoryState): void {
	state.employees.clear();
	state.idempotencyByKey.clear();
	state.employments.clear();
	state.employmentStatusHistory.clear();
	state.contracts.clear();
	state.assignments.clear();
}

function listEmploymentsForEmployee(
	state: CoreMemoryState,
	input: { organizationId: string; employeeId: HumanResourcesEmployeeId },
): Employment[] {
	return [...state.employments.values()].filter(
		(employment) =>
			employment.organizationId === input.organizationId &&
			employment.employeeId === input.employeeId,
	);
}

export function appendEmploymentHistoryToState(
	state: CoreMemoryState,
	record: EmploymentStatusHistoryAppendRecord,
): EmploymentStatusHistory {
	const row: EmploymentStatusHistory = {
		id: randomUUID(),
		organizationId: record.organizationId,
		employmentId: record.employmentId,
		employeeId: record.employeeId,
		fromStatus: record.fromStatus,
		toStatus: record.toStatus,
		startsOnSnapshot: record.startsOnSnapshot,
		endsOnSnapshot: record.endsOnSnapshot,
		effectiveOn: record.effectiveOn,
		changeKind: record.changeKind,
		reason: record.reason,
		evidenceReference: record.evidenceReference,
		correlationId: record.correlationId,
		actorUserId: record.actorUserId,
		createdAt: new Date(),
	};
	state.employmentStatusHistory.set(row.id, row);
	return row;
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
				return await errorResult.ok(null);
			}
			if (employee.organizationId !== input.organizationId) {
				return await errorResult.ok(null);
			}
			return await errorResult.ok(cloneEmployee(employee));
		},

		async findEmployeeByIdempotencyKey(input: {
			organizationId: string;
			idempotencyKey: string;
		}): Promise<Result<IdempotentEmployeeRecord | null>> {
			const record = state.idempotencyByKey.get(
				idempotencyMapKey(input.organizationId, input.idempotencyKey),
			);
			if (record === undefined) {
				return await errorResult.ok(null);
			}
			return await errorResult.ok({
				employee: cloneEmployee(record.employee),
				createRequestFingerprint: record.createRequestFingerprint,
			});
		},

		async createEmployee(
			record: EmployeeCreateRecord,
			ports: MutationPorts,
			meta: HumanResourcesMutationMeta,
		): Promise<Result<Employee>> {
			const existingByKey = await this.findEmployeeByIdempotencyKey({
				organizationId: record.organizationId,
				idempotencyKey: record.createIdempotencyKey,
			});
			if (!existingByKey.ok) {
				return existingByKey;
			}
			if (existingByKey.data !== null) {
				return errorResult.ok(cloneEmployee(existingByKey.data.employee));
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

			return errorResult.ok(cloneEmployee(employee));
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
			meta: HumanResourcesMutationMeta,
		): Promise<Result<Employee>> {
			const employee = state.employees.get(input.employeeId);
			if (!employee || employee.organizationId !== input.organizationId) {
				return errorResult.fail("NOT_FOUND", {
					publicMessage: "The requested resource was not found",
					internalContext: humanResourcesErrorDetails(
						HUMAN_RESOURCES_ERROR_NOT_FOUND,
					),
				});
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

			return errorResult.ok(cloneEmployee(updated));
		},

		async listEmployees(input: {
			organizationId: string;
			page: number;
			pageSize: number;
			employeeNumberPrefix?: string | undefined;
			legalNamePrefix?: string | undefined;
			employmentStatus?: string | undefined;
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

			return await errorResult.ok({
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
				return await errorResult.ok(null);
			}
			return await errorResult.ok({ ...employment });
		},

		async findOpenEmploymentByEmployee(input: {
			organizationId: string;
			employeeId: HumanResourcesEmployeeId;
		}): Promise<Result<Employment | null>> {
			const sequentialOutcome1 = await runSequential(
				state.employments.values(),
				async (employment) => {
					if (
						employment.organizationId === input.organizationId &&
						employment.employeeId === input.employeeId &&
						employment.endsOn === null
					) {
						return sequentialReturn(await errorResult.ok({ ...employment }));
					}
				},
			);
			if (sequentialOutcome1.kind === "return") {
				return sequentialOutcome1.value;
			}
			return await errorResult.ok(null);
		},

		async findEmploymentByEmployeeAsOf(input: {
			organizationId: string;
			employeeId: HumanResourcesEmployeeId;
			asOf: string;
		}): Promise<Result<Employment | null>> {
			const resolution = resolveUniqueEffectiveRangeRecordBy({
				records: [...state.employments.values()].filter(
					(employment) =>
						employment.organizationId === input.organizationId &&
						employment.employeeId === input.employeeId,
				),
				asOf: input.asOf,
				getId: (employment) => employment.id,
				getEffectiveFrom: (employment) => employment.startsOn,
				getEffectiveTo: (employment) => employment.endsOn,
			});
			if (!resolution.ok) {
				return await errorResult.fail("CONFLICT", {
					publicMessage: "The request conflicts with current state",
					internalContext: humanResourcesErrorDetails(
						HUMAN_RESOURCES_ERROR_CONFLICT,
					),
				});
			}
			return await errorResult.ok(
				resolution.record === null ? null : { ...resolution.record },
			);
		},

		async listEmploymentsByEmployee(input: {
			organizationId: string;
			employeeId: HumanResourcesEmployeeId;
		}) {
			return await errorResult.ok(
				listEmploymentsForEmployee(state, input).map((employment) => ({
					id: employment.id,
					startsOn: employment.startsOn,
					endsOn: employment.endsOn,
				})),
			);
		},

		async listEmploymentStatusHistory(input: {
			organizationId: string;
			employmentId: HumanResourcesEmploymentId;
		}): Promise<Result<EmploymentStatusHistory[]>> {
			const rows = [...state.employmentStatusHistory.values()]
				.filter(
					(row) =>
						row.organizationId === input.organizationId &&
						row.employmentId === input.employmentId,
				)
				.sort((left, right) => {
					const byEffective = left.effectiveOn.localeCompare(right.effectiveOn);
					if (byEffective !== 0) {
						return byEffective;
					}
					return left.createdAt.getTime() - right.createdAt.getTime();
				})
				.map((row) => ({ ...row }));
			return await errorResult.ok(rows);
		},

		async appendEmploymentStatusHistory(
			record: EmploymentStatusHistoryAppendRecord,
		): Promise<Result<EmploymentStatusHistory>> {
			return await errorResult.ok(
				appendEmploymentHistoryToState(state, record),
			);
		},

		// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: The memory adapter mirrors the ordered production state transition for deterministic contract parity.
		async createEmployment(
			record: EmploymentCreateRecord,
			ports: MutationPorts,
			meta: HumanResourcesMutationMeta,
		): Promise<Result<Employment>> {
			const employee = state.employees.get(record.employeeId);
			if (!employee || employee.organizationId !== record.organizationId) {
				return errorResult.fail("NOT_FOUND", {
					publicMessage: "The requested resource was not found",
					internalContext: humanResourcesErrorDetails(
						HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
					),
				});
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
				return rehireRequiresEndedEmployment();
			}

			const siblingEmployments = listEmploymentsForEmployee(state, {
				organizationId: record.organizationId,
				employeeId: record.employeeId,
			});

			const isRehire = siblingEmployments.some(
				(employmentValue) => employmentValue.endsOn !== null,
			);

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
			appendEmploymentHistoryToState(state, {
				organizationId: employment.organizationId,
				employmentId: employment.id,
				employeeId: employment.employeeId,
				fromStatus: null,
				toStatus: "active",
				startsOnSnapshot: employment.startsOn,
				endsOnSnapshot: employment.endsOn,
				effectiveOn: employment.startsOn,
				changeKind: "create",
				reason: null,
				evidenceReference: null,
				correlationId: meta.correlationId,
				actorUserId: employment.createdBy,
			});

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
				for (const [historyId, row] of state.employmentStatusHistory) {
					if (row.employmentId === employment.id) {
						state.employmentStatusHistory.delete(historyId);
					}
				}
				return audit;
			}

			const outbox = await ports.outbox.append({
				organizationId: employment.organizationId,
				actorUserId: employment.createdBy,
				correlationId: meta.correlationId,
				type: isRehire
					? HUMAN_RESOURCES_EMPLOYEE_REHIRED_EVENT
					: HUMAN_RESOURCES_EMPLOYMENT_STARTED_EVENT,
				payload: {
					organizationId: employment.organizationId,
					entityType: "hr_employment",
					entityId: employment.id,
					actorId: employment.createdBy,
					correlationId: meta.correlationId,
					effectiveOn: record.startsOn,
				},
			});
			if (!outbox.ok) {
				state.employments.delete(employment.id);
				return outbox;
			}

			return errorResult.ok({ ...employment });
		},

		// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: The memory adapter mirrors the ordered production state transition for deterministic contract parity.
		async amendEmployment(
			input: {
				organizationId: string;
				employmentId: HumanResourcesEmploymentId;
				status?: EmploymentStatus | undefined;
				startsOn?: string | undefined;
				endsOn?: string | null | undefined;
				lifecycleEffectiveOn?: string | undefined;
				expectedVersion: number;
				actorUserId: string;
			},
			ports: MutationPorts,
			meta: HumanResourcesMutationMeta,
		): Promise<Result<Employment>> {
			const employment = state.employments.get(input.employmentId);
			if (!employment || employment.organizationId !== input.organizationId) {
				return errorResult.fail("NOT_FOUND", {
					publicMessage: "The requested resource was not found",
					internalContext: humanResourcesErrorDetails(
						HUMAN_RESOURCES_ERROR_NOT_FOUND,
					),
				});
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
				input.endsOn === undefined ? employment.endsOn : input.endsOn;
			const nextStatus = input.status ?? employment.status;
			const parsedStatus = employmentStatusSchema.safeParse(nextStatus);
			if (!parsedStatus.success) {
				return errorResult.fail("BAD_REQUEST", {
					publicMessage: "The request is invalid",
					internalContext: humanResourcesErrorDetails(
						HUMAN_RESOURCES_ERROR_INVALID_INPUT,
					),
				});
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

			if (
				input.lifecycleEffectiveOn !== undefined &&
				parsedStatus.data !== employment.status
			) {
				appendEmploymentHistoryToState(state, {
					organizationId: updated.organizationId,
					employmentId: updated.id,
					employeeId: updated.employeeId,
					fromStatus: employment.status,
					toStatus: parsedStatus.data,
					startsOnSnapshot: updated.startsOn,
					endsOnSnapshot: updated.endsOn,
					effectiveOn: input.lifecycleEffectiveOn,
					changeKind: "lifecycle",
					reason: null,
					evidenceReference: null,
					correlationId: meta.correlationId,
					actorUserId: input.actorUserId,
				});
			}

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

			return errorResult.ok({ ...updated });
		},

		async correctEmployment(
			input: {
				organizationId: string;
				employmentId: HumanResourcesEmploymentId;
				status?: EmploymentStatus | undefined;
				startsOn?: string | undefined;
				endsOn?: string | null | undefined;
				reason: string;
				evidenceReference: string | null;
				effectiveOn?: string | undefined;
				expectedVersion: number;
				actorUserId: string;
			},
			ports: MutationPorts,
			meta: HumanResourcesMutationMeta,
		): Promise<Result<Employment>> {
			const employment = state.employments.get(input.employmentId);
			if (!employment || employment.organizationId !== input.organizationId) {
				return errorResult.fail("NOT_FOUND", {
					publicMessage: "The requested resource was not found",
					internalContext: humanResourcesErrorDetails(
						HUMAN_RESOURCES_ERROR_NOT_FOUND,
					),
				});
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
				input.endsOn === undefined ? employment.endsOn : input.endsOn;
			const nextStatus = input.status ?? employment.status;
			const parsedStatus = employmentStatusSchema.safeParse(nextStatus);
			if (!parsedStatus.success) {
				return errorResult.fail("BAD_REQUEST", {
					publicMessage: "The request is invalid",
					internalContext: humanResourcesErrorDetails(
						HUMAN_RESOURCES_ERROR_INVALID_INPUT,
					),
				});
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
			appendEmploymentHistoryToState(state, {
				organizationId: updated.organizationId,
				employmentId: updated.id,
				employeeId: updated.employeeId,
				fromStatus: employment.status,
				toStatus: parsedStatus.data,
				startsOnSnapshot: updated.startsOn,
				endsOnSnapshot: updated.endsOn,
				effectiveOn: input.effectiveOn ?? updated.startsOn,
				changeKind: "correction",
				reason: input.reason,
				evidenceReference: input.evidenceReference,
				correlationId: meta.correlationId,
				actorUserId: input.actorUserId,
			});

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

			return errorResult.ok({ ...updated });
		},

		// Employment Contract methods
		async getEmploymentContractById(input: {
			organizationId: string;
			employmentContractId: HumanResourcesEmploymentContractId;
		}): Promise<Result<EmploymentContract | null>> {
			const contract = state.contracts.get(input.employmentContractId);
			if (!contract || contract.organizationId !== input.organizationId) {
				return await errorResult.ok(null);
			}
			return await errorResult.ok({ ...contract });
		},

		async findContractByEmploymentAndCode(input: {
			organizationId: string;
			employmentId: HumanResourcesEmploymentId;
			referenceCode: string;
		}): Promise<Result<EmploymentContract | null>> {
			const sequentialOutcome2 = await runSequential(
				state.contracts.values(),
				async (contract) => {
					if (
						contract.organizationId === input.organizationId &&
						contract.employmentId === input.employmentId &&
						contract.referenceCode === input.referenceCode &&
						contract.lineageStatus === "active"
					) {
						return sequentialReturn(await errorResult.ok({ ...contract }));
					}
				},
			);
			if (sequentialOutcome2.kind === "return") {
				return sequentialOutcome2.value;
			}
			return await errorResult.ok(null);
		},

		async listActiveContractsByEmployment(input: {
			organizationId: string;
			employmentId: HumanResourcesEmploymentId;
		}) {
			return await errorResult.ok(
				[...state.contracts.values()]
					.filter(
						(contract) =>
							contract.organizationId === input.organizationId &&
							contract.employmentId === input.employmentId &&
							contract.lineageStatus === "active",
					)
					.map((contract) => ({
						id: contract.id,
						startsOn: contract.startsOn,
						endsOn: contract.endsOn,
					})),
			);
		},

		async listEmploymentContractsByEmployment(input: {
			organizationId: string;
			employmentId: HumanResourcesEmploymentId;
		}): Promise<Result<EmploymentContract[]>> {
			const contracts = [...state.contracts.values()]
				.filter(
					(contract) =>
						contract.organizationId === input.organizationId &&
						contract.employmentId === input.employmentId,
				)
				.sort(compareEmploymentContractsByLineage)
				.map((contract) => ({ ...contract }));
			return await errorResult.ok(contracts);
		},

		async findEmploymentContractByEmploymentAsOf(input: {
			organizationId: string;
			employmentId: HumanResourcesEmploymentId;
			asOf: string;
		}): Promise<Result<EmploymentContract | null>> {
			const resolution = resolveUniqueEffectiveRangeRecordBy({
				records: [...state.contracts.values()].filter(
					(contract) =>
						contract.organizationId === input.organizationId &&
						contract.employmentId === input.employmentId,
				),
				asOf: input.asOf,
				getId: (contract) => contract.id,
				getEffectiveFrom: (contract) => contract.startsOn,
				getEffectiveTo: (contract) => contract.endsOn,
			});
			if (!resolution.ok) {
				return await errorResult.fail("CONFLICT", {
					publicMessage: "The request conflicts with current state",
					internalContext: humanResourcesErrorDetails(
						HUMAN_RESOURCES_ERROR_CONFLICT,
					),
				});
			}
			return await errorResult.ok(
				resolution.record === null ? null : { ...resolution.record },
			);
		},

		async createEmploymentContract(
			record: EmploymentContractCreateRecord,
			ports: MutationPorts,
			meta: HumanResourcesMutationMeta,
		): Promise<Result<EmploymentContract>> {
			const employment = state.employments.get(record.employmentId);
			if (!employment || employment.organizationId !== record.organizationId) {
				return errorResult.fail("NOT_FOUND", {
					publicMessage: "The requested resource was not found",
					internalContext: humanResourcesErrorDetails(
						HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
					),
				});
			}

			if (employment.employeeId !== record.employeeId) {
				return errorResult.fail("BAD_REQUEST", {
					publicMessage: "The request is invalid",
					internalContext: humanResourcesErrorDetails(
						HUMAN_RESOURCES_ERROR_INVALID_INPUT,
					),
				});
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
				return errorResult.fail("CONFLICT", {
					publicMessage: "The request conflicts with current state",
					internalContext: humanResourcesErrorDetails(
						HUMAN_RESOURCES_ERROR_DUPLICATE,
					),
				});
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
				lineageStatus: "active",
				supersedesContractId: null,
				supersededByContractId: null,
				reasonCode: record.reasonCode,
				sourceReference: record.sourceReference,
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
				type: HUMAN_RESOURCES_EMPLOYMENT_CONTRACT_CREATED_EVENT,
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

			return errorResult.ok({ ...contract });
		},

		async correctEmploymentContract(
			input: {
				organizationId: string;
				employmentContractId: HumanResourcesEmploymentContractId;
				referenceCode?: string | undefined;
				startsOn?: string | undefined;
				endsOn?: string | null | undefined;
				reasonCode: string;
				sourceReference: string;
				expectedVersion: number;
				actorUserId: string;
			},
			ports: MutationPorts,
			meta: HumanResourcesMutationMeta,
		): Promise<Result<EmploymentContract>> {
			const contract = state.contracts.get(input.employmentContractId);
			if (!contract || contract.organizationId !== input.organizationId) {
				return errorResult.fail("NOT_FOUND", {
					publicMessage: "The requested resource was not found",
					internalContext: humanResourcesErrorDetails(
						HUMAN_RESOURCES_ERROR_NOT_FOUND,
					),
				});
			}
			const versionCheck = assertExpectedVersion(
				contract.version,
				input.expectedVersion,
			);
			if (!versionCheck.ok) {
				return versionCheck;
			}
			if (contract.lineageStatus !== "active") {
				return errorResult.fail("CONFLICT", {
					publicMessage: "The request conflicts with current state",
					internalContext: humanResourcesErrorDetails(
						HUMAN_RESOURCES_ERROR_CONFLICT,
					),
				});
			}

			const referenceCode = input.referenceCode ?? contract.referenceCode;
			const startsOn = input.startsOn ?? contract.startsOn;
			const endsOn =
				input.endsOn === undefined ? contract.endsOn : input.endsOn;
			const dateCheck = assertValidDateRange(startsOn, endsOn);
			if (!dateCheck.ok) {
				return dateCheck;
			}

			const previous = { ...contract };
			const now = new Date();
			contract.referenceCode = referenceCode;
			contract.startsOn = startsOn;
			contract.endsOn = endsOn;
			contract.reasonCode = input.reasonCode;
			contract.sourceReference = input.sourceReference;
			contract.version += 1;
			contract.updatedBy = input.actorUserId;
			contract.updatedAt = now;

			const audit = await ports.audit.record({
				organizationId: contract.organizationId,
				actorUserId: input.actorUserId,
				correlationId: meta.correlationId,
				entity: "hr_employment_contract",
				entityId: contract.id,
				action: "UPDATE",
				changes: [],
			});
			if (!audit.ok) {
				state.contracts.set(contract.id, previous);
				return audit;
			}

			const outbox = await ports.outbox.append({
				organizationId: contract.organizationId,
				actorUserId: input.actorUserId,
				correlationId: meta.correlationId,
				type: HUMAN_RESOURCES_EMPLOYMENT_CONTRACT_CHANGED_EVENT,
				payload: {
					organizationId: contract.organizationId,
					entityType: "hr_employment_contract",
					entityId: contract.id,
					actorId: input.actorUserId,
					correlationId: meta.correlationId,
				},
			});
			if (!outbox.ok) {
				state.contracts.set(contract.id, previous);
				return outbox;
			}

			return errorResult.ok({ ...contract });
		},

		async supersedeEmploymentContract(
			input: {
				organizationId: string;
				employmentContractId: HumanResourcesEmploymentContractId;
				referenceCode: string;
				startsOn: string;
				endsOn: string | null;
				reasonCode: string;
				sourceReference: string;
				predecessorEffectiveTo: string;
				expectedVersion: number;
				actorUserId: string;
			},
			ports: MutationPorts,
			meta: HumanResourcesMutationMeta,
		): Promise<
			Result<{ superseded: EmploymentContract; successor: EmploymentContract }>
		> {
			const predecessor = state.contracts.get(input.employmentContractId);
			if (!predecessor || predecessor.organizationId !== input.organizationId) {
				return errorResult.fail("NOT_FOUND", {
					publicMessage: "The requested resource was not found",
					internalContext: humanResourcesErrorDetails(
						HUMAN_RESOURCES_ERROR_NOT_FOUND,
					),
				});
			}
			const versionCheck = assertExpectedVersion(
				predecessor.version,
				input.expectedVersion,
			);
			if (!versionCheck.ok) {
				return versionCheck;
			}
			if (predecessor.lineageStatus !== "active") {
				return errorResult.fail("CONFLICT", {
					publicMessage: "The request conflicts with current state",
					internalContext: humanResourcesErrorDetails(
						HUMAN_RESOURCES_ERROR_CONFLICT,
					),
				});
			}

			const dateCheck = assertValidDateRange(input.startsOn, input.endsOn);
			if (!dateCheck.ok) {
				return dateCheck;
			}

			const successorId = parseHumanResourcesEmploymentContractId(randomUUID());
			if (!successorId.ok) {
				return successorId;
			}

			const previousPredecessor = { ...predecessor };
			const now = new Date();
			predecessor.lineageStatus = "superseded";
			predecessor.endsOn = input.predecessorEffectiveTo;
			predecessor.supersededByContractId = successorId.data;
			predecessor.version += 1;
			predecessor.updatedBy = input.actorUserId;
			predecessor.updatedAt = now;

			const successor: EmploymentContract = {
				id: successorId.data,
				organizationId: predecessor.organizationId,
				employmentId: predecessor.employmentId,
				employeeId: predecessor.employeeId,
				referenceCode: input.referenceCode,
				startsOn: input.startsOn,
				endsOn: input.endsOn,
				lineageStatus: "active",
				supersedesContractId: predecessor.id,
				supersededByContractId: null,
				reasonCode: input.reasonCode,
				sourceReference: input.sourceReference,
				version: 1,
				createdBy: input.actorUserId,
				updatedBy: input.actorUserId,
				createdAt: now,
				updatedAt: now,
			};
			state.contracts.set(successor.id, successor);

			const audit = await ports.audit.record({
				organizationId: predecessor.organizationId,
				actorUserId: input.actorUserId,
				correlationId: meta.correlationId,
				entity: "hr_employment_contract",
				entityId: predecessor.id,
				action: "UPDATE",
				changes: [],
			});
			if (!audit.ok) {
				state.contracts.set(predecessor.id, previousPredecessor);
				state.contracts.delete(successor.id);
				return audit;
			}

			const supersededEvent = await ports.outbox.append({
				organizationId: predecessor.organizationId,
				actorUserId: input.actorUserId,
				correlationId: meta.correlationId,
				type: HUMAN_RESOURCES_EMPLOYMENT_CONTRACT_SUPERSEDED_EVENT,
				payload: {
					organizationId: predecessor.organizationId,
					entityType: "hr_employment_contract",
					entityId: predecessor.id,
					actorId: input.actorUserId,
					correlationId: meta.correlationId,
				},
			});
			if (!supersededEvent.ok) {
				state.contracts.set(predecessor.id, previousPredecessor);
				state.contracts.delete(successor.id);
				return supersededEvent;
			}

			const createAudit = await ports.audit.record({
				organizationId: successor.organizationId,
				actorUserId: input.actorUserId,
				correlationId: meta.correlationId,
				entity: "hr_employment_contract",
				entityId: successor.id,
				action: "CREATE",
				changes: [],
			});
			if (!createAudit.ok) {
				state.contracts.set(predecessor.id, previousPredecessor);
				state.contracts.delete(successor.id);
				return createAudit;
			}

			const createdEvent = await ports.outbox.append({
				organizationId: successor.organizationId,
				actorUserId: input.actorUserId,
				correlationId: meta.correlationId,
				type: HUMAN_RESOURCES_EMPLOYMENT_CONTRACT_CREATED_EVENT,
				payload: {
					organizationId: successor.organizationId,
					entityType: "hr_employment_contract",
					entityId: successor.id,
					actorId: input.actorUserId,
					correlationId: meta.correlationId,
				},
			});
			if (!createdEvent.ok) {
				state.contracts.set(predecessor.id, previousPredecessor);
				state.contracts.delete(successor.id);
				return createdEvent;
			}

			return errorResult.ok({
				superseded: { ...predecessor },
				successor: { ...successor },
			});
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
			return await errorResult.ok(count);
		},

		async resolvePositionOccupancyAsOf(input: {
			organizationId: string;
			positionId: HumanResourcesPositionId;
			asOf: string;
		}): Promise<Result<PositionOccupancyAsOf | null>> {
			const position = org.positions.get(input.positionId);
			if (!position || position.organizationId !== input.organizationId) {
				return await errorResult.ok(null);
			}

			const assignments = [...state.assignments.values()].filter(
				(assignmentValue) =>
					assignmentValue.organizationId === input.organizationId &&
					assignmentValue.positionId === input.positionId &&
					assignmentValue.startsOn <= input.asOf &&
					(assignmentValue.endsOn === null ||
						assignmentValue.endsOn >= input.asOf),
			);
			if (assignments.length > 1) {
				return await errorResult.fail("CONFLICT", {
					publicMessage: "The request conflicts with current state",
					internalContext: humanResourcesErrorDetails(
						HUMAN_RESOURCES_ERROR_CONFLICT,
					),
				});
			}

			const assignment = assignments[0] ?? null;
			return await errorResult.ok({
				position: { ...position },
				asOf: input.asOf,
				assignment: assignment ? { ...assignment } : null,
				state: assignment ? "occupied" : "vacant",
			});
		},

		// Assignment methods
		async getAssignmentById(input: {
			organizationId: string;
			assignmentId: HumanResourcesAssignmentId;
		}): Promise<Result<WorkAssignment | null>> {
			const assignment = state.assignments.get(input.assignmentId);
			if (!assignment || assignment.organizationId !== input.organizationId) {
				return await errorResult.ok(null);
			}
			return await errorResult.ok({ ...assignment });
		},

		async findOpenAssignmentByEmployment(input: {
			organizationId: string;
			employmentId: HumanResourcesEmploymentId;
		}): Promise<Result<WorkAssignment | null>> {
			const sequentialOutcome3 = await runSequential(
				state.assignments.values(),
				async (assignment) => {
					if (
						assignment.organizationId === input.organizationId &&
						assignment.employmentId === input.employmentId &&
						assignment.endsOn === null
					) {
						return sequentialReturn(await errorResult.ok({ ...assignment }));
					}
				},
			);
			if (sequentialOutcome3.kind === "return") {
				return sequentialOutcome3.value;
			}
			return await errorResult.ok(null);
		},

		async findAssignmentByEmploymentAsOf(input: {
			organizationId: string;
			employmentId: HumanResourcesEmploymentId;
			asOf: string;
		}): Promise<Result<WorkAssignment | null>> {
			const resolution = resolveUniqueEffectiveRangeRecordBy({
				records: [...state.assignments.values()].filter(
					(assignment) =>
						assignment.organizationId === input.organizationId &&
						assignment.employmentId === input.employmentId,
				),
				asOf: input.asOf,
				getId: (assignment) => assignment.id,
				getEffectiveFrom: (assignment) => assignment.startsOn,
				getEffectiveTo: (assignment) => assignment.endsOn,
			});
			if (!resolution.ok) {
				return await multiplePrimaryAssignmentsAtAsOf();
			}
			return await errorResult.ok(
				resolution.record === null ? null : { ...resolution.record },
			);
		},

		async listAssignmentsByEmployment(input: {
			organizationId: string;
			employmentId: HumanResourcesEmploymentId;
		}): Promise<Result<WorkAssignment[]>> {
			const rows = [...state.assignments.values()]
				.filter(
					(assignment) =>
						assignment.organizationId === input.organizationId &&
						assignment.employmentId === input.employmentId,
				)
				.map((assignment) => ({ ...assignment }));
			return await errorResult.ok(rows);
		},

		async listWorkforcePlanActualAssignments(input: {
			organizationId: string;
			asOf: string;
		}): Promise<Result<WorkforcePlanActualAssignment[]>> {
			const actuals: WorkforcePlanActualAssignment[] = [];
			for (const assignment of state.assignments.values()) {
				if (
					assignment.organizationId !== input.organizationId ||
					assignment.startsOn > input.asOf ||
					(assignment.endsOn !== null && assignment.endsOn < input.asOf)
				) {
					continue;
				}

				const employment = state.employments.get(assignment.employmentId);
				if (
					!employment ||
					employment.organizationId !== input.organizationId ||
					employment.status !== "active" ||
					employment.startsOn > input.asOf ||
					(employment.endsOn !== null && employment.endsOn < input.asOf)
				) {
					continue;
				}

				const position = org.positions.get(assignment.positionId);
				if (!position || position.organizationId !== input.organizationId) {
					continue;
				}

				actuals.push({
					employmentId: employment.id,
					employeeId: employment.employeeId,
					positionId: assignment.positionId,
					departmentId: position.departmentId,
					jobId: position.jobId,
					locationCode: assignment.organizationDimensions?.location.key ?? null,
					employmentStatus: employment.status,
					employmentStartsOn: employment.startsOn,
					employmentEndsOn: employment.endsOn,
					assignmentStartsOn: assignment.startsOn,
					assignmentEndsOn: assignment.endsOn,
				});
			}

			actuals.sort((a, b) => a.employeeId.localeCompare(b.employeeId));
			return await errorResult.ok(actuals);
		},

		// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: The memory adapter mirrors the ordered production state transition for deterministic contract parity.
		async createAssignment(
			record: AssignmentCreateRecord,
			ports: MutationPorts,
			meta: HumanResourcesMutationMeta,
		): Promise<Result<WorkAssignment>> {
			const employment = state.employments.get(record.employmentId);
			if (!employment || employment.organizationId !== record.organizationId) {
				return errorResult.fail("NOT_FOUND", {
					publicMessage: "The requested resource was not found",
					internalContext: humanResourcesErrorDetails(
						HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
					),
				});
			}

			if (employment.employeeId !== record.employeeId) {
				return errorResult.fail("BAD_REQUEST", {
					publicMessage: "The request is invalid",
					internalContext: humanResourcesErrorDetails(
						HUMAN_RESOURCES_ERROR_INVALID_INPUT,
					),
				});
			}

			const position = org.positions.get(record.positionId);
			if (!position || position.organizationId !== record.organizationId) {
				return errorResult.fail("NOT_FOUND", {
					publicMessage: "The requested resource was not found",
					internalContext: humanResourcesErrorDetails(
						HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
					),
				});
			}

			const activeCheck = assertActivePosition(position.status);
			if (!activeCheck.ok) {
				return activeCheck;
			}

			const dateCheck = assertValidDateRange(record.startsOn, record.endsOn);
			if (!dateCheck.ok) {
				return dateCheck;
			}

			const withinEmployment = assertAssignmentWithinEmployment({
				assignmentStartsOn: record.startsOn,
				assignmentEndsOn: record.endsOn,
				employmentStartsOn: employment.startsOn,
				employmentEndsOn: employment.endsOn,
			});
			if (!withinEmployment.ok) {
				return withinEmployment;
			}

			const siblings = await this.listAssignmentsByEmployment({
				organizationId: record.organizationId,
				employmentId: record.employmentId,
			});
			if (!siblings.ok) {
				return siblings;
			}
			const overlap = assertNoAssignmentOverlap({
				candidateStartsOn: record.startsOn,
				candidateEndsOn: record.endsOn,
				existing: siblings.data,
			});
			if (!overlap.ok) {
				return overlap;
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
				organizationDimensions: structuredClone(record.organizationDimensions),
				predecessorAssignmentId: record.predecessorAssignmentId ?? null,
				successorAssignmentId: record.successorAssignmentId ?? null,
				transferMovementId: record.transferMovementId ?? null,
				managerEmployeeIdSnapshot: record.managerEmployeeIdSnapshot,
				workCalendarIdSnapshot: record.workCalendarIdSnapshot,
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

			const outbox = await ports.outbox.append({
				organizationId: assignment.organizationId,
				actorUserId: assignment.createdBy,
				correlationId: meta.correlationId,
				type: HUMAN_RESOURCES_ASSIGNMENT_CREATED_EVENT,
				payload: {
					organizationId: assignment.organizationId,
					entityType: "hr_work_assignment",
					entityId: assignment.id,
					actorId: assignment.createdBy,
					correlationId: meta.correlationId,
				},
			});
			if (!outbox.ok) {
				state.assignments.delete(assignment.id);
				return outbox;
			}

			return errorResult.ok({ ...assignment });
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
			meta: HumanResourcesMutationMeta,
		): Promise<Result<WorkAssignment>> {
			const assignment = state.assignments.get(input.assignmentId);
			if (!assignment || assignment.organizationId !== input.organizationId) {
				return errorResult.fail("NOT_FOUND", {
					publicMessage: "The requested resource was not found",
					internalContext: humanResourcesErrorDetails(
						HUMAN_RESOURCES_ERROR_NOT_FOUND,
					),
				});
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

			const outbox = await ports.outbox.append({
				organizationId: updated.organizationId,
				actorUserId: input.actorUserId,
				correlationId: meta.correlationId,
				type: HUMAN_RESOURCES_ASSIGNMENT_ENDED_EVENT,
				payload: {
					organizationId: updated.organizationId,
					entityType: "hr_work_assignment",
					entityId: updated.id,
					actorId: input.actorUserId,
					correlationId: meta.correlationId,
				},
			});
			if (!outbox.ok) {
				state.assignments.set(input.assignmentId, assignment);
				return outbox;
			}

			return errorResult.ok({ ...updated });
		},

		// Reporting line methods
	};
}
