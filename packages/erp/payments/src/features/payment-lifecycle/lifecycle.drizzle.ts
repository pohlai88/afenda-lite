import { randomUUID } from "node:crypto";

import {
	database as afendaDatabase,
	and,
	desc,
	eq,
	payment,
	paymentAllocation,
	paymentDeduction,
	paymentReversal,
} from "@afenda/db";
import {
	errorIngress,
	errorProject,
	errorResult,
	type Result,
} from "@afenda/errors";

import type {
	ApplicationFxContext,
	Payment,
	PaymentApplicationInstruction,
	PaymentDeduction,
	PaymentDirection,
	PaymentFxContext,
	PaymentInstrument,
	PaymentMethodSnapshot,
	PaymentPurpose,
	PaymentReversal,
	PaymentStatus,
} from "../../kernel/contracts/domain";
import {
	APPLICATION_STATUSES,
	INSTRUMENT_CLEARANCE_STATUSES,
	PAYMENT_DEDUCTION_EFFECTS,
	PAYMENT_DEDUCTION_KINDS,
	PAYMENT_DIRECTIONS,
	PAYMENT_INSTRUMENT_KINDS,
	PAYMENT_METHOD_KINDS,
	PAYMENT_PURPOSES,
	PAYMENT_STATUSES,
} from "../../kernel/contracts/domain";
import {
	decimal as decimalOf,
	formatDecimal as formatDecimalOf,
} from "../../kernel/money";
import { deriveFunctionalAmount } from "./fx-policy";
import type {
	PaymentCreateRecord,
	PaymentsLifecycleStore,
} from "./lifecycle.store";

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

function parseSnapshot(value: string | null): Record<string, unknown> | null {
	if (value === null || value.trim().length === 0) {
		return null;
	}
	const parsed: unknown = JSON.parse(value);
	if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
		throw new Error("Invalid payment.counterparty_snapshot");
	}
	return parsed as Record<string, unknown>;
}

function mapInstruction(
	row: typeof paymentAllocation.$inferSelect,
): PaymentApplicationInstruction {
	return {
		id: row.id,
		organizationId: row.organizationId,
		paymentId: row.paymentId,
		targetModule: parseEnum(
			row.targetModule,
			["receivables", "payables"] as const,
			"payment_allocation.target_module",
		),
		targetDocumentType: parseEnum(
			row.targetDocumentType,
			[
				"customer_invoice",
				"customer_credit",
				"supplier_invoice",
				"supplier_credit",
			] as const,
			"payment_allocation.target_document_type",
		),
		targetDocumentId: row.targetDocumentId,
		intendedAmount: row.intendedAmount,
		appliedAmount: row.appliedAmount,
		currencyCode: row.currencyCode,
		fx:
			row.fxContext === null || row.fxContext.trim().length === 0
				? null
				: (JSON.parse(row.fxContext) as ApplicationFxContext),
		realizedFx: row.realizedFx,
		status: parseEnum(
			row.status,
			APPLICATION_STATUSES,
			"payment_allocation.status",
		),
		rejectionCode: row.rejectionCode,
		createdBy: row.createdBy,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	};
}

function parseJsonObject(value: string | null, field: string): unknown {
	if (value === null || value.trim().length === 0) {
		return null;
	}
	const parsed: unknown = JSON.parse(value);
	if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
		throw new Error(`Invalid ${field}`);
	}
	return parsed;
}

function mapInstrument(value: string | null): PaymentInstrument | null {
	const parsed = parseJsonObject(value, "payment.instrument");
	if (parsed === null) {
		return null;
	}
	const instrument = parsed as PaymentInstrument;
	parseEnum(
		instrument.kind,
		PAYMENT_INSTRUMENT_KINDS,
		"payment.instrument.kind",
	);
	return instrument;
}

function mapFxContext(value: string | null): PaymentFxContext | null {
	return parseJsonObject(
		value,
		"payment.fx_context",
	) as PaymentFxContext | null;
}

function mapMethodSnapshot(value: string | null): PaymentMethodSnapshot | null {
	const parsed = parseJsonObject(value, "payment.method_snapshot");
	if (parsed === null) {
		return null;
	}
	const snapshot = parsed as PaymentMethodSnapshot;
	parseEnum(
		snapshot.kind,
		PAYMENT_METHOD_KINDS,
		"payment.method_snapshot.kind",
	);
	return snapshot;
}

function mapDeduction(
	row: typeof paymentDeduction.$inferSelect,
): PaymentDeduction {
	return {
		id: row.id,
		paymentId: row.paymentId,
		lineNo: row.lineNo,
		kind: parseEnum(
			row.kind,
			PAYMENT_DEDUCTION_KINDS,
			"payment_deduction.kind",
		),
		effect: parseEnum(
			row.effect,
			PAYMENT_DEDUCTION_EFFECTS,
			"payment_deduction.effect",
		),
		amount: row.amount,
		functionalAmount: row.functionalAmount,
		accountingPurposeCode: row.accountingPurposeCode,
		description: row.description,
		createdBy: row.createdBy,
		createdAt: row.createdAt,
	};
}

function mapReversal(
	row: typeof paymentReversal.$inferSelect,
): PaymentReversal {
	return {
		id: row.id,
		organizationId: row.organizationId,
		paymentId: row.paymentId,
		reason: row.reason,
		reversedBy: row.reversedBy,
		reversedAt: row.reversedAt,
	};
}

function mapPayment(
	row: typeof payment.$inferSelect,
	instructions: PaymentApplicationInstruction[],
	deductions: PaymentDeduction[],
	reversal: PaymentReversal | null,
): Payment {
	return {
		id: row.id,
		organizationId: row.organizationId,
		code: row.code,
		normalizedCode: row.normalizedCode,
		paymentAccountId: row.paymentAccountId,
		paymentMethodId: row.paymentMethodId,
		methodSnapshot: mapMethodSnapshot(row.methodSnapshot),
		instrument: mapInstrument(row.instrument),
		clearanceStatus: parseEnum(
			row.clearanceStatus,
			INSTRUMENT_CLEARANCE_STATUSES,
			"payment.clearance_status",
		),
		clearanceIdempotencyKey: row.clearanceIdempotencyKey,
		fxContext: mapFxContext(row.fxContext),
		functionalAmount: row.functionalAmount,
		deductions,
		direction: parseEnum(
			row.direction,
			PAYMENT_DIRECTIONS,
			"payment.direction",
		),
		purpose: parseEnum(row.purpose, PAYMENT_PURPOSES, "payment.purpose"),
		status: parseEnum(row.status, PAYMENT_STATUSES, "payment.status"),
		counterpartyId: row.counterpartyId,
		counterpartySnapshot: parseSnapshot(row.counterpartySnapshot),
		transferGroupId: row.transferGroupId,
		linkedPaymentId: row.linkedPaymentId,
		originalPaymentId: row.originalPaymentId,
		refundSource:
			row.refundSource === null
				? null
				: parseEnum(
						row.refundSource,
						["customer_payment", "customer_credit", "manual"] as const,
						"payment.refund_source",
					),
		currencyCode: row.currencyCode,
		amount: row.amount,
		reference: row.reference,
		createIdempotencyKey: row.createIdempotencyKey,
		postIdempotencyKey: row.postIdempotencyKey,
		reverseIdempotencyKey: row.reverseIdempotencyKey,
		version: row.version,
		createdBy: row.createdBy,
		updatedBy: row.updatedBy,
		postedAt: row.postedAt,
		postedBy: row.postedBy,
		reversedAt: row.reversedAt,
		reversedBy: row.reversedBy,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
		applicationInstructions: instructions,
		reversal,
	};
}

function instrumentSummary(
	instrument: PaymentInstrument | null,
): { kind: string; reference: string | null } | null {
	if (instrument === null) {
		return null;
	}
	switch (instrument.kind) {
		case "check":
			return { kind: instrument.kind, reference: instrument.number };
		case "bank-transfer":
			return { kind: instrument.kind, reference: instrument.bankReference };
		case "card":
			return {
				kind: instrument.kind,
				reference:
					instrument.settlementReference ??
					instrument.authorizationReference ??
					null,
			};
		case "gateway":
			return { kind: instrument.kind, reference: instrument.providerReference };
		case "other":
			return { kind: instrument.kind, reference: instrument.reference ?? null };
		default:
			throw new Error("Unreachable instrument kind");
	}
}

interface PaymentEventDeductionFact {
	accountingPurposeCode: string;
	amount: string;
	effect: string;
	functionalAmount: string | null;
	kind: string;
}

function negate(value: string): string {
	return value.startsWith("-") ? value.slice(1) : `-${value}`;
}

/** Serialized economic-facts payload for payment.* events. */
function paymentPayload(record: {
	organizationId: string;
	paymentId: string;
	paymentAccountId: string;
	paymentMethodId: string;
	methodSnapshot: PaymentMethodSnapshot | null;
	instrument: PaymentInstrument | null;
	fxContext: PaymentFxContext | null;
	functionalAmount: string;
	deductions: readonly PaymentEventDeductionFact[];
	negateDeductions?: boolean;
	direction: PaymentDirection;
	purpose: PaymentPurpose;
	status: PaymentStatus;
	amount: string;
	currencyCode: string;
	transferGroupId: string | null;
	linkedPaymentId: string | null;
	originalPaymentId: string | null;
	actorUserId: string;
	correlationId: string;
	extra?: Record<string, unknown>;
}): string {
	const cashMovementReduction = record.deductions
		.filter((deduction) => deduction.effect === "reduces_cash_movement")
		.reduce((sum, deduction) => sum + decimalOf(deduction.amount), 0n);
	const deductions = record.deductions.map((deduction) =>
		record.negateDeductions === true
			? {
					...deduction,
					amount: negate(deduction.amount),
					functionalAmount:
						deduction.functionalAmount === null
							? null
							: negate(deduction.functionalAmount),
				}
			: deduction,
	);
	return JSON.stringify({
		organizationId: record.organizationId,
		paymentId: record.paymentId,
		paymentAccountId: record.paymentAccountId,
		paymentMethodId: record.paymentMethodId,
		methodSnapshot: record.methodSnapshot,
		instrument: instrumentSummary(record.instrument),
		fx:
			record.fxContext === null
				? null
				: {
						transactionCurrency: record.fxContext.transactionCurrency,
						functionalCurrency: record.fxContext.functionalCurrency,
						exchangeRate: record.fxContext.exchangeRate,
						rateDate: record.fxContext.rateDate,
						transactionAmount: record.amount,
						functionalAmount: record.functionalAmount,
					},
		functionalAmount: record.functionalAmount,
		cashMovement: formatDecimalOf(
			decimalOf(record.amount) - cashMovementReduction,
		),
		deductions,
		roundingDifferenceFunctionalAmount: null,
		direction: record.direction,
		purpose: record.purpose,
		status: record.status,
		amount: record.amount,
		currencyCode: record.currencyCode,
		transferGroupId: record.transferGroupId,
		linkedPaymentId: record.linkedPaymentId,
		originalPaymentId: record.originalPaymentId,
		actorId: record.actorUserId,
		correlationId: record.correlationId,
		...record.extra,
	});
}

async function getById(
	organizationId: string,
	id: string,
): Promise<Result<Payment | null>> {
	try {
		const [header] = await afendaDatabase.client
			.select()
			.from(payment)
			.where(
				and(eq(payment.organizationId, organizationId), eq(payment.id, id)),
			)
			.limit(1);
		if (header === undefined) {
			return errorResult.ok(null);
		}
		const [instructions, deductions, reversals] = await Promise.all([
			afendaDatabase.client
				.select()
				.from(paymentAllocation)
				.where(
					and(
						eq(paymentAllocation.organizationId, organizationId),
						eq(paymentAllocation.paymentId, id),
					),
				),
			afendaDatabase.client
				.select()
				.from(paymentDeduction)
				.where(
					and(
						eq(paymentDeduction.organizationId, organizationId),
						eq(paymentDeduction.paymentId, id),
					),
				),
			afendaDatabase.client
				.select()
				.from(paymentReversal)
				.where(
					and(
						eq(paymentReversal.organizationId, organizationId),
						eq(paymentReversal.paymentId, id),
					),
				)
				.limit(1),
		]);
		return errorResult.ok(
			mapPayment(
				header,
				instructions.map(mapInstruction),
				deductions
					.map(mapDeduction)
					.sort((left, right) => left.lineNo - right.lineNo),
				reversals[0] === undefined ? null : mapReversal(reversals[0]),
			),
		);
	} catch (error) {
		return failFromPersistence(error, "Failed to load payment");
	}
}

async function reload(
	organizationId: string,
	id: string,
	_message: string,
): Promise<Result<Payment>> {
	const result = await getById(organizationId, id);
	if (!result.ok) {
		return result;
	}
	return result.data === null
		? errorResult.fail("INTERNAL_ERROR")
		: errorResult.ok(result.data);
}

export const drizzlePaymentLifecycleMethods: PaymentsLifecycleStore = {
	async createDraft(record: PaymentCreateRecord): Promise<Result<Payment>> {
		const id = randomUUID();
		const eventId = randomUUID();
		const snapshot =
			record.counterpartySnapshot === null
				? null
				: JSON.stringify(record.counterpartySnapshot);
		const instrumentJson =
			record.instrument === null ? null : JSON.stringify(record.instrument);
		const fxJson =
			record.fxContext === null ? null : JSON.stringify(record.fxContext);
		const methodSnapshotJson =
			record.methodSnapshot === null
				? null
				: JSON.stringify(record.methodSnapshot);
		const clearanceStatus =
			record.instrument !== null &&
			(record.instrument.kind === "check" ||
				record.instrument.kind === "bank-transfer")
				? "pending"
				: "not-applicable";
		const deductionsJson = JSON.stringify(
			record.deductions.map((line) => ({
				lineNo: line.lineNo,
				kind: line.kind,
				effect: line.effect,
				amount: line.amount,
				accountingPurposeCode: line.accountingPurposeCode,
				description: line.description,
			})),
		);
		const payload = paymentPayload({
			organizationId: record.organizationId,
			paymentId: id,
			paymentAccountId: record.paymentAccountId,
			paymentMethodId: record.paymentMethodId,
			methodSnapshot: record.methodSnapshot,
			instrument: record.instrument,
			fxContext: record.fxContext,
			functionalAmount: record.functionalAmount,
			deductions: record.deductions.map((line) => ({
				kind: line.kind,
				effect: line.effect,
				accountingPurposeCode: line.accountingPurposeCode,
				amount: line.amount,
				functionalAmount: null,
			})),
			direction: record.direction,
			purpose: record.purpose,
			status: "draft",
			amount: record.amount,
			currencyCode: record.currencyCode,
			transferGroupId: record.transferGroupId,
			linkedPaymentId: record.linkedPaymentId,
			originalPaymentId: record.originalPaymentId,
			actorUserId: record.actorUserId,
			correlationId: record.correlationId,
		});
		try {
			const [rows] = await afendaDatabase.transaction((sql) => [
				sql`
					WITH account AS (
						SELECT id FROM payment_account
						WHERE id = ${record.paymentAccountId}
							AND organization_id = ${record.organizationId}
							AND active = true
							AND currency_code = ${record.currencyCode}
					),
					mutated AS (
						INSERT INTO payment (
							id, organization_id, code, normalized_code, payment_account_id,
							payment_method_id, method_snapshot, instrument, clearance_status,
							fx_context, functional_amount,
							direction, purpose, status, counterparty_id, counterparty_snapshot,
							transfer_group_id, linked_payment_id, original_payment_id, refund_source,
							currency_code, amount, reference, create_idempotency_key, version,
							created_by, updated_by
						)
						SELECT ${id}, ${record.organizationId}, ${record.code}, ${record.normalizedCode},
							account.id, ${record.paymentMethodId}, ${methodSnapshotJson},
							${instrumentJson}, ${clearanceStatus}, ${fxJson}, ${record.functionalAmount},
							${record.direction}, ${record.purpose}, 'draft',
							${record.counterpartyId}, ${snapshot}, ${record.transferGroupId},
							${record.linkedPaymentId}, ${record.originalPaymentId}, ${record.refundSource},
							${record.currencyCode}, ${record.amount}, ${record.reference},
							${record.createIdempotencyKey}, 1, ${record.actorUserId}, ${record.actorUserId}
						FROM account
						RETURNING id
					),
					deducted AS (
						INSERT INTO payment_deduction (
							id, organization_id, payment_id, line_no, kind, effect, amount,
							functional_amount, accounting_purpose_code, description, created_by
						)
						SELECT gen_random_uuid(), ${record.organizationId}, mutated.id,
							(line->>'lineNo')::int, line->>'kind', line->>'effect', line->>'amount',
							NULL, line->>'accountingPurposeCode', line->>'description',
							${record.actorUserId}
						FROM mutated, jsonb_array_elements(${deductionsJson}::jsonb) AS line
						RETURNING id
					)
					INSERT INTO platform_domain_event (
						id, organization_id, type, source_module, correlation_id, actor_user_id,
						payload, status, attempts
					)
					SELECT ${eventId}, ${record.organizationId}, 'payments.payment.created.v1',
						'payments', ${record.correlationId}, ${record.actorUserId},
						${payload}::jsonb, 'pending', 0
					FROM mutated
					RETURNING id
				`,
			]);
			if (rows[0] === undefined) {
				return errorResult.fail("CONFLICT", {
					publicMessage: "Payment create conflict",
				});
			}
			return reload(record.organizationId, id, "Created payment missing");
		} catch (error) {
			return failFromPersistence(error, "Failed to create payment");
		}
	},

	async post(
		record: Parameters<PaymentsLifecycleStore["post"]>[0],
	): Promise<Result<Payment>> {
		const eventId = randomUUID();
		const current = await getById(record.organizationId, record.paymentId);
		if (!current.ok) {
			return current;
		}
		if (current.data === null) {
			return errorResult.fail("NOT_FOUND", {
				publicMessage: "Payment not found",
			});
		}
		const draft = current.data;
		const methodSnapshotJson = JSON.stringify(record.methodSnapshot);
		const frozenDeductions = draft.deductions.map((deduction) => ({
			...deduction,
			functionalAmount: deriveFunctionalAmount(
				deduction.amount,
				draft.fxContext,
			),
		}));
		const frozenDeductionsJson = JSON.stringify(
			frozenDeductions.map((deduction) => ({
				lineNo: deduction.lineNo,
				functionalAmount: deduction.functionalAmount,
			})),
		);
		const postedPayload = paymentPayload({
			organizationId: record.organizationId,
			paymentId: draft.id,
			paymentAccountId: draft.paymentAccountId,
			paymentMethodId: draft.paymentMethodId,
			methodSnapshot: record.methodSnapshot,
			instrument: draft.instrument,
			fxContext: draft.fxContext,
			functionalAmount: draft.functionalAmount,
			deductions: frozenDeductions,
			direction: draft.direction,
			purpose: draft.purpose,
			status: "posted",
			amount: draft.amount,
			currencyCode: draft.currencyCode,
			transferGroupId: draft.transferGroupId,
			linkedPaymentId: draft.linkedPaymentId,
			originalPaymentId: draft.originalPaymentId,
			actorUserId: record.actorUserId,
			correlationId: record.correlationId,
		});
		try {
			const [rows] = await afendaDatabase.transaction((sql) => [
				sql`
					WITH mutated AS (
						UPDATE payment
						SET status = 'posted',
							posted_at = now(),
							posted_by = ${record.actorUserId},
							post_idempotency_key = ${record.idempotencyKey},
							method_snapshot = ${methodSnapshotJson},
							updated_at = now(),
							updated_by = ${record.actorUserId},
							version = version + 1
						WHERE id = ${record.paymentId}
							AND organization_id = ${record.organizationId}
							AND status = 'draft'
							AND direction <> 'refund'
							AND version = ${record.expectedVersion}
						RETURNING *
					),
					frozen AS (
						UPDATE payment_deduction d
						SET functional_amount = line->>'functionalAmount'
						FROM mutated, jsonb_array_elements(${frozenDeductionsJson}::jsonb) AS line
						WHERE d.payment_id = mutated.id
							AND d.line_no = (line->>'lineNo')::int
					),
					outboxed AS (
						INSERT INTO platform_domain_event (
							id, organization_id, type, source_module, correlation_id,
							actor_user_id, payload, status, attempts
						)
						SELECT ${eventId}, organization_id, 'payments.payment.posted.v1',
							'payments', ${record.correlationId}, ${record.actorUserId},
							${postedPayload}::jsonb, 'pending', 0
						FROM mutated
						RETURNING id
					)
					SELECT mutated.id FROM mutated, outboxed
				`,
			]);
			if (rows[0] === undefined) {
				return errorResult.fail("CONFLICT", {
					publicMessage: "Payment post conflict",
				});
			}
			return reload(
				record.organizationId,
				record.paymentId,
				"Posted payment missing",
			);
		} catch (error) {
			return failFromPersistence(error, "Failed to post payment");
		}
	},

	async reverse(
		record: Parameters<PaymentsLifecycleStore["reverse"]>[0],
	): Promise<Result<Payment>> {
		const reversalId = randomUUID();
		const eventId = randomUUID();
		const current = await getById(record.organizationId, record.paymentId);
		if (!current.ok) {
			return current;
		}
		if (current.data === null) {
			return errorResult.fail("NOT_FOUND", {
				publicMessage: "Payment not found",
			});
		}
		const posted = current.data;
		const reversedPayload = paymentPayload({
			organizationId: record.organizationId,
			paymentId: posted.id,
			paymentAccountId: posted.paymentAccountId,
			paymentMethodId: posted.paymentMethodId,
			methodSnapshot: posted.methodSnapshot,
			instrument: posted.instrument,
			fxContext: posted.fxContext,
			functionalAmount: posted.functionalAmount,
			deductions: posted.deductions,
			negateDeductions: true,
			direction: posted.direction,
			purpose: posted.purpose,
			status: "reversed",
			amount: posted.amount,
			currencyCode: posted.currencyCode,
			transferGroupId: posted.transferGroupId,
			linkedPaymentId: posted.linkedPaymentId,
			originalPaymentId: posted.originalPaymentId,
			actorUserId: record.actorUserId,
			correlationId: record.correlationId,
			extra: { reversalId, reason: record.reason },
		});
		try {
			const [rows] = await afendaDatabase.transaction((sql) => [
				sql`
					WITH mutated AS (
						UPDATE payment
						SET status = 'reversed',
							reversed_at = now(),
							reversed_by = ${record.actorUserId},
							reverse_idempotency_key = ${record.idempotencyKey},
							updated_at = now(),
							updated_by = ${record.actorUserId},
							version = version + 1
						WHERE id = ${record.paymentId}
							AND organization_id = ${record.organizationId}
							AND status = 'posted'
							AND version = ${record.expectedVersion}
						RETURNING *
					),
					reversed AS (
						INSERT INTO payment_reversal (
							id, organization_id, payment_id, reason, reversed_by
						)
						SELECT ${reversalId}, organization_id, id, ${record.reason},
							${record.actorUserId}
						FROM mutated
						RETURNING id
					),
					outboxed AS (
						INSERT INTO platform_domain_event (
							id, organization_id, type, source_module, correlation_id,
							actor_user_id, payload, status, attempts
						)
						SELECT ${eventId}, organization_id, 'payments.payment.reversed.v1',
							'payments', ${record.correlationId}, ${record.actorUserId},
							${reversedPayload}::jsonb, 'pending', 0
						FROM mutated
						RETURNING id
					)
					SELECT mutated.id FROM mutated, reversed, outboxed
				`,
			]);
			if (rows[0] === undefined) {
				return errorResult.fail("CONFLICT", {
					publicMessage: "Payment reversal conflict",
				});
			}
			return reload(
				record.organizationId,
				record.paymentId,
				"Reversed payment missing",
			);
		} catch (error) {
			return failFromPersistence(error, "Failed to reverse payment");
		}
	},

	async createAndPostTransfer(
		record: Parameters<PaymentsLifecycleStore["createAndPostTransfer"]>[0],
	): Promise<Result<{ outgoing: Payment; incoming: Payment }>> {
		if (record.fromPaymentAccountId === record.toPaymentAccountId) {
			return errorResult.fail("CONFLICT", {
				publicMessage: "Transfer accounts must differ",
			});
		}
		const groupId = randomUUID();
		const outgoingId = randomUUID();
		const incomingId = randomUUID();
		const eventId = randomUUID();
		const outgoingCode = `${record.code}-OUT`;
		const incomingCode = `${record.code}-IN`;
		try {
			const [rows] = await afendaDatabase.transaction((sql) => [
				sql`
					WITH from_account AS (
						SELECT id, currency_code FROM payment_account
						WHERE id = ${record.fromPaymentAccountId}
							AND organization_id = ${record.organizationId}
							AND active = true
							AND currency_code = ${record.currencyCode}
					),
					to_account AS (
						SELECT id, currency_code FROM payment_account
						WHERE id = ${record.toPaymentAccountId}
							AND organization_id = ${record.organizationId}
							AND active = true
							AND currency_code = ${record.currencyCode}
							AND id <> ${record.fromPaymentAccountId}
					),
					outgoing AS (
						INSERT INTO payment (
							id, organization_id, code, normalized_code, payment_account_id,
							payment_method_id, method_snapshot, functional_amount,
							direction, purpose, status, currency_code, amount, reference,
							transfer_group_id, linked_payment_id, create_idempotency_key,
							post_idempotency_key, version, created_by, updated_by,
							posted_at, posted_by
						)
						SELECT ${outgoingId}, ${record.organizationId}, ${outgoingCode},
							${`${record.normalizedCode}-OUT`}, from_account.id,
							${record.paymentMethodId}, ${JSON.stringify(record.methodSnapshot)},
							${record.amount}, 'disbursement',
							'internal_transfer', 'posted', ${record.currencyCode}, ${record.amount},
							${record.reference}, ${groupId}, ${incomingId},
							${`${record.idempotencyKey}:out`}, ${record.idempotencyKey}, 1,
							${record.actorUserId}, ${record.actorUserId}, now(), ${record.actorUserId}
						FROM from_account, to_account
						RETURNING id
					),
					incoming AS (
						INSERT INTO payment (
							id, organization_id, code, normalized_code, payment_account_id,
							payment_method_id, method_snapshot, functional_amount,
							direction, purpose, status, currency_code, amount, reference,
							transfer_group_id, linked_payment_id, create_idempotency_key,
							post_idempotency_key, version, created_by, updated_by,
							posted_at, posted_by
						)
						SELECT ${incomingId}, ${record.organizationId}, ${incomingCode},
							${`${record.normalizedCode}-IN`}, to_account.id,
							${record.paymentMethodId}, ${JSON.stringify(record.methodSnapshot)},
							${record.amount}, 'receipt',
							'internal_transfer', 'posted', ${record.currencyCode}, ${record.amount},
							${record.reference}, ${groupId}, ${outgoingId},
							${`${record.idempotencyKey}:in`}, ${record.idempotencyKey}, 1,
							${record.actorUserId}, ${record.actorUserId}, now(), ${record.actorUserId}
						FROM from_account, to_account, outgoing
						RETURNING id
					),
					outboxed AS (
						INSERT INTO platform_domain_event (
							id, organization_id, type, source_module, correlation_id,
							actor_user_id, payload, status, attempts
						)
						SELECT ${eventId}, ${record.organizationId}, 'payments.transfer.posted.v1',
							'payments', ${record.correlationId}, ${record.actorUserId},
							jsonb_build_object(
								'organizationId', ${record.organizationId},
								'transferGroupId', ${groupId},
								'outgoingPaymentId', ${outgoingId},
								'incomingPaymentId', ${incomingId},
								'amount', ${record.amount},
								'currencyCode', ${record.currencyCode},
								'actorId', ${record.actorUserId},
								'correlationId', ${record.correlationId}
							), 'pending', 0
						FROM outgoing, incoming
						RETURNING id
					)
					SELECT outgoing.id FROM outgoing, incoming, outboxed
				`,
			]);
			if (rows[0] === undefined) {
				return errorResult.fail("CONFLICT", {
					publicMessage: "Payment transfer conflict",
				});
			}
			const [outgoing, incoming] = await Promise.all([
				getById(record.organizationId, outgoingId),
				getById(record.organizationId, incomingId),
			]);
			if (!outgoing.ok) {
				return outgoing;
			}
			if (!incoming.ok) {
				return incoming;
			}
			if (outgoing.data === null || incoming.data === null) {
				return errorResult.fail("INTERNAL_ERROR");
			}
			return errorResult.ok({
				outgoing: outgoing.data,
				incoming: incoming.data,
			});
		} catch (error) {
			return failFromPersistence(error, "Failed to create payment transfer");
		}
	},

	async postRefund(
		record: Parameters<PaymentsLifecycleStore["postRefund"]>[0],
	): Promise<Result<Payment>> {
		const id = randomUUID();
		const eventId = randomUUID();
		const instrumentJson =
			record.instrument === null ? null : JSON.stringify(record.instrument);
		const fxJson =
			record.fxContext === null ? null : JSON.stringify(record.fxContext);
		const methodSnapshotJson =
			record.methodSnapshot === null
				? null
				: JSON.stringify(record.methodSnapshot);
		const clearanceStatus =
			record.instrument !== null &&
			(record.instrument.kind === "check" ||
				record.instrument.kind === "bank-transfer")
				? "pending"
				: "not-applicable";
		const refundDeductions = record.deductions.map((line) => ({
			kind: line.kind,
			effect: line.effect,
			accountingPurposeCode: line.accountingPurposeCode,
			amount: line.amount,
			functionalAmount: deriveFunctionalAmount(line.amount, record.fxContext),
		}));
		const deductionsJson = JSON.stringify(
			record.deductions.map((line) => ({
				lineNo: line.lineNo,
				kind: line.kind,
				effect: line.effect,
				amount: line.amount,
				functionalAmount: deriveFunctionalAmount(line.amount, record.fxContext),
				accountingPurposeCode: line.accountingPurposeCode,
				description: line.description,
			})),
		);
		const original = await getById(
			record.organizationId,
			record.originalPaymentId,
		);
		if (!original.ok) {
			return original;
		}
		if (original.data === null) {
			return errorResult.fail("NOT_FOUND", {
				publicMessage: "Original payment not found",
			});
		}
		const refundPayload = paymentPayload({
			organizationId: record.organizationId,
			paymentId: id,
			paymentAccountId: record.paymentAccountId,
			paymentMethodId: record.paymentMethodId,
			methodSnapshot: record.methodSnapshot,
			instrument: record.instrument,
			fxContext: record.fxContext,
			functionalAmount: record.functionalAmount,
			deductions: refundDeductions,
			direction: "refund",
			purpose:
				original.data.direction === "receipt"
					? "customer_refund"
					: "supplier_refund_receipt",
			status: "posted",
			amount: record.amount,
			currencyCode: original.data.currencyCode,
			transferGroupId: null,
			linkedPaymentId: null,
			originalPaymentId: record.originalPaymentId,
			actorUserId: record.actorUserId,
			correlationId: record.correlationId,
			extra: { refundSource: record.refundSource },
		});
		try {
			const [rows] = await afendaDatabase.transaction((sql) => [
				sql`
					WITH original AS (
						SELECT p.*
						FROM payment p
						WHERE p.id = ${record.originalPaymentId}
							AND p.organization_id = ${record.organizationId}
							AND p.status = 'posted'
							AND p.direction <> 'refund'
							AND (
								SELECT COALESCE(SUM(r.amount::numeric), 0)
								FROM payment r
								WHERE r.organization_id = p.organization_id
									AND r.original_payment_id = p.id
									AND r.status = 'posted'
							) + ${record.amount}::numeric <= p.amount::numeric
					),
					account AS (
						SELECT a.id
						FROM payment_account a, original
						WHERE a.id = ${record.paymentAccountId}
							AND a.organization_id = ${record.organizationId}
							AND a.active = true
							AND a.currency_code = original.currency_code
					),
					mutated AS (
						INSERT INTO payment (
							id, organization_id, code, normalized_code, payment_account_id,
							payment_method_id, method_snapshot, instrument, clearance_status,
							fx_context, functional_amount,
							direction, purpose, status, counterparty_id, counterparty_snapshot,
							original_payment_id, refund_source, currency_code, amount, reference,
							create_idempotency_key, post_idempotency_key, version,
							created_by, updated_by, posted_at, posted_by
						)
						SELECT ${id}, original.organization_id, ${record.code}, ${record.normalizedCode},
							account.id, ${record.paymentMethodId}, ${methodSnapshotJson},
							${instrumentJson}, ${clearanceStatus}, ${fxJson},
							${record.functionalAmount}, 'refund',
							CASE WHEN original.direction = 'receipt' THEN 'customer_refund'
								ELSE 'supplier_refund_receipt' END,
							'posted', original.counterparty_id, original.counterparty_snapshot,
							original.id, ${record.refundSource}, original.currency_code,
							${record.amount}, ${record.reference}, ${record.createIdempotencyKey},
							${record.createIdempotencyKey}, 1, ${record.actorUserId},
							${record.actorUserId}, now(), ${record.actorUserId}
						FROM original, account
						RETURNING *
					),
					deducted AS (
						INSERT INTO payment_deduction (
							id, organization_id, payment_id, line_no, kind, effect, amount,
							functional_amount, accounting_purpose_code, description, created_by
						)
						SELECT gen_random_uuid(), ${record.organizationId}, mutated.id,
							(line->>'lineNo')::int, line->>'kind', line->>'effect', line->>'amount',
							line->>'functionalAmount', line->>'accountingPurposeCode',
							line->>'description', ${record.actorUserId}
						FROM mutated, jsonb_array_elements(${deductionsJson}::jsonb) AS line
						RETURNING id
					),
					outboxed AS (
						INSERT INTO platform_domain_event (
							id, organization_id, type, source_module, correlation_id,
							actor_user_id, payload, status, attempts
						)
						SELECT ${eventId}, organization_id, 'payments.refund.posted.v1',
							'payments', ${record.correlationId}, ${record.actorUserId},
							${refundPayload}::jsonb, 'pending', 0
						FROM mutated
						RETURNING id
					)
					SELECT mutated.id FROM mutated, outboxed
				`,
			]);
			if (rows[0] === undefined) {
				return errorResult.fail("CONFLICT", {
					publicMessage: "Refund post conflict",
				});
			}
			return reload(record.organizationId, id, "Posted refund missing");
		} catch (error) {
			return failFromPersistence(error, "Failed to post refund");
		}
	},

	async updateInstrumentClearance(
		record: Parameters<PaymentsLifecycleStore["updateInstrumentClearance"]>[0],
	): Promise<Result<Payment>> {
		const current = await getById(record.organizationId, record.paymentId);
		if (!current.ok) {
			return current;
		}
		if (current.data === null) {
			return errorResult.fail("NOT_FOUND", {
				publicMessage: "Payment not found",
			});
		}
		const existing = current.data;
		if (existing.clearanceIdempotencyKey === record.idempotencyKey) {
			return errorResult.ok(existing);
		}
		if (existing.status !== "posted") {
			return errorResult.fail("CONFLICT", {
				publicMessage:
					"Instrument clearance can only change on posted payments",
			});
		}
		if (
			record.status === "not-applicable" &&
			existing.clearanceStatus !== "not-applicable"
		) {
			return errorResult.fail("CONFLICT", {
				publicMessage: "A clearable instrument cannot return to not-applicable",
			});
		}
		let instrumentJson: string | null =
			existing.instrument === null ? null : JSON.stringify(existing.instrument);
		if (existing.instrument !== null && existing.instrument.kind === "check") {
			instrumentJson = JSON.stringify({
				...existing.instrument,
				...(record.clearanceDate === null
					? {}
					: { clearanceDate: record.clearanceDate }),
				...(record.settlementReference === null
					? {}
					: { bankReference: record.settlementReference }),
			});
		}
		const eventId = randomUUID();
		try {
			const [rows] = await afendaDatabase.transaction((sql) => [
				sql`
					WITH mutated AS (
						UPDATE payment
						SET clearance_status = ${record.status},
							clearance_idempotency_key = ${record.idempotencyKey},
							instrument = ${instrumentJson},
							updated_at = now(),
							updated_by = ${record.actorUserId},
							version = version + 1
						WHERE id = ${record.paymentId}
							AND organization_id = ${record.organizationId}
							AND status = 'posted'
							AND version = ${record.expectedVersion}
						RETURNING *
					)
					INSERT INTO platform_domain_event (
						id, organization_id, type, source_module, correlation_id,
						actor_user_id, payload, status, attempts
					)
					SELECT ${eventId}, organization_id,
						'payments.payment.instrument_clearance_updated.v1',
						'payments', ${record.correlationId}, ${record.actorUserId},
						jsonb_build_object(
							'organizationId', organization_id,
							'paymentId', id,
							'status', ${record.status},
							'clearanceDate', ${record.clearanceDate},
							'settlementReference', ${record.settlementReference},
							'reason', ${record.reason},
							'actorId', ${record.actorUserId},
							'correlationId', ${record.correlationId}
						), 'pending', 0
					FROM mutated
					RETURNING id
				`,
			]);
			if (rows[0] === undefined) {
				return errorResult.fail("CONFLICT", {
					publicMessage: "Instrument clearance conflict",
				});
			}
			return reload(
				record.organizationId,
				record.paymentId,
				"Cleared payment missing",
			);
		} catch (error) {
			return failFromPersistence(
				error,
				"Failed to update instrument clearance",
			);
		}
	},

	getById,

	async list(
		filter: Parameters<PaymentsLifecycleStore["list"]>[0],
	): Promise<Result<Payment[]>> {
		try {
			const conditions = [eq(payment.organizationId, filter.organizationId)];
			if (filter.status !== undefined) {
				conditions.push(eq(payment.status, filter.status));
			}
			if (filter.direction !== undefined) {
				conditions.push(eq(payment.direction, filter.direction));
			}
			const headers = await afendaDatabase.client
				.select()
				.from(payment)
				.where(and(...conditions))
				.orderBy(desc(payment.updatedAt), desc(payment.id))
				.limit(filter.pageSize)
				.offset((filter.page - 1) * filter.pageSize);
			const results = await Promise.all(
				headers.map((row) => getById(filter.organizationId, row.id)),
			);
			const payments: Payment[] = [];
			for (const result of results) {
				if (!result.ok) {
					return result;
				}
				if (result.data === null) {
					return errorResult.fail("INTERNAL_ERROR");
				}
				payments.push(result.data);
			}
			return errorResult.ok(payments);
		} catch (error) {
			return failFromPersistence(error, "Failed to list payments");
		}
	},
};
