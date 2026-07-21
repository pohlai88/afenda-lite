import { sql } from "drizzle-orm";
import {
	date,
	index,
	integer,
	pgTable,
	text,
	timestamp,
	uniqueIndex,
	uuid,
} from "drizzle-orm/pg-core";

import { createErpScaffoldTable } from "./scaffold-table";

/** Human Resources mutation tables — sole mutator `@afenda/human-resources`. */
export const hrEmployee = pgTable(
	"hr_employee",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		employeeNumber: text("employee_number").notNull(),
		normalizedEmployeeNumber: text("normalized_employee_number").notNull(),
		legalName: text("legal_name").notNull(),
		createIdempotencyKey: text("create_idempotency_key").notNull(),
		createRequestFingerprint: text("create_request_fingerprint").notNull(),
		version: integer("version").notNull().default(1),
		createdBy: text("created_by").notNull(),
		updatedBy: text("updated_by").notNull(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => [
		index("hr_employee_org_id_idx").on(t.organizationId, t.id),
		index("hr_employee_org_updated_at_idx").on(
			t.organizationId,
			t.updatedAt,
			t.id,
		),
		index("hr_employee_org_legal_name_idx").on(t.organizationId, t.legalName),
		uniqueIndex("hr_employee_org_normalized_number_uidx").on(
			t.organizationId,
			t.normalizedEmployeeNumber,
		),
		uniqueIndex("hr_employee_org_create_idempotency_uidx").on(
			t.organizationId,
			t.createIdempotencyKey,
		),
	],
);

export const hrEmployment = pgTable(
	"hr_employment",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		employeeId: uuid("employee_id")
			.notNull()
			.references(() => hrEmployee.id),
		/** active | notice | terminated */
		status: text("status").notNull(),
		startsOn: date("starts_on", { mode: "string" }).notNull(),
		endsOn: date("ends_on", { mode: "string" }),
		version: integer("version").notNull().default(1),
		createdBy: text("created_by").notNull(),
		updatedBy: text("updated_by").notNull(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => [
		index("hr_employment_org_id_idx").on(t.organizationId, t.id),
		index("hr_employment_org_employee_idx").on(t.organizationId, t.employeeId),
		uniqueIndex("hr_employment_org_employee_open_uidx")
			.on(t.organizationId, t.employeeId)
			.where(sql`${t.endsOn} IS NULL`),
	],
);

export const hrPosition = pgTable(
	"hr_position",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		code: text("code").notNull(),
		title: text("title").notNull(),
		/** active | inactive */
		status: text("status").notNull(),
		version: integer("version").notNull().default(1),
		createdBy: text("created_by").notNull(),
		updatedBy: text("updated_by").notNull(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => [
		index("hr_position_org_id_idx").on(t.organizationId, t.id),
		index("hr_position_org_status_idx").on(t.organizationId, t.status),
		uniqueIndex("hr_position_org_code_uidx").on(t.organizationId, t.code),
	],
);

export const hrEmploymentContract = pgTable(
	"hr_employment_contract",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		employmentId: uuid("employment_id")
			.notNull()
			.references(() => hrEmployment.id),
		employeeId: uuid("employee_id")
			.notNull()
			.references(() => hrEmployee.id),
		referenceCode: text("reference_code").notNull(),
		startsOn: date("starts_on", { mode: "string" }).notNull(),
		endsOn: date("ends_on", { mode: "string" }),
		version: integer("version").notNull().default(1),
		createdBy: text("created_by").notNull(),
		updatedBy: text("updated_by").notNull(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => [
		index("hr_employment_contract_org_id_idx").on(t.organizationId, t.id),
		index("hr_employment_contract_org_employment_idx").on(
			t.organizationId,
			t.employmentId,
		),
		uniqueIndex("hr_employment_contract_org_employment_ref_uidx").on(
			t.organizationId,
			t.employmentId,
			t.referenceCode,
		),
	],
);

export const hrWorkAssignment = pgTable(
	"hr_work_assignment",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		employmentId: uuid("employment_id")
			.notNull()
			.references(() => hrEmployment.id),
		employeeId: uuid("employee_id")
			.notNull()
			.references(() => hrEmployee.id),
		positionId: uuid("position_id")
			.notNull()
			.references(() => hrPosition.id),
		startsOn: date("starts_on", { mode: "string" }).notNull(),
		endsOn: date("ends_on", { mode: "string" }),
		version: integer("version").notNull().default(1),
		createdBy: text("created_by").notNull(),
		updatedBy: text("updated_by").notNull(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => [
		index("hr_work_assignment_org_id_idx").on(t.organizationId, t.id),
		index("hr_work_assignment_org_employment_idx").on(
			t.organizationId,
			t.employmentId,
		),
		index("hr_work_assignment_org_position_idx").on(
			t.organizationId,
			t.positionId,
		),
		uniqueIndex("hr_work_assignment_org_employment_open_uidx")
			.on(t.organizationId, t.employmentId)
			.where(sql`${t.endsOn} IS NULL`),
	],
);

export const hrDepartment = createErpScaffoldTable("hr_department");
export const hrJob = createErpScaffoldTable("hr_job");
export const hrReportingLine = createErpScaffoldTable("hr_reporting_line");
export const hrEmploymentMovement = createErpScaffoldTable(
	"hr_employment_movement",
);

export const hrJobRequisition = createErpScaffoldTable("hr_job_requisition");
export const hrCandidate = createErpScaffoldTable("hr_candidate");
export const hrCandidateApplication = createErpScaffoldTable(
	"hr_candidate_application",
);
export const hrInterview = createErpScaffoldTable("hr_interview");
export const hrInterviewEvaluation = createErpScaffoldTable(
	"hr_interview_evaluation",
);
export const hrEmploymentOffer = createErpScaffoldTable("hr_employment_offer");

export const hrOnboardingCase = createErpScaffoldTable("hr_onboarding_case");
export const hrOnboardingTask = createErpScaffoldTable("hr_onboarding_task");
export const hrProbationReview = createErpScaffoldTable("hr_probation_review");
export const hrEmploymentConfirmation = createErpScaffoldTable(
	"hr_employment_confirmation",
);
export const hrTermination = createErpScaffoldTable("hr_termination");
export const hrOffboardingCase = createErpScaffoldTable("hr_offboarding_case");
export const hrOffboardingTask = createErpScaffoldTable("hr_offboarding_task");
export const hrExitInterview = createErpScaffoldTable("hr_exit_interview");
export const hrClearance = createErpScaffoldTable("hr_clearance");

export const hrLearningCourse = createErpScaffoldTable("hr_learning_course");
export const hrLearningProgram = createErpScaffoldTable("hr_learning_program");
export const hrLearningSession = createErpScaffoldTable("hr_learning_session");
export const hrLearningAssignment = createErpScaffoldTable(
	"hr_learning_assignment",
);
export const hrLearningAttendance = createErpScaffoldTable(
	"hr_learning_attendance",
);
export const hrLearningAssessment = createErpScaffoldTable(
	"hr_learning_assessment",
);
export const hrLearningCompletion = createErpScaffoldTable(
	"hr_learning_completion",
);
export const hrEmployeeCertification = createErpScaffoldTable(
	"hr_employee_certification",
);
export const hrDevelopmentPlan = createErpScaffoldTable("hr_development_plan");

export const hrCompensationGrade = createErpScaffoldTable(
	"hr_compensation_grade",
);
export const hrSalaryBand = createErpScaffoldTable("hr_salary_band");
export const hrEmployeeCompensation = createErpScaffoldTable(
	"hr_employee_compensation",
);
export const hrAllowanceEntitlement = createErpScaffoldTable(
	"hr_allowance_entitlement",
);
export const hrBonusEligibility = createErpScaffoldTable(
	"hr_bonus_eligibility",
);
export const hrBenefitPlan = createErpScaffoldTable("hr_benefit_plan");
export const hrBenefitEligibility = createErpScaffoldTable(
	"hr_benefit_eligibility",
);
export const hrBenefitEnrollment = createErpScaffoldTable(
	"hr_benefit_enrollment",
);
export const hrCompensationReviewCycle = createErpScaffoldTable(
	"hr_compensation_review_cycle",
);
export const hrCompensationReview = createErpScaffoldTable(
	"hr_compensation_review",
);
