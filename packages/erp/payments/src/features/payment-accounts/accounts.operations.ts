import type { Result } from "@afenda/errors";

import type { PaymentAccount } from "../../kernel/contracts/domain";
import {
	type PaymentsAuthorizationPort,
	requirePaymentsPermission,
} from "../../kernel/execution/authorization";
import {
	normalizedCode,
	parsePaymentsInput,
} from "../../kernel/validation/parse-input";
import {
	createPaymentAccountInputSchema,
	listPaymentAccountsInputSchema,
} from "./accounts.schema";
import type { PaymentAccountsStore } from "./accounts.store";

export interface PaymentAccountsOperationDeps {
	authorization?: PaymentsAuthorizationPort | undefined;
	store: PaymentAccountsStore;
}

export async function createPaymentAccountOperation(
	input: unknown,
	deps: PaymentAccountsOperationDeps,
): Promise<Result<PaymentAccount>> {
	const parsed = parsePaymentsInput(createPaymentAccountInputSchema, input);
	if (!parsed.ok) {
		return parsed;
	}
	const allowed = await requirePaymentsPermission(deps.authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		permission: "payments.account.manage",
	});
	if (!allowed.ok) {
		return allowed;
	}
	return deps.store.createPaymentAccount({
		organizationId: parsed.data.organizationId,
		code: parsed.data.code,
		normalizedCode: normalizedCode(parsed.data.code),
		name: parsed.data.name,
		kind: parsed.data.kind,
		currencyCode: parsed.data.currencyCode,
		active: parsed.data.active ?? true,
		createdBy: parsed.data.actorUserId,
	});
}

export async function listPaymentAccountsOperation(
	input: unknown,
	deps: PaymentAccountsOperationDeps,
): Promise<Result<PaymentAccount[]>> {
	const parsed = parsePaymentsInput(listPaymentAccountsInputSchema, input);
	if (!parsed.ok) {
		return parsed;
	}
	const allowed = await requirePaymentsPermission(deps.authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		permission: "payments.account.read",
	});
	if (!allowed.ok) {
		return allowed;
	}
	return deps.store.listPaymentAccounts(parsed.data.organizationId);
}
