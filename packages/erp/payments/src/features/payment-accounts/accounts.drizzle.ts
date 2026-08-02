import { randomUUID } from "node:crypto";

import {
	database as afendaDatabase,
	and,
	desc,
	eq,
	paymentAccount,
} from "@afenda/db";
import {
	errorIngress,
	errorProject,
	errorResult,
	type Result,
} from "@afenda/errors";

import type { PaymentAccount } from "../../kernel/contracts/domain";
import { PAYMENT_ACCOUNT_KINDS } from "../../kernel/contracts/domain";
import type { PaymentAccountsStore } from "./accounts.store";

function failFromPersistence(error: unknown, _fallbackMessage: string) {
	return errorProject.result(
		errorIngress.postgres(error, { operation: "persistence.postgres" }),
	);
}

function parseEnum<T extends string>(
	value: string,
	values: readonly T[],
	field: string,
): T {
	const found = values.find((candidate) => candidate === value);
	if (found === undefined) {
		throw new Error(`Invalid ${field}: ${value}`);
	}
	return found;
}

function mapAccount(row: typeof paymentAccount.$inferSelect): PaymentAccount {
	return {
		id: row.id,
		organizationId: row.organizationId,
		code: row.code,
		normalizedCode: row.normalizedCode,
		name: row.name,
		kind: parseEnum(row.kind, PAYMENT_ACCOUNT_KINDS, "payment_account.kind"),
		currencyCode: row.currencyCode,
		active: row.active,
		createdBy: row.createdBy,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	};
}

export const drizzlePaymentAccountMethods: PaymentAccountsStore = {
	async createPaymentAccount(
		record: Omit<PaymentAccount, "id" | "createdAt" | "updatedAt">,
	): Promise<Result<PaymentAccount>> {
		const id = randomUUID();
		try {
			const [row] = await afendaDatabase.client
				.insert(paymentAccount)
				.values({
					id,
					organizationId: record.organizationId,
					code: record.code,
					normalizedCode: record.normalizedCode,
					name: record.name,
					kind: record.kind,
					currencyCode: record.currencyCode,
					active: record.active,
					createdBy: record.createdBy,
				})
				.returning();
			if (row === undefined) {
				return errorResult.fail("INTERNAL_ERROR");
			}
			return errorResult.ok(mapAccount(row));
		} catch (error) {
			return failFromPersistence(error, "Failed to create payment account");
		}
	},

	async getPaymentAccountById(
		organizationId: string,
		id: string,
	): Promise<Result<PaymentAccount | null>> {
		try {
			const [row] = await afendaDatabase.client
				.select()
				.from(paymentAccount)
				.where(
					and(
						eq(paymentAccount.organizationId, organizationId),
						eq(paymentAccount.id, id),
					),
				)
				.limit(1);
			return errorResult.ok(row === undefined ? null : mapAccount(row));
		} catch (error) {
			return failFromPersistence(error, "Failed to load payment account");
		}
	},

	async listPaymentAccounts(
		organizationId: string,
	): Promise<Result<PaymentAccount[]>> {
		try {
			const rows = await afendaDatabase.client
				.select()
				.from(paymentAccount)
				.where(eq(paymentAccount.organizationId, organizationId))
				.orderBy(desc(paymentAccount.updatedAt), desc(paymentAccount.id));
			return errorResult.ok(rows.map(mapAccount));
		} catch (error) {
			return failFromPersistence(error, "Failed to list payment accounts");
		}
	},
};
