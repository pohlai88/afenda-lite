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

import type { InvoiceCreateRecord, ReceivablesStore } from "./store";
import type {
	CustomerAging,
	CustomerAllocation,
	CustomerBalance,
	SalesCreditNote,
	SalesInvoice,
	SalesInvoiceLine,
	SalesInvoiceStatus,
} from "./types";

function asStatus(value: string): SalesInvoiceStatus {
	if (
		value === "draft" ||
		value === "posted" ||
		value === "closed" ||
		value === "cancelled"
	) {
		return value;
	}
	throw new Error(`Invalid sales_invoice.status: ${value}`);
}

function mapLine(row: typeof salesInvoiceLine.$inferSelect): SalesInvoiceLine {
	return {
		id: row.id,
		organizationId: row.organizationId,
		invoiceId: row.invoiceId,
		lineNo: row.lineNo,
		itemId: row.itemId,
		itemCode: row.itemCode,
		itemName: row.itemName,
		description: row.itemName,
		quantity: row.quantity,
		unitPrice: row.unitPrice,
		lineAmount: row.lineAmount,
		salesOrderLineId: row.salesOrderLineId,
		deliveryLineId: row.deliveryLineId,
		createdBy: row.createdBy,
		createdAt: row.createdAt,
	};
}

function mapAllocation(
	row: typeof customerAllocation.$inferSelect,
): CustomerAllocation {
	if (row.paymentId === null || row.paymentApplicationInstructionId === null) {
		throw new Error("Receipt application is missing payment references");
	}
	return {
		id: row.id,
		organizationId: row.organizationId,
		invoiceId: row.salesInvoiceId,
		customerId: row.customerPartyId,
		paymentId: row.paymentId,
		paymentApplicationInstructionId: row.paymentApplicationInstructionId,
		creditNoteId: row.creditNoteId,
		status: row.status === "reversed" ? "reversed" : "active",
		amount: row.amount,
		createdBy: row.createdBy,
		createdAt: row.createdAt,
		reversedAt: row.reversedAt,
		reversedBy: row.reversedBy,
	};
}

function mapCredit(row: typeof salesCreditNote.$inferSelect): SalesCreditNote {
	if (row.salesInvoiceId === null) {
		throw new Error("Credit note is missing its sales invoice");
	}
	return {
		id: row.id,
		organizationId: row.organizationId,
		code: row.code,
		normalizedCode: row.normalizedCode,
		status:
			row.status === "draft" || row.status === "cancelled"
				? row.status
				: "posted",
		customerId: row.customerPartyId,
		customerCode: row.customerPartyCode,
		customerName: row.customerPartyName,
		salesInvoiceId: row.salesInvoiceId,
		currencyCode: row.currencyCode,
		amount: row.amount,
		version: row.version,
		createdBy: row.createdBy,
		updatedBy: row.updatedBy,
		postedAt: row.postedAt,
		postedBy: row.postedBy,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	};
}

function total(lines: SalesInvoiceLine[]): number {
	return lines.reduce((sum, line) => sum + Number(line.lineAmount), 0);
}

function mapInvoice(
	row: typeof salesInvoice.$inferSelect,
	lines: SalesInvoiceLine[],
	applied: number,
): SalesInvoice {
	const totalAmount = total(lines);
	const isOpen = row.status === "posted" || row.status === "closed";
	return {
		id: row.id,
		organizationId: row.organizationId,
		code: row.code,
		normalizedCode: row.normalizedCode,
		status: asStatus(row.status),
		invoiceSource: row.invoiceSource as SalesInvoice["invoiceSource"],
		customerId: row.customerPartyId,
		customerCode: row.customerPartyCode,
		customerName: row.customerPartyName,
		currencyCode: row.currencyCode,
		salesOrderId: row.salesOrderId,
		deliveryId: row.deliveryId,
		invoiceDate: row.invoiceDate,
		accountingDate: row.accountingDate,
		dueDate: row.dueDate,
		paymentTermCode: row.paymentTermCode,
		paymentTermDescription: row.paymentTermDescription,
		manualReason: row.manualReason,
		totalAmount: String(totalAmount),
		openAmount: isOpen ? String(Math.max(0, totalAmount - applied)) : "0",
		version: row.version,
		createdBy: row.createdBy,
		updatedBy: row.updatedBy,
		postedAt: row.postedAt,
		postedBy: row.postedBy,
		closedAt: row.closedAt,
		closedBy: row.closedBy,
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
	return result.data === null
		? fail("INTERNAL_ERROR", message)
		: ok(result.data);
}

export class DrizzleReceivablesStore implements ReceivablesStore {
	async createInvoice(
		record: InvoiceCreateRecord,
	): Promise<Result<SalesInvoice>> {
		try {
			const [existing] = await db
				.select({ id: salesInvoice.id })
				.from(salesInvoice)
				.where(
					and(
						eq(salesInvoice.organizationId, record.organizationId),
						eq(salesInvoice.createIdempotencyKey, record.idempotencyKey),
					),
				)
				.limit(1);
			if (existing !== undefined) {
				return reload(
					this,
					record.organizationId,
					existing.id,
					"Created invoice missing",
				);
			}

			const id = randomUUID();
			const [rows] = await runNeonHttpTransaction<[{ id: string }[]]>((sql) => [
				sql`
					INSERT INTO sales_invoice (
						id, organization_id, code, normalized_code, status, invoice_source,
						customer_party_id, customer_party_code, customer_party_name, currency_code,
						sales_order_id, delivery_id, invoice_date, accounting_date, due_date,
						payment_term_code, payment_term_description, manual_reason,
						create_idempotency_key, version, created_by, updated_by
					) VALUES (
						${id}, ${record.organizationId}, ${record.code}, ${record.normalizedCode},
						'draft', ${record.invoiceSource}, ${record.customerId}, ${record.customerCode},
						${record.customerName}, ${record.currencyCode}, ${record.salesOrderId},
						${record.deliveryId}, ${record.invoiceDate}, ${record.accountingDate},
						${record.dueDate}, ${record.paymentTermCode}, ${record.paymentTermDescription},
						${record.manualReason}, ${record.idempotencyKey}, 1,
						${record.actorUserId}, ${record.actorUserId}
					)
					ON CONFLICT (organization_id, normalized_code) DO NOTHING
					RETURNING id
				`,
			]);
			if (rows[0] === undefined)
				return fail("CONFLICT", "Sales invoice create conflict");
			return reload(this, record.organizationId, id, "Created invoice missing");
		} catch (error) {
			return failFromUnknown(error, "Failed to create sales invoice");
		}
	}

	async addLine(
		record: Parameters<ReceivablesStore["addLine"]>[0],
	): Promise<Result<SalesInvoiceLine>> {
		try {
			const [existing] = await db
				.select()
				.from(salesInvoiceLine)
				.where(
					and(
						eq(salesInvoiceLine.organizationId, record.organizationId),
						eq(salesInvoiceLine.lineIdempotencyKey, record.idempotencyKey),
					),
				)
				.limit(1);
			if (existing !== undefined) return ok(mapLine(existing));

			const id = randomUUID();
			const [rows] = await runNeonHttpTransaction<[{ id: string }[]]>((sql) => [
				sql`
					WITH inserted AS (
						INSERT INTO sales_invoice_line (
							id, organization_id, invoice_id, line_no, item_id, item_code, item_name,
							quantity, unit_price, line_amount, sales_order_line_id, delivery_line_id,
							line_idempotency_key, version, created_by, updated_by
						)
						SELECT ${id}, ${record.organizationId}, ${record.invoiceId},
							COALESCE(MAX(line_no), 0) + 1, ${record.itemId}, ${record.itemCode},
							${record.itemName}, ${record.quantity}, ${record.unitPrice},
							(${record.quantity}::numeric * ${record.unitPrice}::numeric)::text,
							${record.salesOrderLineId}, ${record.deliveryLineId}, ${record.idempotencyKey},
							1, ${record.actorUserId}, ${record.actorUserId}
						FROM sales_invoice invoice
						LEFT JOIN sales_invoice_line line
							ON line.invoice_id = invoice.id AND line.organization_id = invoice.organization_id
						WHERE invoice.id = ${record.invoiceId}
							AND invoice.organization_id = ${record.organizationId}
							AND invoice.status = 'draft'
						GROUP BY invoice.id
						RETURNING id
					),
					bumped AS (
						UPDATE sales_invoice
						SET version = version + 1, updated_at = now(), updated_by = ${record.actorUserId}
						WHERE id = ${record.invoiceId} AND organization_id = ${record.organizationId}
							AND EXISTS (SELECT 1 FROM inserted)
						RETURNING id
					)
					SELECT inserted.id FROM inserted, bumped
				`,
			]);
			if (rows[0] === undefined)
				return fail("CONFLICT", "Sales invoice line conflict");
			const [line] = await db
				.select()
				.from(salesInvoiceLine)
				.where(
					and(
						eq(salesInvoiceLine.organizationId, record.organizationId),
						eq(salesInvoiceLine.id, id),
					),
				)
				.limit(1);
			return line === undefined
				? fail("INTERNAL_ERROR", "Created invoice line missing")
				: ok(mapLine(line));
		} catch (error) {
			return failFromUnknown(error, "Failed to add sales invoice line");
		}
	}

	async postInvoice(
		record: Parameters<ReceivablesStore["postInvoice"]>[0],
	): Promise<Result<SalesInvoice>> {
		for (const check of record.sourceLineChecks ?? []) {
			if (Number(check.quantity) > Number(check.remainingInvoiceableQuantity)) {
				return fail(
					"CONFLICT",
					"Invoice quantity exceeds remaining invoiceable quantity",
				);
			}
		}
		try {
			const [alreadyPosted] = await db
				.select({ id: salesInvoice.id })
				.from(salesInvoice)
				.where(
					and(
						eq(salesInvoice.organizationId, record.organizationId),
						eq(salesInvoice.postIdempotencyKey, record.idempotencyKey),
					),
				)
				.limit(1);
			if (alreadyPosted !== undefined)
				return reload(
					this,
					record.organizationId,
					alreadyPosted.id,
					"Posted invoice missing",
				);

			const eventId = randomUUID();
			const balanceId = randomUUID();
			const [rows] = await runNeonHttpTransaction<[{ id: string }[]]>((sql) => [
				sql`
					WITH mutated AS (
						UPDATE sales_invoice
						SET status = 'posted', posted_at = now(), posted_by = ${record.actorUserId},
							post_idempotency_key = ${record.idempotencyKey}, updated_at = now(),
							updated_by = ${record.actorUserId}, version = version + 1
						WHERE id = ${record.invoiceId} AND organization_id = ${record.organizationId}
							AND status = 'draft' AND version = ${record.expectedVersion}
							AND (SELECT COALESCE(SUM(line_amount::numeric), 0) FROM sales_invoice_line
								WHERE invoice_id = ${record.invoiceId} AND organization_id = ${record.organizationId}) > 0
						RETURNING *
					),
					totaled AS (
						SELECT mutated.*, (SELECT SUM(line_amount::numeric) FROM sales_invoice_line
							WHERE invoice_id = mutated.id AND organization_id = mutated.organization_id) AS total_amount
						FROM mutated
					),
					projected AS (
						INSERT INTO customer_balance_projection (
							id, organization_id, customer_party_id, currency_code, open_balance,
							version, created_by, updated_by
						)
						SELECT ${balanceId}, organization_id, customer_party_id, currency_code,
							total_amount::text, 1, ${record.actorUserId}, ${record.actorUserId} FROM totaled
						ON CONFLICT (organization_id, customer_party_id, currency_code) DO UPDATE SET
							open_balance = (customer_balance_projection.open_balance::numeric + EXCLUDED.open_balance::numeric)::text,
							version = customer_balance_projection.version + 1, updated_at = now(),
							updated_by = ${record.actorUserId}
						RETURNING id
					),
					outboxed AS (
						INSERT INTO platform_domain_event (
							id, organization_id, type, source_module, correlation_id, actor_user_id, payload, status, attempts
						)
						SELECT ${eventId}, organization_id, 'receivables.invoice.posted.v1', 'receivables',
							${record.correlationId}, ${record.actorUserId},
							jsonb_build_object('organizationId', organization_id, 'entityId', id,
								'customerId', customer_party_id, 'amount', total_amount::text,
								'currencyCode', currency_code, 'actorId', ${record.actorUserId},
								'correlationId', ${record.correlationId}), 'pending', 0
						FROM totaled RETURNING id
					)
					SELECT id FROM totaled, projected, outboxed
				`,
			]);
			if (rows[0] === undefined)
				return fail("CONFLICT", "Sales invoice post conflict");
			return reload(
				this,
				record.organizationId,
				record.invoiceId,
				"Posted invoice missing",
			);
		} catch (error) {
			return failFromUnknown(error, "Failed to post sales invoice");
		}
	}

	async issueCredit(
		record: Parameters<ReceivablesStore["issueCredit"]>[0],
	): Promise<Result<SalesCreditNote>> {
		try {
			const [existing] = await db
				.select()
				.from(salesCreditNote)
				.where(
					and(
						eq(salesCreditNote.organizationId, record.organizationId),
						eq(salesCreditNote.issueIdempotencyKey, record.idempotencyKey),
					),
				)
				.limit(1);
			if (existing !== undefined) return ok(mapCredit(existing));

			const id = randomUUID();
			const eventId = randomUUID();
			const balanceId = randomUUID();
			const [rows] = await runNeonHttpTransaction<[{ id: string }[]]>((sql) => [
				sql`
					WITH eligible AS (
						SELECT invoice.*, (SELECT COALESCE(SUM(line_amount::numeric), 0) FROM sales_invoice_line
							WHERE invoice_id = invoice.id AND organization_id = invoice.organization_id)
							- (SELECT COALESCE(SUM(amount::numeric), 0) FROM customer_allocation
								WHERE sales_invoice_id = invoice.id AND organization_id = invoice.organization_id AND status = 'active')
							- (SELECT COALESCE(SUM(amount::numeric), 0) FROM sales_credit_note
								WHERE sales_invoice_id = invoice.id AND organization_id = invoice.organization_id AND status = 'posted')
							AS open_amount
						FROM sales_invoice invoice
						WHERE id = ${record.salesInvoiceId} AND organization_id = ${record.organizationId}
							AND status = 'posted'
					),
					credited AS (
						INSERT INTO sales_credit_note (
							id, organization_id, code, normalized_code, status, customer_party_id,
							customer_party_code, customer_party_name, sales_invoice_id, currency_code, amount,
							issue_idempotency_key, version, created_by, updated_by, posted_at, posted_by
						)
						SELECT ${id}, organization_id, ${record.code}, ${record.normalizedCode}, 'posted',
							customer_party_id, customer_party_code, customer_party_name, id, currency_code,
							${record.amount}, ${record.idempotencyKey}, 1, ${record.actorUserId},
							${record.actorUserId}, now(), ${record.actorUserId}
						FROM eligible WHERE currency_code = ${record.currencyCode}
							AND customer_party_id = ${record.customerId}
							AND ${record.amount}::numeric > 0 AND ${record.amount}::numeric <= open_amount
						RETURNING *
					),
					bumped AS (
						UPDATE sales_invoice SET version = version + 1, updated_at = now(), updated_by = ${record.actorUserId}
						WHERE id = ${record.salesInvoiceId} AND organization_id = ${record.organizationId}
							AND EXISTS (SELECT 1 FROM credited) RETURNING *
					),
					projected AS (
						INSERT INTO customer_balance_projection (
							id, organization_id, customer_party_id, currency_code, open_balance, version, created_by, updated_by
						)
						SELECT ${balanceId}, organization_id, customer_party_id, currency_code,
							(-amount::numeric)::text, 1, ${record.actorUserId}, ${record.actorUserId} FROM credited
						ON CONFLICT (organization_id, customer_party_id, currency_code) DO UPDATE SET
							open_balance = (customer_balance_projection.open_balance::numeric + EXCLUDED.open_balance::numeric)::text,
							version = customer_balance_projection.version + 1, updated_at = now(), updated_by = ${record.actorUserId}
						RETURNING id
					),
					outboxed AS (
						INSERT INTO platform_domain_event (
							id, organization_id, type, source_module, correlation_id, actor_user_id, payload, status, attempts
						)
						SELECT ${eventId}, organization_id, 'receivables.credit_note.posted.v1', 'receivables',
							${record.correlationId}, ${record.actorUserId},
							jsonb_build_object('organizationId', organization_id, 'entityId', id,
								'customerId', customer_party_id, 'amount', amount, 'currencyCode', currency_code,
								'actorId', ${record.actorUserId}, 'correlationId', ${record.correlationId}), 'pending', 0
						FROM credited RETURNING id
					)
					SELECT credited.id FROM credited, bumped, projected, outboxed
				`,
			]);
			if (rows[0] === undefined)
				return fail("CONFLICT", "Credit note issue conflict");
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
			return credit === undefined
				? fail("INTERNAL_ERROR", "Issued credit note missing")
				: ok(mapCredit(credit));
		} catch (error) {
			return failFromUnknown(error, "Failed to issue credit note");
		}
	}

	async applyReceipt(
		record: Parameters<ReceivablesStore["applyReceipt"]>[0],
	): Promise<Result<CustomerAllocation>> {
		try {
			const [existing] = await db
				.select()
				.from(customerAllocation)
				.where(
					and(
						eq(customerAllocation.organizationId, record.organizationId),
						eq(customerAllocation.applyIdempotencyKey, record.idempotencyKey),
					),
				)
				.limit(1);
			if (existing !== undefined) return ok(mapAllocation(existing));

			const id = randomUUID();
			const eventId = randomUUID();
			const [rows] = await runNeonHttpTransaction<[{ id: string }[]]>((sql) => [
				sql`
					WITH eligible AS (
						SELECT invoice.*, (SELECT COALESCE(SUM(line_amount::numeric), 0) FROM sales_invoice_line
							WHERE invoice_id = invoice.id AND organization_id = invoice.organization_id)
							- (SELECT COALESCE(SUM(amount::numeric), 0) FROM customer_allocation
								WHERE sales_invoice_id = invoice.id AND organization_id = invoice.organization_id AND status = 'active')
							- (SELECT COALESCE(SUM(amount::numeric), 0) FROM sales_credit_note
								WHERE sales_invoice_id = invoice.id AND organization_id = invoice.organization_id AND status = 'posted')
							AS open_amount
						FROM sales_invoice invoice
						WHERE id = ${record.invoiceId} AND organization_id = ${record.organizationId}
							AND status = 'posted' AND version = ${record.expectedInvoiceVersion}
					),
					mutated AS (
						UPDATE sales_invoice SET version = version + 1, updated_at = now(), updated_by = ${record.actorUserId}
						WHERE id = ${record.invoiceId} AND organization_id = ${record.organizationId}
							AND ${record.amount}::numeric > 0 AND ${record.amount}::numeric <= (SELECT open_amount FROM eligible)
						RETURNING *
					),
					allocated AS (
						INSERT INTO customer_allocation (
							id, organization_id, customer_party_id, sales_invoice_id, payment_id,
							payment_application_instruction_id, status, amount, allocated_at, allocated_by,
							apply_idempotency_key, version, created_by, updated_by
						)
						SELECT ${id}, organization_id, customer_party_id, id, ${record.paymentId},
							${record.paymentApplicationInstructionId}, 'active', ${record.amount}, now(),
							${record.actorUserId}, ${record.idempotencyKey}, 1, ${record.actorUserId}, ${record.actorUserId}
						FROM mutated RETURNING *
					),
					projected AS (
						UPDATE customer_balance_projection SET
							open_balance = (open_balance::numeric - ${record.amount}::numeric)::text,
							version = version + 1, updated_at = now(), updated_by = ${record.actorUserId}
						WHERE organization_id = ${record.organizationId}
							AND customer_party_id = (SELECT customer_party_id FROM mutated)
							AND currency_code = (SELECT currency_code FROM mutated)
						RETURNING id
					),
					outboxed AS (
						INSERT INTO platform_domain_event (
							id, organization_id, type, source_module, correlation_id, actor_user_id, payload, status, attempts
						)
						SELECT ${eventId}, organization_id, 'receivables.receipt_application.posted.v1', 'receivables',
							${record.correlationId}, ${record.actorUserId},
							jsonb_build_object('organizationId', organization_id, 'entityId', id,
								'customerId', customer_party_id, 'amount', amount, 'currencyCode',
								(SELECT currency_code FROM mutated), 'actorId', ${record.actorUserId},
								'correlationId', ${record.correlationId}), 'pending', 0
						FROM allocated RETURNING id
					)
					SELECT allocated.id FROM allocated, projected, outboxed
				`,
			]);
			if (rows[0] === undefined)
				return fail("CONFLICT", "Customer receipt application conflict");
			const [allocation] = await db
				.select()
				.from(customerAllocation)
				.where(
					and(
						eq(customerAllocation.organizationId, record.organizationId),
						eq(customerAllocation.id, id),
					),
				)
				.limit(1);
			return allocation === undefined
				? fail("INTERNAL_ERROR", "Created receipt application missing")
				: ok(mapAllocation(allocation));
		} catch (error) {
			return failFromUnknown(error, "Failed to apply customer receipt");
		}
	}

	async reverseReceiptApplication(
		record: Parameters<ReceivablesStore["reverseReceiptApplication"]>[0],
	): Promise<Result<CustomerAllocation>> {
		try {
			const eventId = randomUUID();
			const [rows] = await runNeonHttpTransaction<[{ id: string }[]]>((sql) => [
				sql`
					WITH reversed AS (
						UPDATE customer_allocation SET status = 'reversed', reversed_at = now(),
							reversed_by = ${record.actorUserId}, updated_at = now(), updated_by = ${record.actorUserId},
							version = version + 1
						WHERE id = ${record.allocationId} AND organization_id = ${record.organizationId}
							AND status = 'active'
						RETURNING *
					),
					mutated AS (
						UPDATE sales_invoice invoice SET status = CASE WHEN invoice.status = 'closed' THEN 'posted' ELSE invoice.status END,
							closed_at = CASE WHEN invoice.status = 'closed' THEN NULL ELSE invoice.closed_at END,
							closed_by = CASE WHEN invoice.status = 'closed' THEN NULL ELSE invoice.closed_by END,
							version = version + 1, updated_at = now(), updated_by = ${record.actorUserId}
						FROM reversed WHERE invoice.id = reversed.sales_invoice_id
							AND invoice.organization_id = ${record.organizationId}
						RETURNING invoice.*
					),
					projected AS (
						UPDATE customer_balance_projection balance SET
							open_balance = (balance.open_balance::numeric + reversed.amount::numeric)::text,
							version = balance.version + 1, updated_at = now(), updated_by = ${record.actorUserId}
						FROM reversed, mutated WHERE balance.organization_id = ${record.organizationId}
							AND balance.customer_party_id = reversed.customer_party_id AND balance.currency_code = mutated.currency_code
						RETURNING balance.id
					),
					outboxed AS (
						INSERT INTO platform_domain_event (
							id, organization_id, type, source_module, correlation_id, actor_user_id, payload, status, attempts
						)
						SELECT ${eventId}, organization_id, 'receivables.receipt_application.reversed.v1', 'receivables',
							${record.correlationId}, ${record.actorUserId},
							jsonb_build_object('organizationId', organization_id, 'entityId', id, 'customerId',
								customer_party_id, 'amount', amount, 'currencyCode', (SELECT currency_code FROM mutated),
								'actorId', ${record.actorUserId}, 'correlationId', ${record.correlationId}), 'pending', 0
						FROM reversed RETURNING id
					)
					SELECT reversed.id FROM reversed, mutated, projected, outboxed
				`,
			]);
			if (rows[0] === undefined) {
				const [allocation] = await db
					.select()
					.from(customerAllocation)
					.where(
						and(
							eq(customerAllocation.organizationId, record.organizationId),
							eq(customerAllocation.id, record.allocationId),
						),
					)
					.limit(1);
				return allocation?.status === "reversed"
					? ok(mapAllocation(allocation))
					: fail("CONFLICT", "Customer receipt application reversal conflict");
			}
			const [allocation] = await db
				.select()
				.from(customerAllocation)
				.where(
					and(
						eq(customerAllocation.organizationId, record.organizationId),
						eq(customerAllocation.id, record.allocationId),
					),
				)
				.limit(1);
			return allocation === undefined
				? fail("INTERNAL_ERROR", "Reversed receipt application missing")
				: ok(mapAllocation(allocation));
		} catch (error) {
			return failFromUnknown(
				error,
				"Failed to reverse customer receipt application",
			);
		}
	}

	async reverseAllocationsByPayment(
		record: Parameters<ReceivablesStore["reverseAllocationsByPayment"]>[0],
	): Promise<Result<CustomerAllocation[]>> {
		try {
			const allocations = await db
				.select({ id: customerAllocation.id })
				.from(customerAllocation)
				.where(
					and(
						eq(customerAllocation.organizationId, record.organizationId),
						eq(customerAllocation.paymentId, record.paymentId),
						eq(customerAllocation.status, "active"),
					),
				);
			const results = await Promise.all(
				allocations.map((allocation) =>
					this.reverseReceiptApplication({
						organizationId: record.organizationId,
						allocationId: allocation.id,
						idempotencyKey: `${record.idempotencyKey}:${allocation.id}`,
						actorUserId: record.actorUserId,
						correlationId: record.correlationId,
						effects: record.effects,
					}),
				),
			);
			const reversed: CustomerAllocation[] = [];
			for (const result of results) {
				if (!result.ok) return result;
				reversed.push(result.data);
			}
			return ok(reversed);
		} catch (error) {
			return failFromUnknown(
				error,
				"Failed to reverse customer receipt applications",
			);
		}
	}

	async cancelDraft(
		record: Parameters<ReceivablesStore["cancelDraft"]>[0],
	): Promise<Result<SalesInvoice>> {
		try {
			const [existing] = await db
				.select({ id: salesInvoice.id })
				.from(salesInvoice)
				.where(
					and(
						eq(salesInvoice.organizationId, record.organizationId),
						eq(salesInvoice.cancelIdempotencyKey, record.idempotencyKey),
					),
				)
				.limit(1);
			if (existing !== undefined)
				return reload(
					this,
					record.organizationId,
					existing.id,
					"Cancelled invoice missing",
				);
			const eventId = randomUUID();
			const [rows] = await runNeonHttpTransaction<[{ id: string }[]]>((sql) => [
				sql`
					WITH mutated AS (
						UPDATE sales_invoice SET status = 'cancelled', cancelled_at = now(), cancelled_by = ${record.actorUserId},
							cancel_idempotency_key = ${record.idempotencyKey}, updated_at = now(), updated_by = ${record.actorUserId},
							version = version + 1
						WHERE id = ${record.invoiceId} AND organization_id = ${record.organizationId}
							AND status = 'draft' AND version = ${record.expectedVersion} RETURNING *
					),
					outboxed AS (
						INSERT INTO platform_domain_event (id, organization_id, type, source_module, correlation_id, actor_user_id, payload, status, attempts)
						SELECT ${eventId}, organization_id, 'receivables.invoice.cancelled.v1', 'receivables',
							${record.correlationId}, ${record.actorUserId},
							jsonb_build_object('organizationId', organization_id, 'entityId', id, 'customerId', customer_party_id,
								'amount', '0', 'currencyCode', currency_code, 'actorId', ${record.actorUserId},
								'correlationId', ${record.correlationId}), 'pending', 0 FROM mutated RETURNING id
					)
					SELECT mutated.id FROM mutated, outboxed
				`,
			]);
			if (rows[0] === undefined)
				return fail("CONFLICT", "Only draft sales invoices can be cancelled");
			return reload(
				this,
				record.organizationId,
				record.invoiceId,
				"Cancelled invoice missing",
			);
		} catch (error) {
			return failFromUnknown(error, "Failed to cancel draft sales invoice");
		}
	}

	async closeInvoice(
		record: Parameters<ReceivablesStore["closeInvoice"]>[0],
	): Promise<Result<SalesInvoice>> {
		try {
			const [existing] = await db
				.select({ id: salesInvoice.id })
				.from(salesInvoice)
				.where(
					and(
						eq(salesInvoice.organizationId, record.organizationId),
						eq(salesInvoice.closeIdempotencyKey, record.idempotencyKey),
					),
				)
				.limit(1);
			if (existing !== undefined)
				return reload(
					this,
					record.organizationId,
					existing.id,
					"Closed invoice missing",
				);
			const eventId = randomUUID();
			const [rows] = await runNeonHttpTransaction<[{ id: string }[]]>((sql) => [
				sql`
					WITH eligible AS (
						SELECT invoice.id FROM sales_invoice invoice
						WHERE invoice.id = ${record.invoiceId} AND invoice.organization_id = ${record.organizationId}
							AND invoice.status = 'posted' AND invoice.version = ${record.expectedVersion}
							AND (SELECT COALESCE(SUM(line_amount::numeric), 0) FROM sales_invoice_line
								WHERE invoice_id = invoice.id AND organization_id = invoice.organization_id)
								- (SELECT COALESCE(SUM(amount::numeric), 0) FROM customer_allocation
									WHERE sales_invoice_id = invoice.id AND organization_id = invoice.organization_id AND status = 'active')
								- (SELECT COALESCE(SUM(amount::numeric), 0) FROM sales_credit_note
									WHERE sales_invoice_id = invoice.id AND organization_id = invoice.organization_id AND status = 'posted') = 0
					),
					mutated AS (
						UPDATE sales_invoice SET status = 'closed', closed_at = now(), closed_by = ${record.actorUserId},
							close_idempotency_key = ${record.idempotencyKey}, updated_at = now(), updated_by = ${record.actorUserId},
							version = version + 1 WHERE id = ${record.invoiceId} AND organization_id = ${record.organizationId}
							AND EXISTS (SELECT 1 FROM eligible) RETURNING *
					),
					outboxed AS (
						INSERT INTO platform_domain_event (id, organization_id, type, source_module, correlation_id, actor_user_id, payload, status, attempts)
						SELECT ${eventId}, organization_id, 'receivables.invoice.closed.v1', 'receivables',
							${record.correlationId}, ${record.actorUserId},
							jsonb_build_object('organizationId', organization_id, 'entityId', id, 'customerId', customer_party_id,
								'amount', '0', 'currencyCode', currency_code, 'actorId', ${record.actorUserId},
								'correlationId', ${record.correlationId}), 'pending', 0 FROM mutated RETURNING id
					)
					SELECT mutated.id FROM mutated, outboxed
				`,
			]);
			if (rows[0] === undefined)
				return fail("CONFLICT", "Invoice open amount must be zero to close");
			return reload(
				this,
				record.organizationId,
				record.invoiceId,
				"Closed invoice missing",
			);
		} catch (error) {
			return failFromUnknown(error, "Failed to close sales invoice");
		}
	}

	async getById(
		organizationId: string,
		id: string,
	): Promise<Result<SalesInvoice | null>> {
		try {
			const [header] = await db
				.select()
				.from(salesInvoice)
				.where(
					and(
						eq(salesInvoice.organizationId, organizationId),
						eq(salesInvoice.id, id),
					),
				)
				.limit(1);
			if (header === undefined) return ok(null);
			const [lines, allocations, credits] = await Promise.all([
				db
					.select()
					.from(salesInvoiceLine)
					.where(
						and(
							eq(salesInvoiceLine.organizationId, organizationId),
							eq(salesInvoiceLine.invoiceId, id),
						),
					)
					.orderBy(asc(salesInvoiceLine.lineNo)),
				db
					.select()
					.from(customerAllocation)
					.where(
						and(
							eq(customerAllocation.organizationId, organizationId),
							eq(customerAllocation.salesInvoiceId, id),
							eq(customerAllocation.status, "active"),
						),
					),
				db
					.select()
					.from(salesCreditNote)
					.where(
						and(
							eq(salesCreditNote.organizationId, organizationId),
							eq(salesCreditNote.salesInvoiceId, id),
							eq(salesCreditNote.status, "posted"),
						),
					),
			]);
			return ok(
				mapInvoice(
					header,
					lines.map(mapLine),
					[...allocations, ...credits].reduce(
						(sum, row) => sum + Number(row.amount),
						0,
					),
				),
			);
		} catch (error) {
			return failFromUnknown(error, "Failed to load sales invoice");
		}
	}

	async list(
		filter: Parameters<ReceivablesStore["list"]>[0],
	): Promise<Result<SalesInvoice[]>> {
		try {
			const conditions = [
				eq(salesInvoice.organizationId, filter.organizationId),
			];
			if (filter.status !== undefined)
				conditions.push(eq(salesInvoice.status, filter.status));
			const headers = await db
				.select()
				.from(salesInvoice)
				.where(and(...conditions))
				.orderBy(desc(salesInvoice.updatedAt), desc(salesInvoice.id))
				.limit(filter.pageSize)
				.offset((filter.page - 1) * filter.pageSize);
			if (headers.length === 0) return ok([]);
			const ids = headers.map((header) => header.id);
			const [lines, allocations, credits] = await Promise.all([
				db
					.select()
					.from(salesInvoiceLine)
					.where(
						and(
							eq(salesInvoiceLine.organizationId, filter.organizationId),
							inArray(salesInvoiceLine.invoiceId, ids),
						),
					)
					.orderBy(asc(salesInvoiceLine.lineNo)),
				db
					.select()
					.from(customerAllocation)
					.where(
						and(
							eq(customerAllocation.organizationId, filter.organizationId),
							inArray(customerAllocation.salesInvoiceId, ids),
							eq(customerAllocation.status, "active"),
						),
					),
				db
					.select()
					.from(salesCreditNote)
					.where(
						and(
							eq(salesCreditNote.organizationId, filter.organizationId),
							inArray(salesCreditNote.salesInvoiceId, ids),
							eq(salesCreditNote.status, "posted"),
						),
					),
			]);
			const linesByInvoice = new Map<string, SalesInvoiceLine[]>();
			for (const line of lines)
				linesByInvoice.set(line.invoiceId, [
					...(linesByInvoice.get(line.invoiceId) ?? []),
					mapLine(line),
				]);
			const appliedByInvoice = new Map<string, number>();
			for (const row of allocations)
				appliedByInvoice.set(
					row.salesInvoiceId,
					(appliedByInvoice.get(row.salesInvoiceId) ?? 0) + Number(row.amount),
				);
			for (const credit of credits)
				if (credit.salesInvoiceId !== null)
					appliedByInvoice.set(
						credit.salesInvoiceId,
						(appliedByInvoice.get(credit.salesInvoiceId) ?? 0) +
							Number(credit.amount),
					);
			return ok(
				headers.map((header) =>
					mapInvoice(
						header,
						linesByInvoice.get(header.id) ?? [],
						appliedByInvoice.get(header.id) ?? 0,
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
			if (currencyCode !== undefined)
				conditions.push(
					eq(customerBalanceProjection.currencyCode, currencyCode),
				);
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

	async getAging(
		input: Parameters<ReceivablesStore["getAging"]>[0],
	): Promise<Result<CustomerAging>> {
		const invoices = await this.list({
			organizationId: input.organizationId,
			page: 1,
			pageSize: 100,
			status: "posted",
		});
		if (!invoices.ok) return invoices;
		const asOf = new Date(`${input.asOfDate}T23:59:59.999Z`);
		const buckets = {
			current: 0,
			days1to30: 0,
			days31to60: 0,
			days61to90: 0,
			over90: 0,
		};
		for (const invoice of invoices.data) {
			if (
				invoice.customerId !== input.customerId ||
				invoice.currencyCode !== input.currencyCode ||
				Number(invoice.openAmount) <= 0
			)
				continue;
			const due = invoice.dueDate ?? invoice.postedAt ?? invoice.createdAt;
			const days = Math.floor((asOf.getTime() - due.getTime()) / 86_400_000);
			if (days <= 0) buckets.current += Number(invoice.openAmount);
			else if (days <= 30) buckets.days1to30 += Number(invoice.openAmount);
			else if (days <= 60) buckets.days31to60 += Number(invoice.openAmount);
			else if (days <= 90) buckets.days61to90 += Number(invoice.openAmount);
			else buckets.over90 += Number(invoice.openAmount);
		}
		const formatted = Object.fromEntries(
			Object.entries(buckets).map(([key, value]) => [key, String(value)]),
		) as CustomerAging["buckets"];
		return ok({
			organizationId: input.organizationId,
			customerId: input.customerId,
			currencyCode: input.currencyCode,
			asOfDate: input.asOfDate,
			buckets: formatted,
			totalOpen: String(
				Object.values(buckets).reduce((sum, value) => sum + value, 0),
			),
		});
	}

	async sumPostedQuantityForSourceLine(
		input: Parameters<ReceivablesStore["sumPostedQuantityForSourceLine"]>[0],
	): Promise<Result<string>> {
		try {
			const headers = await db
				.select({ id: salesInvoice.id })
				.from(salesInvoice)
				.where(
					and(
						eq(salesInvoice.organizationId, input.organizationId),
						inArray(salesInvoice.status, ["posted", "closed"]),
					),
				);
			const ids = headers
				.filter((header) => header.id !== input.excludeInvoiceId)
				.map((header) => header.id);
			if (ids.length === 0) return ok("0");
			const conditions = [
				eq(salesInvoiceLine.organizationId, input.organizationId),
				inArray(salesInvoiceLine.invoiceId, ids),
			];
			if (input.salesOrderLineId !== undefined)
				conditions.push(
					eq(salesInvoiceLine.salesOrderLineId, input.salesOrderLineId),
				);
			if (input.deliveryLineId !== undefined)
				conditions.push(
					eq(salesInvoiceLine.deliveryLineId, input.deliveryLineId),
				);
			const lines = await db
				.select({ quantity: salesInvoiceLine.quantity })
				.from(salesInvoiceLine)
				.where(and(...conditions));
			return ok(
				String(lines.reduce((sum, line) => sum + Number(line.quantity), 0)),
			);
		} catch (error) {
			return failFromUnknown(error, "Failed to sum posted invoice quantity");
		}
	}

	async listPostedFactsForReconcile(organizationId: string): Promise<
		Result<{
			invoices: Array<{
				id: string;
				customerId: string;
				currencyCode: string;
				totalAmount: string;
				status: SalesInvoiceStatus;
			}>;
			credits: Array<{
				id: string;
				customerId: string;
				currencyCode: string;
				amount: string;
				status: string;
			}>;
			allocations: Array<{
				id: string;
				customerId: string;
				invoiceId: string;
				amount: string;
				status: string;
			}>;
			balances: CustomerBalance[];
		}>
	> {
		try {
			const [invoiceResult, credits, allocations] = await Promise.all([
				this.list({ organizationId, page: 1, pageSize: 100, status: "posted" }),
				db
					.select()
					.from(salesCreditNote)
					.where(
						and(
							eq(salesCreditNote.organizationId, organizationId),
							eq(salesCreditNote.status, "posted"),
						),
					),
				db
					.select()
					.from(customerAllocation)
					.where(
						and(
							eq(customerAllocation.organizationId, organizationId),
							eq(customerAllocation.status, "active"),
						),
					),
			]);
			if (!invoiceResult.ok) return invoiceResult;
			const closed = await this.list({
				organizationId,
				page: 1,
				pageSize: 100,
				status: "closed",
			});
			if (!closed.ok) return closed;
			const balanceRows = await db
				.select()
				.from(customerBalanceProjection)
				.where(eq(customerBalanceProjection.organizationId, organizationId));
			return ok({
				invoices: [...invoiceResult.data, ...closed.data].map((invoice) => ({
					id: invoice.id,
					customerId: invoice.customerId,
					currencyCode: invoice.currencyCode,
					totalAmount: invoice.totalAmount,
					status: invoice.status,
				})),
				credits: credits.map((credit) => ({
					id: credit.id,
					customerId: credit.customerPartyId,
					currencyCode: credit.currencyCode,
					amount: credit.amount,
					status: credit.status,
				})),
				allocations: allocations.map((allocation) => ({
					id: allocation.id,
					customerId: allocation.customerPartyId,
					invoiceId: allocation.salesInvoiceId,
					amount: allocation.amount,
					status: allocation.status,
				})),
				balances: balanceRows.map((row) => ({
					organizationId: row.organizationId,
					customerId: row.customerPartyId,
					currencyCode: row.currencyCode,
					openBalance: row.openBalance,
					updatedAt: row.updatedAt,
				})),
			});
		} catch (error) {
			return failFromUnknown(
				error,
				"Failed to load receivables reconciliation facts",
			);
		}
	}
}

export function createDrizzleReceivablesStore(): DrizzleReceivablesStore {
	return new DrizzleReceivablesStore();
}
