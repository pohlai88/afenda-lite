import { z } from "zod";

import {
	currencyCode,
	identity,
	uuid,
} from "../../kernel/validation/common.schema";

export const getSupplierBalanceInputSchema = z.object({
	...identity,
	currencyCode: currencyCode.optional(),
	supplierId: uuid,
});
