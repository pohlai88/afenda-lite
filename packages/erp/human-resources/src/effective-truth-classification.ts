import type { EffectiveTruthAdoption } from "./effective-truth-adoption";
import {
	HUMAN_RESOURCES_EFFECTIVE_TRUTH_ADOPTION,
	HUMAN_RESOURCES_EFFECTIVE_TRUTH_EXPECTED_TABLES,
} from "./effective-truth-adoption";
import { HUMAN_RESOURCES_MUTATION_TABLES } from "./mutation-tables";

type HumanResourcesMutationTable =
	(typeof HUMAN_RESOURCES_MUTATION_TABLES)[number];

/** Slice 4.1 package-wide taxonomy — every mutation table gets exactly one category. */
export type EffectiveTruthClassificationCategory =
	| "effective-definition"
	| "bounded-assignment"
	| "versioned-current-fact"
	| "append-only-operational-fact"
	| "transactional-state-machine"
	| "derived-projection"
	| "explicit-exclusion";

export const EFFECTIVE_TRUTH_CLASSIFICATION_CATEGORIES = [
	"effective-definition",
	"bounded-assignment",
	"versioned-current-fact",
	"append-only-operational-fact",
	"transactional-state-machine",
	"derived-projection",
	"explicit-exclusion",
] as const satisfies readonly EffectiveTruthClassificationCategory[];

export type EffectiveTruthClassificationDomain =
	| "compensation"
	| "compliance"
	| "core"
	| "employee-relations"
	| "leave"
	| "learning"
	| "lifecycle"
	| "organization"
	| "performance"
	| "recruitment"
	| "talent"
	| "time"
	| "workforce-foundation"
	| "workforce-planning";

export type EffectiveTruthClassificationCluster = "A" | "B" | "C";

export interface EffectiveTruthClassificationRow {
	category: EffectiveTruthClassificationCategory;
	cluster: EffectiveTruthClassificationCluster;
	domain: EffectiveTruthClassificationDomain;
	rationale: string;
	table: HumanResourcesMutationTable;
}

/** Maps Phase 3 adoption decisions to Slice 4.1 taxonomy categories. */
export function adoptionDecisionToClassificationCategory(
	decision: EffectiveTruthAdoption["decision"],
): EffectiveTruthClassificationCategory {
	switch (decision) {
		case "effective-lineage":
		case "effective-range":
		case "period-lineage":
		case "point-lineage":
			return "effective-definition";
		case "bounded-assignment":
			return "bounded-assignment";
		case "versioned-current":
			return "versioned-current-fact";
		default: {
			const exhaustive: never = decision;
			return exhaustive;
		}
	}
}

type ClassificationInput = Omit<EffectiveTruthClassificationRow, "table"> & {
	table: HumanResourcesMutationTable;
};

function row(input: ClassificationInput): EffectiveTruthClassificationRow {
	return input;
}

/**
 * Machine-enforced Slice 4.1 classification register for all HR mutation tables.
 * Completeness is validated against `HUMAN_RESOURCES_MUTATION_TABLES`; the Phase 3
 * adoption matrix remains scoped to temporal mechanism rows only.
 */
export const HUMAN_RESOURCES_EFFECTIVE_TRUTH_CLASSIFICATION = [
	row({
		table: "hr_person",
		category: "versioned-current-fact",
		domain: "workforce-foundation",
		cluster: "A",
		rationale:
			"Phase 3 adoption versioned-current — current person projection; identity lineage owned by hr_person_identity_version",
	}),
	row({
		table: "hr_person_identity_version",
		category: "effective-definition",
		domain: "workforce-foundation",
		cluster: "A",
		rationale:
			"Phase 3 adoption effective-lineage — legal-name identity correction history",
	}),
	row({
		table: "hr_person_contact",
		category: "versioned-current-fact",
		domain: "workforce-foundation",
		cluster: "A",
		rationale:
			"Person contact facts with active/retired status; primary uniqueness enforced per contact type",
	}),
	row({
		table: "hr_person_identifier",
		category: "effective-definition",
		domain: "workforce-foundation",
		cluster: "A",
		rationale:
			"Effective-dated person identifier segments with open fingerprint uniqueness",
	}),
	row({
		table: "hr_employee",
		category: "versioned-current-fact",
		domain: "core",
		cluster: "A",
		rationale: "Cluster A employment anchor — current employee identity",
	}),
	row({
		table: "hr_worker",
		category: "versioned-current-fact",
		domain: "workforce-foundation",
		cluster: "A",
		rationale:
			"Phase 3 adoption versioned-current — current worker projection; type/status lineage owned by hr_worker_classification_version",
	}),
	row({
		table: "hr_worker_classification_version",
		category: "effective-definition",
		domain: "workforce-foundation",
		cluster: "A",
		rationale:
			"Phase 3 adoption effective-lineage — worker type and status classification history",
	}),
	row({
		table: "hr_employment",
		category: "bounded-assignment",
		domain: "core",
		cluster: "A",
		rationale: "Phase 3 adoption bounded-assignment — employment tenure range",
	}),
	row({
		table: "hr_employment_status_history",
		category: "append-only-operational-fact",
		domain: "core",
		cluster: "A",
		rationale:
			"Append-only employment status and tenure snapshots for as-of history",
	}),
	row({
		table: "hr_employment_contract",
		category: "bounded-assignment",
		domain: "core",
		cluster: "A",
		rationale: "Phase 3 adoption bounded-assignment — contract effective range",
	}),
	row({
		table: "hr_work_assignment",
		category: "bounded-assignment",
		domain: "core",
		cluster: "A",
		rationale:
			"Phase 3 adoption bounded-assignment — assignment placement range",
	}),
	row({
		table: "hr_department",
		category: "versioned-current-fact",
		domain: "organization",
		cluster: "A",
		rationale:
			"Phase 3 adoption versioned-current — current department projection; structure lineage owned by hr_department_structure_version",
	}),
	row({
		table: "hr_department_structure_version",
		category: "effective-definition",
		domain: "organization",
		cluster: "A",
		rationale:
			"Phase 3 adoption effective-lineage — department name and parent structure history",
	}),
	row({
		table: "hr_job",
		category: "versioned-current-fact",
		domain: "organization",
		cluster: "A",
		rationale:
			"Phase 3 adoption versioned-current — current job projection; definition lineage owned by hr_job_definition_version",
	}),
	row({
		table: "hr_job_definition_version",
		category: "effective-definition",
		domain: "organization",
		cluster: "A",
		rationale:
			"Phase 3 adoption effective-lineage — job title definition history",
	}),
	row({
		table: "hr_position",
		category: "versioned-current-fact",
		domain: "organization",
		cluster: "A",
		rationale:
			"Phase 3 adoption versioned-current — current position projection; definition lineage owned by hr_position_definition_version",
	}),
	row({
		table: "hr_position_definition_version",
		category: "effective-definition",
		domain: "organization",
		cluster: "A",
		rationale:
			"Phase 3 adoption effective-lineage — position title, department, and job definition history",
	}),
	row({
		table: "hr_reporting_line",
		category: "bounded-assignment",
		domain: "organization",
		cluster: "A",
		rationale: "Phase 3 adoption bounded-assignment — manager reporting range",
	}),
	row({
		table: "hr_employment_movement",
		category: "append-only-operational-fact",
		domain: "lifecycle",
		cluster: "A",
		rationale: "Cluster A lifecycle — immutable movement audit trail",
	}),
	row({
		table: "hr_job_requisition",
		category: "transactional-state-machine",
		domain: "recruitment",
		cluster: "A",
		rationale: "Cluster A recruitment workflow — requisition status machine",
	}),
	row({
		table: "hr_candidate",
		category: "transactional-state-machine",
		domain: "recruitment",
		cluster: "A",
		rationale: "Cluster A recruitment workflow — candidate pipeline state",
	}),
	row({
		table: "hr_candidate_application",
		category: "transactional-state-machine",
		domain: "recruitment",
		cluster: "A",
		rationale: "Cluster A recruitment workflow — application stage machine",
	}),
	row({
		table: "hr_candidate_application_status_history",
		category: "append-only-operational-fact",
		domain: "recruitment",
		cluster: "A",
		rationale:
			"Cluster A recruitment workflow — immutable application stage transition audit",
	}),
	row({
		table: "hr_interview",
		category: "transactional-state-machine",
		domain: "recruitment",
		cluster: "A",
		rationale: "Cluster A recruitment workflow — interview scheduling state",
	}),
	row({
		table: "hr_interview_evaluation",
		category: "transactional-state-machine",
		domain: "recruitment",
		cluster: "A",
		rationale: "Cluster A recruitment workflow — evaluation submission state",
	}),
	row({
		table: "hr_employment_offer",
		category: "transactional-state-machine",
		domain: "recruitment",
		cluster: "A",
		rationale:
			"Cluster A recruitment workflow — offer acceptance state machine",
	}),
	row({
		table: "hr_hire_attempt",
		category: "transactional-state-machine",
		domain: "recruitment",
		cluster: "A",
		rationale:
			"Cluster A hire orchestration — durable saga progress with idempotent step replay",
	}),
	row({
		table: "hr_onboarding_case",
		category: "transactional-state-machine",
		domain: "lifecycle",
		cluster: "A",
		rationale: "Cluster A lifecycle workflow — onboarding case state",
	}),
	row({
		table: "hr_onboarding_task",
		category: "transactional-state-machine",
		domain: "lifecycle",
		cluster: "A",
		rationale: "Cluster A lifecycle workflow — onboarding task completion",
	}),
	row({
		table: "hr_onboarding_orientation",
		category: "transactional-state-machine",
		domain: "lifecycle",
		cluster: "A",
		rationale:
			"Cluster A lifecycle workflow — onboarding orientation scheduling and completion",
	}),
	row({
		table: "hr_onboarding_equipment_handoff",
		category: "transactional-state-machine",
		domain: "lifecycle",
		cluster: "A",
		rationale:
			"Cluster A lifecycle workflow — equipment provisioning handoff state",
	}),
	row({
		table: "hr_onboarding_access_handoff",
		category: "transactional-state-machine",
		domain: "lifecycle",
		cluster: "A",
		rationale:
			"Cluster A lifecycle workflow — system access provisioning handoff state",
	}),
	row({
		table: "hr_probation_review",
		category: "transactional-state-machine",
		domain: "lifecycle",
		cluster: "A",
		rationale: "Cluster A lifecycle workflow — probation review state",
	}),
	row({
		table: "hr_probation_assessment",
		category: "transactional-state-machine",
		domain: "lifecycle",
		cluster: "A",
		rationale: "Cluster A lifecycle workflow — interim probation assessment",
	}),
	row({
		table: "hr_employment_confirmation",
		category: "transactional-state-machine",
		domain: "lifecycle",
		cluster: "A",
		rationale: "Cluster A lifecycle workflow — confirmation decision state",
	}),
	row({
		table: "hr_termination",
		category: "transactional-state-machine",
		domain: "lifecycle",
		cluster: "A",
		rationale: "Cluster A lifecycle workflow — termination processing state",
	}),
	row({
		table: "hr_offboarding_case",
		category: "transactional-state-machine",
		domain: "lifecycle",
		cluster: "A",
		rationale: "Cluster A lifecycle workflow — offboarding case state",
	}),
	row({
		table: "hr_offboarding_task",
		category: "transactional-state-machine",
		domain: "lifecycle",
		cluster: "A",
		rationale: "Cluster A lifecycle workflow — offboarding task completion",
	}),
	row({
		table: "hr_exit_interview",
		category: "transactional-state-machine",
		domain: "lifecycle",
		cluster: "A",
		rationale: "Cluster A lifecycle workflow — exit interview capture state",
	}),
	row({
		table: "hr_clearance",
		category: "transactional-state-machine",
		domain: "lifecycle",
		cluster: "A",
		rationale: "Cluster A lifecycle workflow — clearance checklist state",
	}),
	row({
		table: "hr_offboarding_access_revocation",
		category: "transactional-state-machine",
		domain: "lifecycle",
		cluster: "A",
		rationale:
			"Cluster A lifecycle workflow — access revocation checklist state",
	}),
	row({
		table: "hr_offboarding_payroll_handoff",
		category: "transactional-state-machine",
		domain: "lifecycle",
		cluster: "A",
		rationale:
			"Cluster A lifecycle workflow — payroll finalization handoff state",
	}),
	row({
		table: "hr_learning_course",
		category: "versioned-current-fact",
		domain: "learning",
		cluster: "C",
		rationale: "Phase 3 adoption versioned-current — course catalog definition",
	}),
	row({
		table: "hr_learning_program",
		category: "versioned-current-fact",
		domain: "learning",
		cluster: "C",
		rationale: "Cluster C learning — program curriculum definition",
	}),
	row({
		table: "hr_learning_session",
		category: "versioned-current-fact",
		domain: "learning",
		cluster: "C",
		rationale:
			"Phase 3 adoption versioned-current — scheduled session definition",
	}),
	row({
		table: "hr_learning_assignment",
		category: "transactional-state-machine",
		domain: "learning",
		cluster: "C",
		rationale: "Cluster C learning workflow — assignment completion state",
	}),
	row({
		table: "hr_learning_attendance",
		category: "append-only-operational-fact",
		domain: "learning",
		cluster: "C",
		rationale: "Cluster C learning — attendance event record",
	}),
	row({
		table: "hr_learning_assessment",
		category: "transactional-state-machine",
		domain: "learning",
		cluster: "C",
		rationale: "Cluster C learning workflow — assessment attempt state",
	}),
	row({
		table: "hr_learning_completion",
		category: "append-only-operational-fact",
		domain: "learning",
		cluster: "C",
		rationale: "Cluster C learning — completion fact record",
	}),
	row({
		table: "hr_employee_certification",
		category: "effective-definition",
		domain: "learning",
		cluster: "C",
		rationale: "Cluster C learning — certification validity effective range",
	}),
	row({
		table: "hr_development_plan",
		category: "transactional-state-machine",
		domain: "learning",
		cluster: "C",
		rationale: "Cluster C learning workflow — development plan lifecycle",
	}),
	row({
		table: "hr_compensation_grade",
		category: "versioned-current-fact",
		domain: "compensation",
		cluster: "C",
		rationale:
			"Phase 3 adoption versioned-current — grade structure definition",
	}),
	row({
		table: "hr_salary_band",
		category: "effective-definition",
		domain: "compensation",
		cluster: "C",
		rationale:
			"Phase 3 adoption effective-range — salary band effective window",
	}),
	row({
		table: "hr_compensation_grade_progression_rule",
		category: "effective-definition",
		domain: "compensation",
		cluster: "C",
		rationale:
			"Phase 3 adoption effective-range — grade progression rule definition",
	}),
	row({
		table: "hr_employee_compensation",
		category: "effective-definition",
		domain: "compensation",
		cluster: "C",
		rationale:
			"Phase 3 adoption effective-range — employee pay effective window",
	}),
	row({
		table: "hr_allowance_entitlement",
		category: "bounded-assignment",
		domain: "compensation",
		cluster: "C",
		rationale: "Cluster C compensation — allowance entitlement effective range",
	}),
	row({
		table: "hr_bonus_eligibility",
		category: "bounded-assignment",
		domain: "compensation",
		cluster: "C",
		rationale: "Cluster C compensation — bonus eligibility effective range",
	}),
	row({
		table: "hr_benefit_plan",
		category: "versioned-current-fact",
		domain: "compensation",
		cluster: "C",
		rationale: "Phase 3 adoption versioned-current — benefit plan definition",
	}),
	row({
		table: "hr_benefit_eligibility",
		category: "bounded-assignment",
		domain: "compensation",
		cluster: "C",
		rationale: "Cluster C compensation — benefit eligibility effective range",
	}),
	row({
		table: "hr_benefit_enrollment",
		category: "effective-definition",
		domain: "compensation",
		cluster: "C",
		rationale: "Phase 3 adoption effective-range — enrollment effective window",
	}),
	row({
		table: "hr_benefit_enrollment_dependent",
		category: "effective-definition",
		domain: "compensation",
		cluster: "C",
		rationale: "Cluster C compensation — dependent coverage effective window",
	}),
	row({
		table: "hr_compensation_review_cycle",
		category: "versioned-current-fact",
		domain: "compensation",
		cluster: "C",
		rationale: "Cluster C compensation — review cycle schedule definition",
	}),
	row({
		table: "hr_compensation_review",
		category: "transactional-state-machine",
		domain: "compensation",
		cluster: "C",
		rationale: "Cluster C compensation workflow — review decision state",
	}),
	row({
		table: "hr_compensation_proposal",
		category: "transactional-state-machine",
		domain: "compensation",
		cluster: "C",
		rationale:
			"Cluster C compensation workflow — offer-linked proposal draft/approve/issue state",
	}),
	row({
		table: "hr_leave_policy",
		category: "effective-definition",
		domain: "leave",
		cluster: "B",
		rationale: "Phase 3 adoption effective-lineage — published policy lineage",
	}),
	row({
		table: "hr_leave_policy_eligibility",
		category: "bounded-assignment",
		domain: "leave",
		cluster: "B",
		rationale: "Cluster B leave — policy eligibility effective range",
	}),
	row({
		table: "hr_leave_entitlement",
		category: "versioned-current-fact",
		domain: "leave",
		cluster: "B",
		rationale: "Cluster B leave — current entitlement balance snapshot",
	}),
	row({
		table: "hr_leave_adjustment",
		category: "append-only-operational-fact",
		domain: "leave",
		cluster: "B",
		rationale: "Cluster B leave — entitlement adjustment audit record",
	}),
	row({
		table: "hr_leave_request",
		category: "transactional-state-machine",
		domain: "leave",
		cluster: "B",
		rationale: "Cluster B leave workflow — request approval state machine",
	}),
	row({
		table: "hr_leave_request_segment",
		category: "append-only-operational-fact",
		domain: "leave",
		cluster: "B",
		rationale: "Cluster B leave — request segment decomposition record",
	}),
	row({
		table: "hr_leave_approval_decision",
		category: "append-only-operational-fact",
		domain: "leave",
		cluster: "B",
		rationale: "Cluster B leave — approval decision audit record",
	}),
	row({
		table: "hr_performance_cycle",
		category: "versioned-current-fact",
		domain: "performance",
		cluster: "C",
		rationale:
			"Phase 3 adoption versioned-current — performance cycle schedule",
	}),
	row({
		table: "hr_performance_cycle_participant",
		category: "bounded-assignment",
		domain: "performance",
		cluster: "C",
		rationale: "Cluster C performance — cycle participation effective range",
	}),
	row({
		table: "hr_performance_cycle_review_period",
		category: "versioned-current-fact",
		domain: "performance",
		cluster: "C",
		rationale: "Cluster C performance — cycle review period schedule",
	}),
	row({
		table: "hr_performance_cycle_eligibility",
		category: "versioned-current-fact",
		domain: "performance",
		cluster: "C",
		rationale: "Cluster C performance — cycle eligible population criteria",
	}),
	row({
		table: "hr_performance_goal",
		category: "versioned-current-fact",
		domain: "performance",
		cluster: "C",
		rationale: "Cluster C performance — goal definition current state",
	}),
	row({
		table: "hr_performance_goal_progress",
		category: "append-only-operational-fact",
		domain: "performance",
		cluster: "C",
		rationale: "Cluster C performance — goal progress update record",
	}),
	row({
		table: "hr_performance_review",
		category: "transactional-state-machine",
		domain: "performance",
		cluster: "C",
		rationale: "Cluster C performance workflow — review completion state",
	}),
	row({
		table: "hr_performance_review_participant",
		category: "versioned-current-fact",
		domain: "performance",
		cluster: "C",
		rationale: "Cluster C performance — review participant roster definition",
	}),
	row({
		table: "hr_performance_assessment",
		category: "transactional-state-machine",
		domain: "performance",
		cluster: "C",
		rationale: "Cluster C performance workflow — assessment submission state",
	}),
	row({
		table: "hr_performance_improvement_plan",
		category: "transactional-state-machine",
		domain: "performance",
		cluster: "C",
		rationale: "Cluster C performance workflow — PIP lifecycle state",
	}),
	row({
		table: "hr_performance_improvement_checkpoint",
		category: "append-only-operational-fact",
		domain: "performance",
		cluster: "C",
		rationale: "Cluster C performance — PIP checkpoint audit record",
	}),
	row({
		table: "hr_competency",
		category: "versioned-current-fact",
		domain: "talent",
		cluster: "C",
		rationale:
			"Phase 3 adoption versioned-current — competency catalog definition",
	}),
	row({
		table: "hr_job_competency",
		category: "versioned-current-fact",
		domain: "talent",
		cluster: "C",
		rationale:
			"Phase 3 adoption versioned-current — job competency requirement",
	}),
	row({
		table: "hr_competency_assessment",
		category: "effective-definition",
		domain: "talent",
		cluster: "C",
		rationale:
			"Phase 3 adoption point-lineage — competency assessment effective point",
	}),
	row({
		table: "hr_talent_profile",
		category: "versioned-current-fact",
		domain: "talent",
		cluster: "C",
		rationale: "Cluster C talent — profile definition current state",
	}),
	row({
		table: "hr_talent_profile_assessment",
		category: "append-only-operational-fact",
		domain: "talent",
		cluster: "C",
		rationale: "Cluster C talent — profile assessment event record",
	}),
	row({
		table: "hr_talent_profile_mobility",
		category: "append-only-operational-fact",
		domain: "talent",
		cluster: "C",
		rationale: "Cluster C talent — mobility preference event record",
	}),
	row({
		table: "hr_talent_critical_role_readiness",
		category: "append-only-operational-fact",
		domain: "talent",
		cluster: "C",
		rationale: "Cluster C talent — critical role readiness event record",
	}),
	row({
		table: "hr_talent_pool",
		category: "versioned-current-fact",
		domain: "talent",
		cluster: "C",
		rationale: "Cluster C talent — pool definition current state",
	}),
	row({
		table: "hr_talent_pool_member",
		category: "bounded-assignment",
		domain: "talent",
		cluster: "C",
		rationale: "Cluster C talent — pool membership effective range",
	}),
	row({
		table: "hr_career_plan",
		category: "versioned-current-fact",
		domain: "talent",
		cluster: "C",
		rationale: "Cluster C talent — career plan definition current state",
	}),
	row({
		table: "hr_career_plan_action",
		category: "transactional-state-machine",
		domain: "talent",
		cluster: "C",
		rationale: "Cluster C talent workflow — career action completion state",
	}),
	row({
		table: "hr_succession_plan",
		category: "versioned-current-fact",
		domain: "talent",
		cluster: "C",
		rationale: "Cluster C talent — succession plan definition current state",
	}),
	row({
		table: "hr_succession_candidate",
		category: "versioned-current-fact",
		domain: "talent",
		cluster: "C",
		rationale: "Cluster C talent — succession candidate roster definition",
	}),
	row({
		table: "hr_headcount_plan",
		category: "effective-definition",
		domain: "workforce-planning",
		cluster: "C",
		rationale:
			"Phase 3 adoption period-lineage — headcount plan period lineage",
	}),
	row({
		table: "hr_headcount_plan_line",
		category: "versioned-current-fact",
		domain: "workforce-planning",
		cluster: "C",
		rationale: "Phase 3 adoption versioned-current — plan line definition",
	}),
	row({
		table: "hr_headcount_reservation",
		category: "transactional-state-machine",
		domain: "workforce-planning",
		cluster: "C",
		rationale: "Cluster C WFP workflow — reservation hold/release state",
	}),
	row({
		table: "hr_employee_case",
		category: "transactional-state-machine",
		domain: "employee-relations",
		cluster: "C",
		rationale: "Cluster C ER workflow — case lifecycle state machine",
	}),
	row({
		table: "hr_employee_case_event",
		category: "append-only-operational-fact",
		domain: "employee-relations",
		cluster: "C",
		rationale: "Cluster C ER — case event audit trail",
	}),
	row({
		table: "hr_employee_case_action",
		category: "transactional-state-machine",
		domain: "employee-relations",
		cluster: "C",
		rationale: "Cluster C ER workflow — case action approval state",
	}),
	row({
		table: "hr_employee_case_appeal",
		category: "transactional-state-machine",
		domain: "employee-relations",
		cluster: "C",
		rationale: "Cluster C ER workflow — appeal resolution state",
	}),
	row({
		table: "hr_document_requirement",
		category: "versioned-current-fact",
		domain: "compliance",
		cluster: "C",
		rationale:
			"Phase 3 adoption versioned-current — document requirement definition",
	}),
	row({
		table: "hr_employee_document",
		category: "append-only-operational-fact",
		domain: "compliance",
		cluster: "C",
		rationale: "Cluster C compliance — document registration audit record",
	}),
	row({
		table: "hr_work_eligibility",
		category: "effective-definition",
		domain: "compliance",
		cluster: "C",
		rationale: "Phase 3 adoption effective-range — eligibility validity window",
	}),
	row({
		table: "hr_policy_acknowledgement",
		category: "effective-definition",
		domain: "compliance",
		cluster: "C",
		rationale:
			"Phase 3 adoption point-lineage — acknowledgement effective point",
	}),
	row({
		table: "hr_payroll_handoff_delivery",
		category: "transactional-state-machine",
		domain: "compensation",
		cluster: "B",
		rationale:
			"Approved payroll handoff delivery, feedback, retry and correction supersession state",
	}),
	row({
		table: "hr_bulk_import_checkpoint",
		category: "transactional-state-machine",
		domain: "core",
		cluster: "A",
		rationale: "Resumable bulk-import progress with compare-and-swap versions",
	}),
	row({
		table: "hr_bulk_import_audit",
		category: "append-only-operational-fact",
		domain: "core",
		cluster: "A",
		rationale: "Immutable ordered bulk-import execution evidence",
	}),
	row({
		table: "hr_bulk_import_error_artifact",
		category: "append-only-operational-fact",
		domain: "core",
		cluster: "A",
		rationale:
			"Immutable downloadable bulk rejection evidence by checkpoint version",
	}),
	row({
		table: "hr_reliability_work_item",
		category: "transactional-state-machine",
		domain: "core",
		cluster: "A",
		rationale:
			"Durable integration execution, retry, success and terminal state",
	}),
	row({
		table: "hr_reliability_dead_letter",
		category: "transactional-state-machine",
		domain: "core",
		cluster: "A",
		rationale:
			"Terminal integration failure evidence with one replay successor",
	}),
	row({
		table: "hr_connector_cursor",
		category: "versioned-current-fact",
		domain: "core",
		cluster: "A",
		rationale:
			"Connector stream recovery position with compare-and-swap versions",
	}),
	row({
		table: "hr_work_calendar",
		category: "effective-definition",
		domain: "time",
		cluster: "B",
		rationale:
			"Phase 3 adoption effective-lineage — calendar definition lineage",
	}),
	row({
		table: "hr_work_calendar_holiday",
		category: "versioned-current-fact",
		domain: "time",
		cluster: "B",
		rationale: "Cluster B time — holiday calendar entry definition",
	}),
	row({
		table: "hr_employment_calendar_assignment",
		category: "bounded-assignment",
		domain: "time",
		cluster: "B",
		rationale:
			"Phase 3 adoption bounded-assignment — calendar assignment range",
	}),
	row({
		table: "hr_work_calendar_scope_assignment",
		category: "bounded-assignment",
		domain: "time",
		cluster: "B",
		rationale:
			"Phase 3 adoption bounded-assignment — calendar scope assignment range",
	}),
	row({
		table: "hr_shift",
		category: "effective-definition",
		domain: "time",
		cluster: "B",
		rationale: "Phase 3 adoption effective-lineage — shift definition lineage",
	}),
	row({
		table: "hr_shift_break",
		category: "versioned-current-fact",
		domain: "time",
		cluster: "B",
		rationale: "Cluster B time — shift break rule definition",
	}),
	row({
		table: "hr_shift_assignment",
		category: "bounded-assignment",
		domain: "time",
		cluster: "B",
		rationale: "Phase 3 adoption bounded-assignment — shift assignment range",
	}),
	row({
		table: "hr_shift_assignment_segment",
		category: "derived-projection",
		domain: "time",
		cluster: "B",
		rationale:
			"Cluster B time — segment derived from shift assignment decomposition",
	}),
	row({
		table: "hr_attendance_event",
		category: "append-only-operational-fact",
		domain: "time",
		cluster: "B",
		rationale: "Cluster B time — raw attendance punch event record",
	}),
	row({
		table: "hr_attendance_session",
		category: "derived-projection",
		domain: "time",
		cluster: "B",
		rationale:
			"Cluster B time — session derived from attendance event aggregation",
	}),
	row({
		table: "hr_attendance_break_waiver_decision",
		category: "append-only-operational-fact",
		domain: "time",
		cluster: "B",
		rationale: "Cluster B time — break waiver decision audit record",
	}),
	row({
		table: "hr_attendance_exception",
		category: "transactional-state-machine",
		domain: "time",
		cluster: "B",
		rationale: "Cluster B time workflow — exception resolution state",
	}),
	row({
		table: "hr_attendance_adjustment",
		category: "append-only-operational-fact",
		domain: "time",
		cluster: "B",
		rationale: "Cluster B time — attendance correction audit record",
	}),
	row({
		table: "hr_attendance_import_batch",
		category: "transactional-state-machine",
		domain: "time",
		cluster: "B",
		rationale: "Cluster B time workflow — import batch processing state",
	}),
	row({
		table: "hr_attendance_import_error",
		category: "explicit-exclusion",
		domain: "time",
		cluster: "B",
		rationale:
			"OPEN-DECISION-01 operational boundary — import staging error telemetry, not HR historical-truth subject",
	}),
	row({
		table: "hr_time_policy",
		category: "effective-definition",
		domain: "time",
		cluster: "B",
		rationale:
			"Phase 3 adoption effective-lineage — time policy definition lineage",
	}),
	row({
		table: "hr_time_policy_assignment",
		category: "bounded-assignment",
		domain: "time",
		cluster: "B",
		rationale: "Phase 3 adoption bounded-assignment — policy assignment range",
	}),
	row({
		table: "hr_time_approval_authority_assignment",
		category: "bounded-assignment",
		domain: "time",
		cluster: "B",
		rationale:
			"Phase 3 adoption bounded-assignment — approval authority assignment range",
	}),
	row({
		table: "hr_timesheet",
		category: "transactional-state-machine",
		domain: "time",
		cluster: "B",
		rationale: "Cluster B time workflow — timesheet approval state machine",
	}),
	row({
		table: "hr_timesheet_approval_decision",
		category: "append-only-operational-fact",
		domain: "time",
		cluster: "B",
		rationale: "Cluster B time — timesheet approval decision audit record",
	}),
	row({
		table: "hr_timesheet_entry",
		category: "versioned-current-fact",
		domain: "time",
		cluster: "B",
		rationale: "Cluster B time — timesheet line entry current state",
	}),
	row({
		table: "hr_overtime_request",
		category: "transactional-state-machine",
		domain: "time",
		cluster: "B",
		rationale: "Cluster B time workflow — overtime request approval state",
	}),
	row({
		table: "hr_overtime_approval",
		category: "append-only-operational-fact",
		domain: "time",
		cluster: "B",
		rationale: "Cluster B time — overtime approval decision audit record",
	}),
] as const satisfies readonly EffectiveTruthClassificationRow[];

export type EffectiveTruthClassificationIssue =
	| { kind: "missing-classification"; table: string }
	| { kind: "unknown-mutation-table"; table: string }
	| { kind: "duplicate-table"; table: string }
	| { kind: "missing-rationale"; table: string }
	| {
			kind: "adoption-bridge-mismatch";
			table: string;
			expected: EffectiveTruthClassificationCategory;
			actual: EffectiveTruthClassificationCategory;
	  };

export function validateEffectiveTruthClassificationRegister(
	rows: readonly EffectiveTruthClassificationRow[] = HUMAN_RESOURCES_EFFECTIVE_TRUTH_CLASSIFICATION,
): readonly EffectiveTruthClassificationIssue[] {
	const knownTables = new Set<string>(HUMAN_RESOURCES_MUTATION_TABLES);
	const classifiedTables = new Set<string>();
	const classificationByTable = new Map<
		string,
		EffectiveTruthClassificationRow
	>();
	const issues: EffectiveTruthClassificationIssue[] = [];

	for (const classificationRow of rows) {
		if (classifiedTables.has(classificationRow.table)) {
			issues.push({
				kind: "duplicate-table",
				table: classificationRow.table,
			});
		}
		classifiedTables.add(classificationRow.table);
		classificationByTable.set(classificationRow.table, classificationRow);

		if (!knownTables.has(classificationRow.table)) {
			issues.push({
				kind: "unknown-mutation-table",
				table: classificationRow.table,
			});
		}
		if (classificationRow.rationale.trim().length === 0) {
			issues.push({
				kind: "missing-rationale",
				table: classificationRow.table,
			});
		}
	}

	for (const table of HUMAN_RESOURCES_MUTATION_TABLES) {
		if (!classifiedTables.has(table)) {
			issues.push({ kind: "missing-classification", table });
		}
	}

	const adoptionByTable = new Map(
		HUMAN_RESOURCES_EFFECTIVE_TRUTH_ADOPTION.map((adoption) => [
			adoption.table,
			adoption,
		]),
	);
	for (const table of HUMAN_RESOURCES_EFFECTIVE_TRUTH_EXPECTED_TABLES) {
		const adoption = adoptionByTable.get(table);
		const classification = classificationByTable.get(table);
		if (adoption === undefined || classification === undefined) {
			continue;
		}
		const expected = adoptionDecisionToClassificationCategory(
			adoption.decision,
		);
		if (classification.category !== expected) {
			issues.push({
				kind: "adoption-bridge-mismatch",
				table,
				expected,
				actual: classification.category,
			});
		}
	}

	return issues;
}

export function summarizeEffectiveTruthClassificationByCategory(
	rows: readonly EffectiveTruthClassificationRow[] = HUMAN_RESOURCES_EFFECTIVE_TRUTH_CLASSIFICATION,
): Record<EffectiveTruthClassificationCategory, number> {
	const totals = Object.fromEntries(
		EFFECTIVE_TRUTH_CLASSIFICATION_CATEGORIES.map((category) => [category, 0]),
	) as Record<EffectiveTruthClassificationCategory, number>;

	for (const classificationRow of rows) {
		totals[classificationRow.category] += 1;
	}

	return totals;
}
