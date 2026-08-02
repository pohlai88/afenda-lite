import { database as afendaDatabase } from "@afenda/db";

const REQUIRED_PERFORMANCE_COLUMNS = [
	["hr_performance_cycle", "status"],
	["hr_performance_goal", "goal_kind"],
	["hr_performance_goal", "aligned_to_goal_id"],
	["hr_performance_goal", "completion_note"],
	["hr_performance_goal", "completion_evidence_reference"],
	["hr_performance_review_participant", "sequence_number"],
	["hr_performance_goal_progress", "evidence_reference"],
	["hr_performance_review", "calibration_note"],
	["hr_performance_assessment", "participant_id"],
	["hr_performance_improvement_checkpoint", "evidence_reference"],
	["hr_performance_improvement_plan", "outcome_evidence_reference"],
	["hr_performance_improvement_plan", "outcome_reason"],
	["hr_performance_improvement_plan", "last_extension_evidence_reference"],
	["hr_performance_improvement_plan", "last_extension_reason"],
	["hr_performance_cycle_review_period", "organization_id"],
	["hr_performance_cycle_eligibility", "organization_id"],
] as const;

let ensured = false;

/**
 * Assert that governed migrations installed the performance schema.
 *
 * Parity tests are deliberately read-only with respect to database structure:
 * migration DDL and ledger ownership remain exclusively with @afenda/db.
 */
export async function ensurePerformanceSchemaForTests(): Promise<void> {
	if (ensured) {
		return;
	}

	const [rows] = await afendaDatabase.transaction((sql) => [
		sql`
			SELECT table_name AS "tableName", column_name AS "columnName"
			FROM information_schema.columns
			WHERE table_schema = 'public'
				AND table_name = ANY(${REQUIRED_PERFORMANCE_COLUMNS.map(([table]) => table)})
		`,
	]);
	const installed = new Set(
		rows.map(
			(row: { tableName: string; columnName: string }) =>
				`${row.tableName}.${row.columnName}`,
		),
	);
	const missing = REQUIRED_PERFORMANCE_COLUMNS.filter(
		([table, column]) => !installed.has(`${table}.${column}`),
	).map(([table, column]) => `${table}.${column}`);

	if (missing.length > 0) {
		throw new Error(
			`HR performance schema is not migration-ready; missing: ${missing.join(", ")}`,
		);
	}
	ensured = true;
}
