/**
 * Read-only probes: migration DDL already present on Neon (ledger backfill gate).
 * Fail closed when no probe exists — use db:migrate for forward apply.
 */

/**
 * @param {import("@neondatabase/serverless").NeonQueryFunction} sql
 * @param {string} tableName
 */
async function tableExists(sql, tableName) {
	const rows = await sql`
		SELECT table_name
		FROM information_schema.tables
		WHERE table_schema = 'public' AND table_name = ${tableName}
	`;
	return rows.length > 0;
}

/**
 * @param {import("@neondatabase/serverless").NeonQueryFunction} sql
 * @param {string} tableName
 * @param {string} columnName
 */
async function columnExists(sql, tableName, columnName) {
	const rows = await sql`
		SELECT column_name
		FROM information_schema.columns
		WHERE table_schema = 'public'
			AND table_name = ${tableName}
			AND column_name = ${columnName}
	`;
	return rows.length > 0;
}

/**
 * @param {import("@neondatabase/serverless").NeonQueryFunction} sql
 * @param {string} constraintName
 */
async function constraintExists(sql, constraintName) {
	const rows = await sql`
		SELECT conname
		FROM pg_constraint
		WHERE conname = ${constraintName}
	`;
	return rows.length > 0;
}

/**
 * @param {import("@neondatabase/serverless").NeonQueryFunction} sql
 * @param {string} indexName
 */
async function indexExists(sql, indexName) {
	const rows = await sql`
		SELECT indexname
		FROM pg_indexes
		WHERE schemaname = 'public' AND indexname = ${indexName}
	`;
	return rows.length > 0;
}

function allExist(probes) {
	return Promise.all(probes).then((results) => results.every(Boolean));
}

const MIGRATION_DDL_PROBES = new Map([
	[
		"0001_ca_relational_invariants",
		(sql) =>
			allExist([
				constraintExists(sql, "ca_legal_company_org_id_unique"),
				constraintExists(sql, "ca_company_name_no_overlap_excl"),
				constraintExists(sql, "ca_company_activity_no_overlap_excl"),
			]),
	],
	[
		"0003_glorious_madelyne_pryor",
		(sql) =>
			allExist([
				tableExists(sql, "ca_legal_establishment"),
				constraintExists(sql, "ca_registered_address_no_overlap_excl"),
				constraintExists(sql, "ca_premise_company_fk"),
			]),
	],
	[
		"0004_even_tigra",
		(sql) => indexExists(sql, "ca_establishment_status_version_uidx"),
	],
	[
		"0026_ca_recorded_range_zero_width",
		(sql) =>
			allExist([
				indexExists(sql, "ca_company_identifier_supersedes_once_uidx"),
				constraintExists(sql, "ca_company_name_recorded_range_check"),
				constraintExists(sql, "ca_company_activity_recorded_range_check"),
			]),
	],
	[
		"0028_ca_company_status_lifecycle",
		(sql) =>
			allExist([
				tableExists(sql, "ca_company_status_history"),
				indexExists(sql, "ca_company_status_version_uidx"),
				constraintExists(sql, "ca_legal_company_state_check"),
			]),
	],
	[
		"0032_hr_bulk_reliability_durability",
		(sql) =>
			allExist([
				tableExists(sql, "hr_bulk_import_checkpoint"),
				tableExists(sql, "hr_reliability_dead_letter"),
				tableExists(sql, "hr_connector_cursor"),
			]),
	],
	[
		"0034_ca_governance_bodies_memberships",
		(sql) =>
			allExist([
				tableExists(sql, "ca_governance_body"),
				tableExists(sql, "ca_governance_membership"),
				indexExists(sql, "ca_governance_membership_body_as_of_idx"),
			]),
	],
	[
		"0035_ca_statutory_offices_officers",
		(sql) =>
			allExist([
				tableExists(sql, "ca_statutory_office"),
				tableExists(sql, "ca_officer_appointment"),
				tableExists(sql, "ca_officer_qualification"),
				indexExists(sql, "ca_officer_qualification_appointment_idx"),
			]),
	],
	[
		"0036_ca_officer_compliance",
		(sql) =>
			allExist([
				tableExists(sql, "ca_officer_declaration"),
				tableExists(sql, "ca_officer_disqualification"),
				tableExists(sql, "ca_conflict_disclosure"),
				indexExists(sql, "ca_conflict_disclosure_matter_idx"),
			]),
	],
	[
		"0037_ca_governance_meetings",
		(sql) =>
			allExist([
				tableExists(sql, "ca_governance_meeting"),
				tableExists(sql, "ca_meeting_notice"),
				tableExists(sql, "ca_meeting_participant"),
				tableExists(sql, "ca_meeting_quorum_result"),
				indexExists(sql, "ca_meeting_quorum_result_meeting_idx"),
			]),
	],
	[
		"0038_ca_resolutions",
		(sql) =>
			allExist([
				tableExists(sql, "ca_meeting_vote"),
				tableExists(sql, "ca_resolution"),
				tableExists(sql, "ca_resolution_action"),
				indexExists(sql, "ca_resolution_action_due_idx"),
			]),
	],
	[
		"0039_hr_reliability_scheduler",
		(sql) =>
			allExist([
				columnExists(sql, "hr_reliability_work_item", "target_type"),
				columnExists(sql, "hr_reliability_work_item", "lease_owner"),
				columnExists(sql, "hr_reliability_dead_letter", "target_id"),
				constraintExists(sql, "hr_reliability_work_item_ack_check"),
			]),
	],
	[
		"0040_hr_bulk_jobs",
		(sql) =>
			allExist([
				tableExists(sql, "hr_bulk_import_job"),
				tableExists(sql, "hr_bulk_import_job_row"),
				tableExists(sql, "hr_bulk_export_job"),
				tableExists(sql, "hr_bulk_export_artifact_chunk"),
				indexExists(sql, "hr_bulk_export_artifact_chunk_org_job_index_uidx"),
			]),
	],
	[
		"0042_platform_tenant_access_indexes",
		(sql) =>
			allExist([
				indexExists(sql, "platform_rbac_audit_org_created_id_idx"),
				indexExists(sql, "platform_role_assignment_org_active_user_idx"),
			]),
	],
	[
		"0043_event_claim_lease",
		(sql) =>
			allExist([
				columnExists(sql, "platform_domain_event", "claim_token"),
				columnExists(sql, "platform_domain_event", "claimed_at"),
			]),
	],
	[
		"0044_payroll_setup_rule_ranges",
		(sql) =>
			allExist([
				constraintExists(sql, "payroll_earning_rule_non_archived_range_excl"),
				constraintExists(sql, "payroll_deduction_rule_non_archived_range_excl"),
				constraintExists(sql, "payroll_statutory_rule_non_archived_range_excl"),
			]),
	],
	[
		"0045_payroll_assignment_ranges",
		(sql) =>
			constraintExists(sql, "payroll_employee_assignment_active_range_excl"),
	],
	[
		"0046_payroll_outputs_reconciliation_adjustments",
		(sql) =>
			allExist([
				columnExists(sql, "payroll_run", "reversal_reason_code"),
				columnExists(sql, "payroll_payslip", "run_employee_id"),
				columnExists(sql, "payroll_adjustment", "original_run_id"),
				columnExists(sql, "payroll_reconciliation", "run_id"),
				constraintExists(sql, "payroll_reconciliation_org_run_fk"),
			]),
	],
]);

export function listMigrationDdlProbeTags() {
	return Object.freeze([...MIGRATION_DDL_PROBES.keys()]);
}

/**
 * @param {import("@neondatabase/serverless").NeonQueryFunction} sql
 * @param {string} tag
 * @returns {Promise<boolean | null>} true when DDL is present, false when absent, null when unprobed
 */
export function probeMigrationDdlApplied(sql, tag) {
	const probe = MIGRATION_DDL_PROBES.get(tag);
	return probe === undefined ? Promise.resolve(null) : probe(sql);
}
