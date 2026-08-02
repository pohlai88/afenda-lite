import { errorResult, type Result } from "@afenda/errors";
import { mapInvalidState } from "../../kernel/execution/persistence-errors";
import type { PayrollRuleFinalizedUsageCheck } from "./rule-finalized-lock";
import type { PayrollSetupStore } from "./setup.store";

export async function assertRuleNotLockedByFinalizedRun(
	store: Pick<PayrollSetupStore, "isRuleVersionUsedByFinalizedRun">,
	input: PayrollRuleFinalizedUsageCheck,
): Promise<Result<void>> {
	const locked = await store.isRuleVersionUsedByFinalizedRun(input);
	if (!locked.ok) {
		return locked;
	}
	if (locked.data) {
		return mapInvalidState("Rule version is referenced by a finalized run");
	}
	return errorResult.ok(undefined);
}
