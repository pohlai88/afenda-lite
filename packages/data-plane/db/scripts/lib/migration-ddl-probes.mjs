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

/**
 * @param {import("@neondatabase/serverless").NeonQueryFunction} sql
 * @param {string} tag
 * @returns {Promise<boolean | null>} true when DDL is present, false when absent, null when unprobed
 */
export async function probeMigrationDdlApplied(sql, tag) {
	if (tag === "0001_ca_relational_invariants") {
		const [companyTenantKey, nameOverlap, activityOverlap] = await Promise.all([
			constraintExists(sql, "ca_legal_company_org_id_unique"),
			constraintExists(sql, "ca_company_name_no_overlap_excl"),
			constraintExists(sql, "ca_company_activity_no_overlap_excl"),
		]);
		return companyTenantKey && nameOverlap && activityOverlap;
	}

	if (tag === "0003_glorious_madelyne_pryor") {
		const [establishmentTable, addressOverlap, premiseCompanyFk] =
			await Promise.all([
				tableExists(sql, "ca_legal_establishment"),
				constraintExists(sql, "ca_registered_address_no_overlap_excl"),
				constraintExists(sql, "ca_premise_company_fk"),
			]);
		return establishmentTable && addressOverlap && premiseCompanyFk;
	}

	if (tag === "0004_even_tigra") {
		return indexExists(sql, "ca_establishment_status_version_uidx");
	}

	if (tag === "0026_ca_recorded_range_zero_width") {
		const [identifierSuccessor, nameRecordedRange, activityRecordedRange] =
			await Promise.all([
				indexExists(sql, "ca_company_identifier_supersedes_once_uidx"),
				constraintExists(sql, "ca_company_name_recorded_range_check"),
				constraintExists(sql, "ca_company_activity_recorded_range_check"),
			]);
		return identifierSuccessor && nameRecordedRange && activityRecordedRange;
	}

	if (tag === "0028_ca_company_status_lifecycle") {
		const [statusTable, statusVersionIndex, legalCompanyState] =
			await Promise.all([
				tableExists(sql, "ca_company_status_history"),
				indexExists(sql, "ca_company_status_version_uidx"),
				constraintExists(sql, "ca_legal_company_state_check"),
			]);
		return statusTable && statusVersionIndex && legalCompanyState;
	}

	if (tag === "0017_hr_candidate_consent") {
		const [columnOk, constraintOk] = await Promise.all([
			columnExists(sql, "hr_candidate", "consent_policy_version"),
			constraintExists(sql, "hr_candidate_consent_source_check"),
		]);
		return columnOk && constraintOk;
	}

	if (tag === "0040_hr_compensation_benefits_ddl") {
		return tableExists(sql, "hr_benefit_enrollment");
	}
	if (tag === "0041_hr_learning_ddl") {
		return tableExists(sql, "hr_learning_course");
	}
	if (tag === "0042_hr_learning_idempotency_columns") {
		return columnExists(sql, "hr_learning_course", "idempotency_key");
	}
	if (tag === "0043_hr_leave_ddl") {
		return tableExists(sql, "hr_leave_policy");
	}
	if (tag === "0044_hr_performance_ddl") {
		return tableExists(sql, "hr_performance_cycle");
	}
	if (tag === "0045_hr_talent_ddl") {
		return tableExists(sql, "hr_competency");
	}
	if (tag === "0046_hr_workforce_planning_ddl") {
		return tableExists(sql, "hr_headcount_plan");
	}
	if (tag === "0047_hr_employee_relations_ddl") {
		return tableExists(sql, "hr_employee_case");
	}
	if (tag === "0048_hr_compliance_ddl") {
		return tableExists(sql, "hr_document_requirement");
	}
	if (tag === "0032_hr_bulk_reliability_durability") {
		const [checkpoint, deadLetter, cursor] = await Promise.all([
			tableExists(sql, "hr_bulk_import_checkpoint"),
			tableExists(sql, "hr_reliability_dead_letter"),
			tableExists(sql, "hr_connector_cursor"),
		]);
		return checkpoint && deadLetter && cursor;
	}

	return null;
}
