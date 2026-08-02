import { randomUUID } from "node:crypto";

import {
	and,
	database as afendaDatabase,
	desc,
	eq,
	paymentMethod,
} from "@afenda/db";
import {
	errorIngress,
	errorProject,
	errorResult,
	type Result,
} from "@afenda/errors";

import type {
	PaymentAccountKind,
	PaymentInstrumentKind,
	PaymentMethod,
} from "../../kernel/contracts/domain";
import {
	INSTRUMENT_REQUIREMENTS,
	PAYMENT_ACCOUNT_KINDS,
	PAYMENT_INSTRUMENT_KINDS,
	PAYMENT_METHOD_KINDS,
} from "../../kernel/contracts/domain";
import type {
	PaymentMethodsStore,
	PaymentMethodUpdateRecord,
} from "./methods.store";

function failFromPersistence(error: unknown) {
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

function parseEnumArray<T extends string>(
	value: string,
	values: readonly T[],
	field: string,
): readonly T[] {
	const parsed: unknown = JSON.parse(value);
	if (!Array.isArray(parsed)) {
		throw new Error(`Invalid ${field}: expected JSON array`);
	}
	return parsed.map((entry) => parseEnum(String(entry), values, field));
}

function mapMethod(row: typeof paymentMethod.$inferSelect): PaymentMethod {
	return {
		id: row.id,
		organizationId: row.organizationId,
		code: row.code,
		normalizedCode: row.normalizedCode,
		name: row.name,
		kind: parseEnum(row.kind, PAYMENT_METHOD_KINDS, "payment_method.kind"),
		instrumentRequirement: parseEnum(
			row.instrumentRequirement,
			INSTRUMENT_REQUIREMENTS,
			"payment_method.instrument_requirement",
		),
		allowedInstrumentKinds: parseEnumArray<PaymentInstrumentKind>(
			row.allowedInstrumentKinds,
			PAYMENT_INSTRUMENT_KINDS,
			"payment_method.allowed_instrument_kinds",
		),
		allowedAccountKinds: parseEnumArray<PaymentAccountKind>(
			row.allowedAccountKinds,
			PAYMENT_ACCOUNT_KINDS,
			"payment_method.allowed_account_kinds",
		),
		active: row.active,
		createdBy: row.createdBy,
		updatedBy: row.updatedBy,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	};
}

export const drizzlePaymentMethodMethods: PaymentMethodsStore = {
	async createPaymentMethod(
		record: Omit<PaymentMethod, "id" | "createdAt" | "updatedAt">,
	): Promise<Result<PaymentMethod>> {
		const id = randomUUID();
		try {
			const [row] = await afendaDatabase.client
				.insert(paymentMethod)
				.values({
					id,
					organizationId: record.organizationId,
					code: record.code,
					normalizedCode: record.normalizedCode,
					name: record.name,
					kind: record.kind,
					instrumentRequirement: record.instrumentRequirement,
					allowedInstrumentKinds: JSON.stringify(record.allowedInstrumentKinds),
					allowedAccountKinds: JSON.stringify(record.allowedAccountKinds),
					active: record.active,
					createdBy: record.createdBy,
					updatedBy: record.updatedBy,
				})
				.returning();
			if (row === undefined) {
				return errorResult.fail("INTERNAL_ERROR");
			}
			return errorResult.ok(mapMethod(row));
		} catch (error) {
			return failFromPersistence(error);
		}
	},

	async getPaymentMethodById(
		organizationId: string,
		id: string,
	): Promise<Result<PaymentMethod | null>> {
		try {
			const [row] = await afendaDatabase.client
				.select()
				.from(paymentMethod)
				.where(
					and(
						eq(paymentMethod.organizationId, organizationId),
						eq(paymentMethod.id, id),
					),
				)
				.limit(1);
			return errorResult.ok(row === undefined ? null : mapMethod(row));
		} catch (error) {
			return failFromPersistence(error);
		}
	},

	async listPaymentMethods(
		organizationId: string,
	): Promise<Result<PaymentMethod[]>> {
		try {
			const rows = await afendaDatabase.client
				.select()
				.from(paymentMethod)
				.where(eq(paymentMethod.organizationId, organizationId))
				.orderBy(desc(paymentMethod.updatedAt), desc(paymentMethod.id));
			return errorResult.ok(rows.map(mapMethod));
		} catch (error) {
			return failFromPersistence(error);
		}
	},

	async updatePaymentMethod(
		record: PaymentMethodUpdateRecord,
	): Promise<Result<PaymentMethod>> {
		try {
			const [row] = await afendaDatabase.client
				.update(paymentMethod)
				.set({
					...(record.name !== undefined ? { name: record.name } : {}),
					...(record.instrumentRequirement !== undefined
						? { instrumentRequirement: record.instrumentRequirement }
						: {}),
					...(record.allowedInstrumentKinds !== undefined
						? {
								allowedInstrumentKinds: JSON.stringify(
									record.allowedInstrumentKinds,
								),
							}
						: {}),
					...(record.allowedAccountKinds !== undefined
						? {
								allowedAccountKinds: JSON.stringify(record.allowedAccountKinds),
							}
						: {}),
					...(record.active !== undefined ? { active: record.active } : {}),
					updatedBy: record.updatedBy,
					updatedAt: new Date(),
				})
				.where(
					and(
						eq(paymentMethod.organizationId, record.organizationId),
						eq(paymentMethod.id, record.id),
					),
				)
				.returning();
			if (row === undefined) {
				return errorResult.fail("NOT_FOUND", {
					publicMessage: "Payment method not found",
				});
			}
			return errorResult.ok(mapMethod(row));
		} catch (error) {
			return failFromPersistence(error);
		}
	},
};
