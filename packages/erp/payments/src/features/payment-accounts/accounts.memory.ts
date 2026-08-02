import { randomUUID } from "node:crypto";

import { errorResult, type Result } from "@afenda/errors";

import type { PaymentAccount } from "../../kernel/contracts/domain";
import type { PaymentAccountsStore } from "./accounts.store";

export interface PaymentAccountsMemoryState {
	accounts: Map<string, PaymentAccount>;
}

function resolveOperation<T>(operation: () => Result<T>): Promise<Result<T>> {
	try {
		return Promise.resolve(operation());
	} catch (error) {
		return Promise.reject(error);
	}
}

export function createMemoryPaymentAccountMethods(
	state: PaymentAccountsMemoryState,
): PaymentAccountsStore {
	return {
		createPaymentAccount(
			record: Omit<PaymentAccount, "id" | "createdAt" | "updatedAt">,
		): Promise<Result<PaymentAccount>> {
			return resolveOperation(() => {
				for (const account of state.accounts.values()) {
					if (
						account.organizationId === record.organizationId &&
						account.normalizedCode === record.normalizedCode
					) {
						return errorResult.fail("CONFLICT", {
							publicMessage: "Payment account code already exists",
						});
					}
				}
				const now = new Date();
				const account: PaymentAccount = {
					...record,
					id: randomUUID(),
					createdAt: now,
					updatedAt: now,
				};
				state.accounts.set(account.id, account);
				return errorResult.ok({ ...account });
			});
		},

		listPaymentAccounts(
			organizationId: string,
		): Promise<Result<PaymentAccount[]>> {
			return resolveOperation(() =>
				errorResult.ok(
					[...state.accounts.values()]
						.filter((account) => account.organizationId === organizationId)
						.map((account) => ({ ...account })),
				),
			);
		},
	};
}
