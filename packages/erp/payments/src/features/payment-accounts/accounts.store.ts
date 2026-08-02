import type { Result } from "@afenda/errors";

import type { PaymentAccount } from "../../kernel/contracts/domain";

export interface PaymentAccountsStore {
	createPaymentAccount: (
		record: Omit<PaymentAccount, "id" | "createdAt" | "updatedAt">,
	) => Promise<Result<PaymentAccount>>;
	getPaymentAccountById: (
		organizationId: string,
		id: string,
	) => Promise<Result<PaymentAccount | null>>;
	listPaymentAccounts: (
		organizationId: string,
	) => Promise<Result<PaymentAccount[]>>;
}
