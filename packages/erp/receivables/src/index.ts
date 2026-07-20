import "server-only";

import { fail, ok, type Result } from "@afenda/errors/result";
import { createEventPublisher } from "@afenda/events";
import { z } from "zod";

import {
	requireReceivablesPermission,
	type ReceivablesAuthorizationPort,
	type ReceivablesPermission,
} from "./authorization";
import { createDrizzleReceivablesStore } from "./drizzle-store";
import { createMemoryReceivablesStore } from "./memory-store";
import type {
	CustomerAllocation,
	CustomerBalance,
	ReceivablesCommandOptions,
	ReceivablesEffects,
	ReceivablesStore,
	SalesInvoice,
	SalesInvoiceLine,
} from "./model";

export {
	requireReceivablesPermission,
	type ReceivablesAuthorizationPort,
	type ReceivablesPermission,
} from "./authorization";
export type {
	CustomerAllocation,
	CustomerBalance,
	ReceivablesCommandOptions,
	ReceivablesEffects,
	ReceivablesStore,
	SalesInvoice,
	SalesInvoiceLine,
	SalesInvoiceStatus,
} from "./model";
export { createDrizzleReceivablesStore, DrizzleReceivablesStore } from "./drizzle-store";
export { createMemoryReceivablesStore, MemoryReceivablesStore } from "./memory-store";

const identity = {
	organizationId: z.string().trim().min(1),
	actorUserId: z.string().trim().min(1),
};
const correlated = { ...identity, correlationId: z.string().trim().min(1) };
const uuid = z.string().uuid();
const money = z
	.union([z.number().positive(), z.string().trim().min(1)])
	.transform((value, ctx) => {
		const number = typeof value === "number" ? value : Number(value);
		if (!Number.isFinite(number) || number <= 0) {
			ctx.addIssue({ code: "custom", message: "Amount must be positive" });
			return z.NEVER;
		}
		return String(number);
	});

const createSchema = z.object({
	...correlated,
	code: z.string().trim().min(1).max(64),
	customerId: uuid,
	customerCode: z.string().trim().min(1).max(64),
	customerName: z.string().trim().min(1).max(256),
	currencyCode: z.string().trim().length(3).transform((value) => value.toUpperCase()),
});
const addLineSchema = z.object({
	...correlated,
	invoiceId: uuid,
	itemId: uuid,
	description: z.string().trim().min(1).max(512),
	quantity: money,
	unitPrice: money,
});
const postSchema = z.object({
	...correlated,
	invoiceId: uuid,
	expectedVersion: z.number().int().positive(),
});
const creditSchema = createSchema.extend({
	amount: money,
});
const allocationSchema = z.object({
	...correlated,
	invoiceId: uuid,
	amount: money,
	paymentId: uuid.optional(),
});
const cancelSchema = z.object({
	...correlated,
	invoiceId: uuid,
	expectedVersion: z.number().int().positive(),
});
const getSchema = z.object({ ...identity, id: uuid });
const listSchema = z.object({
	...identity,
	page: z.number().int().positive().default(1),
	pageSize: z.number().int().positive().max(100).default(50),
	status: z.enum(["draft", "posted", "cancelled"]).optional(),
});
const balanceSchema = z.object({
	...identity,
	customerId: uuid,
	currencyCode: z
		.string()
		.trim()
		.length(3)
		.transform((value) => value.toUpperCase())
		.optional(),
});

let productionStore: ReceivablesStore | undefined;

function resolveStore(store?: ReceivablesStore): ReceivablesStore {
	if (store !== undefined) return store;
	productionStore ??= createDrizzleReceivablesStore();
	return productionStore;
}

function resolveEffects(effects?: ReceivablesEffects): ReceivablesEffects {
	if (effects !== undefined) return effects;
	const publisher = createEventPublisher();
	return {
		async emit(event) {
			const result = await publisher.publish({
				type: event.type,
				sourceModule: "receivables",
				organizationId: event.organizationId,
				actorUserId: event.actorUserId,
				correlationId: event.correlationId,
				payload: event.payload,
			});
			return result.ok ? ok(undefined) : result;
		},
	};
}

async function authorize(
	authorization: ReceivablesAuthorizationPort | undefined,
	input: { organizationId: string; actorUserId: string },
	permission: ReceivablesPermission,
): Promise<Result<void>> {
	return requireReceivablesPermission(authorization, { ...input, permission });
}

function parse<T>(schema: z.ZodType<T>, input: unknown, message: string): Result<T> {
	const parsed = schema.safeParse(input);
	return parsed.success
		? ok(parsed.data)
		: fail("BAD_REQUEST", message, {
				fieldErrors: parsed.error.flatten().fieldErrors,
			});
}

function normalizedCode(code: string): string {
	return code.trim().toUpperCase();
}

export async function createDraftSalesInvoice(
	input: unknown,
	options: ReceivablesCommandOptions = {},
): Promise<Result<SalesInvoice>> {
	const parsed = parse(createSchema, input, "Invalid sales invoice create input");
	if (!parsed.ok) return parsed;
	const allowed = await authorize(options.authorization, parsed.data, "receivables.manage");
	if (!allowed.ok) return allowed;
	return resolveStore(options.store).createInvoice({
		...parsed.data,
		normalizedCode: normalizedCode(parsed.data.code),
		documentType: "invoice",
	});
}

export async function addSalesInvoiceLine(
	input: unknown,
	options: ReceivablesCommandOptions = {},
): Promise<Result<SalesInvoiceLine>> {
	const parsed = parse(addLineSchema, input, "Invalid sales invoice line input");
	if (!parsed.ok) return parsed;
	const allowed = await authorize(options.authorization, parsed.data, "receivables.manage");
	if (!allowed.ok) return allowed;
	return resolveStore(options.store).addLine(parsed.data);
}

export async function postSalesInvoice(
	input: unknown,
	options: ReceivablesCommandOptions = {},
): Promise<Result<SalesInvoice>> {
	const parsed = parse(postSchema, input, "Invalid sales invoice post input");
	if (!parsed.ok) return parsed;
	const allowed = await authorize(options.authorization, parsed.data, "receivables.manage");
	if (!allowed.ok) return allowed;
	return resolveStore(options.store).postInvoice({
		...parsed.data,
		effects: resolveEffects(options.effects),
	});
}

export async function issueCreditNote(
	input: unknown,
	options: ReceivablesCommandOptions = {},
): Promise<Result<SalesInvoice>> {
	const parsed = parse(creditSchema, input, "Invalid credit note input");
	if (!parsed.ok) return parsed;
	const allowed = await authorize(options.authorization, parsed.data, "receivables.manage");
	if (!allowed.ok) return allowed;
	return resolveStore(options.store).issueCredit({
		...parsed.data,
		normalizedCode: normalizedCode(parsed.data.code),
		documentType: "credit_note",
		effects: resolveEffects(options.effects),
	});
}

export async function allocateCustomerReceipt(
	input: unknown,
	options: ReceivablesCommandOptions = {},
): Promise<Result<CustomerAllocation>> {
	const parsed = parse(allocationSchema, input, "Invalid customer allocation input");
	if (!parsed.ok) return parsed;
	const allowed = await authorize(options.authorization, parsed.data, "receivables.manage");
	if (!allowed.ok) return allowed;
	return resolveStore(options.store).allocate({
		...parsed.data,
		paymentId: parsed.data.paymentId ?? null,
		effects: resolveEffects(options.effects),
	});
}

export async function cancelSalesInvoice(
	input: unknown,
	options: ReceivablesCommandOptions = {},
): Promise<Result<SalesInvoice>> {
	const parsed = parse(cancelSchema, input, "Invalid sales invoice cancel input");
	if (!parsed.ok) return parsed;
	const allowed = await authorize(options.authorization, parsed.data, "receivables.manage");
	if (!allowed.ok) return allowed;
	return resolveStore(options.store).cancel(parsed.data);
}

export async function getSalesInvoiceById(
	input: unknown,
	options: ReceivablesCommandOptions = {},
): Promise<Result<SalesInvoice | null>> {
	const parsed = parse(getSchema, input, "Invalid sales invoice get input");
	if (!parsed.ok) return parsed;
	const allowed = await authorize(options.authorization, parsed.data, "receivables.read");
	if (!allowed.ok) return allowed;
	return resolveStore(options.store).getById(parsed.data.organizationId, parsed.data.id);
}

export async function listSalesInvoices(
	input: unknown,
	options: ReceivablesCommandOptions = {},
): Promise<Result<SalesInvoice[]>> {
	const parsed = parse(listSchema, input, "Invalid sales invoice list input");
	if (!parsed.ok) return parsed;
	const allowed = await authorize(options.authorization, parsed.data, "receivables.read");
	if (!allowed.ok) return allowed;
	return resolveStore(options.store).list(parsed.data);
}

export async function getCustomerBalance(
	input: unknown,
	options: ReceivablesCommandOptions = {},
): Promise<Result<CustomerBalance[]>> {
	const parsed = parse(balanceSchema, input, "Invalid customer balance input");
	if (!parsed.ok) return parsed;
	const allowed = await authorize(options.authorization, parsed.data, "receivables.read");
	if (!allowed.ok) return allowed;
	return resolveStore(options.store).getBalance(
		parsed.data.organizationId,
		parsed.data.customerId,
		parsed.data.currencyCode,
	);
}
