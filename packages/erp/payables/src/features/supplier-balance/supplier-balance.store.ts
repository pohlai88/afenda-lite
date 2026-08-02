import type { Result } from "@afenda/errors";

import type { SupplierBalance } from "../../kernel/contracts/domain";

export interface PayablesSupplierBalanceStore {
	getBalance: (
		organizationId: string,
		supplierId: string,
		currencyCode?: string,
	) => Promise<Result<SupplierBalance[]>>;
}
