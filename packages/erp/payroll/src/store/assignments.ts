import type { Result } from "@afenda/errors/result";

import type {
	PayrollEmployeeAssignmentId,
	PayrollPayGroupId,
	PayrollRecurringDeductionId,
	PayrollRecurringEarningId,
} from "../brands";
import type { MutationPorts } from "../ports";
import type {
	PayrollEmployeeAssignment,
	PayrollEmployeeAssignmentCreateRecord,
	PayrollRecurringDeduction,
	PayrollRecurringDeductionCreateRecord,
	PayrollRecurringEarning,
	PayrollRecurringEarningCreateRecord,
} from "../types";

export type PayrollAssignmentsStore = {
	findEmployeeAssignmentByIdempotencyKey(input: {
		organizationId: string;
		idempotencyKey: string;
	}): Promise<
		Result<{
			assignment: PayrollEmployeeAssignment;
			createRequestFingerprint: string;
		} | null>
	>;

	createEmployeeAssignment(
		record: PayrollEmployeeAssignmentCreateRecord,
		ports: MutationPorts,
	): Promise<Result<PayrollEmployeeAssignment>>;

	getEmployeeAssignment(input: {
		organizationId: string;
		assignmentId: PayrollEmployeeAssignmentId;
	}): Promise<Result<PayrollEmployeeAssignment | null>>;

	findRecurringEarningByIdempotencyKey(input: {
		organizationId: string;
		idempotencyKey: string;
	}): Promise<
		Result<{
			recurringEarning: PayrollRecurringEarning;
			createRequestFingerprint: string;
		} | null>
	>;

	createRecurringEarning(
		record: PayrollRecurringEarningCreateRecord,
		ports: MutationPorts,
	): Promise<Result<PayrollRecurringEarning>>;

	getRecurringEarning(input: {
		organizationId: string;
		recurringEarningId: PayrollRecurringEarningId;
	}): Promise<Result<PayrollRecurringEarning | null>>;

	findRecurringDeductionByIdempotencyKey(input: {
		organizationId: string;
		idempotencyKey: string;
	}): Promise<
		Result<{
			recurringDeduction: PayrollRecurringDeduction;
			createRequestFingerprint: string;
		} | null>
	>;

	createRecurringDeduction(
		record: PayrollRecurringDeductionCreateRecord,
		ports: MutationPorts,
	): Promise<Result<PayrollRecurringDeduction>>;

	getRecurringDeduction(input: {
		organizationId: string;
		recurringDeductionId: PayrollRecurringDeductionId;
	}): Promise<Result<PayrollRecurringDeduction | null>>;

	listActiveAssignmentsForPayGroup(input: {
		organizationId: string;
		payGroupId: PayrollPayGroupId;
		effectiveDate: string;
	}): Promise<Result<PayrollEmployeeAssignment[]>>;

	listRecurringEarningsForAssignment(input: {
		organizationId: string;
		assignmentId: PayrollEmployeeAssignmentId;
		effectiveDate: string;
	}): Promise<Result<PayrollRecurringEarning[]>>;

	listRecurringDeductionsForAssignment(input: {
		organizationId: string;
		assignmentId: PayrollEmployeeAssignmentId;
		effectiveDate: string;
	}): Promise<Result<PayrollRecurringDeduction[]>>;
};
