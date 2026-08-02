import type { Result } from "@afenda/errors";
import type {
	PayrollEmployeeAssignment,
	PayrollEmployeeAssignmentCreateRecord,
	PayrollRecurringDeduction,
	PayrollRecurringDeductionCreateRecord,
	PayrollRecurringEarning,
	PayrollRecurringEarningCreateRecord,
} from "../../kernel/contracts/projected-types";
import type { MutationPorts } from "../../kernel/execution/ports";
import type {
	PayrollEmployeeAssignmentId,
	PayrollPayGroupId,
	PayrollRecurringDeductionId,
	PayrollRecurringEarningId,
} from "../../kernel/identity/brands";

export interface PayrollAssignmentsStore {
	createEmployeeAssignment: (
		record: PayrollEmployeeAssignmentCreateRecord,
		ports: MutationPorts,
	) => Promise<Result<PayrollEmployeeAssignment>>;

	createRecurringDeduction: (
		record: PayrollRecurringDeductionCreateRecord,
		ports: MutationPorts,
	) => Promise<Result<PayrollRecurringDeduction>>;

	createRecurringEarning: (
		record: PayrollRecurringEarningCreateRecord,
		ports: MutationPorts,
	) => Promise<Result<PayrollRecurringEarning>>;
	findEmployeeAssignmentByIdempotencyKey: (input: {
		organizationId: string;
		idempotencyKey: string;
	}) => Promise<
		Result<{
			assignment: PayrollEmployeeAssignment;
			createRequestFingerprint: string;
		} | null>
	>;

	findRecurringDeductionByIdempotencyKey: (input: {
		organizationId: string;
		idempotencyKey: string;
	}) => Promise<
		Result<{
			recurringDeduction: PayrollRecurringDeduction;
			createRequestFingerprint: string;
		} | null>
	>;

	findRecurringEarningByIdempotencyKey: (input: {
		organizationId: string;
		idempotencyKey: string;
	}) => Promise<
		Result<{
			recurringEarning: PayrollRecurringEarning;
			createRequestFingerprint: string;
		} | null>
	>;

	getEmployeeAssignment: (input: {
		organizationId: string;
		assignmentId: PayrollEmployeeAssignmentId;
	}) => Promise<Result<PayrollEmployeeAssignment | null>>;

	getRecurringDeduction: (input: {
		organizationId: string;
		recurringDeductionId: PayrollRecurringDeductionId;
	}) => Promise<Result<PayrollRecurringDeduction | null>>;

	getRecurringEarning: (input: {
		organizationId: string;
		recurringEarningId: PayrollRecurringEarningId;
	}) => Promise<Result<PayrollRecurringEarning | null>>;

	listActiveAssignmentsForPayGroup: (input: {
		organizationId: string;
		payGroupId: PayrollPayGroupId;
		effectiveDate: string;
	}) => Promise<Result<PayrollEmployeeAssignment[]>>;

	listRecurringDeductionsForAssignment: (input: {
		organizationId: string;
		assignmentId: PayrollEmployeeAssignmentId;
		effectiveDate: string;
	}) => Promise<Result<PayrollRecurringDeduction[]>>;

	listRecurringEarningsForAssignment: (input: {
		organizationId: string;
		assignmentId: PayrollEmployeeAssignmentId;
		effectiveDate: string;
	}) => Promise<Result<PayrollRecurringEarning[]>>;
}
