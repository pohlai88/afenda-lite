import { randomUUID } from "node:crypto";

import { ok, type Result } from "@afenda/errors/result";

import {
	parsePayrollEmployeeAssignmentId,
	parsePayrollRecurringDeductionId,
	parsePayrollRecurringEarningId,
	parsePayrollVariableInputId,
} from "../../brands";
import type { MutationPorts } from "../../ports";
import { isEffectiveOnDate } from "../../shared/effective-date";
import { mapConflict, mapNotFound } from "../../shared/persistence-errors";
import {
	resolveCreateIdempotentReplay,
	resolveSourceIdempotentReplay,
} from "../../shared/source-idempotency";
import type { PayrollAssignmentsStore } from "../../store/assignments";
import type { PayrollInputsStore } from "../../store/inputs";
import type {
	PayrollEmployeeAssignment,
	PayrollEmployeeAssignmentCreateRecord,
	PayrollRecurringDeduction,
	PayrollRecurringDeductionCreateRecord,
	PayrollRecurringEarning,
	PayrollRecurringEarningCreateRecord,
	PayrollVariableInput,
	PayrollVariableInputCreateRecord,
} from "../../types";
import {
	type AssignmentsMemoryState,
	idempotencyMapKey,
	type InputsMemoryState,
} from "./state";

async function recordAudit(
	ports: MutationPorts,
	input: {
		organizationId: string;
		actorUserId: string;
		correlationId: string;
		entity: string;
		entityId: string;
		action: "CREATE" | "UPDATE" | "DELETE";
	},
): Promise<Result<{ id: string }>> {
	return ports.audit.record({
		organizationId: input.organizationId,
		actorUserId: input.actorUserId,
		correlationId: input.correlationId,
		entity: input.entity,
		entityId: input.entityId,
		action: input.action,
		changes: [],
	});
}

function cloneAssignment(entity: PayrollEmployeeAssignment): PayrollEmployeeAssignment {
	return { ...entity };
}

function cloneRecurringEarning(entity: PayrollRecurringEarning): PayrollRecurringEarning {
	return { ...entity };
}

function cloneRecurringDeduction(
	entity: PayrollRecurringDeduction,
): PayrollRecurringDeduction {
	return { ...entity };
}

function cloneVariableInput(entity: PayrollVariableInput): PayrollVariableInput {
	return { ...entity };
}

export function createMemoryAssignmentsMethods(
	state: AssignmentsMemoryState,
): PayrollAssignmentsStore {
	return {
		async findEmployeeAssignmentByIdempotencyKey(input) {
			const record = state.assignmentIdempotency.get(
				idempotencyMapKey(input.organizationId, input.idempotencyKey),
			);
			if (record === undefined) {
				return ok(null);
			}
			return ok({
				assignment: cloneAssignment(record.entity),
				createRequestFingerprint: record.createRequestFingerprint,
			});
		},

		async createEmployeeAssignment(record, ports) {
			const replay = await this.findEmployeeAssignmentByIdempotencyKey({
				organizationId: record.organizationId,
				idempotencyKey: record.idempotencyKey,
			});
			if (!replay.ok) {
				return replay;
			}
			const resolved = resolveCreateIdempotentReplay({
				existing:
					replay.data === null
						? null
						: {
								entity: replay.data.assignment,
								createRequestFingerprint: replay.data.createRequestFingerprint,
							},
				requestFingerprint: record.createRequestFingerprint,
			});
			if (!resolved.ok) {
				return resolved;
			}
			if (resolved.data !== "create") {
				return ok(cloneAssignment(resolved.data));
			}

			const assignmentId = parsePayrollEmployeeAssignmentId(randomUUID());
			if (!assignmentId.ok) {
				return assignmentId;
			}

			const now = new Date();
			const entity: PayrollEmployeeAssignment = {
				id: assignmentId.data,
				organizationId: record.organizationId,
				employeeId: record.employeeId,
				payGroupId: record.payGroupId,
				status: "active",
				effectiveFrom: record.effectiveFrom,
				effectiveTo: record.effectiveTo ?? null,
				version: 1,
				createdBy: record.createdBy,
				updatedBy: record.createdBy,
				createdAt: now,
				updatedAt: now,
			};

			state.assignments.set(entity.id, entity);
			state.assignmentIdempotency.set(
				idempotencyMapKey(record.organizationId, record.idempotencyKey),
				{
					entity,
					createRequestFingerprint: record.createRequestFingerprint,
				},
			);

			const audit = await recordAudit(ports, {
				organizationId: record.organizationId,
				actorUserId: record.createdBy,
				correlationId: record.correlationId,
				entity: "payroll_employee_assignment",
				entityId: entity.id,
				action: "CREATE",
			});
			if (!audit.ok) {
				return audit;
			}

			return ok(cloneAssignment(entity));
		},

		async getEmployeeAssignment(input) {
			const entity = state.assignments.get(input.assignmentId);
			if (entity === undefined || entity.organizationId !== input.organizationId) {
				return ok(null);
			}
			return ok(cloneAssignment(entity));
		},

		async findRecurringEarningByIdempotencyKey(input) {
			const record = state.recurringEarningIdempotency.get(
				idempotencyMapKey(input.organizationId, input.idempotencyKey),
			);
			if (record === undefined) {
				return ok(null);
			}
			return ok({
				recurringEarning: cloneRecurringEarning(record.entity),
				createRequestFingerprint: record.createRequestFingerprint,
			});
		},

		async createRecurringEarning(record, ports) {
			const assignment = state.assignments.get(record.assignmentId);
			if (
				assignment === undefined ||
				assignment.organizationId !== record.organizationId
			) {
				return mapNotFound("Payroll employee assignment not found");
			}
			if (assignment.employeeId !== record.employeeId) {
				return mapConflict("Assignment employee mismatch");
			}

			const replay = await this.findRecurringEarningByIdempotencyKey({
				organizationId: record.organizationId,
				idempotencyKey: record.idempotencyKey,
			});
			if (!replay.ok) {
				return replay;
			}
			const resolved = resolveCreateIdempotentReplay({
				existing:
					replay.data === null
						? null
						: {
								entity: replay.data.recurringEarning,
								createRequestFingerprint: replay.data.createRequestFingerprint,
							},
				requestFingerprint: record.createRequestFingerprint,
			});
			if (!resolved.ok) {
				return resolved;
			}
			if (resolved.data !== "create") {
				return ok(cloneRecurringEarning(resolved.data));
			}

			const recurringEarningId = parsePayrollRecurringEarningId(randomUUID());
			if (!recurringEarningId.ok) {
				return recurringEarningId;
			}

			const now = new Date();
			const entity: PayrollRecurringEarning = {
				id: recurringEarningId.data,
				organizationId: record.organizationId,
				employeeId: record.employeeId,
				assignmentId: record.assignmentId,
				earningRuleId: record.earningRuleId,
				amount: record.amount,
				currencyCode: record.currencyCode,
				status: "active",
				effectiveFrom: record.effectiveFrom,
				effectiveTo: record.effectiveTo ?? null,
				version: 1,
				createdBy: record.createdBy,
				updatedBy: record.createdBy,
				createdAt: now,
				updatedAt: now,
			};

			state.recurringEarnings.set(entity.id, entity);
			state.recurringEarningIdempotency.set(
				idempotencyMapKey(record.organizationId, record.idempotencyKey),
				{
					entity,
					createRequestFingerprint: record.createRequestFingerprint,
				},
			);

			const audit = await recordAudit(ports, {
				organizationId: record.organizationId,
				actorUserId: record.createdBy,
				correlationId: record.correlationId,
				entity: "payroll_recurring_earning",
				entityId: entity.id,
				action: "CREATE",
			});
			if (!audit.ok) {
				return audit;
			}

			return ok(cloneRecurringEarning(entity));
		},

		async getRecurringEarning(input) {
			const entity = state.recurringEarnings.get(input.recurringEarningId);
			if (entity === undefined || entity.organizationId !== input.organizationId) {
				return ok(null);
			}
			return ok(cloneRecurringEarning(entity));
		},

		async findRecurringDeductionByIdempotencyKey(input) {
			const record = state.recurringDeductionIdempotency.get(
				idempotencyMapKey(input.organizationId, input.idempotencyKey),
			);
			if (record === undefined) {
				return ok(null);
			}
			return ok({
				recurringDeduction: cloneRecurringDeduction(record.entity),
				createRequestFingerprint: record.createRequestFingerprint,
			});
		},

		async createRecurringDeduction(record, ports) {
			const assignment = state.assignments.get(record.assignmentId);
			if (
				assignment === undefined ||
				assignment.organizationId !== record.organizationId
			) {
				return mapNotFound("Payroll employee assignment not found");
			}
			if (assignment.employeeId !== record.employeeId) {
				return mapConflict("Assignment employee mismatch");
			}

			const replay = await this.findRecurringDeductionByIdempotencyKey({
				organizationId: record.organizationId,
				idempotencyKey: record.idempotencyKey,
			});
			if (!replay.ok) {
				return replay;
			}
			const resolved = resolveCreateIdempotentReplay({
				existing:
					replay.data === null
						? null
						: {
								entity: replay.data.recurringDeduction,
								createRequestFingerprint: replay.data.createRequestFingerprint,
							},
				requestFingerprint: record.createRequestFingerprint,
			});
			if (!resolved.ok) {
				return resolved;
			}
			if (resolved.data !== "create") {
				return ok(cloneRecurringDeduction(resolved.data));
			}

			const recurringDeductionId = parsePayrollRecurringDeductionId(randomUUID());
			if (!recurringDeductionId.ok) {
				return recurringDeductionId;
			}

			const now = new Date();
			const entity: PayrollRecurringDeduction = {
				id: recurringDeductionId.data,
				organizationId: record.organizationId,
				employeeId: record.employeeId,
				assignmentId: record.assignmentId,
				deductionRuleId: record.deductionRuleId,
				amount: record.amount,
				currencyCode: record.currencyCode,
				status: "active",
				effectiveFrom: record.effectiveFrom,
				effectiveTo: record.effectiveTo ?? null,
				version: 1,
				createdBy: record.createdBy,
				updatedBy: record.createdBy,
				createdAt: now,
				updatedAt: now,
			};

			state.recurringDeductions.set(entity.id, entity);
			state.recurringDeductionIdempotency.set(
				idempotencyMapKey(record.organizationId, record.idempotencyKey),
				{
					entity,
					createRequestFingerprint: record.createRequestFingerprint,
				},
			);

			const audit = await recordAudit(ports, {
				organizationId: record.organizationId,
				actorUserId: record.createdBy,
				correlationId: record.correlationId,
				entity: "payroll_recurring_deduction",
				entityId: entity.id,
				action: "CREATE",
			});
			if (!audit.ok) {
				return audit;
			}

			return ok(cloneRecurringDeduction(entity));
		},

		async getRecurringDeduction(input) {
			const entity = state.recurringDeductions.get(input.recurringDeductionId);
			if (entity === undefined || entity.organizationId !== input.organizationId) {
				return ok(null);
			}
			return ok(cloneRecurringDeduction(entity));
		},

		async listActiveAssignmentsForPayGroup(input) {
			const assignments = Array.from(state.assignments.values()).filter(
				(assignment) => {
					if (assignment.organizationId !== input.organizationId) {
						return false;
					}
					if (assignment.payGroupId !== input.payGroupId) {
						return false;
					}
					if (assignment.status !== "active") {
						return false;
					}
					return isEffectiveOnDate(
						assignment.effectiveFrom,
						assignment.effectiveTo,
						input.effectiveDate,
					);
				},
			);
			return ok(assignments.map(cloneAssignment));
		},

		async listRecurringEarningsForAssignment(input) {
			const recurringEarnings = Array.from(
				state.recurringEarnings.values(),
			).filter((earning) => {
				if (earning.organizationId !== input.organizationId) {
					return false;
				}
				if (earning.assignmentId !== input.assignmentId) {
					return false;
				}
				if (earning.status !== "active") {
					return false;
				}
				return isEffectiveOnDate(
					earning.effectiveFrom,
					earning.effectiveTo,
					input.effectiveDate,
				);
			});
			return ok(recurringEarnings.map(cloneRecurringEarning));
		},

		async listRecurringDeductionsForAssignment(input) {
			const recurringDeductions = Array.from(
				state.recurringDeductions.values(),
			).filter((deduction) => {
				if (deduction.organizationId !== input.organizationId) {
					return false;
				}
				if (deduction.assignmentId !== input.assignmentId) {
					return false;
				}
				if (deduction.status !== "active") {
					return false;
				}
				return isEffectiveOnDate(
					deduction.effectiveFrom,
					deduction.effectiveTo,
					input.effectiveDate,
				);
			});
			return ok(recurringDeductions.map(cloneRecurringDeduction));
		},
	};
}

export function createMemoryInputsMethods(
	state: InputsMemoryState,
): PayrollInputsStore {
	return {
		async findVariableInputBySource(input) {
			const key = `${input.organizationId}:${input.sourceType}:${input.sourceId}`;
			const record = state.variableInputBySource.get(key);
			if (record === undefined) {
				return ok(null);
			}
			return ok({
				variableInput: cloneVariableInput(record.variableInput),
				sourceRequestFingerprint: record.sourceRequestFingerprint,
				createRequestFingerprint: record.createRequestFingerprint,
			});
		},

		async findVariableInputByIdempotencyKey(input) {
			const record = state.variableInputIdempotency.get(
				idempotencyMapKey(input.organizationId, input.idempotencyKey),
			);
			if (record === undefined) {
				return ok(null);
			}
			return ok({
				variableInput: cloneVariableInput(record.variableInput),
				sourceRequestFingerprint: record.sourceRequestFingerprint,
				createRequestFingerprint: record.createRequestFingerprint,
			});
		},

		async createVariableInput(record, ports) {
			const bySource = await this.findVariableInputBySource({
				organizationId: record.organizationId,
				sourceType: record.sourceType,
				sourceId: record.sourceId,
			});
			if (!bySource.ok) {
				return bySource;
			}
			const sourceReplay = resolveSourceIdempotentReplay({
				existing:
					bySource.data === null
						? null
						: {
								entity: bySource.data.variableInput,
								sourceRequestFingerprint: bySource.data.sourceRequestFingerprint,
							},
				requestFingerprint: record.sourceRequestFingerprint,
			});
			if (!sourceReplay.ok) {
				return sourceReplay;
			}
			if (sourceReplay.data !== "create") {
				return ok(cloneVariableInput(sourceReplay.data));
			}

			const byIdempotency = await this.findVariableInputByIdempotencyKey({
				organizationId: record.organizationId,
				idempotencyKey: record.idempotencyKey,
			});
			if (!byIdempotency.ok) {
				return byIdempotency;
			}
			const idempotencyReplay = resolveCreateIdempotentReplay({
				existing:
					byIdempotency.data === null
						? null
						: {
								entity: byIdempotency.data.variableInput,
								createRequestFingerprint:
									byIdempotency.data.createRequestFingerprint,
							},
				requestFingerprint: record.createRequestFingerprint,
			});
			if (!idempotencyReplay.ok) {
				return idempotencyReplay;
			}
			if (idempotencyReplay.data !== "create") {
				return ok(cloneVariableInput(idempotencyReplay.data));
			}

			const variableInputId = parsePayrollVariableInputId(randomUUID());
			if (!variableInputId.ok) {
				return variableInputId;
			}

			const now = new Date();
			const entity: PayrollVariableInput = {
				id: variableInputId.data,
				organizationId: record.organizationId,
				employeeId: record.employeeId,
				payGroupId: record.payGroupId,
				periodId: record.periodId,
				earningRuleId: record.earningRuleId,
				earningRuleCode: record.earningRuleCode,
				earningRuleVersion: record.earningRuleVersion,
				amount: record.amount,
				currencyCode: record.currencyCode,
				sourceType: record.sourceType,
				sourceId: record.sourceId,
				status: "accepted",
				effectiveFrom: record.effectiveFrom,
				effectiveTo: record.effectiveTo ?? null,
				version: 1,
				createdBy: record.createdBy,
				updatedBy: record.createdBy,
				createdAt: now,
				updatedAt: now,
			};

			state.variableInputs.set(entity.id, entity);
			state.variableInputBySource.set(
				`${record.organizationId}:${record.sourceType}:${record.sourceId}`,
				{
					variableInput: entity,
					sourceRequestFingerprint: record.sourceRequestFingerprint,
					createRequestFingerprint: record.createRequestFingerprint,
				},
			);
			state.variableInputIdempotency.set(
				idempotencyMapKey(record.organizationId, record.idempotencyKey),
				{
					variableInput: entity,
					sourceRequestFingerprint: record.sourceRequestFingerprint,
					createRequestFingerprint: record.createRequestFingerprint,
				},
			);

			const audit = await recordAudit(ports, {
				organizationId: record.organizationId,
				actorUserId: record.createdBy,
				correlationId: record.correlationId,
				entity: "payroll_variable_input",
				entityId: entity.id,
				action: "CREATE",
			});
			if (!audit.ok) {
				return audit;
			}

			return ok(cloneVariableInput(entity));
		},

		async getVariableInput(input) {
			const entity = state.variableInputs.get(input.variableInputId);
			if (entity === undefined || entity.organizationId !== input.organizationId) {
				return ok(null);
			}
			return ok(cloneVariableInput(entity));
		},

		async listVariableInputsForPeriod(input) {
			const variableInputs = Array.from(state.variableInputs.values()).filter(
				(entity) => {
					if (entity.organizationId !== input.organizationId) {
						return false;
					}
					if (entity.periodId !== input.periodId) {
						return false;
					}
					if (input.status !== undefined && entity.status !== input.status) {
						return false;
					}
					return true;
				},
			);
			return ok(variableInputs.map(cloneVariableInput));
		},
	};
}
