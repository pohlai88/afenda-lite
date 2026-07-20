/**
 * N9 / ARCH-023 — assert zero null `organization_id` on hard tenant roots.
 *
 * Table inventory matches `HARD_TENANT_ROOT_TABLE_NAMES` in
 * `packages/data-plane/db/src/hard-tenant-roots.ts` (kept as a plain list here so Node
 * can run without resolving Drizzle TS extensionless imports).
 *
 * Usage: pnpm audit:tenancy-nulls
 * Requires DATABASE_URL (pooled product URL from `.env.local`).
 */

import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { getEnvValue, loadLocalEnv } from "./lib/env-files.mjs";

/** ARCH-023 · RB-001 §3.4 — must stay aligned with HARD_TENANT_ROOT_TABLE_NAMES. */
const HARD_TENANT_ROOT_TABLE_NAMES = [
	"platform_role_assignment",
	"platform_rbac_audit",
	"platform_audit_log",
	"platform_search_document",
	"platform_notification",
	"platform_domain_event",
	"md_party",
	"md_item_group",
	"md_item",
	"md_warehouse",
	"md_payment_term",
	"md_tax_registration",
	"md_party_role",
	"md_party_address",
	"md_party_contact",
	"md_party_external_id",
	"md_party_relationship",
	"md_item_uom",
	"md_item_barcode",
	"md_item_external_id",
	"md_item_alias",
	"md_warehouse_external_id",
	"md_item_template",
	"md_item_template_attribute",
	"md_item_template_attribute_option",
	"md_item_variant",
	"md_item_variant_attribute_value",
	"md_change_request",
	"sales_order",
	"sales_order_line",
	"purchase_order",
	"purchase_order_line",
	"sales_invoice",
	"sales_invoice_line",
	"sales_credit_note",
	"customer_allocation",
	"customer_balance_projection",
	"supplier_invoice",
	"supplier_invoice_line",
	"supplier_credit_note",
	"supplier_allocation",
	"three_way_match_result",
	"supplier_balance_projection",
	"payment",
	"payment_allocation",
	"payment_reversal",
	"stock_movement",
	"stock_movement_line",
	"stock_balance",
	"stock_ledger_entry",
	"stock_reservation",
	"goods_receipt",
	"goods_receipt_line",
	"receiving_discrepancy",
	"delivery",
	"delivery_line",
	"delivery_pick",
	"delivery_pack",
	"proof_of_delivery",
	"journal",
	"journal_line",
	"ledger_posting",
	"accounting_period",
];

const fileEnv = loadLocalEnv();
const databaseUrl = getEnvValue("DATABASE_URL", fileEnv);

if (!databaseUrl || databaseUrl.trim().length === 0) {
	console.error(
		"audit:tenancy-nulls FAIL — DATABASE_URL missing (set in .env.local)",
	);
	process.exit(1);
}

const serverlessUrl = pathToFileURL(
	resolve(
		process.cwd(),
		"packages/data-plane/db/node_modules/@neondatabase/serverless/index.mjs",
	),
).href;
const { neon } = await import(serverlessUrl);
const sql = neon(databaseUrl.trim());

/** Fixed tagged queries — table names never interpolated from user input. */
const NULL_COUNT_BY_TABLE = {
	platform_role_assignment: () =>
		sql`SELECT count(*)::int AS null_count FROM platform_role_assignment WHERE organization_id IS NULL`,
	platform_rbac_audit: () =>
		sql`SELECT count(*)::int AS null_count FROM platform_rbac_audit WHERE organization_id IS NULL`,
	platform_audit_log: () =>
		sql`SELECT count(*)::int AS null_count FROM platform_audit_log WHERE organization_id IS NULL`,
	platform_search_document: () =>
		sql`SELECT count(*)::int AS null_count FROM platform_search_document WHERE organization_id IS NULL`,
	platform_notification: () =>
		sql`SELECT count(*)::int AS null_count FROM platform_notification WHERE organization_id IS NULL`,
	platform_domain_event: () =>
		sql`SELECT count(*)::int AS null_count FROM platform_domain_event WHERE organization_id IS NULL`,
	md_party: () =>
		sql`SELECT count(*)::int AS null_count FROM md_party WHERE organization_id IS NULL`,
	md_item_group: () =>
		sql`SELECT count(*)::int AS null_count FROM md_item_group WHERE organization_id IS NULL`,
	md_item: () =>
		sql`SELECT count(*)::int AS null_count FROM md_item WHERE organization_id IS NULL`,
	md_warehouse: () =>
		sql`SELECT count(*)::int AS null_count FROM md_warehouse WHERE organization_id IS NULL`,
	md_payment_term: () =>
		sql`SELECT count(*)::int AS null_count FROM md_payment_term WHERE organization_id IS NULL`,
	md_tax_registration: () =>
		sql`SELECT count(*)::int AS null_count FROM md_tax_registration WHERE organization_id IS NULL`,
	md_party_role: () =>
		sql`SELECT count(*)::int AS null_count FROM md_party_role WHERE organization_id IS NULL`,
	md_party_address: () =>
		sql`SELECT count(*)::int AS null_count FROM md_party_address WHERE organization_id IS NULL`,
	md_party_contact: () =>
		sql`SELECT count(*)::int AS null_count FROM md_party_contact WHERE organization_id IS NULL`,
	md_party_external_id: () =>
		sql`SELECT count(*)::int AS null_count FROM md_party_external_id WHERE organization_id IS NULL`,
	md_party_relationship: () =>
		sql`SELECT count(*)::int AS null_count FROM md_party_relationship WHERE organization_id IS NULL`,
	md_item_uom: () =>
		sql`SELECT count(*)::int AS null_count FROM md_item_uom WHERE organization_id IS NULL`,
	md_item_barcode: () =>
		sql`SELECT count(*)::int AS null_count FROM md_item_barcode WHERE organization_id IS NULL`,
	md_item_external_id: () =>
		sql`SELECT count(*)::int AS null_count FROM md_item_external_id WHERE organization_id IS NULL`,
	md_item_alias: () =>
		sql`SELECT count(*)::int AS null_count FROM md_item_alias WHERE organization_id IS NULL`,
	md_warehouse_external_id: () =>
		sql`SELECT count(*)::int AS null_count FROM md_warehouse_external_id WHERE organization_id IS NULL`,
	md_item_template: () =>
		sql`SELECT count(*)::int AS null_count FROM md_item_template WHERE organization_id IS NULL`,
	md_item_template_attribute: () =>
		sql`SELECT count(*)::int AS null_count FROM md_item_template_attribute WHERE organization_id IS NULL`,
	md_item_template_attribute_option: () =>
		sql`SELECT count(*)::int AS null_count FROM md_item_template_attribute_option WHERE organization_id IS NULL`,
	md_item_variant: () =>
		sql`SELECT count(*)::int AS null_count FROM md_item_variant WHERE organization_id IS NULL`,
	md_item_variant_attribute_value: () =>
		sql`SELECT count(*)::int AS null_count FROM md_item_variant_attribute_value WHERE organization_id IS NULL`,
	md_change_request: () =>
		sql`SELECT count(*)::int AS null_count FROM md_change_request WHERE organization_id IS NULL`,
	sales_order: () =>
		sql`SELECT count(*)::int AS null_count FROM sales_order WHERE organization_id IS NULL`,
	sales_order_line: () =>
		sql`SELECT count(*)::int AS null_count FROM sales_order_line WHERE organization_id IS NULL`,
	purchase_order: () =>
		sql`SELECT count(*)::int AS null_count FROM purchase_order WHERE organization_id IS NULL`,
	purchase_order_line: () =>
		sql`SELECT count(*)::int AS null_count FROM purchase_order_line WHERE organization_id IS NULL`,
	sales_invoice: () =>
		sql`SELECT count(*)::int AS null_count FROM sales_invoice WHERE organization_id IS NULL`,
	sales_invoice_line: () =>
		sql`SELECT count(*)::int AS null_count FROM sales_invoice_line WHERE organization_id IS NULL`,
	sales_credit_note: () =>
		sql`SELECT count(*)::int AS null_count FROM sales_credit_note WHERE organization_id IS NULL`,
	customer_allocation: () =>
		sql`SELECT count(*)::int AS null_count FROM customer_allocation WHERE organization_id IS NULL`,
	customer_balance_projection: () =>
		sql`SELECT count(*)::int AS null_count FROM customer_balance_projection WHERE organization_id IS NULL`,
	supplier_invoice: () =>
		sql`SELECT count(*)::int AS null_count FROM supplier_invoice WHERE organization_id IS NULL`,
	supplier_invoice_line: () =>
		sql`SELECT count(*)::int AS null_count FROM supplier_invoice_line WHERE organization_id IS NULL`,
	supplier_credit_note: () =>
		sql`SELECT count(*)::int AS null_count FROM supplier_credit_note WHERE organization_id IS NULL`,
	supplier_allocation: () =>
		sql`SELECT count(*)::int AS null_count FROM supplier_allocation WHERE organization_id IS NULL`,
	three_way_match_result: () =>
		sql`SELECT count(*)::int AS null_count FROM three_way_match_result WHERE organization_id IS NULL`,
	supplier_balance_projection: () =>
		sql`SELECT count(*)::int AS null_count FROM supplier_balance_projection WHERE organization_id IS NULL`,
	payment: () =>
		sql`SELECT count(*)::int AS null_count FROM payment WHERE organization_id IS NULL`,
	payment_allocation: () =>
		sql`SELECT count(*)::int AS null_count FROM payment_allocation WHERE organization_id IS NULL`,
	payment_reversal: () =>
		sql`SELECT count(*)::int AS null_count FROM payment_reversal WHERE organization_id IS NULL`,
	stock_movement: () =>
		sql`SELECT count(*)::int AS null_count FROM stock_movement WHERE organization_id IS NULL`,
	stock_movement_line: () =>
		sql`SELECT count(*)::int AS null_count FROM stock_movement_line WHERE organization_id IS NULL`,
	stock_balance: () =>
		sql`SELECT count(*)::int AS null_count FROM stock_balance WHERE organization_id IS NULL`,
	stock_ledger_entry: () =>
		sql`SELECT count(*)::int AS null_count FROM stock_ledger_entry WHERE organization_id IS NULL`,
	stock_reservation: () =>
		sql`SELECT count(*)::int AS null_count FROM stock_reservation WHERE organization_id IS NULL`,
	goods_receipt: () =>
		sql`SELECT count(*)::int AS null_count FROM goods_receipt WHERE organization_id IS NULL`,
	goods_receipt_line: () =>
		sql`SELECT count(*)::int AS null_count FROM goods_receipt_line WHERE organization_id IS NULL`,
	receiving_discrepancy: () =>
		sql`SELECT count(*)::int AS null_count FROM receiving_discrepancy WHERE organization_id IS NULL`,
	delivery: () =>
		sql`SELECT count(*)::int AS null_count FROM delivery WHERE organization_id IS NULL`,
	delivery_line: () =>
		sql`SELECT count(*)::int AS null_count FROM delivery_line WHERE organization_id IS NULL`,
	delivery_pick: () =>
		sql`SELECT count(*)::int AS null_count FROM delivery_pick WHERE organization_id IS NULL`,
	delivery_pack: () =>
		sql`SELECT count(*)::int AS null_count FROM delivery_pack WHERE organization_id IS NULL`,
	proof_of_delivery: () =>
		sql`SELECT count(*)::int AS null_count FROM proof_of_delivery WHERE organization_id IS NULL`,
	journal: () =>
		sql`SELECT count(*)::int AS null_count FROM journal WHERE organization_id IS NULL`,
	journal_line: () =>
		sql`SELECT count(*)::int AS null_count FROM journal_line WHERE organization_id IS NULL`,
	ledger_posting: () =>
		sql`SELECT count(*)::int AS null_count FROM ledger_posting WHERE organization_id IS NULL`,
	accounting_period: () =>
		sql`SELECT count(*)::int AS null_count FROM accounting_period WHERE organization_id IS NULL`,
};

console.log(
	`audit:tenancy-nulls — ${HARD_TENANT_ROOT_TABLE_NAMES.length} hard tenant roots (ARCH-023)`,
);

let failed = 0;

for (const table of HARD_TENANT_ROOT_TABLE_NAMES) {
	const query = NULL_COUNT_BY_TABLE[table];
	if (typeof query !== "function") {
		console.error(`  FAIL  ${table}: no query registered`);
		failed += 1;
		continue;
	}
	const result = await query();
	const nullCount = Number(result[0]?.null_count ?? 0);
	const ok = nullCount === 0;
	if (ok) {
		console.log(`  OK    ${table}: null_count=0`);
	} else {
		console.error(`  FAIL  ${table}: null_count=${nullCount}`);
		failed += 1;
	}
}

if (failed > 0) {
	console.error(`audit:tenancy-nulls FAIL — ${failed} table(s)`);
	process.exit(1);
}

console.log("audit:tenancy-nulls PASS");
