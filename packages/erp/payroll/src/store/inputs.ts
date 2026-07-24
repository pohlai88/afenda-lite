import type { Result } from "@afenda/errors/result";

import type { PayrollPeriodId, PayrollVariableInputId } from "../brands";
import type { MutationPorts } from "../ports";
import type {
	IdempotentPayrollVariableInputRecord,
	PayrollVariableInput,
	PayrollVariableInputCreateRecord,
} from "../types";

export type PayrollInputsStore = {
	findVariableInputBySource(input: {
		organizationId: string;
		sourceType: string;
		sourceId: string;
	}): Promise<Result<IdempotentPayrollVariableInputRecord | null>>;

	findVariableInputByIdempotencyKey(input: {
		organizationId: string;
		idempotencyKey: string;
	}): Promise<Result<IdempotentPayrollVariableInputRecord | null>>;

	createVariableInput(
		record: PayrollVariableInputCreateRecord,
		ports: MutationPorts,
	): Promise<Result<PayrollVariableInput>>;

	getVariableInput(input: {
		organizationId: string;
		variableInputId: PayrollVariableInputId;
	}): Promise<Result<PayrollVariableInput | null>>;

	listVariableInputsForPeriod(input: {
		organizationId: string;
		periodId: PayrollPeriodId;
		status?: PayrollVariableInput["status"];
	}): Promise<Result<PayrollVariableInput[]>>;
};
