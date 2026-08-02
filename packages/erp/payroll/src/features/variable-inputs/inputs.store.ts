import type { Result } from "@afenda/errors";
import type {
	IdempotentPayrollVariableInputRecord,
	PayrollVariableInput,
	PayrollVariableInputCreateRecord,
} from "../../kernel/contracts/projected-types";
import type { MutationPorts } from "../../kernel/execution/ports";
import type {
	PayrollPeriodId,
	PayrollVariableInputId,
} from "../../kernel/identity/brands";

export interface PayrollInputsStore {
	createVariableInput: (
		record: PayrollVariableInputCreateRecord,
		ports: MutationPorts,
	) => Promise<Result<PayrollVariableInput>>;

	findVariableInputByIdempotencyKey: (input: {
		organizationId: string;
		idempotencyKey: string;
	}) => Promise<Result<IdempotentPayrollVariableInputRecord | null>>;
	findVariableInputBySource: (input: {
		organizationId: string;
		sourceType: string;
		sourceId: string;
	}) => Promise<Result<IdempotentPayrollVariableInputRecord | null>>;

	getVariableInput: (input: {
		organizationId: string;
		variableInputId: PayrollVariableInputId;
	}) => Promise<Result<PayrollVariableInput | null>>;

	listVariableInputsForPeriod: (input: {
		organizationId: string;
		periodId: PayrollPeriodId;
		status?: PayrollVariableInput["status"];
	}) => Promise<Result<PayrollVariableInput[]>>;
}
