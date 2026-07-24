import { ok, type Result } from "@afenda/errors/result";

import type { PayrollSetupStore } from "../store/setup";
import { mapInvalidState } from "./persistence-errors";
import type { PayrollRuleFinalizedUsageCheck } from "./rule-finalized-lock";

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
	return ok(undefined);
}
