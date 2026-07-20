import "server-only";

import { fail, ok, type Result } from "@afenda/errors/result";
import { createEventPublisher } from "@afenda/events";
import { z } from "zod";

import {
	type AccountingAuthorizationPort,
	type AccountingPermission,
	requireAccountingPermission,
} from "./authorization";
import { createDrizzleAccountingStore } from "./drizzle-store";
import type {
	AccountingCommandOptions,
	AccountingEffects,
	AccountingPeriod,
	AccountingStore,
	Journal,
	JournalLine,
	TrialBalanceRow,
} from "./model";

export {
	type AccountingAuthorizationPort,
	type AccountingPermission,
	requireAccountingPermission,
} from "./authorization";
export {
	createDrizzleAccountingStore,
	DrizzleAccountingStore,
} from "./drizzle-store";
export {
	createMemoryAccountingStore,
	MemoryAccountingStore,
} from "./memory-store";
export type {
	AccountingCommandOptions,
	AccountingEffects,
	AccountingEventType,
	AccountingPeriod,
	AccountingPeriodStatus,
	AccountingStore,
	Journal,
	JournalLine,
	JournalStatus,
	LedgerPosting,
	TrialBalanceRow,
} from "./model";

const identity = {
	organizationId: z.string().trim().min(1),
	actorUserId: z.string().trim().min(1),
};
const correlated = { ...identity, correlationId: z.string().trim().min(1) };
const uuid = z.string().uuid();
const code = z.string().trim().min(1).max(64);
const description = z.string().trim().min(1).max(512).nullable().optional();
const amount = z
	.union([
		z.number().nonnegative().finite(),
		z
			.string()
			.trim()
			.regex(/^\d+(?:\.\d{1,6})?$/),
	])
	.transform((value) => String(value));
const isoDate = z.iso.date();

const openPeriodSchema = z
	.object({
		...identity,
		code,
		startDate: isoDate,
		endDate: isoDate,
	})
	.refine((value) => value.startDate <= value.endDate, {
		message: "Period end date must not precede start date",
		path: ["endDate"],
	});
const closePeriodSchema = z.object({
	...identity,
	periodId: uuid,
	expectedVersion: z.number().int().positive(),
});
const createSchema = z.object({
	...identity,
	periodId: uuid,
	code,
	currencyCode: z
		.string()
		.trim()
		.length(3)
		.transform((value) => value.toUpperCase())
		.default("USD"),
	description,
});
const lineSchema = z
	.object({
		...identity,
		journalId: uuid,
		accountCode: code,
		description,
		debit: amount,
		credit: amount,
	})
	.refine(
		(value) =>
			(Number(value.debit) > 0 && Number(value.credit) === 0) ||
			(Number(value.credit) > 0 && Number(value.debit) === 0),
		{
			message: "Exactly one of debit or credit must be positive",
			path: ["debit"],
		},
	);
const postSchema = z.object({
	...correlated,
	journalId: uuid,
	expectedVersion: z.number().int().positive(),
});
const reverseSchema = postSchema.extend({
	reason: z.string().trim().min(1).max(512),
});
const getSchema = z.object({ ...identity, id: uuid });
const listSchema = z.object({
	...identity,
	page: z.number().int().positive().default(1),
	pageSize: z.number().int().positive().max(100).default(50),
	status: z.enum(["draft", "posted", "reversed"]).optional(),
	periodId: uuid.optional(),
});
const trialBalanceSchema = z.object({
	...identity,
	periodId: uuid.optional(),
});

let productionStore: AccountingStore | undefined;

function resolveStore(store?: AccountingStore): AccountingStore {
	if (store !== undefined) return store;
	productionStore ??= createDrizzleAccountingStore();
	return productionStore;
}

function resolveEffects(effects?: AccountingEffects): AccountingEffects {
	if (effects !== undefined) return effects;
	const publisher = createEventPublisher();
	return {
		async emit(event) {
			const result = await publisher.publish({
				type: event.type,
				sourceModule: "accounting",
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
	authorization: AccountingAuthorizationPort | undefined,
	input: { organizationId: string; actorUserId: string },
	permission: AccountingPermission,
): Promise<Result<void>> {
	return requireAccountingPermission(authorization, { ...input, permission });
}

function normalizedCode(value: string): string {
	return value.trim().toUpperCase();
}

export async function openAccountingPeriod(
	input: unknown,
	options: AccountingCommandOptions = {},
): Promise<Result<AccountingPeriod>> {
	const parsed = parse(
		openPeriodSchema,
		input,
		"Invalid accounting period input",
	);
	if (!parsed.ok) return parsed;
	const allowed = await authorize(
		options.authorization,
		parsed.data,
		"accounting.manage",
	);
	if (!allowed.ok) return allowed;
	return resolveStore(options.store).openPeriod({
		...parsed.data,
		normalizedCode: normalizedCode(parsed.data.code),
	});
}

export async function closeAccountingPeriod(
	input: unknown,
	options: AccountingCommandOptions = {},
): Promise<Result<AccountingPeriod>> {
	const parsed = parse(
		closePeriodSchema,
		input,
		"Invalid accounting period close input",
	);
	if (!parsed.ok) return parsed;
	const allowed = await authorize(
		options.authorization,
		parsed.data,
		"accounting.manage",
	);
	if (!allowed.ok) return allowed;
	return resolveStore(options.store).closePeriod(parsed.data);
}

export async function createDraftJournal(
	input: unknown,
	options: AccountingCommandOptions = {},
): Promise<Result<Journal>> {
	const parsed = parse(createSchema, input, "Invalid journal create input");
	if (!parsed.ok) return parsed;
	const allowed = await authorize(
		options.authorization,
		parsed.data,
		"accounting.manage",
	);
	if (!allowed.ok) return allowed;
	return resolveStore(options.store).createDraft({
		...parsed.data,
		normalizedCode: normalizedCode(parsed.data.code),
		description: parsed.data.description ?? null,
	});
}

export async function addJournalLine(
	input: unknown,
	options: AccountingCommandOptions = {},
): Promise<Result<JournalLine>> {
	const parsed = parse(lineSchema, input, "Invalid journal line input");
	if (!parsed.ok) return parsed;
	const allowed = await authorize(
		options.authorization,
		parsed.data,
		"accounting.manage",
	);
	if (!allowed.ok) return allowed;
	return resolveStore(options.store).addLine({
		...parsed.data,
		accountCode: normalizedCode(parsed.data.accountCode),
		description: parsed.data.description ?? null,
	});
}

export async function postJournal(
	input: unknown,
	options: AccountingCommandOptions = {},
): Promise<Result<Journal>> {
	const parsed = parse(postSchema, input, "Invalid journal post input");
	if (!parsed.ok) return parsed;
	const allowed = await authorize(
		options.authorization,
		parsed.data,
		"accounting.manage",
	);
	if (!allowed.ok) return allowed;
	return resolveStore(options.store).post({
		...parsed.data,
		effects: resolveEffects(options.effects),
	});
}

export async function reverseJournal(
	input: unknown,
	options: AccountingCommandOptions = {},
): Promise<Result<Journal>> {
	const parsed = parse(reverseSchema, input, "Invalid journal reversal input");
	if (!parsed.ok) return parsed;
	const allowed = await authorize(
		options.authorization,
		parsed.data,
		"accounting.manage",
	);
	if (!allowed.ok) return allowed;
	return resolveStore(options.store).reverse({
		...parsed.data,
		effects: resolveEffects(options.effects),
	});
}

export async function getJournalById(
	input: unknown,
	options: AccountingCommandOptions = {},
): Promise<Result<Journal | null>> {
	const parsed = parse(getSchema, input, "Invalid journal get input");
	if (!parsed.ok) return parsed;
	const allowed = await authorize(
		options.authorization,
		parsed.data,
		"accounting.read",
	);
	if (!allowed.ok) return allowed;
	return resolveStore(options.store).getById(
		parsed.data.organizationId,
		parsed.data.id,
	);
}

export async function listJournals(
	input: unknown,
	options: AccountingCommandOptions = {},
): Promise<Result<Journal[]>> {
	const parsed = parse(listSchema, input, "Invalid journal list input");
	if (!parsed.ok) return parsed;
	const allowed = await authorize(
		options.authorization,
		parsed.data,
		"accounting.read",
	);
	if (!allowed.ok) return allowed;
	return resolveStore(options.store).list(parsed.data);
}

export async function getTrialBalance(
	input: unknown,
	options: AccountingCommandOptions = {},
): Promise<Result<TrialBalanceRow[]>> {
	const parsed = parse(
		trialBalanceSchema,
		input,
		"Invalid trial balance input",
	);
	if (!parsed.ok) return parsed;
	const allowed = await authorize(
		options.authorization,
		parsed.data,
		"accounting.read",
	);
	if (!allowed.ok) return allowed;
	return resolveStore(options.store).trialBalance(parsed.data);
}
