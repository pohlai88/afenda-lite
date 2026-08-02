import { z } from "zod";

import { PAYMENT_ACCOUNT_KINDS } from "../../kernel/contracts/domain";
import {
	code,
	currencyCode,
	identity,
	mutation,
} from "../../kernel/validation/common.schema";

export const createPaymentAccountInputSchema = z.object({
	...mutation,
	code,
	name: z.string().trim().min(1).max(128),
	kind: z.enum(PAYMENT_ACCOUNT_KINDS).default("cash"),
	currencyCode,
	active: z.boolean().optional(),
});

export const listPaymentAccountsInputSchema = z.object({ ...identity });
