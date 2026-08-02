import type { Result } from "@afenda/errors";

import type { SupplierBalance } from "../../kernel/contracts/domain";
import {
	type PayablesAuthorizationPort,
	requirePayablesPermission,
} from "../../kernel/execution/authorization";
import { parsePayablesInput } from "../../kernel/validation/parse-input";
import { getSupplierBalanceInputSchema } from "./supplier-balance.schema";
import type { PayablesSupplierBalanceStore } from "./supplier-balance.store";

export interface SupplierBalanceOperationDeps {
	authorization?: PayablesAuthorizationPort | undefined;
	store: PayablesSupplierBalanceStore;
}

export async function getSupplierBalanceOperation(
	input: unknown,
	deps: SupplierBalanceOperationDeps,
): Promise<Result<SupplierBalance[]>> {
	const parsed = parsePayablesInput(getSupplierBalanceInputSchema, input);
	if (!parsed.ok) {
		return parsed;
	}
	const allowed = await requirePayablesPermission(deps.authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		permission: "payables.read",
	});
	if (!allowed.ok) {
		return allowed;
	}
	return deps.store.getBalance(
		parsed.data.organizationId,
		parsed.data.supplierId,
		parsed.data.currencyCode,
	);
}
