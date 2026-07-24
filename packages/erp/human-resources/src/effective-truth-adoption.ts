import { HUMAN_RESOURCES_MUTATION_TABLES } from "./mutation-tables";

type HumanResourcesMutationTable =
	(typeof HUMAN_RESOURCES_MUTATION_TABLES)[number];

/** Canonical Phase 3 scope; additions require an explicit adoption decision. */
export const HUMAN_RESOURCES_EFFECTIVE_TRUTH_EXPECTED_TABLES = [
	"hr_benefit_enrollment",
	"hr_benefit_plan",
	"hr_compensation_grade",
	"hr_competency",
	"hr_competency_assessment",
	"hr_department",
	"hr_document_requirement",
	"hr_employee_compensation",
	"hr_employment",
	"hr_employment_calendar_assignment",
	"hr_employment_contract",
	"hr_headcount_plan",
	"hr_headcount_plan_line",
	"hr_job",
	"hr_job_competency",
	"hr_learning_course",
	"hr_learning_session",
	"hr_leave_policy",
	"hr_performance_cycle",
	"hr_policy_acknowledgement",
	"hr_position",
	"hr_reporting_line",
	"hr_salary_band",
	"hr_shift",
	"hr_shift_assignment",
	"hr_time_approval_authority_assignment",
	"hr_time_policy",
	"hr_time_policy_assignment",
	"hr_work_assignment",
	"hr_work_calendar",
	"hr_work_calendar_scope_assignment",
	"hr_work_eligibility",
	"hr_worker",
] as const satisfies readonly HumanResourcesMutationTable[];

export type EffectiveTruthDomain =
	| "compensation"
	| "compliance"
	| "core"
	| "leave"
	| "learning"
	| "organization"
	| "performance"
	| "talent"
	| "time"
	| "workforce-foundation"
	| "workforce-planning";

type EffectiveTruthEvidence = {
	unit: string;
	parity: string;
};

type EffectiveTruthAdoptionBase = {
	aggregate: string;
	table: HumanResourcesMutationTable;
	domain: EffectiveTruthDomain;
	concurrency: "version";
	provenance: "audit-outbox" | "row-and-audit-outbox";
	evidence: EffectiveTruthEvidence;
};

type EffectiveLineageAdoption = EffectiveTruthAdoptionBase & {
	decision: "effective-lineage";
	rangeFields: readonly [string, string];
	predecessorField: string;
	successorField: string | null;
	resolution: "as-of";
	rejection: "branch-gap-overlap";
};

type EffectiveRangeAdoption = EffectiveTruthAdoptionBase & {
	decision: "effective-range";
	rangeFields: readonly [string, string];
	resolution: "as-of";
	rejection: "overlap";
};

type BoundedAssignmentAdoption = EffectiveTruthAdoptionBase & {
	decision: "bounded-assignment";
	rangeFields: readonly [string, string];
	resolution: "as-of";
	rejection: "overlap";
};

type PeriodLineageAdoption = EffectiveTruthAdoptionBase & {
	decision: "period-lineage";
	rangeFields: readonly [string, string];
	predecessorField: string;
	successorField: null;
	resolution: "period-key";
	rejection: "branch-overlap";
};

type PointLineageAdoption = EffectiveTruthAdoptionBase & {
	decision: "point-lineage";
	effectiveField: string;
	predecessorField: string;
	successorField: string | null;
	resolution: "latest-effective-point";
	rejection: "branch";
};

type VersionedCurrentAdoption = EffectiveTruthAdoptionBase & {
	decision: "versioned-current";
	resolution: "current-state";
	rejection: "not-applicable";
	rationale:
		| "identity-definition"
		| "operational-definition"
		| "scheduled-definition";
};

export type EffectiveTruthAdoption =
	| BoundedAssignmentAdoption
	| EffectiveLineageAdoption
	| EffectiveRangeAdoption
	| PeriodLineageAdoption
	| PointLineageAdoption
	| VersionedCurrentAdoption;

const CORE_EVIDENCE = {
	unit: "human-resources.core.test.ts",
	parity: "human-resources.core.parity.test.ts",
} satisfies EffectiveTruthEvidence;
const ORGANIZATION_EVIDENCE = {
	unit: "human-resources.organization.test.ts",
	parity: "human-resources.organization.parity.test.ts",
} satisfies EffectiveTruthEvidence;
const LEAVE_EVIDENCE = {
	unit: "leave-policy-lineage.test.ts",
	parity: "human-resources.leave.parity.test.ts",
} satisfies EffectiveTruthEvidence;
const COMPENSATION_EVIDENCE = {
	unit: "compensation-benefits.test.ts",
	parity: "human-resources.compensation-benefits.parity.test.ts",
} satisfies EffectiveTruthEvidence;
const COMPLIANCE_EVIDENCE = {
	unit: "human-resources.compliance.test.ts",
	parity: "human-resources.compliance.parity.test.ts",
} satisfies EffectiveTruthEvidence;
const TALENT_EVIDENCE = {
	unit: "effective-lineage.test.ts",
	parity: "human-resources.talent.parity.test.ts",
} satisfies EffectiveTruthEvidence;
const WORKFORCE_PLANNING_EVIDENCE = {
	unit: "human-resources.workforce-planning.test.ts",
	parity: "human-resources.workforce-planning.parity.test.ts",
} satisfies EffectiveTruthEvidence;
const TIME_CALENDAR_EVIDENCE = {
	unit: "effective-lineage.test.ts",
	parity: "human-resources.time.calendar.parity.test.ts",
} satisfies EffectiveTruthEvidence;
const TIME_POLICY_EVIDENCE = {
	unit: "time-policy-concurrency.test.ts",
	parity: "human-resources.time.policy.parity.test.ts",
} satisfies EffectiveTruthEvidence;
const TIME_SCHEDULING_EVIDENCE = {
	unit: "effective-range.test.ts",
	parity: "human-resources.time.scheduling.parity.test.ts",
} satisfies EffectiveTruthEvidence;
const FOUNDATION_EVIDENCE = {
	unit: "human-resources.worker-foundation.test.ts",
	parity: "human-resources.foundation.parity.test.ts",
} satisfies EffectiveTruthEvidence;
const LEARNING_EVIDENCE = {
	unit: "human-resources.learning.test.ts",
	parity: "human-resources.learning.parity.test.ts",
} satisfies EffectiveTruthEvidence;
const PERFORMANCE_EVIDENCE = {
	unit: "human-resources.performance.test.ts",
	parity: "human-resources.performance.parity.test.ts",
} satisfies EffectiveTruthEvidence;

/**
 * Machine-enforced Phase 3 adoption matrix for mutable HR definitions and
 * assignments. Each row records the deliberate temporal model rather than
 * inferring history from similarly named date fields.
 */
export const HUMAN_RESOURCES_EFFECTIVE_TRUTH_ADOPTION = [
	{
		aggregate: "worker-classification",
		table: "hr_worker",
		domain: "workforce-foundation",
		decision: "versioned-current",
		concurrency: "version",
		provenance: "audit-outbox",
		resolution: "current-state",
		rejection: "not-applicable",
		rationale: "identity-definition",
		evidence: FOUNDATION_EVIDENCE,
	},
	{
		aggregate: "employment",
		table: "hr_employment",
		domain: "core",
		decision: "bounded-assignment",
		rangeFields: ["startsOn", "endsOn"],
		concurrency: "version",
		provenance: "audit-outbox",
		resolution: "as-of",
		rejection: "overlap",
		evidence: CORE_EVIDENCE,
	},
	{
		aggregate: "employment-contract",
		table: "hr_employment_contract",
		domain: "core",
		decision: "bounded-assignment",
		rangeFields: ["startsOn", "endsOn"],
		concurrency: "version",
		provenance: "audit-outbox",
		resolution: "as-of",
		rejection: "overlap",
		evidence: CORE_EVIDENCE,
	},
	{
		aggregate: "work-assignment",
		table: "hr_work_assignment",
		domain: "core",
		decision: "bounded-assignment",
		rangeFields: ["startsOn", "endsOn"],
		concurrency: "version",
		provenance: "audit-outbox",
		resolution: "as-of",
		rejection: "overlap",
		evidence: CORE_EVIDENCE,
	},
	{
		aggregate: "reporting-line",
		table: "hr_reporting_line",
		domain: "organization",
		decision: "bounded-assignment",
		rangeFields: ["startsOn", "endsOn"],
		concurrency: "version",
		provenance: "audit-outbox",
		resolution: "as-of",
		rejection: "overlap",
		evidence: ORGANIZATION_EVIDENCE,
	},
	...(
		[
			["department", "hr_department"],
			["job", "hr_job"],
			["position", "hr_position"],
		] as const
	).map(
		([aggregate, table]) =>
			({
				aggregate,
				table,
				domain: "organization",
				decision: "versioned-current",
				concurrency: "version",
				provenance: "audit-outbox",
				resolution: "current-state",
				rejection: "not-applicable",
				rationale: "identity-definition",
				evidence: ORGANIZATION_EVIDENCE,
			}) satisfies VersionedCurrentAdoption,
	),
	{
		aggregate: "leave-policy",
		table: "hr_leave_policy",
		domain: "leave",
		decision: "effective-lineage",
		rangeFields: ["effectiveFrom", "effectiveTo"],
		predecessorField: "supersedesPolicyId",
		successorField: null,
		concurrency: "version",
		provenance: "audit-outbox",
		resolution: "as-of",
		rejection: "branch-gap-overlap",
		evidence: LEAVE_EVIDENCE,
	},
	{
		aggregate: "salary-band",
		table: "hr_salary_band",
		domain: "compensation",
		decision: "effective-range",
		rangeFields: ["effectiveFrom", "effectiveTo"],
		concurrency: "version",
		provenance: "audit-outbox",
		resolution: "as-of",
		rejection: "overlap",
		evidence: COMPENSATION_EVIDENCE,
	},
	{
		aggregate: "employee-compensation",
		table: "hr_employee_compensation",
		domain: "compensation",
		decision: "effective-range",
		rangeFields: ["effectiveFrom", "effectiveTo"],
		concurrency: "version",
		provenance: "row-and-audit-outbox",
		resolution: "as-of",
		rejection: "overlap",
		evidence: COMPENSATION_EVIDENCE,
	},
	{
		aggregate: "benefit-enrollment",
		table: "hr_benefit_enrollment",
		domain: "compensation",
		decision: "effective-range",
		rangeFields: ["effectiveFrom", "effectiveTo"],
		concurrency: "version",
		provenance: "audit-outbox",
		resolution: "as-of",
		rejection: "overlap",
		evidence: COMPENSATION_EVIDENCE,
	},
	...(
		[
			["compensation-grade", "hr_compensation_grade"],
			["benefit-plan", "hr_benefit_plan"],
		] as const
	).map(
		([aggregate, table]) =>
			({
				aggregate,
				table,
				domain: "compensation",
				decision: "versioned-current",
				concurrency: "version",
				provenance: "audit-outbox",
				resolution: "current-state",
				rejection: "not-applicable",
				rationale: "operational-definition",
				evidence: COMPENSATION_EVIDENCE,
			}) satisfies VersionedCurrentAdoption,
	),
	{
		aggregate: "policy-acknowledgement-requirement",
		table: "hr_policy_acknowledgement",
		domain: "compliance",
		decision: "point-lineage",
		effectiveField: "issuedAt",
		predecessorField: "supersedesAcknowledgementId",
		successorField: null,
		concurrency: "version",
		provenance: "audit-outbox",
		resolution: "latest-effective-point",
		rejection: "branch",
		evidence: COMPLIANCE_EVIDENCE,
	},
	{
		aggregate: "work-eligibility",
		table: "hr_work_eligibility",
		domain: "compliance",
		decision: "effective-range",
		rangeFields: ["issuedOn", "expiresOn"],
		concurrency: "version",
		provenance: "audit-outbox",
		resolution: "as-of",
		rejection: "overlap",
		evidence: COMPLIANCE_EVIDENCE,
	},
	{
		aggregate: "document-requirement",
		table: "hr_document_requirement",
		domain: "compliance",
		decision: "versioned-current",
		concurrency: "version",
		provenance: "audit-outbox",
		resolution: "current-state",
		rejection: "not-applicable",
		rationale: "operational-definition",
		evidence: COMPLIANCE_EVIDENCE,
	},
	{
		aggregate: "competency-assessment",
		table: "hr_competency_assessment",
		domain: "talent",
		decision: "point-lineage",
		effectiveField: "effectiveOn",
		predecessorField: "supersedesAssessmentId",
		successorField: "supersededByAssessmentId",
		concurrency: "version",
		provenance: "row-and-audit-outbox",
		resolution: "latest-effective-point",
		rejection: "branch",
		evidence: TALENT_EVIDENCE,
	},
	...(
		[
			["competency", "hr_competency"],
			["job-competency", "hr_job_competency"],
		] as const
	).map(
		([aggregate, table]) =>
			({
				aggregate,
				table,
				domain: "talent",
				decision: "versioned-current",
				concurrency: "version",
				provenance: "audit-outbox",
				resolution: "current-state",
				rejection: "not-applicable",
				rationale: "operational-definition",
				evidence: TALENT_EVIDENCE,
			}) satisfies VersionedCurrentAdoption,
	),
	{
		aggregate: "headcount-plan",
		table: "hr_headcount_plan",
		domain: "workforce-planning",
		decision: "period-lineage",
		rangeFields: ["periodStart", "periodEnd"],
		predecessorField: "supersedesPlanId",
		successorField: null,
		concurrency: "version",
		provenance: "row-and-audit-outbox",
		resolution: "period-key",
		rejection: "branch-overlap",
		evidence: WORKFORCE_PLANNING_EVIDENCE,
	},
	{
		aggregate: "headcount-plan-line",
		table: "hr_headcount_plan_line",
		domain: "workforce-planning",
		decision: "versioned-current",
		concurrency: "version",
		provenance: "audit-outbox",
		resolution: "current-state",
		rejection: "not-applicable",
		rationale: "operational-definition",
		evidence: WORKFORCE_PLANNING_EVIDENCE,
	},
	...(
		[
			["work-calendar", "hr_work_calendar", TIME_CALENDAR_EVIDENCE],
			["time-policy", "hr_time_policy", TIME_POLICY_EVIDENCE],
			["shift", "hr_shift", TIME_SCHEDULING_EVIDENCE],
		] as const
	).map(
		([aggregate, table, evidence]) =>
			({
				aggregate,
				table,
				domain: "time",
				decision: "effective-lineage",
				rangeFields: ["effectiveFrom", "effectiveTo"],
				predecessorField:
					aggregate === "work-calendar"
						? "supersedesCalendarId"
						: aggregate === "time-policy"
							? "supersedesPolicyId"
							: "supersedesShiftId",
				successorField: null,
				concurrency: "version",
				provenance: "audit-outbox",
				resolution: "as-of",
				rejection: "branch-gap-overlap",
				evidence,
			}) satisfies EffectiveLineageAdoption,
	),
	...(
		[
			["employment-calendar-assignment", "hr_employment_calendar_assignment"],
			["work-calendar-scope-assignment", "hr_work_calendar_scope_assignment"],
			["time-policy-assignment", "hr_time_policy_assignment"],
			[
				"time-approval-authority-assignment",
				"hr_time_approval_authority_assignment",
			],
		] as const
	).map(
		([aggregate, table]) =>
			({
				aggregate,
				table,
				domain: "time",
				decision: "bounded-assignment",
				rangeFields: ["effectiveFrom", "effectiveTo"],
				concurrency: "version",
				provenance: "audit-outbox",
				resolution: "as-of",
				rejection: "overlap",
				evidence: TIME_POLICY_EVIDENCE,
			}) satisfies BoundedAssignmentAdoption,
	),
	{
		aggregate: "shift-assignment",
		table: "hr_shift_assignment",
		domain: "time",
		decision: "bounded-assignment",
		rangeFields: ["startsOn", "endsOn"],
		concurrency: "version",
		provenance: "audit-outbox",
		resolution: "as-of",
		rejection: "overlap",
		evidence: TIME_SCHEDULING_EVIDENCE,
	},
	...(
		[
			["learning-course", "hr_learning_course", "operational-definition"],
			["learning-session", "hr_learning_session", "scheduled-definition"],
		] as const
	).map(
		([aggregate, table, rationale]) =>
			({
				aggregate,
				table,
				domain: "learning",
				decision: "versioned-current",
				concurrency: "version",
				provenance: "audit-outbox",
				resolution: "current-state",
				rejection: "not-applicable",
				rationale,
				evidence: LEARNING_EVIDENCE,
			}) satisfies VersionedCurrentAdoption,
	),
	{
		aggregate: "performance-cycle",
		table: "hr_performance_cycle",
		domain: "performance",
		decision: "versioned-current",
		concurrency: "version",
		provenance: "audit-outbox",
		resolution: "current-state",
		rejection: "not-applicable",
		rationale: "scheduled-definition",
		evidence: PERFORMANCE_EVIDENCE,
	},
] as const satisfies readonly EffectiveTruthAdoption[];

export type EffectiveTruthAdoptionIssue =
	| { kind: "duplicate-aggregate"; aggregate: string }
	| { kind: "duplicate-table"; table: string }
	| { kind: "missing-adoption"; table: string }
	| { kind: "unknown-mutation-table"; table: string }
	| { kind: "missing-evidence"; aggregate: string };

export function validateEffectiveTruthAdoptionMatrix(
	rows: readonly EffectiveTruthAdoption[] = HUMAN_RESOURCES_EFFECTIVE_TRUTH_ADOPTION,
): readonly EffectiveTruthAdoptionIssue[] {
	const knownTables = new Set<string>(HUMAN_RESOURCES_MUTATION_TABLES);
	const aggregates = new Set<string>();
	const tables = new Set<string>();
	const issues: EffectiveTruthAdoptionIssue[] = [];
	for (const row of rows) {
		if (aggregates.has(row.aggregate)) {
			issues.push({ kind: "duplicate-aggregate", aggregate: row.aggregate });
		}
		aggregates.add(row.aggregate);
		if (tables.has(row.table)) {
			issues.push({ kind: "duplicate-table", table: row.table });
		}
		tables.add(row.table);
		if (!knownTables.has(row.table)) {
			issues.push({ kind: "unknown-mutation-table", table: row.table });
		}
		if (row.evidence.unit.length === 0 || row.evidence.parity.length === 0) {
			issues.push({ kind: "missing-evidence", aggregate: row.aggregate });
		}
	}
	for (const table of HUMAN_RESOURCES_EFFECTIVE_TRUTH_EXPECTED_TABLES) {
		if (!tables.has(table)) {
			issues.push({ kind: "missing-adoption", table });
		}
	}
	return issues;
}
