import { randomUUID } from "node:crypto";
import { audit as afendaAudit } from "@afenda/audit";
import {
	database as afendaDatabase,
	and,
	asc,
	sql as drizzleSql,
	eq,
	type NeonHttpSql,
	salesOrder,
	salesOrderHold,
	salesOrderLine,
	salesOrderSchedule,
	salesPriceBook,
	salesPriceBookEntry,
	salesQuotation,
	salesQuotationLine,
	salesReturnAuthorization,
	salesReturnAuthorizationLine,
} from "@afenda/db";
import {
	errorIngress,
	errorProject,
	errorResult,
	type Result,
} from "@afenda/errors";

const SQL_IDENTIFIER_PATTERN = /^[a-z_]+$/u;

import {
	itemIdSchema,
	partyIdSchema,
	paymentTermIdSchema,
} from "@afenda/master-data";
import { z } from "zod";
import type {
	PriceBook,
	PriceBookEntry,
	ReturnAuthorization,
	ReturnAuthorizationLine,
	SalesHold,
	SalesOrder,
	SalesOrderLine,
	SalesOrderSchedule,
	SalesQuotation,
	SalesQuotationLine,
} from "../../kernel/contracts/domain";
import { addDecimals } from "../../kernel/contracts/money";
import type {
	MutationEvidence,
	SalesStore,
} from "../../kernel/contracts/ports";
import {
	priceBookEntryIdSchema,
	priceBookIdSchema,
	returnAuthorizationIdSchema,
	returnAuthorizationLineIdSchema,
	salesHoldIdSchema,
	salesOrderIdSchema,
	salesOrderLineIdSchema,
	salesOrderScheduleIdSchema,
	salesQuotationIdSchema,
	salesQuotationLineIdSchema,
} from "../../kernel/identity/brands";

function failFromPersistence(error: unknown, _fallbackMessage: string) {
	return errorProject.result(
		errorIngress.postgres(error, { operation: "persistence.postgres" }),
	);
}

type EvidenceSeed = Omit<MutationEvidence, "entityId" | "version">;
type SqlValue = string | number | boolean | Date | null;
const partySnapshotSchema = z.object({
	partyId: partyIdSchema,
	code: z.string(),
	name: z.string(),
	billToAddress: z.string().optional(),
	shipToAddress: z.string().optional(),
	paymentTermId: paymentTermIdSchema.optional(),
	paymentTermCode: z.string().optional(),
	paymentTermName: z.string().optional(),
	netDays: z.number().int().optional(),
});
const itemSnapshotSchema = z.object({
	itemId: itemIdSchema,
	code: z.string(),
	name: z.string(),
	baseUomId: z.string(),
	baseUomCode: z.string(),
});
const traceSchema = z.object({
	priceBookId: priceBookIdSchema,
	priceBookEntryId: priceBookEntryIdSchema,
	baseUnitPrice: z.string(),
	discountPercent: z.string(),
	netUnitPrice: z.string(),
	quantity: z.string(),
	lineNetAmount: z.string(),
	override: z
		.object({
			unitPrice: z.string(),
			reason: z.string(),
			approvedBy: z.string(),
		})
		.optional(),
});

function auditStamp(row: {
	version: number;
	createdAt: Date;
	createdBy: string;
	updatedAt: Date;
	updatedBy: string;
}) {
	return {
		version: row.version,
		createdAt: row.createdAt,
		createdBy: row.createdBy,
		updatedAt: row.updatedAt,
		updatedBy: row.updatedBy,
	};
}
function mapBook(row: typeof salesPriceBook.$inferSelect): PriceBook {
	return {
		id: priceBookIdSchema.parse(row.id),
		organizationId: row.organizationId,
		code: row.code,
		normalizedCode: row.normalizedCode,
		name: row.name,
		currencyCode: row.currencyCode,
		validFrom: row.validFrom,
		validTo: row.validTo ?? undefined,
		priority: row.priority,
		status: z
			.enum(["draft", "active", "inactive", "archived"])
			.parse(row.status),
		...auditStamp(row),
	};
}
function mapEntry(
	row: typeof salesPriceBookEntry.$inferSelect,
): PriceBookEntry {
	return {
		id: priceBookEntryIdSchema.parse(row.id),
		organizationId: row.organizationId,
		priceBookId: priceBookIdSchema.parse(row.priceBookId),
		itemId: itemIdSchema.parse(row.itemId),
		uomId: row.uomId,
		minimumQuantity: row.minimumQuantity,
		unitPrice: row.unitPrice,
		discountPercent: row.discountPercent,
		validFrom: row.validFrom,
		validTo: row.validTo ?? undefined,
		...auditStamp(row),
	};
}
function mapQuotation(row: typeof salesQuotation.$inferSelect): SalesQuotation {
	const customer = partySnapshotSchema.parse(row.customerSnapshot);
	return {
		id: salesQuotationIdSchema.parse(row.id),
		organizationId: row.organizationId,
		code: row.code,
		normalizedCode: row.normalizedCode,
		revision: row.revision,
		status: z
			.enum([
				"draft",
				"submitted",
				"approved",
				"sent",
				"accepted",
				"expired",
				"rejected",
				"cancelled",
				"converted",
			])
			.parse(row.status),
		customer,
		currencyCode: row.currencyCode,
		validUntil: row.validUntil,
		subtotalAmount: row.subtotalAmount,
		discountTotal: row.discountTotal,
		taxTotal: row.taxTotal,
		documentTotal: row.documentTotal,
		convertedOrderId: row.convertedOrderId
			? salesOrderIdSchema.parse(row.convertedOrderId)
			: undefined,
		...auditStamp(row),
	};
}
function mapQuotationLine(
	row: typeof salesQuotationLine.$inferSelect,
): SalesQuotationLine {
	return {
		id: salesQuotationLineIdSchema.parse(row.id),
		organizationId: row.organizationId,
		quotationId: salesQuotationIdSchema.parse(row.quotationId),
		lineNo: row.lineNo,
		item: itemSnapshotSchema.parse(row.itemSnapshot),
		quantity: row.quantity,
		unitPrice: row.unitPrice,
		discountAmount: row.discountAmount,
		taxAmount: row.taxAmount,
		lineAmount: row.lineAmount,
		pricingTrace: row.pricingTrace
			? traceSchema.parse(row.pricingTrace)
			: undefined,
		...auditStamp(row),
	};
}
function mapOrder(row: typeof salesOrder.$inferSelect): SalesOrder {
	return {
		id: salesOrderIdSchema.parse(row.id),
		organizationId: row.organizationId,
		code: row.code,
		normalizedCode: row.normalizedCode,
		status: z
			.enum([
				"draft",
				"submitted",
				"approved",
				"confirmed",
				"released",
				"partially_fulfilled",
				"fulfilled",
				"cancelled",
				"closed",
			])
			.parse(row.status),
		customer: partySnapshotSchema.parse(row.customerSnapshot),
		currencyCode: row.currencyCode,
		exchangeRate: row.exchangeRate ?? undefined,
		subtotalAmount: row.subtotalAmount,
		discountTotal: row.discountTotal,
		taxTotal: row.taxTotal,
		documentTotal: row.documentTotal,
		sourceQuotationId: row.sourceQuotationId
			? salesQuotationIdSchema.parse(row.sourceQuotationId)
			: undefined,
		confirmedAt: row.confirmedAt ?? undefined,
		releasedAt: row.releasedAt ?? undefined,
		cancelledAt: row.cancelledAt ?? undefined,
		closedAt: row.closedAt ?? undefined,
		...auditStamp(row),
	};
}
function mapOrderLine(row: typeof salesOrderLine.$inferSelect): SalesOrderLine {
	return {
		id: salesOrderLineIdSchema.parse(row.id),
		organizationId: row.organizationId,
		orderId: salesOrderIdSchema.parse(row.orderId),
		lineNo: row.lineNo,
		item: itemSnapshotSchema.parse(row.itemSnapshot),
		quantity: row.quantity,
		fulfilledQuantity: row.fulfilledQuantity,
		unitPrice: row.unitPrice,
		discountAmount: row.discountAmount,
		taxAmount: row.taxAmount,
		lineAmount: row.lineAmount,
		pricingTrace: row.pricingTrace
			? traceSchema.parse(row.pricingTrace)
			: undefined,
		...auditStamp(row),
	};
}
function mapSchedule(
	row: typeof salesOrderSchedule.$inferSelect,
): SalesOrderSchedule {
	return {
		id: salesOrderScheduleIdSchema.parse(row.id),
		organizationId: row.organizationId,
		orderId: salesOrderIdSchema.parse(row.orderId),
		orderLineId: salesOrderLineIdSchema.parse(row.orderLineId),
		requestedDate: row.requestedDate,
		promisedDate: row.promisedDate ?? undefined,
		quantity: row.quantity,
		releasedQuantity: row.releasedQuantity,
		fulfilledQuantity: row.fulfilledQuantity,
		...auditStamp(row),
	};
}
function mapHold(row: typeof salesOrderHold.$inferSelect): SalesHold {
	return {
		id: salesHoldIdSchema.parse(row.id),
		organizationId: row.organizationId,
		orderId: salesOrderIdSchema.parse(row.orderId),
		kind: z
			.enum([
				"credit",
				"availability",
				"pricing_margin",
				"compliance",
				"manual_review",
			])
			.parse(row.kind),
		reason: row.reason,
		status: z.enum(["open", "resolved"]).parse(row.status),
		resolvedAt: row.resolvedAt ?? undefined,
		resolvedBy: row.resolvedBy ?? undefined,
		...auditStamp(row),
	};
}
function mapReturn(
	row: typeof salesReturnAuthorization.$inferSelect,
): ReturnAuthorization {
	return {
		id: returnAuthorizationIdSchema.parse(row.id),
		organizationId: row.organizationId,
		code: row.code,
		normalizedCode: row.normalizedCode,
		orderId: salesOrderIdSchema.parse(row.orderId),
		status: z
			.enum([
				"draft",
				"submitted",
				"approved",
				"rejected",
				"cancelled",
				"closed",
			])
			.parse(row.status),
		reason: row.reason,
		...auditStamp(row),
	};
}
function mapReturnLine(
	row: typeof salesReturnAuthorizationLine.$inferSelect,
): ReturnAuthorizationLine {
	return {
		id: returnAuthorizationLineIdSchema.parse(row.id),
		organizationId: row.organizationId,
		returnAuthorizationId: returnAuthorizationIdSchema.parse(
			row.returnAuthorizationId,
		),
		orderLineId: salesOrderLineIdSchema.parse(row.orderLineId),
		quantity: row.quantity,
		reason: row.reason,
		requestedDisposition: z
			.enum(["refund", "replacement", "repair", "reject"])
			.parse(row.requestedDisposition),
		...auditStamp(row),
	};
}

function quoteIdentifier(identifier: string): string {
	if (!SQL_IDENTIFIER_PATTERN.test(identifier)) {
		throw new Error("Invalid internal SQL identifier");
	}
	return `"${identifier}"`;
}
function mutationQueries(
	sql: NeonHttpSql,
	statement: string,
	values: readonly SqlValue[],
	evidence: EvidenceSeed,
	entityId: string,
	version: number,
) {
	const auditInsert = afendaAudit.transaction.buildInsert({
		sql,
		input: {
			organizationId: evidence.organizationId,
			actorUserId: evidence.actorUserId,
			correlationId: evidence.correlationId,
			module: "sales",
			entity: evidence.entityType,
			entityId,
			action: evidence.action,
			changes: [],
		},
	});
	if (!auditInsert.ok) {
		throw new TypeError(`Invalid Sales audit evidence: ${auditInsert.code}`);
	}

	const payload = JSON.stringify({
		organizationId: evidence.organizationId,
		entityType: evidence.entityType,
		entityId,
		code: evidence.code,
		version,
		actorId: evidence.actorUserId,
		correlationId: evidence.correlationId,
	});
	return [
		sql.query(statement, [...values]),
		auditInsert.data,
		sql.query(
			"INSERT INTO platform_domain_event (organization_id,type,source_module,deduplication_key,correlation_id,actor_user_id,payload) VALUES ($1,$2,'sales',$3,$4,$5,$6::jsonb)",
			[
				evidence.organizationId,
				evidence.eventType,
				evidence.idempotencyKey,
				evidence.correlationId,
				evidence.actorUserId,
				payload,
			],
		),
	];
}
async function atomicInsert(
	table: string,
	values: Record<string, SqlValue>,
	evidence: EvidenceSeed,
	entityId: string,
	version = 1,
): Promise<Result<void>> {
	const columns = Object.keys(values);
	const params = Object.values(values);
	const placeholders = params.map((_, index) => `$${index + 1}`).join(",");
	const statement = `INSERT INTO ${quoteIdentifier(table)} (${columns.map(quoteIdentifier).join(",")}) VALUES (${placeholders})`;
	try {
		await afendaDatabase.transaction((sql) =>
			mutationQueries(sql, statement, params, evidence, entityId, version),
		);
		return errorResult.ok(undefined);
	} catch (error) {
		return failFromPersistence(error, "Could not persist Sales mutation");
	}
}
async function atomicUpdate(
	table: string,
	id: string,
	org: string,
	expectedVersion: number,
	values: Record<string, SqlValue>,
	evidence: EvidenceSeed,
): Promise<Result<void>> {
	const columns = Object.keys(values);
	const params = Object.values(values);
	const assignments = columns
		.map((column, index) => `${quoteIdentifier(column)}=$${index + 1}`)
		.join(",");
	const statement = `UPDATE ${quoteIdentifier(table)} SET ${assignments}, version=version+1, updated_at=now() WHERE organization_id=$${params.length + 1} AND id=$${params.length + 2}::uuid AND version=$${params.length + 3}`;
	try {
		await afendaDatabase.transaction((sql) => [
			sql.query(
				`SELECT 1/(SELECT count(*)::int FROM ${quoteIdentifier(table)} WHERE organization_id=$1 AND id=$2::uuid AND version=$3)`,
				[org, id, expectedVersion],
			),
			...mutationQueries(
				sql,
				statement,
				[...params, org, id, expectedVersion],
				evidence,
				id,
				expectedVersion + 1,
			),
		]);
		return errorResult.ok(undefined);
	} catch (error) {
		return failFromPersistence(
			error,
			"Could not persist versioned Sales mutation",
		);
	}
}

export class DrizzleSalesStore implements SalesStore {
	async createPriceBook(
		input: Parameters<SalesStore["createPriceBook"]>[0],
		evidence: EvidenceSeed,
	) {
		const id = priceBookIdSchema.parse(randomUUID());
		const written = await atomicInsert(
			"sales_price_book",
			{
				id,
				organization_id: input.organizationId,
				code: input.code,
				normalized_code: input.normalizedCode,
				name: input.name,
				currency_code: input.currencyCode,
				valid_from: input.validFrom,
				valid_to: input.validTo ?? null,
				priority: input.priority,
				status: input.status,
				create_idempotency_key: input.idempotencyKey,
				created_by: input.actorUserId,
				updated_by: input.actorUserId,
			},
			evidence,
			id,
		);
		if (!written.ok) {
			return written;
		}
		return this.getBookRequired(input.organizationId, id);
	}
	async addPriceBookEntry(
		input: Parameters<SalesStore["addPriceBookEntry"]>[0],
		evidence: EvidenceSeed,
	) {
		const id = priceBookEntryIdSchema.parse(randomUUID());
		const written = await atomicInsert(
			"sales_price_book_entry",
			{
				id,
				organization_id: input.organizationId,
				price_book_id: input.priceBookId,
				item_id: input.itemId,
				uom_id: input.uomId,
				minimum_quantity: input.minimumQuantity,
				unit_price: input.unitPrice,
				discount_percent: input.discountPercent,
				valid_from: input.validFrom,
				valid_to: input.validTo ?? null,
				create_idempotency_key: input.idempotencyKey,
				created_by: input.actorUserId,
				updated_by: input.actorUserId,
			},
			evidence,
			id,
		);
		if (!written.ok) {
			return written;
		}
		const rows = await afendaDatabase.client
			.select()
			.from(salesPriceBookEntry)
			.where(
				and(
					eq(salesPriceBookEntry.organizationId, input.organizationId),
					eq(salesPriceBookEntry.id, id),
				),
			)
			.limit(1);
		return rows[0]
			? errorResult.ok(mapEntry(rows[0]))
			: errorResult.fail("INTERNAL_ERROR");
	}
	async getPriceBook(input: Parameters<SalesStore["getPriceBook"]>[0]) {
		const rows = await afendaDatabase.client
			.select()
			.from(salesPriceBook)
			.where(
				and(
					eq(salesPriceBook.organizationId, input.organizationId),
					eq(salesPriceBook.id, input.id),
				),
			)
			.limit(1);
		return errorResult.ok(rows[0] ? mapBook(rows[0]) : null);
	}
	async listPriceBooks(input: Parameters<SalesStore["listPriceBooks"]>[0]) {
		const conditions = [
			eq(salesPriceBook.organizationId, input.organizationId),
		];
		if (input.cursor) {
			conditions.push(drizzleSql`${salesPriceBook.id} > ${input.cursor}`);
		}
		const rows = await afendaDatabase.client
			.select()
			.from(salesPriceBook)
			.where(and(...conditions))
			.orderBy(asc(salesPriceBook.id))
			.limit(input.pageSize + 1);
		const hasNext = rows.length > input.pageSize;
		const items = rows.slice(0, input.pageSize).map(mapBook);
		return errorResult.ok({
			items,
			nextCursor: hasNext ? items.at(-1)?.id : undefined,
		});
	}
	async updatePriceBookStatus(
		input: Parameters<SalesStore["updatePriceBookStatus"]>[0],
		evidence: EvidenceSeed,
	) {
		const written = await atomicUpdate(
			"sales_price_book",
			input.id,
			input.organizationId,
			input.expectedVersion,
			{ status: input.status, updated_by: input.actorUserId },
			evidence,
		);
		if (!written.ok) {
			return written;
		}
		return this.getBookRequired(input.organizationId, input.id);
	}
	async findPriceEntries(input: Parameters<SalesStore["findPriceEntries"]>[0]) {
		const rows = await afendaDatabase.client
			.select({ book: salesPriceBook, entry: salesPriceBookEntry })
			.from(salesPriceBookEntry)
			.innerJoin(
				salesPriceBook,
				and(
					eq(salesPriceBook.organizationId, salesPriceBookEntry.organizationId),
					eq(salesPriceBook.id, salesPriceBookEntry.priceBookId),
				),
			)
			.where(
				and(
					eq(salesPriceBookEntry.organizationId, input.organizationId),
					eq(salesPriceBookEntry.itemId, input.itemId),
					eq(salesPriceBookEntry.uomId, input.uomId),
					eq(salesPriceBook.currencyCode, input.currencyCode),
					eq(salesPriceBook.status, "active"),
				),
			)
			.orderBy(asc(salesPriceBook.priority));
		return errorResult.ok(
			rows
				.filter(
					({ book, entry }) =>
						book.validFrom <= input.at &&
						(!book.validTo || book.validTo >= input.at) &&
						entry.validFrom <= input.at &&
						(!entry.validTo || entry.validTo >= input.at) &&
						Number(entry.minimumQuantity) <= Number(input.quantity),
				)
				.map(({ book, entry }) => ({
					book: mapBook(book),
					entry: mapEntry(entry),
				})),
		);
	}

	async createQuotation(
		input: Parameters<SalesStore["createQuotation"]>[0],
		evidence: EvidenceSeed,
	) {
		const id = salesQuotationIdSchema.parse(randomUUID());
		const written = await atomicInsert(
			"sales_quotation",
			{
				id,
				organization_id: input.organizationId,
				code: input.code,
				normalized_code: input.normalizedCode,
				revision: input.revision,
				status: input.status,
				party_id: input.customer.partyId,
				payment_term_id: input.customer.paymentTermId ?? null,
				customer_snapshot: JSON.stringify(input.customer),
				currency_code: input.currencyCode,
				valid_until: input.validUntil,
				subtotal_amount: input.subtotalAmount,
				discount_total: input.discountTotal,
				tax_total: input.taxTotal,
				document_total: input.documentTotal,
				create_idempotency_key: input.idempotencyKey,
				created_by: input.actorUserId,
				updated_by: input.actorUserId,
			},
			evidence,
			id,
		);
		if (!written.ok) {
			return written;
		}
		return this.getQuotationRequired(input.organizationId, id);
	}
	async addQuotationLine(
		input: Parameters<SalesStore["addQuotationLine"]>[0],
		evidence: EvidenceSeed,
	): Promise<Result<SalesQuotationLine>> {
		const id = salesQuotationLineIdSchema.parse(randomUUID());
		try {
			await afendaDatabase.transaction((sql) => [
				sql.query(
					"SELECT 1/(SELECT count(*)::int FROM sales_quotation WHERE organization_id=$1 AND id=$2::uuid AND version=$3 AND status='draft')",
					[input.organizationId, input.quotationId, input.expectedVersion],
				),
				sql.query(
					"INSERT INTO sales_quotation_line (id,organization_id,quotation_id,line_no,item_id,item_snapshot,quantity,unit_price,discount_amount,tax_amount,line_amount,pricing_trace,create_idempotency_key,created_by,updated_by) VALUES ($1::uuid,$2,$3::uuid,(SELECT count(*)+1 FROM sales_quotation_line WHERE organization_id=$2 AND quotation_id=$3::uuid),$4::uuid,$5::jsonb,$6,$7,$8,$9,$10,$11::jsonb,$12,$13,$13)",
					[
						id,
						input.organizationId,
						input.quotationId,
						input.item.itemId,
						JSON.stringify(input.item),
						input.quantity,
						input.unitPrice,
						input.discountAmount,
						input.taxAmount,
						input.lineAmount,
						input.pricingTrace ? JSON.stringify(input.pricingTrace) : null,
						input.idempotencyKey,
						input.actorUserId,
					],
				),
				sql.query(
					"UPDATE sales_quotation q SET subtotal_amount=t.subtotal,discount_total=t.discount,tax_total=t.tax,document_total=t.subtotal,version=version+1,updated_at=now(),updated_by=$4 FROM (SELECT coalesce(sum(line_amount),0) AS subtotal,coalesce(sum(discount_amount),0) AS discount,coalesce(sum(tax_amount),0) AS tax FROM sales_quotation_line WHERE organization_id=$1 AND quotation_id=$2::uuid) t WHERE q.organization_id=$1 AND q.id=$2::uuid AND q.version=$3",
					[
						input.organizationId,
						input.quotationId,
						input.expectedVersion,
						input.actorUserId,
					],
				),
				...mutationQueries(sql, "SELECT 1", [], evidence, id, 1).slice(1),
			]);
		} catch (error) {
			return failFromPersistence(error, "Could not persist quotation line");
		}
		const rows = await afendaDatabase.client
			.select()
			.from(salesQuotationLine)
			.where(
				and(
					eq(salesQuotationLine.organizationId, input.organizationId),
					eq(salesQuotationLine.id, id),
				),
			)
			.limit(1);
		return rows[0]
			? errorResult.ok(mapQuotationLine(rows[0]))
			: errorResult.fail("INTERNAL_ERROR");
	}
	async transitionQuotation(
		input: Parameters<SalesStore["transitionQuotation"]>[0],
		evidence: EvidenceSeed,
	) {
		const written = await atomicUpdate(
			"sales_quotation",
			input.id,
			input.organizationId,
			input.expectedVersion,
			{
				status: input.status,
				converted_order_id: input.convertedOrderId ?? null,
				updated_by: input.actorUserId,
			},
			evidence,
		);
		if (!written.ok) {
			return written;
		}
		return this.getQuotationRequired(input.organizationId, input.id);
	}
	async getQuotation(input: Parameters<SalesStore["getQuotation"]>[0]) {
		const rows = await afendaDatabase.client
			.select()
			.from(salesQuotation)
			.where(
				and(
					eq(salesQuotation.organizationId, input.organizationId),
					eq(salesQuotation.id, input.id),
				),
			)
			.limit(1);
		return errorResult.ok(rows[0] ? mapQuotation(rows[0]) : null);
	}
	async listQuotationLines(
		input: Parameters<SalesStore["listQuotationLines"]>[0],
	) {
		const rows = await afendaDatabase.client
			.select()
			.from(salesQuotationLine)
			.where(
				and(
					eq(salesQuotationLine.organizationId, input.organizationId),
					eq(salesQuotationLine.quotationId, input.quotationId),
				),
			)
			.orderBy(asc(salesQuotationLine.lineNo));
		return errorResult.ok(rows.map(mapQuotationLine));
	}

	async listQuotations(input: Parameters<SalesStore["listQuotations"]>[0]) {
		const conditions = [
			eq(salesQuotation.organizationId, input.organizationId),
		];
		if (input.cursor) {
			conditions.push(drizzleSql`${salesQuotation.id} > ${input.cursor}`);
		}
		const rows = await afendaDatabase.client
			.select()
			.from(salesQuotation)
			.where(and(...conditions))
			.orderBy(asc(salesQuotation.id))
			.limit(input.pageSize + 1);
		const hasNext = rows.length > input.pageSize;
		const items = rows.slice(0, input.pageSize).map(mapQuotation);
		return errorResult.ok({
			items,
			nextCursor: hasNext ? items.at(-1)?.id : undefined,
		});
	}
	async createOrder(
		input: Parameters<SalesStore["createOrder"]>[0],
		evidence: EvidenceSeed,
	) {
		const id = salesOrderIdSchema.parse(randomUUID());
		const written = await atomicInsert(
			"sales_order",
			{
				id,
				organization_id: input.organizationId,
				code: input.code,
				normalized_code: input.normalizedCode,
				status: input.status,
				party_id: input.customer.partyId,
				payment_term_id: input.customer.paymentTermId ?? null,
				customer_snapshot: JSON.stringify(input.customer),
				currency_code: input.currencyCode,
				exchange_rate: input.exchangeRate ?? null,
				subtotal_amount: input.subtotalAmount,
				discount_total: input.discountTotal,
				tax_total: input.taxTotal,
				document_total: input.documentTotal,
				source_quotation_id: input.sourceQuotationId ?? null,
				create_idempotency_key: input.idempotencyKey,
				created_by: input.actorUserId,
				updated_by: input.actorUserId,
			},
			evidence,
			id,
		);
		if (!written.ok) {
			return written;
		}
		return this.getOrderRequired(input.organizationId, id);
	}
	async addOrderLine(
		input: Parameters<SalesStore["addOrderLine"]>[0],
		schedule: { requestedDate: Date },
		evidence: EvidenceSeed,
	): Promise<Result<SalesOrderLine>> {
		const existing = await this.listOrderLines({
			organizationId: input.organizationId,
			orderId: input.orderId,
		});
		const id = salesOrderLineIdSchema.parse(randomUUID());
		const scheduleId = salesOrderScheduleIdSchema.parse(randomUUID());
		try {
			await afendaDatabase.transaction((sql) => [
				sql.query(
					"SELECT 1/(SELECT count(*)::int FROM sales_order WHERE organization_id=$1 AND id=$2::uuid AND version=$3 AND status='draft')",
					[input.organizationId, input.orderId, input.expectedVersion],
				),
				sql.query(
					"INSERT INTO sales_order_line (id,organization_id,order_id,line_no,item_id,item_snapshot,quantity,fulfilled_quantity,unit_price,discount_amount,tax_amount,line_amount,pricing_trace,create_idempotency_key,created_by,updated_by) VALUES ($1::uuid,$2,$3::uuid,$4,$5::uuid,$6::jsonb,$7,$8,$9,$10,$11,$12,$13::jsonb,$14,$15,$15)",
					[
						id,
						input.organizationId,
						input.orderId,
						existing.data.length + 1,
						input.item.itemId,
						JSON.stringify(input.item),
						input.quantity,
						input.fulfilledQuantity,
						input.unitPrice,
						input.discountAmount,
						input.taxAmount,
						input.lineAmount,
						input.pricingTrace ? JSON.stringify(input.pricingTrace) : null,
						input.idempotencyKey,
						input.actorUserId,
					],
				),
				sql.query(
					"INSERT INTO sales_order_schedule (id,organization_id,order_id,order_line_id,requested_date,quantity,released_quantity,fulfilled_quantity,created_by,updated_by) VALUES ($1::uuid,$2,$3::uuid,$4::uuid,$5,$6,0,0,$7,$7)",
					[
						scheduleId,
						input.organizationId,
						input.orderId,
						id,
						schedule.requestedDate,
						input.quantity,
						input.actorUserId,
					],
				),
				sql.query(
					"UPDATE sales_order SET subtotal_amount=(SELECT COALESCE(sum(line_amount),0) FROM sales_order_line WHERE organization_id=$1 AND order_id=$2::uuid),discount_total=(SELECT COALESCE(sum(discount_amount),0) FROM sales_order_line WHERE organization_id=$1 AND order_id=$2::uuid),document_total=(SELECT COALESCE(sum(line_amount),0) FROM sales_order_line WHERE organization_id=$1 AND order_id=$2::uuid)+tax_total,version=version+1,updated_by=$3,updated_at=now() WHERE organization_id=$1 AND id=$2::uuid AND version=$4",
					[
						input.organizationId,
						input.orderId,
						input.actorUserId,
						input.expectedVersion,
					],
				),
				...mutationQueries(sql, "SELECT 1", [], evidence, id, 1).slice(1),
			]);
		} catch (error) {
			return failFromPersistence(
				error,
				"Could not add sales-order line atomically",
			);
		}
		const rows = await afendaDatabase.client
			.select()
			.from(salesOrderLine)
			.where(
				and(
					eq(salesOrderLine.organizationId, input.organizationId),
					eq(salesOrderLine.id, id),
				),
			)
			.limit(1);
		return rows[0]
			? errorResult.ok(mapOrderLine(rows[0]))
			: errorResult.fail("INTERNAL_ERROR");
	}
	async transitionOrder(
		input: Parameters<SalesStore["transitionOrder"]>[0],
		evidence: EvidenceSeed,
	) {
		const values: Record<string, SqlValue> = {
			status: input.status,
			updated_by: input.actorUserId,
		};
		if (input.status === "confirmed") {
			values.confirmed_at = input.at;
		}
		if (input.status === "released") {
			values.released_at = input.at;
		}
		if (input.status === "cancelled") {
			values.cancelled_at = input.at;
		}
		if (input.status === "closed") {
			values.closed_at = input.at;
		}
		const written = await atomicUpdate(
			"sales_order",
			input.id,
			input.organizationId,
			input.expectedVersion,
			values,
			evidence,
		);
		if (!written.ok) {
			return written;
		}
		return this.getOrderRequired(input.organizationId, input.id);
	}
	async releaseOrder(
		input: Parameters<SalesStore["releaseOrder"]>[0],
		evidence: EvidenceSeed,
	): Promise<Result<SalesOrder>> {
		const lines = await this.listOrderLines({
			organizationId: input.organizationId,
			orderId: input.id,
		});
		const subtotal = await addDecimals(
			lines.data.map((line) => line.lineAmount),
		);
		if (!subtotal.ok) {
			return subtotal;
		}
		const discount = await addDecimals(
			lines.data.map((line) => line.discountAmount),
		);
		if (!discount.ok) {
			return discount;
		}
		const document = await addDecimals([subtotal.data, input.taxTotal]);
		if (!document.ok) {
			return document;
		}
		try {
			await afendaDatabase.transaction((sql) => [
				sql.query(
					"SELECT 1/(SELECT count(*)::int FROM sales_order WHERE organization_id=$1 AND id=$2::uuid AND version=$3 AND status IN ('approved','confirmed'))",
					[input.organizationId, input.id, input.expectedVersion],
				),
				sql.query(
					"UPDATE sales_order SET status='released',confirmed_at=$4,released_at=$4,subtotal_amount=$5,discount_total=$6,tax_total=$7,document_total=$8,credit_check_reference=$9,availability_reference=$10,updated_by=$11,updated_at=$4,version=version+1 WHERE organization_id=$1 AND id=$2::uuid AND version=$3",
					[
						input.organizationId,
						input.id,
						input.expectedVersion,
						input.at,
						subtotal.data,
						discount.data,
						input.taxTotal,
						document.data,
						input.creditReference ?? null,
						input.availabilityReference ?? null,
						input.actorUserId,
					],
				),
				sql.query(
					"UPDATE sales_order_schedule SET released_quantity=quantity,updated_by=$3,updated_at=$4,version=version+1 WHERE organization_id=$1 AND order_id=$2::uuid",
					[input.organizationId, input.id, input.actorUserId, input.at],
				),
				...mutationQueries(
					sql,
					"SELECT 1",
					[],
					evidence,
					input.id,
					input.expectedVersion + 1,
				).slice(1),
			]);
		} catch (error) {
			return failFromPersistence(error, "Could not release Sales order");
		}
		return this.getOrderRequired(input.organizationId, input.id);
	}
	async getOrder(input: Parameters<SalesStore["getOrder"]>[0]) {
		const rows = await afendaDatabase.client
			.select()
			.from(salesOrder)
			.where(
				and(
					eq(salesOrder.organizationId, input.organizationId),
					eq(salesOrder.id, input.id),
				),
			)
			.limit(1);
		return errorResult.ok(rows[0] ? mapOrder(rows[0]) : null);
	}
	async listOrders(input: Parameters<SalesStore["listOrders"]>[0]) {
		const conditions = [eq(salesOrder.organizationId, input.organizationId)];
		if (input.status) {
			conditions.push(eq(salesOrder.status, input.status));
		}
		if (input.cursor) {
			conditions.push(drizzleSql`${salesOrder.id} > ${input.cursor}`);
		}
		const rows = await afendaDatabase.client
			.select()
			.from(salesOrder)
			.where(and(...conditions))
			.orderBy(asc(salesOrder.id))
			.limit(input.pageSize + 1);
		const hasNext = rows.length > input.pageSize;
		const items = rows.slice(0, input.pageSize).map(mapOrder);
		const nextCursor = hasNext ? items.at(-1)?.id : undefined;
		return errorResult.ok(nextCursor ? { items, nextCursor } : { items });
	}
	async listOrderLines(input: Parameters<SalesStore["listOrderLines"]>[0]) {
		const rows = await afendaDatabase.client
			.select()
			.from(salesOrderLine)
			.where(
				and(
					eq(salesOrderLine.organizationId, input.organizationId),
					eq(salesOrderLine.orderId, input.orderId),
				),
			)
			.orderBy(asc(salesOrderLine.lineNo));
		return errorResult.ok(rows.map(mapOrderLine));
	}
	async listOrderSchedules(
		input: Parameters<SalesStore["listOrderSchedules"]>[0],
	) {
		const rows = await afendaDatabase.client
			.select()
			.from(salesOrderSchedule)
			.where(
				and(
					eq(salesOrderSchedule.organizationId, input.organizationId),
					eq(salesOrderSchedule.orderId, input.orderId),
				),
			)
			.orderBy(asc(salesOrderSchedule.requestedDate));
		return errorResult.ok(rows.map(mapSchedule));
	}
	async placeHold(
		input: Parameters<SalesStore["placeHold"]>[0],
		evidence: EvidenceSeed,
	) {
		const id = salesHoldIdSchema.parse(randomUUID());
		const written = await atomicInsert(
			"sales_order_hold",
			{
				id,
				organization_id: input.organizationId,
				order_id: input.orderId,
				kind: input.kind,
				reason: input.reason,
				status: "open",
				create_idempotency_key: input.idempotencyKey,
				created_by: input.actorUserId,
				updated_by: input.actorUserId,
			},
			evidence,
			id,
		);
		if (!written.ok) {
			return written;
		}
		return this.getHold(input.organizationId, id);
	}
	async resolveHold(
		input: Parameters<SalesStore["resolveHold"]>[0],
		evidence: EvidenceSeed,
	) {
		const current = await this.getHold(input.organizationId, input.id);
		if (!current.ok) {
			return current;
		}
		const written = await atomicUpdate(
			"sales_order_hold",
			input.id,
			input.organizationId,
			current.data.version,
			{
				status: "resolved",
				resolved_at: new Date(),
				resolved_by: input.actorUserId,
				updated_by: input.actorUserId,
			},
			evidence,
		);
		if (!written.ok) {
			return written;
		}
		return this.getHold(input.organizationId, input.id);
	}
	async listOpenHolds(input: Parameters<SalesStore["listOpenHolds"]>[0]) {
		const rows = await afendaDatabase.client
			.select()
			.from(salesOrderHold)
			.where(
				and(
					eq(salesOrderHold.organizationId, input.organizationId),
					eq(salesOrderHold.orderId, input.orderId),
					eq(salesOrderHold.status, "open"),
				),
			);
		return errorResult.ok(rows.map(mapHold));
	}
	async recordFulfillment(
		input: Parameters<SalesStore["recordFulfillment"]>[0],
		evidence: EvidenceSeed,
	) {
		const lineRows = await afendaDatabase.client
			.select()
			.from(salesOrderLine)
			.where(
				and(
					eq(salesOrderLine.organizationId, input.organizationId),
					eq(salesOrderLine.id, input.lineId),
					eq(salesOrderLine.orderId, input.orderId),
				),
			)
			.limit(1);
		const [line] = lineRows;
		if (!line) {
			return errorResult.fail("NOT_FOUND", {
				publicMessage: "Sales-order line not found",
			});
		}
		const next = await addDecimals([
			line.fulfilledQuantity,
			input.fulfilledQuantity,
		]);
		if (!next.ok) {
			return next;
		}
		if (Number(next.data) > Number(line.quantity)) {
			return errorResult.fail("CONFLICT", {
				publicMessage: "Fulfilled quantity exceeds ordered quantity",
			});
		}
		try {
			await afendaDatabase.transaction((sql) => [
				sql.query(
					"SELECT 1/(SELECT count(*)::int FROM sales_order WHERE organization_id=$1 AND id=$2::uuid AND version=$3 AND status IN ('released','partially_fulfilled'))",
					[input.organizationId, input.orderId, input.expectedVersion],
				),
				sql.query(
					"UPDATE sales_order_line SET fulfilled_quantity=$1,version=version+1,updated_by=$2,updated_at=now() WHERE organization_id=$3 AND id=$4::uuid",
					[next.data, input.actorUserId, input.organizationId, input.lineId],
				),
				sql.query(
					"UPDATE sales_order SET status=CASE WHEN NOT EXISTS (SELECT 1 FROM sales_order_line WHERE organization_id=$1 AND order_id=$2::uuid AND fulfilled_quantity < quantity) THEN 'fulfilled' ELSE 'partially_fulfilled' END,version=version+1,updated_by=$3,updated_at=now() WHERE organization_id=$1 AND id=$2::uuid AND version=$4",
					[
						input.organizationId,
						input.orderId,
						input.actorUserId,
						input.expectedVersion,
					],
				),
				...mutationQueries(
					sql,
					"SELECT 1",
					[],
					evidence,
					input.orderId,
					input.expectedVersion + 1,
				).slice(1),
			]);
		} catch (error) {
			return failFromPersistence(
				error,
				"Could not record fulfillment atomically",
			);
		}
		return this.getOrderRequired(input.organizationId, input.orderId);
	}

	async createReturnAuthorization(
		input: Parameters<SalesStore["createReturnAuthorization"]>[0],
		evidence: EvidenceSeed,
	) {
		const id = returnAuthorizationIdSchema.parse(randomUUID());
		const written = await atomicInsert(
			"sales_return_authorization",
			{
				id,
				organization_id: input.organizationId,
				code: input.code,
				normalized_code: input.normalizedCode,
				order_id: input.orderId,
				status: input.status,
				reason: input.reason,
				create_idempotency_key: input.idempotencyKey,
				created_by: input.actorUserId,
				updated_by: input.actorUserId,
			},
			evidence,
			id,
		);
		if (!written.ok) {
			return written;
		}
		return this.getReturn(input.organizationId, id);
	}
	async addReturnLine(
		input: Parameters<SalesStore["addReturnLine"]>[0],
		evidence: EvidenceSeed,
	) {
		const id = returnAuthorizationLineIdSchema.parse(randomUUID());
		try {
			await afendaDatabase.transaction((sql) => [
				sql.query(
					"SELECT 1/(SELECT count(*)::int FROM sales_return_authorization r JOIN sales_order_line l ON l.organization_id=r.organization_id AND l.order_id=r.order_id WHERE r.organization_id=$1 AND r.id=$2::uuid AND r.version=$3 AND r.status='draft' AND l.id=$4::uuid AND l.fulfilled_quantity >= $5::numeric)",
					[
						input.organizationId,
						input.returnAuthorizationId,
						input.expectedVersion,
						input.orderLineId,
						input.quantity,
					],
				),
				sql.query(
					"INSERT INTO sales_return_authorization_line (id,organization_id,return_authorization_id,order_line_id,quantity,reason,requested_disposition,create_idempotency_key,created_by,updated_by) VALUES ($1::uuid,$2,$3::uuid,$4::uuid,$5,$6,$7,$8,$9,$9)",
					[
						id,
						input.organizationId,
						input.returnAuthorizationId,
						input.orderLineId,
						input.quantity,
						input.reason,
						input.requestedDisposition,
						input.idempotencyKey,
						input.actorUserId,
					],
				),
				sql.query(
					"UPDATE sales_return_authorization SET version=version+1,updated_at=now(),updated_by=$4 WHERE organization_id=$1 AND id=$2::uuid AND version=$3",
					[
						input.organizationId,
						input.returnAuthorizationId,
						input.expectedVersion,
						input.actorUserId,
					],
				),
				...mutationQueries(sql, "SELECT 1", [], evidence, id, 1).slice(1),
			]);
		} catch (error) {
			return failFromPersistence(error, "Could not persist return line");
		}
		const rows = await afendaDatabase.client
			.select()
			.from(salesReturnAuthorizationLine)
			.where(
				and(
					eq(salesReturnAuthorizationLine.organizationId, input.organizationId),
					eq(salesReturnAuthorizationLine.id, id),
				),
			)
			.limit(1);
		return rows[0]
			? errorResult.ok(mapReturnLine(rows[0]))
			: errorResult.fail("INTERNAL_ERROR");
	}
	async getReturnAuthorization(
		input: Parameters<SalesStore["getReturnAuthorization"]>[0],
	) {
		const rows = await afendaDatabase.client
			.select()
			.from(salesReturnAuthorization)
			.where(
				and(
					eq(salesReturnAuthorization.organizationId, input.organizationId),
					eq(salesReturnAuthorization.id, input.id),
				),
			)
			.limit(1);
		return errorResult.ok(rows[0] ? mapReturn(rows[0]) : null);
	}
	async listReturnAuthorizations(
		input: Parameters<SalesStore["listReturnAuthorizations"]>[0],
	) {
		const conditions = [
			eq(salesReturnAuthorization.organizationId, input.organizationId),
		];
		if (input.cursor) {
			conditions.push(
				drizzleSql`${salesReturnAuthorization.id} > ${input.cursor}`,
			);
		}
		const rows = await afendaDatabase.client
			.select()
			.from(salesReturnAuthorization)
			.where(and(...conditions))
			.orderBy(asc(salesReturnAuthorization.id))
			.limit(input.pageSize + 1);
		const hasNext = rows.length > input.pageSize;
		const items = rows.slice(0, input.pageSize).map(mapReturn);
		return errorResult.ok({
			items,
			nextCursor: hasNext ? items.at(-1)?.id : undefined,
		});
	}
	async listReturnLines(input: Parameters<SalesStore["listReturnLines"]>[0]) {
		const rows = await afendaDatabase.client
			.select()
			.from(salesReturnAuthorizationLine)
			.where(
				and(
					eq(salesReturnAuthorizationLine.organizationId, input.organizationId),
					eq(
						salesReturnAuthorizationLine.returnAuthorizationId,
						input.returnAuthorizationId,
					),
				),
			)
			.orderBy(asc(salesReturnAuthorizationLine.id));
		return errorResult.ok(rows.map(mapReturnLine));
	}
	async transitionReturn(
		input: Parameters<SalesStore["transitionReturn"]>[0],
		evidence: EvidenceSeed,
	) {
		const written = await atomicUpdate(
			"sales_return_authorization",
			input.id,
			input.organizationId,
			input.expectedVersion,
			{ status: input.status, updated_by: input.actorUserId },
			evidence,
		);
		if (!written.ok) {
			return written;
		}
		return this.getReturn(input.organizationId, input.id);
	}

	private async getBookRequired(
		org: string,
		id: string,
	): Promise<Result<PriceBook>> {
		const rows = await afendaDatabase.client
			.select()
			.from(salesPriceBook)
			.where(
				and(eq(salesPriceBook.organizationId, org), eq(salesPriceBook.id, id)),
			)
			.limit(1);
		return rows[0]
			? errorResult.ok(mapBook(rows[0]))
			: errorResult.fail("INTERNAL_ERROR");
	}
	private async getQuotationRequired(
		org: string,
		id: string,
	): Promise<Result<SalesQuotation>> {
		const value = await this.getQuotation({
			organizationId: org,
			id: salesQuotationIdSchema.parse(id),
		});
		return value.data
			? errorResult.ok(value.data)
			: errorResult.fail("INTERNAL_ERROR");
	}
	private async getOrderRequired(
		org: string,
		id: string,
	): Promise<Result<SalesOrder>> {
		const value = await this.getOrder({
			organizationId: org,
			id: salesOrderIdSchema.parse(id),
		});
		return value.data
			? errorResult.ok(value.data)
			: errorResult.fail("INTERNAL_ERROR");
	}
	private async getHold(org: string, id: string): Promise<Result<SalesHold>> {
		const rows = await afendaDatabase.client
			.select()
			.from(salesOrderHold)
			.where(
				and(eq(salesOrderHold.organizationId, org), eq(salesOrderHold.id, id)),
			)
			.limit(1);
		return rows[0]
			? errorResult.ok(mapHold(rows[0]))
			: errorResult.fail("NOT_FOUND", {
					publicMessage: "Sales-order hold not found",
				});
	}
	private async getReturn(
		org: string,
		id: string,
	): Promise<Result<ReturnAuthorization>> {
		const rows = await afendaDatabase.client
			.select()
			.from(salesReturnAuthorization)
			.where(
				and(
					eq(salesReturnAuthorization.organizationId, org),
					eq(salesReturnAuthorization.id, id),
				),
			)
			.limit(1);
		return rows[0]
			? errorResult.ok(mapReturn(rows[0]))
			: errorResult.fail("NOT_FOUND", {
					publicMessage: "Return authorization not found",
				});
	}
}
export function createDrizzleSalesStore(): SalesStore {
	return new DrizzleSalesStore();
}
