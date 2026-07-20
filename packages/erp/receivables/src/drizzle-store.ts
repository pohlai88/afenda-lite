import { randomUUID } from "node:crypto";

import {
	and,
	asc,
	customerAllocation,
	customerBalanceProjection,
	db,
	desc,
	eq,
	inArray,
	runNeonHttpTransaction,
	salesCreditNote,
	salesInvoice,
	salesInvoiceLine,
} from "@afenda/db";
import { fail, failFromUnknown, ok, type Result } from "@afenda/errors/result";

import type {
	CustomerAllocation,
	CustomerBalance,
	InvoiceCreateRecord,
	ReceivablesStore,
	SalesInvoice,
	SalesInvoiceLine,
	SalesInvoiceStatus,
} from "./model";

function mapLine(row: typeof salesInvoiceLine.$inferSelect): SalesInvoiceLine {
	return {
		id: row.id,
		organizationId: row.organizationId,
		invoiceId: row.invoiceId,
		lineNo: row.lineNo,
		itemId: row.itemId,
		description: row.itemName,
		quantity: row.quantity,
		unitPrice: row.unitPrice,
		lineAmount: row.lineAmount,
		createdBy: row.createdBy,
		createdAt: row.createdAt,
	};
}

function status(value: string): SalesInvoiceStatus {
	if (value === "draft" || value === "posted" || value === "cancelled") return value;
	throw new Error(`Invalid sales_invoice.status: ${value}`);
}

function mapInvoice(
	row: typeof salesInvoice.$inferSelect,
	lines: SalesInvoiceLine[],
	allocatedAmount = 0,
): SalesInvoice {
	const total = lines.reduce((sum, line) => sum + Number(line.lineAmount), 0);
	const totalAmount = total.toString();
	return {
		id: row.id,
		organizationId: row.organizationId,
		code: row.code,
		normalizedCode: row.normalizedCode,
		documentType: "invoice",
		status: status(row.status),
		customerId: row.customerPartyId,
		customerCode: row.customerPartyCode,
		customerName: row.customerPartyName,
		currencyCode: row.currencyCode,
		totalAmount,
		openAmount:
			row.status === "posted" ? Math.max(0, total - allocatedAmount).toString() : "0",
		version: row.version,
		createdBy: row.createdBy,
		updatedBy: row.updatedBy,
		postedAt: row.postedAt,
		postedBy: row.postedBy,
		cancelledAt: row.cancelledAt,
		cancelledBy: row.cancelledBy,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
		lines,
	};
}

async function reload(
	store: DrizzleReceivablesStore,
	organizationId: string,
	id: string,
	message: string,
): Promise<Result<SalesInvoice>> {
	const result = await store.getById(organizationId, id);
	if (!result.ok) return result;
	return result.data === null ? fail("INTERNAL_ERROR", message) : ok(result.data);
}

export class DrizzleReceivablesStore implements ReceivablesStore {
	async createInvoice(record: InvoiceCreateRecord): Promise<Result<SalesInvoice>> {
		try {
			const id = randomUUID();
			await runNeonHttpTransaction((sql) => [
				sql`
					INSERT INTO sales_invoice (
						id, organization_id, code, normalized_code, status,
						customer_party_id, customer_party_code, customer_party_name,
						currency_code, version, created_by, updated_by
					) VALUES (
						${id}, ${record.organizationId}, ${record.code}, ${record.normalizedCode},
						'draft', ${record.customerId}, ${record.customerCode}, ${record.customerName},
						${record.currencyCode}, 1, ${record.actorUserId}, ${record.actorUserId}
					)
				`,
			]);
			return reload(this, record.organizationId, id, "Created invoice missing");
		} catch (error) {
			return failFromUnknown(error, "Failed to create sales invoice");
		}
	}

	async addLine(record: Parameters<ReceivablesStore["addLine"]>[0]): Promise<Result<SalesInvoiceLine>> {
		const invoice = await this.getById(record.organizationId, record.invoiceId);
		if (!invoice.ok) return invoice;
		if (invoice.data === null) return fail("NOT_FOUND", "Sales invoice not found");
		if (invoice.data.status !== "draft" || invoice.data.documentType !== "invoice") {
			return fail("CONFLICT", "Lines can only be added to draft invoices");
		}
		const id = randomUUID();
		const lineNo = invoice.data.lines.length + 1;
		try {
			const [rows] = await runNeonHttpTransaction<[{ id: string }[]]>((sql) => [
				sql`
					WITH inserted AS (
						INSERT INTO sales_invoice_line (
							id, organization_id, invoice_id, line_no, item_id, item_code,
							item_name, quantity, unit_price, line_amount, version,
							created_by, updated_by
						)
						SELECT ${id}, ${record.organizationId}, ${record.invoiceId}, ${lineNo},
							${record.itemId}, ${record.itemId}, ${record.description}, ${record.quantity},
							${record.unitPrice}, ${record.quantity}::numeric * ${record.unitPrice}::numeric,
							1, ${record.actorUserId}, ${record.actorUserId}
						WHERE EXISTS (
							SELECT 1 FROM sales_invoice
							WHERE id = ${record.invoiceId} AND organization_id = ${record.organizationId}
								AND status = 'draft'
						)
						RETURNING id, line_amount
					),
					bumped AS (
						UPDATE sales_invoice
						SET version = version + 1, updated_by = ${record.actorUserId}, updated_at = now()
						WHERE id = ${record.invoiceId} AND organization_id = ${record.organizationId}
							AND EXISTS (SELECT 1 FROM inserted)
						RETURNING id
					)
					SELECT inserted.id FROM inserted, bumped
				`,
			]);
			if (rows[0] === undefined) return fail("CONFLICT", "Sales invoice line conflict");
			const [line] = await db
				.select()
				.from(salesInvoiceLine)
				.where(and(eq(salesInvoiceLine.organizationId, record.organizationId), eq(salesInvoiceLine.id, id)))
				.limit(1);
			return line === undefined
				? fail("INTERNAL_ERROR", "Created invoice line missing")
				: ok(mapLine(line));
		} catch (error) {
			return failFromUnknown(error, "Failed to add sales invoice line");
		}
	}

	async postInvoice(record: Parameters<ReceivablesStore["postInvoice"]>[0]): Promise<Result<SalesInvoice>> {
		const eventId = randomUUID();
		const balanceId = randomUUID();
		try {
			const payload = JSON.stringify({
				organizationId: record.organizationId,
				entityId: record.invoiceId,
				actorId: record.actorUserId,
				correlationId: record.correlationId,
			});
			const [rows] = await runNeonHttpTransaction<[{ id: string }[]]>((sql) => [
				sql`
					WITH mutated AS (
						UPDATE sales_invoice
						SET status = 'posted', posted_at = now(),
							posted_by = ${record.actorUserId}, updated_by = ${record.actorUserId},
							updated_at = now(), version = version + 1
						WHERE id = ${record.invoiceId} AND organization_id = ${record.organizationId}
							AND status = 'draft' AND version = ${record.expectedVersion}
							AND EXISTS (
								SELECT 1 FROM sales_invoice_line
								WHERE invoice_id = ${record.invoiceId}
									AND organization_id = ${record.organizationId}
							)
						RETURNING *
					),
					totaled AS (
						SELECT mutated.*, (
							SELECT SUM(line.line_amount::numeric)
							FROM sales_invoice_line line
							WHERE line.invoice_id = mutated.id
								AND line.organization_id = mutated.organization_id
						) AS total_amount
						FROM mutated
					),
					projected AS (
						INSERT INTO customer_balance_projection (
							id, organization_id, customer_party_id, currency_code, open_balance,
							version, created_by, updated_by
						)
						SELECT ${balanceId}, organization_id, customer_party_id, currency_code,
							total_amount, 1, ${record.actorUserId}, ${record.actorUserId}
						FROM totaled
						ON CONFLICT (organization_id, customer_party_id, currency_code)
						DO UPDATE SET
							open_balance = (customer_balance_projection.open_balance::numeric +
								EXCLUDED.open_balance::numeric)::text,
							version = customer_balance_projection.version + 1,
							updated_by = ${record.actorUserId}, updated_at = now()
						RETURNING id
					),
					outboxed AS (
						INSERT INTO platform_domain_event (
							id, organization_id, type, source_module, correlation_id, actor_user_id,
							payload, status, attempts
						)
						SELECT ${eventId}, organization_id, 'receivables.invoice.posted.v1', 'receivables',
							${record.correlationId}, ${record.actorUserId},
							(${payload}::jsonb || jsonb_build_object(
								'customerId', customer_party_id, 'amount', total_amount::text,
								'currencyCode', currency_code
							)), 'pending', 0
						FROM totaled RETURNING id
					)
					SELECT totaled.id FROM totaled, projected, outboxed
				`,
			]);
			if (rows[0] === undefined) return fail("CONFLICT", "Sales invoice post conflict");
			return reload(this, record.organizationId, record.invoiceId, "Posted invoice missing");
		} catch (error) {
			return failFromUnknown(error, "Failed to post sales invoice");
		}
	}

	async issueCredit(record: Parameters<ReceivablesStore["issueCredit"]>[0]): Promise<Result<SalesInvoice>> {
		const id = randomUUID();
		const eventId = randomUUID();
		const balanceId = randomUUID();
		try {
			const [rows] = await runNeonHttpTransaction<[{ id: string }[]]>((sql) => [
				sql`
					WITH mutated AS (
						INSERT INTO sales_credit_note (
							id, organization_id, code, normalized_code, status,
							customer_party_id, customer_party_code, customer_party_name,
							currency_code, version, created_by, updated_by, posted_at, posted_by
						) VALUES (
							${id}, ${record.organizationId}, ${record.code}, ${record.normalizedCode},
							'posted', ${record.customerId}, ${record.customerCode},
							${record.customerName}, ${record.currencyCode}, 2,
							${record.actorUserId}, ${record.actorUserId}, now(), ${record.actorUserId}
						) RETURNING *
					),
					projected AS (
						INSERT INTO customer_balance_projection (
							id, organization_id, customer_party_id, currency_code, open_balance,
							version, created_by, updated_by
						)
						SELECT ${balanceId}, organization_id, customer_party_id, currency_code,
							(-${record.amount}::numeric)::text, 1,
							${record.actorUserId}, ${record.actorUserId}
						FROM mutated
						ON CONFLICT (organization_id, customer_party_id, currency_code)
						DO UPDATE SET
							open_balance = (customer_balance_projection.open_balance::numeric +
								EXCLUDED.open_balance::numeric)::text,
							version = customer_balance_projection.version + 1,
							updated_by = ${record.actorUserId}, updated_at = now()
						RETURNING id
					),
					outboxed AS (
						INSERT INTO platform_domain_event (
							id, organization_id, type, source_module, correlation_id, actor_user_id,
							payload, status, attempts
						)
						SELECT ${eventId}, organization_id, 'receivables.credit_note.posted.v1', 'receivables',
							${record.correlationId}, ${record.actorUserId},
							jsonb_build_object(
								'organizationId', organization_id, 'entityId', id,
								'customerId', customer_party_id, 'amount', ${record.amount},
								'currencyCode', currency_code, 'actorId', ${record.actorUserId},
								'correlationId', ${record.correlationId}
							), 'pending', 0 FROM mutated RETURNING id
					)
					SELECT mutated.id FROM mutated, projected, outboxed
				`,
			]);
			if (rows[0] === undefined) return fail("CONFLICT", "Credit note issue conflict");
			const [credit] = await db
				.select()
				.from(salesCreditNote)
				.where(
					and(
						eq(salesCreditNote.organizationId, record.organizationId),
						eq(salesCreditNote.id, id),
					),
				)
				.limit(1);
			if (credit === undefined) return fail("INTERNAL_ERROR", "Issued credit note missing");
			return ok({
				id: credit.id,
				organizationId: credit.organizationId,
				code: credit.code,
				normalizedCode: credit.normalizedCode,
				documentType: "credit_note",
				status: status(credit.status),
				customerId: credit.customerPartyId,
				customerCode: credit.customerPartyCode,
				customerName: credit.customerPartyName,
				currencyCode: credit.currencyCode,
				totalAmount: record.amount,
				openAmount: "0",
				version: credit.version,
				createdBy: credit.createdBy,
				updatedBy: credit.updatedBy,
				postedAt: credit.postedAt,
				postedBy: credit.postedBy,
				cancelledAt: null,
				cancelledBy: null,
				createdAt: credit.createdAt,
				updatedAt: credit.updatedAt,
				lines: [],
			});
		} catch (error) {
			return failFromUnknown(error, "Failed to issue credit note");
		}
	}

	async allocate(record: Parameters<ReceivablesStore["allocate"]>[0]): Promise<Result<CustomerAllocation>> {
		const id = randomUUID();
		const eventId = randomUUID();
		try {
			const [rows] = await runNeonHttpTransaction<[
				Array<{
					id: string;
					organization_id: string;
					invoice_id: string;
					customer_id: string;
					payment_id: string | null;
					amount: string;
					created_by: string;
					created_at: Date;
				}>,
			]>((sql) => [
				sql`
					WITH eligible AS (
						SELECT invoice.*, (
							SELECT COALESCE(SUM(line.line_amount::numeric), 0)
							FROM sales_invoice_line line
							WHERE line.invoice_id = invoice.id
								AND line.organization_id = invoice.organization_id
						) - (
							SELECT COALESCE(SUM(allocation.amount::numeric), 0)
							FROM customer_allocation allocation
							WHERE allocation.sales_invoice_id = invoice.id
								AND allocation.organization_id = invoice.organization_id
						) AS open_amount
						FROM sales_invoice invoice
						WHERE invoice.id = ${record.invoiceId}
							AND invoice.organization_id = ${record.organizationId}
							AND invoice.status = 'posted'
					),
					mutated AS (
						UPDATE sales_invoice
						SET version = version + 1, updated_by = ${record.actorUserId}, updated_at = now()
						WHERE id = ${record.invoiceId} AND organization_id = ${record.organizationId}
							AND ${record.amount}::numeric > 0
							AND (SELECT open_amount FROM eligible) >= ${record.amount}::numeric
						RETURNING *
					),
					allocated AS (
						INSERT INTO customer_allocation (
							id, organization_id, customer_party_id, sales_invoice_id,
							payment_id, amount, allocated_at, allocated_by, version,
							created_by, updated_by
						)
						SELECT ${id}, organization_id, customer_party_id, id, ${record.paymentId},
							${record.amount}, now(), ${record.actorUserId}, 1,
							${record.actorUserId}, ${record.actorUserId}
						FROM mutated RETURNING *
					),
					projected AS (
						UPDATE customer_balance_projection
						SET open_balance = (open_balance::numeric - ${record.amount}::numeric)::text,
							version = version + 1, updated_by = ${record.actorUserId}, updated_at = now()
						WHERE organization_id = ${record.organizationId}
							AND customer_party_id = (SELECT customer_party_id FROM mutated)
							AND currency_code = (SELECT currency_code FROM mutated)
						RETURNING id
					),
					outboxed AS (
						INSERT INTO platform_domain_event (
							id, organization_id, type, source_module, correlation_id, actor_user_id,
							payload, status, attempts
						)
						SELECT ${eventId}, organization_id, 'receivables.allocation.posted.v1', 'receivables',
							${record.correlationId}, ${record.actorUserId},
							jsonb_build_object(
								'organizationId', organization_id, 'entityId', ${id},
								'customerId', customer_party_id, 'amount', ${record.amount},
								'currencyCode', currency_code, 'actorId', ${record.actorUserId},
								'correlationId', ${record.correlationId}
							), 'pending', 0 FROM mutated RETURNING id
					)
					SELECT allocated.id, allocated.organization_id,
						allocated.sales_invoice_id AS invoice_id,
						allocated.customer_party_id AS customer_id,
						allocated.payment_id, allocated.amount,
						allocated.created_by, allocated.created_at
					FROM allocated, projected, outboxed
				`,
			]);
			const row = rows[0];
			if (row === undefined) return fail("CONFLICT", "Customer allocation conflict");
			return ok({
				id: row.id,
				organizationId: row.organization_id,
				invoiceId: row.invoice_id,
				customerId: row.customer_id,
				paymentId: row.payment_id,
				amount: row.amount,
				createdBy: row.created_by,
				createdAt: row.created_at,
			});
		} catch (error) {
			return failFromUnknown(error, "Failed to allocate customer receipt");
		}
	}

	async cancel(record: Parameters<ReceivablesStore["cancel"]>[0]): Promise<Result<SalesInvoice>> {
		try {
			const [rows] = await runNeonHttpTransaction<[{ id: string }[]]>((sql) => [
				sql`
					WITH eligible AS (
						SELECT invoice.*, (
							SELECT COALESCE(SUM(line.line_amount::numeric), 0)
							FROM sales_invoice_line line
							WHERE line.invoice_id = invoice.id
								AND line.organization_id = invoice.organization_id
						) AS total_amount,
						(
							SELECT COALESCE(SUM(allocation.amount::numeric), 0)
							FROM customer_allocation allocation
							WHERE allocation.sales_invoice_id = invoice.id
								AND allocation.organization_id = invoice.organization_id
						) AS allocated_amount
						FROM sales_invoice invoice
						WHERE invoice.id = ${record.invoiceId}
							AND invoice.organization_id = ${record.organizationId}
							AND invoice.version = ${record.expectedVersion}
							AND (
								invoice.status = 'draft'
								OR (invoice.status = 'posted' AND NOT EXISTS (
									SELECT 1 FROM customer_allocation allocation
									WHERE allocation.sales_invoice_id = invoice.id
										AND allocation.organization_id = invoice.organization_id
								))
							)
					),
					mutated AS (
						UPDATE sales_invoice
						SET status = 'cancelled', cancelled_at = now(),
							cancelled_by = ${record.actorUserId}, updated_by = ${record.actorUserId},
							updated_at = now(), version = version + 1
						WHERE id = ${record.invoiceId} AND organization_id = ${record.organizationId}
							AND EXISTS (SELECT 1 FROM eligible)
						RETURNING *
					),
					projected AS (
						UPDATE customer_balance_projection
						SET open_balance = (
								open_balance::numeric - (SELECT total_amount FROM eligible)
							)::text,
							version = version + 1, updated_by = ${record.actorUserId}, updated_at = now()
						WHERE organization_id = ${record.organizationId}
							AND customer_party_id = (SELECT customer_party_id FROM eligible)
							AND currency_code = (SELECT currency_code FROM eligible)
							AND (SELECT status FROM eligible) = 'posted'
							AND EXISTS (SELECT 1 FROM mutated)
						RETURNING id
					)
					SELECT mutated.id FROM mutated
				`,
			]);
			if (rows[0] === undefined) return fail("CONFLICT", "Sales invoice cancel conflict");
			return reload(this, record.organizationId, record.invoiceId, "Cancelled invoice missing");
		} catch (error) {
			return failFromUnknown(error, "Failed to cancel sales invoice");
		}
	}

	async getById(organizationId: string, id: string): Promise<Result<SalesInvoice | null>> {
		try {
			const [header] = await db
				.select()
				.from(salesInvoice)
				.where(and(eq(salesInvoice.organizationId, organizationId), eq(salesInvoice.id, id)))
				.limit(1);
			if (header === undefined) return ok(null);
			const lines = await db
				.select()
				.from(salesInvoiceLine)
				.where(
					and(
						eq(salesInvoiceLine.organizationId, organizationId),
						eq(salesInvoiceLine.invoiceId, id),
					),
				)
				.orderBy(asc(salesInvoiceLine.lineNo));
			const allocations = await db
				.select()
				.from(customerAllocation)
				.where(
					and(
						eq(customerAllocation.organizationId, organizationId),
						eq(customerAllocation.salesInvoiceId, id),
					),
				);
			const allocated = allocations.reduce(
				(total, row) => total + Number(row.amount),
				0,
			);
			return ok(mapInvoice(header, lines.map(mapLine), allocated));
		} catch (error) {
			return failFromUnknown(error, "Failed to load sales invoice");
		}
	}

	async list(filter: Parameters<ReceivablesStore["list"]>[0]): Promise<Result<SalesInvoice[]>> {
		try {
			const conditions = [eq(salesInvoice.organizationId, filter.organizationId)];
			if (filter.status !== undefined) conditions.push(eq(salesInvoice.status, filter.status));
			const headers = await db
				.select()
				.from(salesInvoice)
				.where(and(...conditions))
				.orderBy(desc(salesInvoice.updatedAt), desc(salesInvoice.id))
				.limit(filter.pageSize)
				.offset((filter.page - 1) * filter.pageSize);
			if (headers.length === 0) return ok([]);
			const ids = headers.map((row) => row.id);
			const lines = await db
				.select()
				.from(salesInvoiceLine)
				.where(
					and(
						eq(salesInvoiceLine.organizationId, filter.organizationId),
						inArray(salesInvoiceLine.invoiceId, ids),
					),
				)
				.orderBy(asc(salesInvoiceLine.lineNo));
			const allocations = await db
				.select()
				.from(customerAllocation)
				.where(
					and(
						eq(customerAllocation.organizationId, filter.organizationId),
						inArray(customerAllocation.salesInvoiceId, ids),
					),
				);
			const allocatedByInvoice = new Map<string, number>();
			for (const row of allocations) {
				allocatedByInvoice.set(
					row.salesInvoiceId,
					(allocatedByInvoice.get(row.salesInvoiceId) ?? 0) + Number(row.amount),
				);
			}
			const grouped = new Map<string, SalesInvoiceLine[]>();
			for (const row of lines) {
				const mapped = mapLine(row);
				grouped.set(row.invoiceId, [...(grouped.get(row.invoiceId) ?? []), mapped]);
			}
			return ok(
				headers.map((row) =>
					mapInvoice(
						row,
						grouped.get(row.id) ?? [],
						allocatedByInvoice.get(row.id) ?? 0,
					),
				),
			);
		} catch (error) {
			return failFromUnknown(error, "Failed to list sales invoices");
		}
	}

	async getBalance(
		organizationId: string,
		customerId: string,
		currencyCode?: string,
	): Promise<Result<CustomerBalance[]>> {
		try {
			const conditions = [
				eq(customerBalanceProjection.organizationId, organizationId),
				eq(customerBalanceProjection.customerPartyId, customerId),
			];
			if (currencyCode !== undefined) {
				conditions.push(eq(customerBalanceProjection.currencyCode, currencyCode));
			}
			const rows = await db
				.select()
				.from(customerBalanceProjection)
				.where(and(...conditions))
				.orderBy(asc(customerBalanceProjection.currencyCode));
			return ok(
				rows.map((row) => ({
					organizationId: row.organizationId,
					customerId: row.customerPartyId,
					currencyCode: row.currencyCode,
					openBalance: row.openBalance,
					updatedAt: row.updatedAt,
				})),
			);
		} catch (error) {
			return failFromUnknown(error, "Failed to load customer balance");
		}
	}
}

export function createDrizzleReceivablesStore(): DrizzleReceivablesStore {
	return new DrizzleReceivablesStore();
}
