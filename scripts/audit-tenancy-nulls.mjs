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
	"md_import_batch",
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
	"supplier_credit_note_line",
	"supplier_allocation",
	"three_way_match_result",
	"supplier_balance_projection",
	"payment_account",
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
	"chart_of_account",
	"ledger_account",
	"account_role_mapping",
	"posting_profile",
	"posting_profile_line",
	"source_posting_link",
	"financial_posting_exception",
	"hr_employee",
	"hr_employment",
	"hr_employment_contract",
	"hr_work_assignment",
	"hr_department",
	"hr_job",
	"hr_position",
	"hr_reporting_line",
	"hr_employment_movement",
	"hr_job_requisition",
	"hr_candidate",
	"hr_candidate_application",
	"hr_interview",
	"hr_interview_evaluation",
	"hr_employment_offer",
	"hr_onboarding_case",
	"hr_onboarding_task",
	"hr_probation_review",
	"hr_employment_confirmation",
	"hr_termination",
	"hr_offboarding_case",
	"hr_offboarding_task",
	"hr_exit_interview",
	"hr_clearance",
	"hr_learning_course",
	"hr_learning_program",
	"hr_learning_session",
	"hr_learning_assignment",
	"hr_learning_attendance",
	"hr_learning_assessment",
	"hr_learning_completion",
	"hr_employee_certification",
	"hr_development_plan",
	"hr_compensation_grade",
	"hr_salary_band",
	"hr_employee_compensation",
	"hr_allowance_entitlement",
	"hr_bonus_eligibility",
	"hr_benefit_plan",
	"hr_benefit_eligibility",
	"hr_benefit_enrollment",
	"hr_compensation_review_cycle",
	"hr_compensation_review",
	"hr_leave_policy",
	"hr_leave_policy_eligibility",
	"hr_leave_entitlement",
	"hr_leave_adjustment",
	"hr_leave_request",
	"hr_leave_request_segment",
	"hr_leave_approval_decision",
	"hr_performance_cycle",
	"hr_performance_cycle_participant",
	"hr_performance_goal",
	"hr_performance_goal_progress",
	"hr_performance_review",
	"hr_performance_review_participant",
	"hr_performance_assessment",
	"hr_performance_improvement_plan",
	"hr_performance_improvement_checkpoint",
	"hr_competency",
	"hr_job_competency",
	"hr_competency_assessment",
	"hr_talent_profile",
	"hr_talent_profile_assessment",
	"hr_talent_pool",
	"hr_talent_pool_member",
	"hr_career_plan",
	"hr_career_plan_action",
	"hr_succession_plan",
	"hr_succession_candidate",
	"hr_headcount_plan",
	"hr_headcount_plan_line",
	"hr_headcount_reservation",
	"hr_employee_case",
	"hr_employee_case_event",
	"hr_employee_case_action",
	"hr_employee_case_appeal",
	"hr_document_requirement",
	"hr_employee_document",
	"hr_work_eligibility",
	"hr_policy_acknowledgement",
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
	md_import_batch: () =>
		sql`SELECT count(*)::int AS null_count FROM md_import_batch WHERE organization_id IS NULL`,
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
	supplier_credit_note_line: () =>
		sql`SELECT count(*)::int AS null_count FROM supplier_credit_note_line WHERE organization_id IS NULL`,
	supplier_allocation: () =>
		sql`SELECT count(*)::int AS null_count FROM supplier_allocation WHERE organization_id IS NULL`,
	three_way_match_result: () =>
		sql`SELECT count(*)::int AS null_count FROM three_way_match_result WHERE organization_id IS NULL`,
	supplier_balance_projection: () =>
		sql`SELECT count(*)::int AS null_count FROM supplier_balance_projection WHERE organization_id IS NULL`,
	payment_account: () =>
		sql`SELECT count(*)::int AS null_count FROM payment_account WHERE organization_id IS NULL`,
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
	chart_of_account: () =>
		sql`SELECT count(*)::int AS null_count FROM chart_of_account WHERE organization_id IS NULL`,
	ledger_account: () =>
		sql`SELECT count(*)::int AS null_count FROM ledger_account WHERE organization_id IS NULL`,
	account_role_mapping: () =>
		sql`SELECT count(*)::int AS null_count FROM account_role_mapping WHERE organization_id IS NULL`,
	posting_profile: () =>
		sql`SELECT count(*)::int AS null_count FROM posting_profile WHERE organization_id IS NULL`,
	posting_profile_line: () =>
		sql`SELECT count(*)::int AS null_count FROM posting_profile_line WHERE organization_id IS NULL`,
	source_posting_link: () =>
		sql`SELECT count(*)::int AS null_count FROM source_posting_link WHERE organization_id IS NULL`,
	financial_posting_exception: () =>
		sql`SELECT count(*)::int AS null_count FROM financial_posting_exception WHERE organization_id IS NULL`,
	hr_employee: () =>
		sql`SELECT count(*)::int AS null_count FROM hr_employee WHERE organization_id IS NULL`,
	hr_employment: () =>
		sql`SELECT count(*)::int AS null_count FROM hr_employment WHERE organization_id IS NULL`,
	hr_employment_contract: () =>
		sql`SELECT count(*)::int AS null_count FROM hr_employment_contract WHERE organization_id IS NULL`,
	hr_work_assignment: () =>
		sql`SELECT count(*)::int AS null_count FROM hr_work_assignment WHERE organization_id IS NULL`,
	hr_department: () =>
		sql`SELECT count(*)::int AS null_count FROM hr_department WHERE organization_id IS NULL`,
	hr_job: () =>
		sql`SELECT count(*)::int AS null_count FROM hr_job WHERE organization_id IS NULL`,
	hr_position: () =>
		sql`SELECT count(*)::int AS null_count FROM hr_position WHERE organization_id IS NULL`,
	hr_reporting_line: () =>
		sql`SELECT count(*)::int AS null_count FROM hr_reporting_line WHERE organization_id IS NULL`,
	hr_employment_movement: () =>
		sql`SELECT count(*)::int AS null_count FROM hr_employment_movement WHERE organization_id IS NULL`,
	hr_job_requisition: () =>
		sql`SELECT count(*)::int AS null_count FROM hr_job_requisition WHERE organization_id IS NULL`,
	hr_candidate: () =>
		sql`SELECT count(*)::int AS null_count FROM hr_candidate WHERE organization_id IS NULL`,
	hr_candidate_application: () =>
		sql`SELECT count(*)::int AS null_count FROM hr_candidate_application WHERE organization_id IS NULL`,
	hr_interview: () =>
		sql`SELECT count(*)::int AS null_count FROM hr_interview WHERE organization_id IS NULL`,
	hr_interview_evaluation: () =>
		sql`SELECT count(*)::int AS null_count FROM hr_interview_evaluation WHERE organization_id IS NULL`,
	hr_employment_offer: () =>
		sql`SELECT count(*)::int AS null_count FROM hr_employment_offer WHERE organization_id IS NULL`,
	hr_onboarding_case: () =>
		sql`SELECT count(*)::int AS null_count FROM hr_onboarding_case WHERE organization_id IS NULL`,
	hr_onboarding_task: () =>
		sql`SELECT count(*)::int AS null_count FROM hr_onboarding_task WHERE organization_id IS NULL`,
	hr_probation_review: () =>
		sql`SELECT count(*)::int AS null_count FROM hr_probation_review WHERE organization_id IS NULL`,
	hr_employment_confirmation: () =>
		sql`SELECT count(*)::int AS null_count FROM hr_employment_confirmation WHERE organization_id IS NULL`,
	hr_termination: () =>
		sql`SELECT count(*)::int AS null_count FROM hr_termination WHERE organization_id IS NULL`,
	hr_offboarding_case: () =>
		sql`SELECT count(*)::int AS null_count FROM hr_offboarding_case WHERE organization_id IS NULL`,
	hr_offboarding_task: () =>
		sql`SELECT count(*)::int AS null_count FROM hr_offboarding_task WHERE organization_id IS NULL`,
	hr_exit_interview: () =>
		sql`SELECT count(*)::int AS null_count FROM hr_exit_interview WHERE organization_id IS NULL`,
	hr_clearance: () =>
		sql`SELECT count(*)::int AS null_count FROM hr_clearance WHERE organization_id IS NULL`,
	hr_learning_course: () =>
		sql`SELECT count(*)::int AS null_count FROM hr_learning_course WHERE organization_id IS NULL`,
	hr_learning_program: () =>
		sql`SELECT count(*)::int AS null_count FROM hr_learning_program WHERE organization_id IS NULL`,
	hr_learning_session: () =>
		sql`SELECT count(*)::int AS null_count FROM hr_learning_session WHERE organization_id IS NULL`,
	hr_learning_assignment: () =>
		sql`SELECT count(*)::int AS null_count FROM hr_learning_assignment WHERE organization_id IS NULL`,
	hr_learning_attendance: () =>
		sql`SELECT count(*)::int AS null_count FROM hr_learning_attendance WHERE organization_id IS NULL`,
	hr_learning_assessment: () =>
		sql`SELECT count(*)::int AS null_count FROM hr_learning_assessment WHERE organization_id IS NULL`,
	hr_learning_completion: () =>
		sql`SELECT count(*)::int AS null_count FROM hr_learning_completion WHERE organization_id IS NULL`,
	hr_employee_certification: () =>
		sql`SELECT count(*)::int AS null_count FROM hr_employee_certification WHERE organization_id IS NULL`,
	hr_development_plan: () =>
		sql`SELECT count(*)::int AS null_count FROM hr_development_plan WHERE organization_id IS NULL`,
	hr_compensation_grade: () =>
		sql`SELECT count(*)::int AS null_count FROM hr_compensation_grade WHERE organization_id IS NULL`,
	hr_salary_band: () =>
		sql`SELECT count(*)::int AS null_count FROM hr_salary_band WHERE organization_id IS NULL`,
	hr_employee_compensation: () =>
		sql`SELECT count(*)::int AS null_count FROM hr_employee_compensation WHERE organization_id IS NULL`,
	hr_allowance_entitlement: () =>
		sql`SELECT count(*)::int AS null_count FROM hr_allowance_entitlement WHERE organization_id IS NULL`,
	hr_bonus_eligibility: () =>
		sql`SELECT count(*)::int AS null_count FROM hr_bonus_eligibility WHERE organization_id IS NULL`,
	hr_benefit_plan: () =>
		sql`SELECT count(*)::int AS null_count FROM hr_benefit_plan WHERE organization_id IS NULL`,
	hr_benefit_eligibility: () =>
		sql`SELECT count(*)::int AS null_count FROM hr_benefit_eligibility WHERE organization_id IS NULL`,
	hr_benefit_enrollment: () =>
		sql`SELECT count(*)::int AS null_count FROM hr_benefit_enrollment WHERE organization_id IS NULL`,
	hr_compensation_review_cycle: () =>
		sql`SELECT count(*)::int AS null_count FROM hr_compensation_review_cycle WHERE organization_id IS NULL`,
	hr_compensation_review: () =>
		sql`SELECT count(*)::int AS null_count FROM hr_compensation_review WHERE organization_id IS NULL`,
	hr_leave_policy: () =>
		sql`SELECT count(*)::int AS null_count FROM hr_leave_policy WHERE organization_id IS NULL`,
	hr_leave_policy_eligibility: () =>
		sql`SELECT count(*)::int AS null_count FROM hr_leave_policy_eligibility WHERE organization_id IS NULL`,
	hr_leave_entitlement: () =>
		sql`SELECT count(*)::int AS null_count FROM hr_leave_entitlement WHERE organization_id IS NULL`,
	hr_leave_adjustment: () =>
		sql`SELECT count(*)::int AS null_count FROM hr_leave_adjustment WHERE organization_id IS NULL`,
	hr_leave_request: () =>
		sql`SELECT count(*)::int AS null_count FROM hr_leave_request WHERE organization_id IS NULL`,
	hr_leave_request_segment: () =>
		sql`SELECT count(*)::int AS null_count FROM hr_leave_request_segment WHERE organization_id IS NULL`,
	hr_leave_approval_decision: () =>
		sql`SELECT count(*)::int AS null_count FROM hr_leave_approval_decision WHERE organization_id IS NULL`,
	hr_performance_cycle: () =>
		sql`SELECT count(*)::int AS null_count FROM hr_performance_cycle WHERE organization_id IS NULL`,
	hr_performance_cycle_participant: () =>
		sql`SELECT count(*)::int AS null_count FROM hr_performance_cycle_participant WHERE organization_id IS NULL`,
	hr_performance_goal: () =>
		sql`SELECT count(*)::int AS null_count FROM hr_performance_goal WHERE organization_id IS NULL`,
	hr_performance_goal_progress: () =>
		sql`SELECT count(*)::int AS null_count FROM hr_performance_goal_progress WHERE organization_id IS NULL`,
	hr_performance_review: () =>
		sql`SELECT count(*)::int AS null_count FROM hr_performance_review WHERE organization_id IS NULL`,
	hr_performance_review_participant: () =>
		sql`SELECT count(*)::int AS null_count FROM hr_performance_review_participant WHERE organization_id IS NULL`,
	hr_performance_assessment: () =>
		sql`SELECT count(*)::int AS null_count FROM hr_performance_assessment WHERE organization_id IS NULL`,
	hr_performance_improvement_plan: () =>
		sql`SELECT count(*)::int AS null_count FROM hr_performance_improvement_plan WHERE organization_id IS NULL`,
	hr_performance_improvement_checkpoint: () =>
		sql`SELECT count(*)::int AS null_count FROM hr_performance_improvement_checkpoint WHERE organization_id IS NULL`,
	hr_competency: () =>
		sql`SELECT count(*)::int AS null_count FROM hr_competency WHERE organization_id IS NULL`,
	hr_job_competency: () =>
		sql`SELECT count(*)::int AS null_count FROM hr_job_competency WHERE organization_id IS NULL`,
	hr_competency_assessment: () =>
		sql`SELECT count(*)::int AS null_count FROM hr_competency_assessment WHERE organization_id IS NULL`,
	hr_talent_profile: () =>
		sql`SELECT count(*)::int AS null_count FROM hr_talent_profile WHERE organization_id IS NULL`,
	hr_talent_profile_assessment: () =>
		sql`SELECT count(*)::int AS null_count FROM hr_talent_profile_assessment WHERE organization_id IS NULL`,
	hr_talent_pool: () =>
		sql`SELECT count(*)::int AS null_count FROM hr_talent_pool WHERE organization_id IS NULL`,
	hr_talent_pool_member: () =>
		sql`SELECT count(*)::int AS null_count FROM hr_talent_pool_member WHERE organization_id IS NULL`,
	hr_career_plan: () =>
		sql`SELECT count(*)::int AS null_count FROM hr_career_plan WHERE organization_id IS NULL`,
	hr_career_plan_action: () =>
		sql`SELECT count(*)::int AS null_count FROM hr_career_plan_action WHERE organization_id IS NULL`,
	hr_succession_plan: () =>
		sql`SELECT count(*)::int AS null_count FROM hr_succession_plan WHERE organization_id IS NULL`,
	hr_succession_candidate: () =>
		sql`SELECT count(*)::int AS null_count FROM hr_succession_candidate WHERE organization_id IS NULL`,
	hr_headcount_plan: () =>
		sql`SELECT count(*)::int AS null_count FROM hr_headcount_plan WHERE organization_id IS NULL`,
	hr_headcount_plan_line: () =>
		sql`SELECT count(*)::int AS null_count FROM hr_headcount_plan_line WHERE organization_id IS NULL`,
	hr_headcount_reservation: () =>
		sql`SELECT count(*)::int AS null_count FROM hr_headcount_reservation WHERE organization_id IS NULL`,
	hr_employee_case: () =>
		sql`SELECT count(*)::int AS null_count FROM hr_employee_case WHERE organization_id IS NULL`,
	hr_employee_case_event: () =>
		sql`SELECT count(*)::int AS null_count FROM hr_employee_case_event WHERE organization_id IS NULL`,
	hr_employee_case_action: () =>
		sql`SELECT count(*)::int AS null_count FROM hr_employee_case_action WHERE organization_id IS NULL`,
	hr_employee_case_appeal: () =>
		sql`SELECT count(*)::int AS null_count FROM hr_employee_case_appeal WHERE organization_id IS NULL`,
	hr_document_requirement: () =>
		sql`SELECT count(*)::int AS null_count FROM hr_document_requirement WHERE organization_id IS NULL`,
	hr_employee_document: () =>
		sql`SELECT count(*)::int AS null_count FROM hr_employee_document WHERE organization_id IS NULL`,
	hr_work_eligibility: () =>
		sql`SELECT count(*)::int AS null_count FROM hr_work_eligibility WHERE organization_id IS NULL`,
	hr_policy_acknowledgement: () =>
		sql`SELECT count(*)::int AS null_count FROM hr_policy_acknowledgement WHERE organization_id IS NULL`,
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
