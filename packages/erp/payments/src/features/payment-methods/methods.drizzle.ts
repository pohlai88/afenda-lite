import { randomUUID } from "node:crypto";

import {
	database as afendaDatabase,
	and,
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

function methodEventPayload(record: {
	organizationId: string;
	paymentMethodId: string;
	code: string;
	kind: string;
	active: boolean;
	actorUserId: string;
}): string {
	return JSON.stringify({
		organizationId: record.organizationId,
		paymentMethodId: record.paymentMethodId,
		code: record.code,
		kind: record.kind,
		active: record.active,
		actorId: record.actorUserId,
		correlationId: `payment-method:${record.paymentMethodId}`,
	});
}

async function loadMethodById(
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
}

export const drizzlePaymentMethodMethods: PaymentMethodsStore = {
	async createPaymentMethod(
		record: Omit<PaymentMethod, "id" | "createdAt" | "updatedAt">,
	): Promise<Result<PaymentMethod>> {
		const id = randomUUID();
		const eventId = randomUUID();
		const payload = methodEventPayload({
			organizationId: record.organizationId,
			paymentMethodId: id,
			code: record.code,
			kind: record.kind,
			active: record.active,
			actorUserId: record.createdBy,
		});
		try {
			const [rows] = await afendaDatabase.transaction((sql) => [
				sql`
					WITH mutated AS (
						INSERT INTO payment_method (
							id, organization_id, code, normalized_code, name, kind,
							instrument_requirement, allowed_instrument_kinds,
							allowed_account_kinds, active, created_by, updated_by
						)
						VALUES (
							${id}, ${record.organizationId}, ${record.code},
							${record.normalizedCode}, ${record.name}, ${record.kind},
							${record.instrumentRequirement},
							${JSON.stringify(record.allowedInstrumentKinds)},
							${JSON.stringify(record.allowedAccountKinds)}, ${record.active},
							${record.createdBy}, ${record.updatedBy}
						)
						RETURNING id
					)
					INSERT INTO platform_domain_event (
						id, organization_id, type, source_module, correlation_id,
						actor_user_id, payload, status, attempts
					)
					SELECT ${eventId}, ${record.organizationId},
						'payments.payment_method.created.v1', 'payments',
						${`payment-method:${id}`}, ${record.createdBy},
						${payload}::jsonb, 'pending', 0
					FROM mutated
					RETURNING id
				`,
			]);
			if (rows[0] === undefined) {
				return errorResult.fail("INTERNAL_ERROR");
			}
			const loaded = await loadMethodById(record.organizationId, id);
			if (!loaded.ok) {
				return loaded;
			}
			return loaded.data === null
				? errorResult.fail("INTERNAL_ERROR")
				: errorResult.ok(loaded.data);
		} catch (error) {
			return failFromPersistence(error);
		}
	},

	getPaymentMethodById: loadMethodById,

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
					...(record.name === undefined ? {} : { name: record.name }),
					...(record.instrumentRequirement === undefined
						? {}
						: { instrumentRequirement: record.instrumentRequirement }),
					...(record.allowedInstrumentKinds === undefined
						? {}
						: {
								allowedInstrumentKinds: JSON.stringify(
									record.allowedInstrumentKinds,
								),
							}),
					...(record.allowedAccountKinds === undefined
						? {}
						: {
								allowedAccountKinds: JSON.stringify(record.allowedAccountKinds),
							}),
					...(record.active === undefined ? {} : { active: record.active }),
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
			const method = mapMethod(row);
			const eventType =
				record.active === false
					? "payments.payment_method.deactivated.v1"
					: "payments.payment_method.updated.v1";
			const eventId = randomUUID();
			const payload = methodEventPayload({
				organizationId: method.organizationId,
				paymentMethodId: method.id,
				code: method.code,
				kind: method.kind,
				active: method.active,
				actorUserId: record.updatedBy,
			});
			await afendaDatabase.transaction((sql) => [
				sql`
					INSERT INTO platform_domain_event (
						id, organization_id, type, source_module, correlation_id,
						actor_user_id, payload, status, attempts
					)
					VALUES (
						${eventId}, ${method.organizationId}, ${eventType}, 'payments',
						${`payment-method:${method.id}`}, ${record.updatedBy},
						${payload}::jsonb, 'pending', 0
					)
				`,
			]);
			return errorResult.ok(method);
		} catch (error) {
			return failFromPersistence(error);
		}
	},
};
