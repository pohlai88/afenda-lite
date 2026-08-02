// biome-ignore-all lint/suspicious/useAwait: The deterministic memory adapter implements asynchronous payroll assignment and input ports.
import { randomUUID } from "node:crypto";

import { errorResult } from "@afenda/errors";
import type {
	PayrollEmployeeAssignment,
	PayrollRecurringDeduction,
	PayrollRecurringEarning,
} from "../../kernel/contracts/projected-types";
import {
	mapConflict,
	mapNotFound,
} from "../../kernel/execution/persistence-errors";
import { recordPayrollAudit as recordAudit } from "../../kernel/execution/record-audit";
import {
	type PayrollEmployeeAssignmentId,
	type PayrollRecurringDeductionId,
	type PayrollRecurringEarningId,
	parsePayrollEmployeeAssignmentId,
	parsePayrollRecurringDeductionId,
	parsePayrollRecurringEarningId,
} from "../../kernel/identity/brands";
import {
	type IdempotentEntityRecord,
	idempotencyMapKey,
	resolveCreateIdempotentReplay,
} from "../../kernel/identity/source-idempotency";
import {
	effectiveRangesOverlap,
	isEffectiveOnDate,
} from "../../kernel/temporal/effective-date";
import type { PayrollAssignmentsStore } from "./assignments.store";

export interface AssignmentsMemoryState {
	assignmentIdempotency: Map<
		string,
		IdempotentEntityRecord<PayrollEmployeeAssignment>
	>;
	assignments: Map<PayrollEmployeeAssignmentId, PayrollEmployeeAssignment>;
	recurringDeductionIdempotency: Map<
		string,
		IdempotentEntityRecord<PayrollRecurringDeduction>
	>;
	recurringDeductions: Map<
		PayrollRecurringDeductionId,
		PayrollRecurringDeduction
	>;
	recurringEarningIdempotency: Map<
		string,
		IdempotentEntityRecord<PayrollRecurringEarning>
	>;
	recurringEarnings: Map<PayrollRecurringEarningId, PayrollRecurringEarning>;
}

function cloneAssignment(
	entity: PayrollEmployeeAssignment,
): PayrollEmployeeAssignment {
	return { ...entity };
}

function cloneRecurringEarning(
	entity: PayrollRecurringEarning,
): PayrollRecurringEarning {
	return { ...entity };
}

function cloneRecurringDeduction(
	entity: PayrollRecurringDeduction,
): PayrollRecurringDeduction {
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
				return errorResult.ok(null);
			}
			return errorResult.ok({
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
				return errorResult.ok(cloneAssignment(resolved.data));
			}

			const overlapsActiveAssignment = Array.from(
				state.assignments.values(),
			).some(
				(existing) =>
					existing.organizationId === record.organizationId &&
					existing.employeeId === record.employeeId &&
					existing.status === "active" &&
					effectiveRangesOverlap(
						existing.effectiveFrom,
						existing.effectiveTo,
						record.effectiveFrom,
						record.effectiveTo ?? null,
					),
			);
			if (overlapsActiveAssignment) {
				return errorResult.fail("CONFLICT", {
					publicMessage:
						"Employee already has an active payroll assignment for this effective range",
				});
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

			return errorResult.ok(cloneAssignment(entity));
		},

		async getEmployeeAssignment(input) {
			const entity = state.assignments.get(input.assignmentId);
			if (
				entity === undefined ||
				entity.organizationId !== input.organizationId
			) {
				return errorResult.ok(null);
			}
			return errorResult.ok(cloneAssignment(entity));
		},

		async findRecurringEarningByIdempotencyKey(input) {
			const record = state.recurringEarningIdempotency.get(
				idempotencyMapKey(input.organizationId, input.idempotencyKey),
			);
			if (record === undefined) {
				return errorResult.ok(null);
			}
			return errorResult.ok({
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
				return errorResult.ok(cloneRecurringEarning(resolved.data));
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

			return errorResult.ok(cloneRecurringEarning(entity));
		},

		async getRecurringEarning(input) {
			const entity = state.recurringEarnings.get(input.recurringEarningId);
			if (
				entity === undefined ||
				entity.organizationId !== input.organizationId
			) {
				return errorResult.ok(null);
			}
			return errorResult.ok(cloneRecurringEarning(entity));
		},

		async findRecurringDeductionByIdempotencyKey(input) {
			const record = state.recurringDeductionIdempotency.get(
				idempotencyMapKey(input.organizationId, input.idempotencyKey),
			);
			if (record === undefined) {
				return errorResult.ok(null);
			}
			return errorResult.ok({
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
				return errorResult.ok(cloneRecurringDeduction(resolved.data));
			}

			const recurringDeductionId = parsePayrollRecurringDeductionId(
				randomUUID(),
			);
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

			return errorResult.ok(cloneRecurringDeduction(entity));
		},

		async getRecurringDeduction(input) {
			const entity = state.recurringDeductions.get(input.recurringDeductionId);
			if (
				entity === undefined ||
				entity.organizationId !== input.organizationId
			) {
				return errorResult.ok(null);
			}
			return errorResult.ok(cloneRecurringDeduction(entity));
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
			return errorResult.ok(assignments.map(cloneAssignment));
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
			return errorResult.ok(recurringEarnings.map(cloneRecurringEarning));
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
			return errorResult.ok(recurringDeductions.map(cloneRecurringDeduction));
		},
	};
}
