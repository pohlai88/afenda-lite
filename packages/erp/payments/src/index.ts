import "server-only";

import { fail, ok, type Result } from "@afenda/errors/result";
import { createEventPublisher } from "@afenda/events";
import { z } from "zod";

import {
	type PaymentsAuthorizationPort,
	type PaymentsPermission,
	requirePaymentsPermission,
} from "./authorization";
import { createDrizzlePaymentsStore } from "./drizzle-store";
import type {
	Payment,
	PaymentAllocation,
	PaymentsCommandOptions,
	PaymentsEffects,
	PaymentsStore,
} from "./model";

export {
	type PaymentsAuthorizationPort,
	type PaymentsPermission,
	requirePaymentsPermission,
} from "./authorization";
export {
	createDrizzlePaymentsStore,
	DrizzlePaymentsStore,
} from "./drizzle-store";
export { createMemoryPaymentsStore, MemoryPaymentsStore } from "./memory-store";
export type {
	Payment,
	PaymentAllocation,
	PaymentAllocationTarget,
	PaymentDirection,
	PaymentReversal,
	PaymentStatus,
	PaymentsCommandOptions,
	PaymentsEffects,
	PaymentsStore,
} from "./model";

const identity = {
	organizationId: z.string().trim().min(1),
	actorUserId: z.string().trim().min(1),
};
const correlated = { ...identity, correlationId: z.string().trim().min(1) };
const uuid = z.string().uuid();
const money = z
	.union([
		z.number().positive().finite(),
		z
			.string()
			.trim()
			.regex(/^\d+(?:\.\d{1,6})?$/),
	])
	.transform((value) => String(value));
const code = z.string().trim().min(1).max(64);
const reference = z.string().trim().min(1).max(256).nullable().optional();
const createSchema = z
	.object({
		...correlated,
		code,
		direction: z.enum(["receipt", "disbursement", "transfer"]),
		counterpartyId: uuid.nullable().optional(),
		currencyCode: z
			.string()
			.trim()
			.length(3)
			.transform((value) => value.toUpperCase()),
		amount: money,
		reference,
	})
	.superRefine((value, ctx) => {
		if (value.direction !== "transfer" && value.counterpartyId == null) {
			ctx.addIssue({
				code: "custom",
				message: "Counterparty is required for receipts and disbursements",
				path: ["counterpartyId"],
			});
		}
	});
const allocationSchema = z.object({
	...identity,
	paymentId: uuid,
	targetType: z.enum(["receivable", "payable"]),
	targetId: uuid,
	amount: money,
});
const versionedSchema = z.object({
	...correlated,
	paymentId: uuid,
	expectedVersion: z.number().int().positive(),
});
const reversalSchema = versionedSchema.extend({
	reason: z.string().trim().min(1).max(512),
});
const refundSchema = z.object({
	...correlated,
	code,
	originalPaymentId: uuid,
	amount: money,
	reference,
});
const getSchema = z.object({ ...identity, id: uuid });
const listSchema = z.object({
	...identity,
	page: z.number().int().positive().default(1),
	pageSize: z.number().int().positive().max(100).default(50),
	status: z.enum(["draft", "posted", "reversed"]).optional(),
	direction: z
		.enum(["receipt", "disbursement", "refund", "transfer"])
		.optional(),
});

let productionStore: PaymentsStore | undefined;

function resolveStore(store?: PaymentsStore): PaymentsStore {
	if (store !== undefined) return store;
	productionStore ??= createDrizzlePaymentsStore();
	return productionStore;
}

function resolveEffects(effects?: PaymentsEffects): PaymentsEffects {
	if (effects !== undefined) return effects;
	const publisher = createEventPublisher();
	return {
		async emit(event) {
			const result = await publisher.publish({
				type: event.type,
				sourceModule: "payments",
				organizationId: event.organizationId,
				actorUserId: event.actorUserId,
				correlationId: event.correlationId,
				payload: event.payload,
			});
			return result.ok ? ok(undefined) : result;
		},
	};
}

function parse<T>(
	schema: z.ZodType<T>,
	input: unknown,
	message: string,
): Result<T> {
	const parsed = schema.safeParse(input);
	return parsed.success
		? ok(parsed.data)
		: fail("BAD_REQUEST", message, {
				fieldErrors: parsed.error.flatten().fieldErrors,
			});
}

async function authorize(
	authorization: PaymentsAuthorizationPort | undefined,
	input: { organizationId: string; actorUserId: string },
	permission: PaymentsPermission,
): Promise<Result<void>> {
	return requirePaymentsPermission(authorization, { ...input, permission });
}

function normalizedCode(value: string): string {
	return value.trim().toUpperCase();
}

export async function createDraftPayment(
	input: unknown,
	options: PaymentsCommandOptions = {},
): Promise<Result<Payment>> {
	const parsed = parse(createSchema, input, "Invalid payment create input");
	if (!parsed.ok) return parsed;
	const allowed = await authorize(
		options.authorization,
		parsed.data,
		"payments.manage",
	);
	if (!allowed.ok) return allowed;
	return resolveStore(options.store).createDraft({
		...parsed.data,
		normalizedCode: normalizedCode(parsed.data.code),
		counterpartyId: parsed.data.counterpartyId ?? null,
		reference: parsed.data.reference ?? null,
		effects: resolveEffects(options.effects),
	});
}

export async function addPaymentAllocation(
	input: unknown,
	options: PaymentsCommandOptions = {},
): Promise<Result<PaymentAllocation>> {
	const parsed = parse(
		allocationSchema,
		input,
		"Invalid payment allocation input",
	);
	if (!parsed.ok) return parsed;
	const allowed = await authorize(
		options.authorization,
		parsed.data,
		"payments.manage",
	);
	if (!allowed.ok) return allowed;
	return resolveStore(options.store).addAllocation(parsed.data);
}

export async function postPayment(
	input: unknown,
	options: PaymentsCommandOptions = {},
): Promise<Result<Payment>> {
	const parsed = parse(versionedSchema, input, "Invalid payment post input");
	if (!parsed.ok) return parsed;
	const allowed = await authorize(
		options.authorization,
		parsed.data,
		"payments.manage",
	);
	if (!allowed.ok) return allowed;
	return resolveStore(options.store).post({
		...parsed.data,
		effects: resolveEffects(options.effects),
	});
}

export async function reversePayment(
	input: unknown,
	options: PaymentsCommandOptions = {},
): Promise<Result<Payment>> {
	const parsed = parse(reversalSchema, input, "Invalid payment reversal input");
	if (!parsed.ok) return parsed;
	const allowed = await authorize(
		options.authorization,
		parsed.data,
		"payments.manage",
	);
	if (!allowed.ok) return allowed;
	return resolveStore(options.store).reverse({
		...parsed.data,
		effects: resolveEffects(options.effects),
	});
}

export async function postRefund(
	input: unknown,
	options: PaymentsCommandOptions = {},
): Promise<Result<Payment>> {
	const parsed = parse(refundSchema, input, "Invalid refund post input");
	if (!parsed.ok) return parsed;
	const allowed = await authorize(
		options.authorization,
		parsed.data,
		"payments.manage",
	);
	if (!allowed.ok) return allowed;
	return resolveStore(options.store).postRefund({
		...parsed.data,
		normalizedCode: normalizedCode(parsed.data.code),
		reference: parsed.data.reference ?? null,
		effects: resolveEffects(options.effects),
	});
}

export async function getPaymentById(
	input: unknown,
	options: PaymentsCommandOptions = {},
): Promise<Result<Payment | null>> {
	const parsed = parse(getSchema, input, "Invalid payment get input");
	if (!parsed.ok) return parsed;
	const allowed = await authorize(
		options.authorization,
		parsed.data,
		"payments.read",
	);
	if (!allowed.ok) return allowed;
	return resolveStore(options.store).getById(
		parsed.data.organizationId,
		parsed.data.id,
	);
}

export async function listPayments(
	input: unknown,
	options: PaymentsCommandOptions = {},
): Promise<Result<Payment[]>> {
	const parsed = parse(listSchema, input, "Invalid payment list input");
	if (!parsed.ok) return parsed;
	const allowed = await authorize(
		options.authorization,
		parsed.data,
		"payments.read",
	);
	if (!allowed.ok) return allowed;
	return resolveStore(options.store).list(parsed.data);
}
