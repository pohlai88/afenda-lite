import { sql } from "drizzle-orm";
import {
	type AnyPgColumn,
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

export const hrDepartment = pgTable(
	"hr_department",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		code: text("code").notNull(),
		name: text("name").notNull(),
		parentDepartmentId: uuid("parent_department_id").references(
			(): AnyPgColumn => hrDepartment.id,
		),
		/** active | archived */
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
		index("hr_department_org_id_idx").on(t.organizationId, t.id),
		index("hr_department_org_parent_idx").on(
			t.organizationId,
			t.parentDepartmentId,
		),
		index("hr_department_org_status_idx").on(t.organizationId, t.status),
		uniqueIndex("hr_department_org_code_uidx").on(t.organizationId, t.code),
	],
);

export const hrJob = pgTable(
	"hr_job",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		code: text("code").notNull(),
		title: text("title").notNull(),
		/** active | archived */
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
		index("hr_job_org_id_idx").on(t.organizationId, t.id),
		index("hr_job_org_status_idx").on(t.organizationId, t.status),
		uniqueIndex("hr_job_org_code_uidx").on(t.organizationId, t.code),
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
		departmentId: uuid("department_id").references(() => hrDepartment.id),
		jobId: uuid("job_id").references(() => hrJob.id),
		/** active | frozen | closed */
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
		index("hr_position_org_department_idx").on(
			t.organizationId,
			t.departmentId,
		),
		index("hr_position_org_job_idx").on(t.organizationId, t.jobId),
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

export const hrReportingLine = pgTable(
	"hr_reporting_line",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		employeeId: uuid("employee_id")
			.notNull()
			.references(() => hrEmployee.id),
		managerEmployeeId: uuid("manager_employee_id")
			.notNull()
			.references(() => hrEmployee.id),
		/** primary */
		relationshipKind: text("relationship_kind").notNull(),
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
		index("hr_reporting_line_org_id_idx").on(t.organizationId, t.id),
		index("hr_reporting_line_org_employee_idx").on(
			t.organizationId,
			t.employeeId,
		),
		index("hr_reporting_line_org_manager_idx").on(
			t.organizationId,
			t.managerEmployeeId,
		),
		uniqueIndex("hr_reporting_line_org_employee_open_primary_uidx")
			.on(t.organizationId, t.employeeId)
			.where(
				sql`${t.endsOn} IS NULL AND ${t.relationshipKind} = 'primary'`,
			),
	],
);

export const hrEmploymentMovement = createErpScaffoldTable(
	"hr_employment_movement",
);

export const hrJobRequisition = pgTable(
	"hr_job_requisition",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		code: text("code").notNull(),
		title: text("title").notNull(),
		/** draft | submitted | approved | open | on_hold | closed | cancelled */
		status: text("status").notNull(),
		jobId: uuid("job_id").references(() => hrJob.id),
		positionId: uuid("position_id").references(() => hrPosition.id),
		departmentId: uuid("department_id").references(() => hrDepartment.id),
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
		index("hr_job_requisition_org_id_idx").on(t.organizationId, t.id),
		index("hr_job_requisition_org_status_idx").on(t.organizationId, t.status),
		uniqueIndex("hr_job_requisition_org_code_uidx").on(
			t.organizationId,
			t.code,
		),
		uniqueIndex("hr_job_requisition_org_create_idempotency_uidx").on(
			t.organizationId,
			t.createIdempotencyKey,
		),
	],
);

export const hrCandidate = pgTable(
	"hr_candidate",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		displayName: text("display_name").notNull(),
		email: text("email").notNull(),
		normalizedEmail: text("normalized_email").notNull(),
		phone: text("phone"),
		/** active | archived */
		status: text("status").notNull(),
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
		index("hr_candidate_org_id_idx").on(t.organizationId, t.id),
		index("hr_candidate_org_status_idx").on(t.organizationId, t.status),
		uniqueIndex("hr_candidate_org_normalized_email_uidx").on(
			t.organizationId,
			t.normalizedEmail,
		),
		uniqueIndex("hr_candidate_org_create_idempotency_uidx").on(
			t.organizationId,
			t.createIdempotencyKey,
		),
	],
);

export const hrCandidateApplication = pgTable(
	"hr_candidate_application",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		candidateId: uuid("candidate_id")
			.notNull()
			.references(() => hrCandidate.id),
		requisitionId: uuid("requisition_id")
			.notNull()
			.references(() => hrJobRequisition.id),
		/** submitted | in_review | interviewing | offered | accepted | rejected | withdrawn */
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
		index("hr_candidate_application_org_id_idx").on(t.organizationId, t.id),
		index("hr_candidate_application_org_candidate_idx").on(
			t.organizationId,
			t.candidateId,
		),
		index("hr_candidate_application_org_requisition_idx").on(
			t.organizationId,
			t.requisitionId,
		),
		index("hr_candidate_application_org_status_idx").on(
			t.organizationId,
			t.status,
		),
		uniqueIndex("hr_candidate_application_org_candidate_requisition_open_uidx")
			.on(t.organizationId, t.candidateId, t.requisitionId)
			.where(
				sql`${t.status} NOT IN ('accepted', 'rejected', 'withdrawn')`,
			),
	],
);

export const hrInterview = pgTable(
	"hr_interview",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		applicationId: uuid("application_id")
			.notNull()
			.references(() => hrCandidateApplication.id),
		scheduledAt: timestamp("scheduled_at", { withTimezone: true }).notNull(),
		/** scheduled | completed | cancelled */
		status: text("status").notNull(),
		interviewerActorId: text("interviewer_actor_id").notNull(),
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
		index("hr_interview_org_id_idx").on(t.organizationId, t.id),
		index("hr_interview_org_application_idx").on(
			t.organizationId,
			t.applicationId,
		),
		index("hr_interview_org_status_idx").on(t.organizationId, t.status),
	],
);

export const hrInterviewEvaluation = pgTable(
	"hr_interview_evaluation",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		interviewId: uuid("interview_id")
			.notNull()
			.references(() => hrInterview.id),
		/** advance | hold | reject */
		result: text("result").notNull(),
		privateNotes: text("private_notes"),
		evaluatorActorId: text("evaluator_actor_id").notNull(),
		recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull(),
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
		index("hr_interview_evaluation_org_id_idx").on(t.organizationId, t.id),
		uniqueIndex("hr_interview_evaluation_org_interview_uidx").on(
			t.organizationId,
			t.interviewId,
		),
	],
);

export const hrEmploymentOffer = pgTable(
	"hr_employment_offer",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		applicationId: uuid("application_id")
			.notNull()
			.references(() => hrCandidateApplication.id),
		/** draft | issued | accepted | declined | expired | withdrawn */
		status: text("status").notNull(),
		termsSummary: text("terms_summary").notNull(),
		expiresOn: date("expires_on", { mode: "string" }).notNull(),
		issuedAt: timestamp("issued_at", { withTimezone: true }),
		respondedAt: timestamp("responded_at", { withTimezone: true }),
		acceptIdempotencyKey: text("accept_idempotency_key"),
		acceptRequestFingerprint: text("accept_request_fingerprint"),
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
		index("hr_employment_offer_org_id_idx").on(t.organizationId, t.id),
		index("hr_employment_offer_org_status_idx").on(t.organizationId, t.status),
		uniqueIndex("hr_employment_offer_org_application_draft_issued_uidx")
			.on(t.organizationId, t.applicationId)
			.where(sql`${t.status} IN ('draft', 'issued')`),
		uniqueIndex("hr_employment_offer_org_accept_idempotency_uidx")
			.on(t.organizationId, t.acceptIdempotencyKey)
			.where(sql`${t.acceptIdempotencyKey} IS NOT NULL`),
	],
);

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
