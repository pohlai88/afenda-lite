import { z } from "zod";

import {
	INSTRUMENT_REQUIREMENTS,
	PAYMENT_ACCOUNT_KINDS,
	PAYMENT_INSTRUMENT_KINDS,
	PAYMENT_METHOD_KINDS,
} from "../../kernel/contracts/domain";
import {
	code,
	identity,
	mutation,
	uuid,
} from "../../kernel/validation/common.schema";

export const createPaymentMethodInputSchema = z.object({
	...mutation,
	code,
	name: z.string().trim().min(1).max(128),
	kind: z.enum(PAYMENT_METHOD_KINDS),
	instrumentRequirement: z.enum(INSTRUMENT_REQUIREMENTS),
	allowedInstrumentKinds: z.array(z.enum(PAYMENT_INSTRUMENT_KINDS)).default([]),
	allowedAccountKinds: z.array(z.enum(PAYMENT_ACCOUNT_KINDS)).min(1),
	active: z.boolean().optional(),
});

export const updatePaymentMethodInputSchema = z.object({
	...mutation,
	id: uuid,
	name: z.string().trim().min(1).max(128).optional(),
	instrumentRequirement: z.enum(INSTRUMENT_REQUIREMENTS).optional(),
	allowedInstrumentKinds: z.array(z.enum(PAYMENT_INSTRUMENT_KINDS)).optional(),
	allowedAccountKinds: z.array(z.enum(PAYMENT_ACCOUNT_KINDS)).min(1).optional(),
});

export const deactivatePaymentMethodInputSchema = z.object({
	...mutation,
	id: uuid,
});

export const seedDefaultPaymentMethodsInputSchema = z.object({ ...mutation });

export const listPaymentMethodsInputSchema = z.object({ ...identity });
