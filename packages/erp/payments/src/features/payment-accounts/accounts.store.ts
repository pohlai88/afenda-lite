import type { Result } from "@afenda/errors";

import type { PaymentAccount } from "../../kernel/contracts/domain";

export interface PaymentAccountsStore {
	createPaymentAccount: (
		record: Omit<PaymentAccount, "id" | "createdAt" | "updatedAt">,
	) => Promise<Result<PaymentAccount>>;
	listPaymentAccounts: (
		organizationId: string,
	) => Promise<Result<PaymentAccount[]>>;
}
