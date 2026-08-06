import { sql } from "drizzle-orm";
import {
	type AnyPgColumn,
	boolean,
	check,
	date,
	foreignKey,
	index,
	integer,
	jsonb,
	numeric,
	pgTable,
	primaryKey,
	text,
	timestamp,
	unique,
	uniqueIndex,
	uuid,
} from "drizzle-orm/pg-core";
import { mdOrganizationDimension } from "./master-data";
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
		unique("hr_employee_org_id_uidx").on(t.organizationId, t.id),
	],
);

export const hrPerson = pgTable(
	"hr_person",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		legalName: text("legal_name").notNull(),
		preferredName: text("preferred_name"),
		privacyClassification: text("privacy_classification")
			.notNull()
			.default("workforce_core"),
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
		index("hr_person_org_id_idx").on(t.organizationId, t.id),
		index("hr_person_org_legal_name_idx").on(t.organizationId, t.legalName),
		uniqueIndex("hr_person_org_create_idempotency_uidx").on(
			t.organizationId,
			t.createIdempotencyKey,
		),
		unique("hr_person_org_id_uidx").on(t.organizationId, t.id),
		check(
			"hr_person_privacy_classification_check",
			sql`${t.privacyClassification} IN ('workforce_core', 'pay_and_benefits', 'medical_and_leave', 'recruitment_and_background', 'employee_relations_and_legal', 'performance_and_talent')`,
		),
	],
);

export const hrPersonContact = pgTable(
	"hr_person_contact",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		personId: uuid("person_id").notNull(),
		contactType: text("contact_type").notNull(),
		valueText: text("value_text").notNull(),
		normalizedValue: text("normalized_value").notNull(),
		isPrimary: boolean("is_primary").notNull().default(false),
		status: text("status").notNull().default("active"),
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
		index("hr_person_contact_org_person_idx").on(t.organizationId, t.personId),
		index("hr_person_contact_org_id_idx").on(t.organizationId, t.id),
		index("hr_person_contact_org_type_normalized_idx").on(
			t.organizationId,
			t.contactType,
			t.normalizedValue,
		),
		uniqueIndex("hr_person_contact_org_create_idempotency_uidx").on(
			t.organizationId,
			t.createIdempotencyKey,
		),
		uniqueIndex("hr_person_contact_org_person_type_primary_uidx")
			.on(t.organizationId, t.personId, t.contactType)
			.where(sql`${t.status} = 'active' AND ${t.isPrimary} = true`),
		foreignKey({
			columns: [t.organizationId, t.personId],
			foreignColumns: [hrPerson.organizationId, hrPerson.id],
			name: "hr_person_contact_org_person_fk",
		}),
		check(
			"hr_person_contact_type_check",
			sql`${t.contactType} IN ('email', 'phone', 'postal_address')`,
		),
		check(
			"hr_person_contact_status_check",
			sql`${t.status} IN ('active', 'retired')`,
		),
	],
);

export const hrPersonIdentifier = pgTable(
	"hr_person_identifier",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		personId: uuid("person_id").notNull(),
		identifierType: text("identifier_type").notNull(),
		identifierFingerprint: text("identifier_fingerprint").notNull(),
		identifierLast4: text("identifier_last4").notNull(),
		documentRef: text("document_ref"),
		effectiveFrom: date("effective_from").notNull(),
		effectiveTo: date("effective_to"),
		status: text("status").notNull().default("active"),
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
		index("hr_person_identifier_org_person_idx").on(
			t.organizationId,
			t.personId,
		),
		index("hr_person_identifier_org_id_idx").on(t.organizationId, t.id),
		index("hr_person_identifier_org_type_fingerprint_idx").on(
			t.organizationId,
			t.identifierType,
			t.identifierFingerprint,
		),
		uniqueIndex("hr_person_identifier_org_create_idempotency_uidx").on(
			t.organizationId,
			t.createIdempotencyKey,
		),
		uniqueIndex("hr_person_identifier_org_type_fingerprint_open_uidx")
			.on(t.organizationId, t.identifierType, t.identifierFingerprint)
			.where(sql`${t.effectiveTo} IS NULL AND ${t.status} = 'active'`),
		foreignKey({
			columns: [t.organizationId, t.personId],
			foreignColumns: [hrPerson.organizationId, hrPerson.id],
			name: "hr_person_identifier_org_person_fk",
		}),
		check(
			"hr_person_identifier_status_check",
			sql`${t.status} IN ('active', 'retired')`,
		),
		check(
			"hr_person_identifier_date_range_check",
			sql`${t.effectiveTo} IS NULL OR ${t.effectiveTo} >= ${t.effectiveFrom}`,
		),
	],
);

export const hrWorker = pgTable(
	"hr_worker",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		personId: uuid("person_id").notNull(),
		workerType: text("worker_type").notNull(),
		employeeId: uuid("employee_id"),
		status: text("status").notNull(),
		effectiveFrom: date("effective_from").notNull(),
		effectiveTo: date("effective_to"),
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
		index("hr_worker_org_id_idx").on(t.organizationId, t.id),
		index("hr_worker_org_person_idx").on(t.organizationId, t.personId),
		index("hr_worker_org_employee_idx").on(t.organizationId, t.employeeId),
		uniqueIndex("hr_worker_org_create_idempotency_uidx").on(
			t.organizationId,
			t.createIdempotencyKey,
		),
		unique("hr_worker_org_id_uidx").on(t.organizationId, t.id),
		uniqueIndex("hr_worker_org_person_uidx").on(t.organizationId, t.personId),
		uniqueIndex("hr_worker_org_employee_uidx")
			.on(t.organizationId, t.employeeId)
			.where(sql`${t.employeeId} IS NOT NULL`),
		foreignKey({
			columns: [t.organizationId, t.personId],
			foreignColumns: [hrPerson.organizationId, hrPerson.id],
			name: "hr_worker_org_person_fk",
		}),
		foreignKey({
			columns: [t.organizationId, t.employeeId],
			foreignColumns: [hrEmployee.organizationId, hrEmployee.id],
			name: "hr_worker_org_employee_fk",
		}),
		check(
			"hr_worker_type_check",
			sql`${t.workerType} IN ('employee', 'contractor', 'contingent_worker', 'intern')`,
		),
		check(
			"hr_worker_status_check",
			sql`${t.status} IN ('active', 'inactive', 'former')`,
		),
		check(
			"hr_worker_effective_dates_check",
			sql`${t.effectiveTo} IS NULL OR ${t.effectiveTo} >= ${t.effectiveFrom}`,
		),
		check(
			"hr_worker_employee_id_check",
			sql`(${t.workerType} = 'employee') OR (${t.employeeId} IS NULL)`,
		),
	],
);

/** Non-destructive person identity lineage — historical legal-name segments. */
export const hrPersonIdentityVersion = pgTable(
	"hr_person_identity_version",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		personId: uuid("person_id").notNull(),
		legalName: text("legal_name").notNull(),
		effectiveFrom: date("effective_from").notNull(),
		effectiveTo: date("effective_to"),
		supersedesIdentityVersionId: uuid(
			"supersedes_identity_version_id",
		).references((): AnyPgColumn => hrPersonIdentityVersion.id),
		lineageStatus: text("lineage_status").notNull(),
		reasonCode: text("reason_code").notNull(),
		evidenceRef: text("evidence_ref"),
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
		index("hr_person_identity_version_org_person_idx").on(
			t.organizationId,
			t.personId,
		),
		index("hr_person_identity_version_org_id_idx").on(t.organizationId, t.id),
		uniqueIndex("hr_person_identity_version_org_person_open_uidx")
			.on(t.organizationId, t.personId)
			.where(sql`${t.effectiveTo} IS NULL AND ${t.lineageStatus} = 'active'`),
		foreignKey({
			columns: [t.organizationId, t.personId],
			foreignColumns: [hrPerson.organizationId, hrPerson.id],
			name: "hr_person_identity_version_org_person_fk",
		}),
		check(
			"hr_person_identity_version_lineage_status_check",
			sql`${t.lineageStatus} IN ('active', 'superseded')`,
		),
		check(
			"hr_person_identity_version_date_range_check",
			sql`${t.effectiveTo} IS NULL OR ${t.effectiveTo} >= ${t.effectiveFrom}`,
		),
	],
);

/** Non-destructive worker classification lineage — type/status history segments. */
export const hrWorkerClassificationVersion = pgTable(
	"hr_worker_classification_version",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		workerId: uuid("worker_id").notNull(),
		workerType: text("worker_type").notNull(),
		employeeId: uuid("employee_id"),
		workerStatus: text("worker_status").notNull(),
		effectiveFrom: date("effective_from").notNull(),
		effectiveTo: date("effective_to"),
		supersedesClassificationVersionId: uuid(
			"supersedes_classification_version_id",
		).references((): AnyPgColumn => hrWorkerClassificationVersion.id),
		lineageStatus: text("lineage_status").notNull(),
		reasonCode: text("reason_code").notNull(),
		evidenceRef: text("evidence_ref"),
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
		index("hr_worker_classification_version_org_worker_idx").on(
			t.organizationId,
			t.workerId,
		),
		index("hr_worker_classification_version_org_id_idx").on(
			t.organizationId,
			t.id,
		),
		uniqueIndex("hr_worker_classification_version_org_worker_open_uidx")
			.on(t.organizationId, t.workerId)
			.where(sql`${t.effectiveTo} IS NULL AND ${t.lineageStatus} = 'active'`),
		foreignKey({
			columns: [t.organizationId, t.workerId],
			foreignColumns: [hrWorker.organizationId, hrWorker.id],
			name: "hr_worker_classification_version_org_worker_fk",
		}),
		foreignKey({
			columns: [t.organizationId, t.employeeId],
			foreignColumns: [hrEmployee.organizationId, hrEmployee.id],
			name: "hr_worker_classification_version_org_employee_fk",
		}),
		check(
			"hr_worker_classification_version_type_check",
			sql`${t.workerType} IN ('employee', 'contractor', 'contingent_worker', 'intern')`,
		),
		check(
			"hr_worker_classification_version_worker_status_check",
			sql`${t.workerStatus} IN ('active', 'inactive', 'former')`,
		),
		check(
			"hr_worker_classification_version_lineage_status_check",
			sql`${t.lineageStatus} IN ('active', 'superseded')`,
		),
		check(
			"hr_worker_classification_version_date_range_check",
			sql`${t.effectiveTo} IS NULL OR ${t.effectiveTo} >= ${t.effectiveFrom}`,
		),
		check(
			"hr_worker_classification_version_employee_id_check",
			sql`(${t.workerType} = 'employee') OR (${t.employeeId} IS NULL)`,
		),
	],
);

/** User-to-employee identity mapping for actor resolution and RBAC */
export const hrUserEmployee = pgTable(
	"hr_user_employee",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		userId: text("user_id").notNull(),
		employeeId: uuid("employee_id")
			.notNull()
			.references(() => hrEmployee.id),
		relationshipType: text("relationship_type")
			.notNull()
			.$type<"self" | "proxy">(),
		effectiveFrom: date("effective_from").notNull(),
		effectiveUntil: date("effective_until"),
		createdBy: text("created_by").notNull(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => [
		index("hr_user_employee_org_user_idx").on(t.organizationId, t.userId),
		index("hr_user_employee_org_employee_idx").on(
			t.organizationId,
			t.employeeId,
		),
		index("hr_user_employee_effective_idx").on(
			t.organizationId,
			t.userId,
			t.effectiveFrom,
			t.effectiveUntil,
		),
		uniqueIndex("hr_user_employee_org_user_emp_from_uidx").on(
			t.organizationId,
			t.userId,
			t.employeeId,
			t.effectiveFrom,
		),
		check(
			"hr_user_employee_relationship_type_check",
			sql`${t.relationshipType} IN ('self', 'proxy')`,
		),
		check(
			"hr_user_employee_effective_dates_check",
			sql`${t.effectiveUntil} IS NULL OR ${t.effectiveUntil} > ${t.effectiveFrom}`,
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
		/** active | superseded | archived */
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
		unique("hr_department_org_id_uidx").on(t.organizationId, t.id),
	],
);

/** Non-destructive department structure lineage — name and parent history. */
export const hrDepartmentStructureVersion = pgTable(
	"hr_department_structure_version",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		departmentId: uuid("department_id").notNull(),
		name: text("name").notNull(),
		parentDepartmentId: uuid("parent_department_id"),
		effectiveFrom: date("effective_from", { mode: "string" }).notNull(),
		effectiveTo: date("effective_to", { mode: "string" }),
		supersedesStructureVersionId: uuid(
			"supersedes_structure_version_id",
		).references((): AnyPgColumn => hrDepartmentStructureVersion.id),
		lineageStatus: text("lineage_status").notNull(),
		reasonCode: text("reason_code").notNull(),
		evidenceRef: text("evidence_ref"),
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
		index("hr_department_structure_version_org_department_idx").on(
			t.organizationId,
			t.departmentId,
		),
		index("hr_department_structure_version_org_id_idx").on(
			t.organizationId,
			t.id,
		),
		uniqueIndex("hr_department_structure_version_org_department_open_uidx")
			.on(t.organizationId, t.departmentId)
			.where(sql`${t.effectiveTo} IS NULL AND ${t.lineageStatus} = 'active'`),
		foreignKey({
			columns: [t.organizationId, t.departmentId],
			foreignColumns: [hrDepartment.organizationId, hrDepartment.id],
			name: "hr_department_structure_version_org_department_fk",
		}),
		check(
			"hr_department_structure_version_lineage_status_check",
			sql`${t.lineageStatus} IN ('active', 'superseded')`,
		),
		check(
			"hr_department_structure_version_date_range_check",
			sql`${t.effectiveTo} IS NULL OR ${t.effectiveTo} >= ${t.effectiveFrom}`,
		),
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
		unique("hr_job_org_id_uidx").on(t.organizationId, t.id),
	],
);

/** Non-destructive job definition lineage — title history. */
export const hrJobDefinitionVersion = pgTable(
	"hr_job_definition_version",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		jobId: uuid("job_id").notNull(),
		title: text("title").notNull(),
		effectiveFrom: date("effective_from", { mode: "string" }).notNull(),
		effectiveTo: date("effective_to", { mode: "string" }),
		supersedesDefinitionVersionId: uuid(
			"supersedes_definition_version_id",
		).references((): AnyPgColumn => hrJobDefinitionVersion.id),
		lineageStatus: text("lineage_status").notNull(),
		reasonCode: text("reason_code").notNull(),
		evidenceRef: text("evidence_ref"),
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
		index("hr_job_definition_version_org_job_idx").on(
			t.organizationId,
			t.jobId,
		),
		index("hr_job_definition_version_org_id_idx").on(t.organizationId, t.id),
		uniqueIndex("hr_job_definition_version_org_job_open_uidx")
			.on(t.organizationId, t.jobId)
			.where(sql`${t.effectiveTo} IS NULL AND ${t.lineageStatus} = 'active'`),
		foreignKey({
			columns: [t.organizationId, t.jobId],
			foreignColumns: [hrJob.organizationId, hrJob.id],
			name: "hr_job_definition_version_org_job_fk",
		}),
		check(
			"hr_job_definition_version_lineage_status_check",
			sql`${t.lineageStatus} IN ('active', 'superseded')`,
		),
		check(
			"hr_job_definition_version_date_range_check",
			sql`${t.effectiveTo} IS NULL OR ${t.effectiveTo} >= ${t.effectiveFrom}`,
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
		check(
			"hr_employment_effective_range_ck",
			sql`${t.endsOn} IS NULL OR ${t.startsOn} <= ${t.endsOn}`,
		),
	],
);

/** Append-only employment status and tenure snapshots for historical queries. */
export const hrEmploymentStatusHistory = pgTable(
	"hr_employment_status_history",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		employmentId: uuid("employment_id")
			.notNull()
			.references(() => hrEmployment.id),
		employeeId: uuid("employee_id")
			.notNull()
			.references(() => hrEmployee.id),
		fromStatus: text("from_status"),
		toStatus: text("to_status").notNull(),
		startsOnSnapshot: date("starts_on_snapshot", { mode: "string" }).notNull(),
		endsOnSnapshot: date("ends_on_snapshot", { mode: "string" }),
		effectiveOn: date("effective_on", { mode: "string" }).notNull(),
		changeKind: text("change_kind").notNull(),
		reason: text("reason"),
		evidenceReference: text("evidence_reference"),
		correlationId: text("correlation_id").notNull(),
		actorUserId: text("actor_user_id").notNull(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => [
		index("hr_employment_status_history_org_employment_effective_idx").on(
			t.organizationId,
			t.employmentId,
			t.effectiveOn,
		),
		index("hr_employment_status_history_org_employee_effective_idx").on(
			t.organizationId,
			t.employeeId,
			t.effectiveOn,
		),
		check(
			"hr_employment_status_history_change_kind_check",
			sql`${t.changeKind} IN ('create', 'lifecycle', 'correction')`,
		),
		check(
			"hr_employment_status_history_to_status_check",
			sql`${t.toStatus} IN ('active', 'notice', 'terminated')`,
		),
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
		unique("hr_position_org_id_uidx").on(t.organizationId, t.id),
	],
);

/** Non-destructive position definition lineage — title, department, job history. */
export const hrPositionDefinitionVersion = pgTable(
	"hr_position_definition_version",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		positionId: uuid("position_id").notNull(),
		title: text("title").notNull(),
		departmentId: uuid("department_id"),
		jobId: uuid("job_id"),
		effectiveFrom: date("effective_from", { mode: "string" }).notNull(),
		effectiveTo: date("effective_to", { mode: "string" }),
		supersedesDefinitionVersionId: uuid(
			"supersedes_definition_version_id",
		).references((): AnyPgColumn => hrPositionDefinitionVersion.id),
		lineageStatus: text("lineage_status").notNull(),
		reasonCode: text("reason_code").notNull(),
		evidenceRef: text("evidence_ref"),
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
		index("hr_position_definition_version_org_position_idx").on(
			t.organizationId,
			t.positionId,
		),
		index("hr_position_definition_version_org_id_idx").on(
			t.organizationId,
			t.id,
		),
		uniqueIndex("hr_position_definition_version_org_position_open_uidx")
			.on(t.organizationId, t.positionId)
			.where(sql`${t.effectiveTo} IS NULL AND ${t.lineageStatus} = 'active'`),
		foreignKey({
			columns: [t.organizationId, t.positionId],
			foreignColumns: [hrPosition.organizationId, hrPosition.id],
			name: "hr_position_definition_version_org_position_fk",
		}),
		check(
			"hr_position_definition_version_lineage_status_check",
			sql`${t.lineageStatus} IN ('active', 'superseded')`,
		),
		check(
			"hr_position_definition_version_date_range_check",
			sql`${t.effectiveTo} IS NULL OR ${t.effectiveTo} >= ${t.effectiveFrom}`,
		),
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
		lineageStatus: text("lineage_status").notNull(),
		supersedesContractId: uuid("supersedes_contract_id").references(
			(): AnyPgColumn => hrEmploymentContract.id,
		),
		supersededByContractId: uuid("superseded_by_contract_id").references(
			(): AnyPgColumn => hrEmploymentContract.id,
		),
		reasonCode: text("reason_code").notNull(),
		sourceReference: text("source_reference"),
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
		index("hr_employment_contract_org_employment_starts_idx").on(
			t.organizationId,
			t.employmentId,
			t.startsOn,
		),
		uniqueIndex("hr_employment_contract_org_employment_ref_active_uidx")
			.on(t.organizationId, t.employmentId, t.referenceCode)
			.where(sql`${t.lineageStatus} = 'active'`),
		check(
			"hr_employment_contract_effective_range_ck",
			sql`${t.endsOn} IS NULL OR ${t.startsOn} <= ${t.endsOn}`,
		),
		check(
			"hr_employment_contract_lineage_status_check",
			sql`${t.lineageStatus} IN ('active', 'superseded')`,
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
		/** Nullable only for rows predating governed dimensions; reads fail closed. */
		legalEntityDimensionId: uuid("legal_entity_dimension_id"),
		legalEntityKeySnapshot: text("legal_entity_key_snapshot"),
		legalEntityNameSnapshot: text("legal_entity_name_snapshot"),
		businessUnitDimensionId: uuid("business_unit_dimension_id"),
		businessUnitKeySnapshot: text("business_unit_key_snapshot"),
		businessUnitNameSnapshot: text("business_unit_name_snapshot"),
		locationDimensionId: uuid("location_dimension_id"),
		locationKeySnapshot: text("location_key_snapshot"),
		locationNameSnapshot: text("location_name_snapshot"),
		costCentreDimensionId: uuid("cost_centre_dimension_id"),
		costCentreKeySnapshot: text("cost_centre_key_snapshot"),
		costCentreNameSnapshot: text("cost_centre_name_snapshot"),
		projectDimensionId: uuid("project_dimension_id"),
		projectKeySnapshot: text("project_key_snapshot"),
		projectNameSnapshot: text("project_name_snapshot"),
		predecessorAssignmentId: uuid("predecessor_assignment_id").references(
			(): AnyPgColumn => hrWorkAssignment.id,
		),
		successorAssignmentId: uuid("successor_assignment_id").references(
			(): AnyPgColumn => hrWorkAssignment.id,
		),
		transferMovementId: uuid("transfer_movement_id").references(
			(): AnyPgColumn => hrEmploymentMovement.id,
		),
		managerEmployeeIdSnapshot: uuid("manager_employee_id_snapshot").references(
			() => hrEmployee.id,
		),
		workCalendarIdSnapshot: uuid("work_calendar_id_snapshot").references(
			(): AnyPgColumn => hrWorkCalendar.id,
		),
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
		index("hr_work_assignment_org_legal_entity_idx").on(
			t.organizationId,
			t.legalEntityDimensionId,
		),
		index("hr_work_assignment_org_business_unit_idx").on(
			t.organizationId,
			t.businessUnitDimensionId,
		),
		index("hr_work_assignment_org_location_idx").on(
			t.organizationId,
			t.locationDimensionId,
		),
		index("hr_work_assignment_org_cost_centre_idx").on(
			t.organizationId,
			t.costCentreDimensionId,
		),
		index("hr_work_assignment_org_project_idx").on(
			t.organizationId,
			t.projectDimensionId,
		),
		index("hr_work_assignment_org_employment_starts_idx").on(
			t.organizationId,
			t.employmentId,
			t.startsOn,
		),
		uniqueIndex("hr_work_assignment_org_employment_open_uidx")
			.on(t.organizationId, t.employmentId)
			.where(sql`${t.endsOn} IS NULL`),
		foreignKey({
			columns: [t.organizationId, t.legalEntityDimensionId],
			foreignColumns: [
				mdOrganizationDimension.organizationId,
				mdOrganizationDimension.id,
			],
			name: "hr_work_assignment_org_legal_entity_dimension_fk",
		}),
		foreignKey({
			columns: [t.organizationId, t.businessUnitDimensionId],
			foreignColumns: [
				mdOrganizationDimension.organizationId,
				mdOrganizationDimension.id,
			],
			name: "hr_work_assignment_org_business_unit_dimension_fk",
		}),
		foreignKey({
			columns: [t.organizationId, t.locationDimensionId],
			foreignColumns: [
				mdOrganizationDimension.organizationId,
				mdOrganizationDimension.id,
			],
			name: "hr_work_assignment_org_location_dimension_fk",
		}),
		foreignKey({
			columns: [t.organizationId, t.costCentreDimensionId],
			foreignColumns: [
				mdOrganizationDimension.organizationId,
				mdOrganizationDimension.id,
			],
			name: "hr_work_assignment_org_cost_centre_dimension_fk",
		}),
		foreignKey({
			columns: [t.organizationId, t.projectDimensionId],
			foreignColumns: [
				mdOrganizationDimension.organizationId,
				mdOrganizationDimension.id,
			],
			name: "hr_work_assignment_org_project_dimension_fk",
		}),
		check(
			"hr_work_assignment_effective_range_ck",
			sql`${t.endsOn} IS NULL OR ${t.startsOn} <= ${t.endsOn}`,
		),
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
		supersedesReportingLineId: uuid("supersedes_reporting_line_id").references(
			(): AnyPgColumn => hrReportingLine.id,
		),
		supersededByReportingLineId: uuid(
			"superseded_by_reporting_line_id",
		).references((): AnyPgColumn => hrReportingLine.id),
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
			.where(sql`${t.endsOn} IS NULL AND ${t.relationshipKind} = 'primary'`),
		check(
			"hr_reporting_line_effective_range_ck",
			sql`${t.endsOn} IS NULL OR ${t.startsOn} <= ${t.endsOn}`,
		),
	],
);

export const hrEmploymentMovement = pgTable(
	"hr_employment_movement",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		employmentId: uuid("employment_id")
			.notNull()
			.references(() => hrEmployment.id),
		employeeId: uuid("employee_id")
			.notNull()
			.references(() => hrEmployee.id),
		/** transfer */
		movementKind: text("movement_kind").notNull(),
		fromAssignmentId: uuid("from_assignment_id")
			.notNull()
			.references(() => hrWorkAssignment.id),
		toAssignmentId: uuid("to_assignment_id")
			.notNull()
			.references(() => hrWorkAssignment.id),
		fromPositionId: uuid("from_position_id")
			.notNull()
			.references(() => hrPosition.id),
		toPositionId: uuid("to_position_id")
			.notNull()
			.references(() => hrPosition.id),
		effectiveOn: date("effective_on", { mode: "string" }).notNull(),
		reason: text("reason").notNull(),
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
		index("hr_employment_movement_org_id_idx").on(t.organizationId, t.id),
		index("hr_employment_movement_org_employment_idx").on(
			t.organizationId,
			t.employmentId,
		),
		uniqueIndex("hr_employment_movement_org_create_idempotency_uidx").on(
			t.organizationId,
			t.createIdempotencyKey,
		),
	],
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
		hiringManagerEmployeeId: uuid("hiring_manager_employee_id").references(
			() => hrEmployee.id,
		),
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
		consentPolicyVersion: text("consent_policy_version"),
		consentCapturedAt: timestamp("consent_captured_at", {
			withTimezone: true,
		}),
		consentSource: text("consent_source"),
		retentionUntil: date("retention_until", { mode: "string" }),
		consentWithdrawnAt: timestamp("consent_withdrawn_at", {
			withTimezone: true,
		}),
		/** active | archived | anonymized */
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
		check(
			"hr_candidate_consent_source_check",
			sql`${t.consentSource} IS NULL OR ${t.consentSource} IN ('self_service', 'recruiter_recorded', 'import')`,
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
			.where(sql`${t.status} NOT IN ('accepted', 'rejected', 'withdrawn')`),
	],
);

/** Append-only candidate application status and reason history. */
export const hrCandidateApplicationStatusHistory = pgTable(
	"hr_candidate_application_status_history",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		applicationId: uuid("application_id")
			.notNull()
			.references(() => hrCandidateApplication.id),
		candidateId: uuid("candidate_id")
			.notNull()
			.references(() => hrCandidate.id),
		requisitionId: uuid("requisition_id")
			.notNull()
			.references(() => hrJobRequisition.id),
		fromStatus: text("from_status"),
		toStatus: text("to_status").notNull(),
		changeKind: text("change_kind").notNull(),
		reason: text("reason"),
		reasonCode: text("reason_code"),
		correlationId: text("correlation_id").notNull(),
		actorUserId: text("actor_user_id").notNull(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => [
		index(
			"hr_candidate_application_status_history_org_application_created_idx",
		).on(t.organizationId, t.applicationId, t.createdAt),
		index("hr_candidate_application_status_history_org_candidate_idx").on(
			t.organizationId,
			t.candidateId,
		),
		check(
			"hr_candidate_application_status_history_change_kind_check",
			sql`${t.changeKind} IN ('create', 'lifecycle')`,
		),
		check(
			"hr_candidate_application_status_history_to_status_check",
			sql`${t.toStatus} IN ('submitted', 'in_review', 'interviewing', 'offered', 'accepted', 'rejected', 'withdrawn')`,
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
		scorecardJson: jsonb("scorecard_json").notNull(),
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
		check(
			"hr_interview_evaluation_scorecard_json_check",
			sql`jsonb_typeof(${t.scorecardJson}) = 'object'
				AND jsonb_typeof(${t.scorecardJson}->'criteria') = 'array'
				AND jsonb_array_length(${t.scorecardJson}->'criteria') BETWEEN 1 AND 20`,
		),
	],
);

export const hrCompensationProposal = pgTable(
	"hr_compensation_proposal",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		applicationId: uuid("application_id")
			.notNull()
			.references(() => hrCandidateApplication.id),
		/** draft | approved */
		status: text("status").notNull(),
		proposedBaseAmount: text("proposed_base_amount"),
		proposedCurrencyCode: text("proposed_currency_code"),
		proposedGradeId: uuid("proposed_grade_id").references(
			() => hrCompensationGrade.id,
		),
		proposedSalaryBandId: uuid("proposed_salary_band_id").references(
			() => hrSalaryBand.id,
		),
		confidentialNote: text("confidential_note"),
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
		index("hr_compensation_proposal_org_id_idx").on(t.organizationId, t.id),
		index("hr_compensation_proposal_org_application_idx").on(
			t.organizationId,
			t.applicationId,
		),
		index("hr_compensation_proposal_org_status_idx").on(
			t.organizationId,
			t.status,
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
		compensationProposalId: uuid("compensation_proposal_id").references(
			() => hrCompensationProposal.id,
		),
		/** draft | approved | issued | accepted | declined | expired | withdrawn */
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
		uniqueIndex("hr_employment_offer_org_application_active_uidx")
			.on(t.organizationId, t.applicationId)
			.where(sql`${t.status} IN ('draft', 'approved', 'issued')`),
		uniqueIndex("hr_employment_offer_org_accept_idempotency_uidx")
			.on(t.organizationId, t.acceptIdempotencyKey)
			.where(sql`${t.acceptIdempotencyKey} IS NOT NULL`),
	],
);

export const hrHireAttempt = pgTable(
	"hr_hire_attempt",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		offerId: uuid("offer_id")
			.notNull()
			.references(() => hrEmploymentOffer.id),
		correlationId: text("correlation_id").notNull(),
		idempotencyKey: text("idempotency_key").notNull(),
		requestFingerprint: text("request_fingerprint").notNull(),
		/** in_progress | completed | failed_compensated */
		status: text("status").notNull(),
		currentStep: text("current_step"),
		personId: uuid("person_id").references(() => hrPerson.id),
		employeeId: uuid("employee_id").references(() => hrEmployee.id),
		employmentId: uuid("employment_id").references(() => hrEmployment.id),
		workerId: uuid("worker_id").references(() => hrWorker.id),
		assignmentId: uuid("assignment_id").references(() => hrWorkAssignment.id),
		onboardingCaseId: uuid("onboarding_case_id").references(
			() => hrOnboardingCase.id,
		),
		compensationLog: jsonb("compensation_log")
			.notNull()
			.default(sql`'[]'::jsonb`),
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
		index("hr_hire_attempt_org_id_idx").on(t.organizationId, t.id),
		uniqueIndex("hr_hire_attempt_org_idempotency_uidx").on(
			t.organizationId,
			t.idempotencyKey,
		),
		uniqueIndex("hr_hire_attempt_org_offer_open_uidx")
			.on(t.organizationId, t.offerId)
			.where(sql`${t.status} IN ('in_progress', 'completed')`),
	],
);

export const hrOnboardingCase = pgTable(
	"hr_onboarding_case",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		employmentId: uuid("employment_id")
			.notNull()
			.references(() => hrEmployment.id),
		employeeId: uuid("employee_id")
			.notNull()
			.references(() => hrEmployee.id),
		/** in_progress | completed | cancelled */
		status: text("status").notNull(),
		sourceOfferId: uuid("source_offer_id").references(
			() => hrEmploymentOffer.id,
		),
		startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
		completedAt: timestamp("completed_at", { withTimezone: true }),
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
		index("hr_onboarding_case_org_id_idx").on(t.organizationId, t.id),
		index("hr_onboarding_case_org_employment_idx").on(
			t.organizationId,
			t.employmentId,
		),
		uniqueIndex("hr_onboarding_case_org_employment_open_uidx")
			.on(t.organizationId, t.employmentId)
			.where(sql`${t.status} = 'in_progress'`),
		uniqueIndex("hr_onboarding_case_org_create_idempotency_uidx").on(
			t.organizationId,
			t.createIdempotencyKey,
		),
	],
);

export const hrOnboardingTask = pgTable(
	"hr_onboarding_task",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		caseId: uuid("case_id")
			.notNull()
			.references(() => hrOnboardingCase.id),
		code: text("code").notNull(),
		title: text("title").notNull(),
		mandatory: boolean("mandatory").notNull(),
		/** pending | completed | waived */
		status: text("status").notNull(),
		completedAt: timestamp("completed_at", { withTimezone: true }),
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
		index("hr_onboarding_task_org_id_idx").on(t.organizationId, t.id),
		index("hr_onboarding_task_org_case_idx").on(t.organizationId, t.caseId),
		uniqueIndex("hr_onboarding_task_org_case_code_uidx").on(
			t.organizationId,
			t.caseId,
			t.code,
		),
	],
);

export const hrOnboardingOrientation = pgTable(
	"hr_onboarding_orientation",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		onboardingCaseId: uuid("onboarding_case_id")
			.notNull()
			.references(() => hrOnboardingCase.id),
		employmentId: uuid("employment_id")
			.notNull()
			.references(() => hrEmployment.id),
		/** pending | acknowledged */
		status: text("status").notNull(),
		acknowledgedOn: date("acknowledged_on", { mode: "string" }),
		notes: text("notes"),
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
		index("hr_onboarding_orientation_org_id_idx").on(t.organizationId, t.id),
		uniqueIndex("hr_onboarding_orientation_org_case_uidx").on(
			t.organizationId,
			t.onboardingCaseId,
		),
		check(
			"hr_onboarding_orientation_status_check",
			sql`${t.status} IN ('pending', 'acknowledged')`,
		),
	],
);

export const hrOnboardingEquipmentHandoff = pgTable(
	"hr_onboarding_equipment_handoff",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		onboardingCaseId: uuid("onboarding_case_id")
			.notNull()
			.references(() => hrOnboardingCase.id),
		employmentId: uuid("employment_id")
			.notNull()
			.references(() => hrEmployment.id),
		/** pending | handed_over */
		status: text("status").notNull(),
		handedOverOn: date("handed_over_on", { mode: "string" }),
		summary: text("summary"),
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
		index("hr_onboarding_equipment_handoff_org_id_idx").on(
			t.organizationId,
			t.id,
		),
		uniqueIndex("hr_onboarding_equipment_handoff_org_case_uidx").on(
			t.organizationId,
			t.onboardingCaseId,
		),
		check(
			"hr_onboarding_equipment_handoff_status_check",
			sql`${t.status} IN ('pending', 'handed_over')`,
		),
	],
);

export const hrOnboardingAccessHandoff = pgTable(
	"hr_onboarding_access_handoff",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		onboardingCaseId: uuid("onboarding_case_id")
			.notNull()
			.references(() => hrOnboardingCase.id),
		employmentId: uuid("employment_id")
			.notNull()
			.references(() => hrEmployment.id),
		/** pending | granted */
		status: text("status").notNull(),
		grantedOn: date("granted_on", { mode: "string" }),
		summary: text("summary"),
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
		index("hr_onboarding_access_handoff_org_id_idx").on(t.organizationId, t.id),
		uniqueIndex("hr_onboarding_access_handoff_org_case_uidx").on(
			t.organizationId,
			t.onboardingCaseId,
		),
		check(
			"hr_onboarding_access_handoff_status_check",
			sql`${t.status} IN ('pending', 'granted')`,
		),
	],
);

export const hrProbationReview = pgTable(
	"hr_probation_review",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		employmentId: uuid("employment_id")
			.notNull()
			.references(() => hrEmployment.id),
		employeeId: uuid("employee_id")
			.notNull()
			.references(() => hrEmployee.id),
		/** open | closed */
		status: text("status").notNull(),
		startsOn: date("starts_on", { mode: "string" }).notNull(),
		endsOn: date("ends_on", { mode: "string" }).notNull(),
		/** null while open; passed | failed when closed */
		outcome: text("outcome"),
		outcomeActorId: text("outcome_actor_id"),
		outcomeRecordedOn: date("outcome_recorded_on", { mode: "string" }),
		lastExtensionReason: text("last_extension_reason"),
		lastExtensionEvidenceReference: text("last_extension_evidence_reference"),
		outcomeReason: text("outcome_reason"),
		outcomeEvidenceReference: text("outcome_evidence_reference"),
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
		index("hr_probation_review_org_id_idx").on(t.organizationId, t.id),
		index("hr_probation_review_org_employment_idx").on(
			t.organizationId,
			t.employmentId,
		),
		uniqueIndex("hr_probation_review_org_employment_open_uidx")
			.on(t.organizationId, t.employmentId)
			.where(sql`${t.status} = 'open'`),
		uniqueIndex("hr_probation_review_org_create_idempotency_uidx").on(
			t.organizationId,
			t.createIdempotencyKey,
		),
		check(
			"hr_probation_review_effective_range_ck",
			sql`${t.startsOn} <= ${t.endsOn}`,
		),
		check(
			"hr_probation_review_outcome_recorded_on_range_ck",
			sql`${t.outcomeRecordedOn} IS NULL OR (${t.startsOn} <= ${t.outcomeRecordedOn} AND ${t.outcomeRecordedOn} <= ${t.endsOn})`,
		),
	],
);

export const hrProbationAssessment = pgTable(
	"hr_probation_assessment",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		probationReviewId: uuid("probation_review_id")
			.notNull()
			.references(() => hrProbationReview.id),
		employmentId: uuid("employment_id")
			.notNull()
			.references(() => hrEmployment.id),
		employeeId: uuid("employee_id")
			.notNull()
			.references(() => hrEmployee.id),
		reviewedOn: date("reviewed_on", { mode: "string" }).notNull(),
		reason: text("reason").notNull(),
		evidenceReference: text("evidence_reference"),
		actorUserId: text("actor_user_id").notNull(),
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
		index("hr_probation_assessment_org_id_idx").on(t.organizationId, t.id),
		index("hr_probation_assessment_org_probation_review_idx").on(
			t.organizationId,
			t.probationReviewId,
		),
	],
);

export const hrEmploymentConfirmation = pgTable(
	"hr_employment_confirmation",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		employmentId: uuid("employment_id")
			.notNull()
			.references(() => hrEmployment.id),
		employeeId: uuid("employee_id")
			.notNull()
			.references(() => hrEmployee.id),
		confirmedOn: date("confirmed_on", { mode: "string" }).notNull(),
		confirmedBy: text("confirmed_by").notNull(),
		evidenceNote: text("evidence_note").notNull(),
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
		index("hr_employment_confirmation_org_id_idx").on(t.organizationId, t.id),
		uniqueIndex("hr_employment_confirmation_org_employment_uidx").on(
			t.organizationId,
			t.employmentId,
		),
		uniqueIndex("hr_employment_confirmation_org_create_idempotency_uidx").on(
			t.organizationId,
			t.createIdempotencyKey,
		),
	],
);

export const hrTermination = pgTable(
	"hr_termination",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		employmentId: uuid("employment_id")
			.notNull()
			.references(() => hrEmployment.id),
		employeeId: uuid("employee_id")
			.notNull()
			.references(() => hrEmployee.id),
		/** draft | finalized */
		status: text("status").notNull(),
		reasonCode: text("reason_code").notNull(),
		reasonDetail: text("reason_detail").notNull(),
		effectiveOn: date("effective_on", { mode: "string" }).notNull(),
		approvedAt: timestamp("approved_at", { withTimezone: true }),
		approvedBy: text("approved_by"),
		rehireEligible: boolean("rehire_eligible").notNull().default(true),
		finalizedAt: timestamp("finalized_at", { withTimezone: true }),
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
		index("hr_termination_org_id_idx").on(t.organizationId, t.id),
		index("hr_termination_org_employment_idx").on(
			t.organizationId,
			t.employmentId,
		),
		uniqueIndex("hr_termination_org_employment_finalized_uidx")
			.on(t.organizationId, t.employmentId)
			.where(sql`${t.status} = 'finalized'`),
		uniqueIndex("hr_termination_org_employment_draft_uidx")
			.on(t.organizationId, t.employmentId)
			.where(sql`${t.status} = 'draft'`),
		uniqueIndex("hr_termination_org_create_idempotency_uidx").on(
			t.organizationId,
			t.createIdempotencyKey,
		),
	],
);

export const hrOffboardingCase = pgTable(
	"hr_offboarding_case",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		employmentId: uuid("employment_id")
			.notNull()
			.references(() => hrEmployment.id),
		employeeId: uuid("employee_id")
			.notNull()
			.references(() => hrEmployee.id),
		terminationId: uuid("termination_id").references(() => hrTermination.id),
		/** in_progress | completed | cancelled */
		status: text("status").notNull(),
		startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
		completedAt: timestamp("completed_at", { withTimezone: true }),
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
		index("hr_offboarding_case_org_id_idx").on(t.organizationId, t.id),
		index("hr_offboarding_case_org_employment_idx").on(
			t.organizationId,
			t.employmentId,
		),
		uniqueIndex("hr_offboarding_case_org_employment_open_uidx")
			.on(t.organizationId, t.employmentId)
			.where(sql`${t.status} = 'in_progress'`),
		uniqueIndex("hr_offboarding_case_org_create_idempotency_uidx").on(
			t.organizationId,
			t.createIdempotencyKey,
		),
	],
);

export const hrOffboardingTask = pgTable(
	"hr_offboarding_task",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		caseId: uuid("case_id")
			.notNull()
			.references(() => hrOffboardingCase.id),
		code: text("code").notNull(),
		title: text("title").notNull(),
		mandatory: boolean("mandatory").notNull(),
		/** pending | completed | waived */
		status: text("status").notNull(),
		completedAt: timestamp("completed_at", { withTimezone: true }),
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
		index("hr_offboarding_task_org_id_idx").on(t.organizationId, t.id),
		index("hr_offboarding_task_org_case_idx").on(t.organizationId, t.caseId),
		uniqueIndex("hr_offboarding_task_org_case_code_uidx").on(
			t.organizationId,
			t.caseId,
			t.code,
		),
	],
);

export const hrExitInterview = pgTable(
	"hr_exit_interview",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		offboardingCaseId: uuid("offboarding_case_id")
			.notNull()
			.references(() => hrOffboardingCase.id),
		employmentId: uuid("employment_id")
			.notNull()
			.references(() => hrEmployment.id),
		conductedOn: date("conducted_on", { mode: "string" }).notNull(),
		notes: text("notes").notNull(),
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
		index("hr_exit_interview_org_id_idx").on(t.organizationId, t.id),
		uniqueIndex("hr_exit_interview_org_case_uidx").on(
			t.organizationId,
			t.offboardingCaseId,
		),
	],
);

export const hrClearance = pgTable(
	"hr_clearance",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		offboardingCaseId: uuid("offboarding_case_id")
			.notNull()
			.references(() => hrOffboardingCase.id),
		employmentId: uuid("employment_id")
			.notNull()
			.references(() => hrEmployment.id),
		/** pending | cleared */
		status: text("status").notNull(),
		clearedOn: date("cleared_on", { mode: "string" }),
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
		index("hr_clearance_org_id_idx").on(t.organizationId, t.id),
		uniqueIndex("hr_clearance_org_case_uidx").on(
			t.organizationId,
			t.offboardingCaseId,
		),
	],
);

export const hrOffboardingAccessRevocation = pgTable(
	"hr_offboarding_access_revocation",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		offboardingCaseId: uuid("offboarding_case_id")
			.notNull()
			.references(() => hrOffboardingCase.id),
		employmentId: uuid("employment_id")
			.notNull()
			.references(() => hrEmployment.id),
		/** pending | revoked */
		status: text("status").notNull(),
		revokedOn: date("revoked_on", { mode: "string" }),
		summary: text("summary"),
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
		index("hr_offboarding_access_revocation_org_id_idx").on(
			t.organizationId,
			t.id,
		),
		uniqueIndex("hr_offboarding_access_revocation_org_case_uidx").on(
			t.organizationId,
			t.offboardingCaseId,
		),
		check(
			"hr_offboarding_access_revocation_status_check",
			sql`${t.status} IN ('pending', 'revoked')`,
		),
	],
);

export const hrOffboardingPayrollHandoff = pgTable(
	"hr_offboarding_payroll_handoff",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		offboardingCaseId: uuid("offboarding_case_id")
			.notNull()
			.references(() => hrOffboardingCase.id),
		employmentId: uuid("employment_id")
			.notNull()
			.references(() => hrEmployment.id),
		/** pending | ready */
		status: text("status").notNull(),
		readyOn: date("ready_on", { mode: "string" }),
		summary: text("summary"),
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
		index("hr_offboarding_payroll_handoff_org_id_idx").on(
			t.organizationId,
			t.id,
		),
		uniqueIndex("hr_offboarding_payroll_handoff_org_case_uidx").on(
			t.organizationId,
			t.offboardingCaseId,
		),
		check(
			"hr_offboarding_payroll_handoff_status_check",
			sql`${t.status} IN ('pending', 'ready')`,
		),
	],
);

export const hrLearningCourse = pgTable(
	"hr_learning_course",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		code: text("code").notNull(),
		title: text("title").notNull(),
		description: text("description"),
		durationHours: numeric("duration_hours", { precision: 10, scale: 2 }),
		/** active | archived */
		status: text("status").notNull(),
		createIdempotencyKey: text("create_idempotency_key"),
		createRequestFingerprint: text("create_request_fingerprint"),
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
		index("hr_learning_course_org_id_idx").on(t.organizationId, t.id),
		uniqueIndex("hr_learning_course_org_code_uidx").on(
			t.organizationId,
			t.code,
		),
		uniqueIndex("hr_learning_course_org_create_idempotency_uidx")
			.on(t.organizationId, t.createIdempotencyKey)
			.where(sql`${t.createIdempotencyKey} IS NOT NULL`),
		index("hr_learning_course_org_status_idx").on(t.organizationId, t.status),
		check(
			"hr_learning_course_status_check",
			sql`${t.status} IN ('active', 'superseded', 'archived')`,
		),
	],
);

export const hrLearningSession = pgTable(
	"hr_learning_session",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		courseId: uuid("course_id")
			.notNull()
			.references(() => hrLearningCourse.id),
		code: text("code").notNull(),
		title: text("title").notNull(),
		scheduledStartsAt: timestamp("scheduled_starts_at", {
			withTimezone: true,
		}).notNull(),
		scheduledEndsAt: timestamp("scheduled_ends_at", {
			withTimezone: true,
		}).notNull(),
		actualStartsAt: timestamp("actual_starts_at", { withTimezone: true }),
		actualEndsAt: timestamp("actual_ends_at", { withTimezone: true }),
		/** scheduled | in_progress | completed | cancelled */
		status: text("status").notNull(),
		capacity: integer("capacity"),
		primaryInstructorUserId: text("primary_instructor_user_id"),
		createIdempotencyKey: text("create_idempotency_key"),
		createRequestFingerprint: text("create_request_fingerprint"),
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
		index("hr_learning_session_org_id_idx").on(t.organizationId, t.id),
		index("hr_learning_session_org_course_idx").on(
			t.organizationId,
			t.courseId,
		),
		uniqueIndex("hr_learning_session_org_code_uidx").on(
			t.organizationId,
			t.code,
		),
		uniqueIndex("hr_learning_session_org_create_idempotency_uidx")
			.on(t.organizationId, t.createIdempotencyKey)
			.where(sql`${t.createIdempotencyKey} IS NOT NULL`),
		index("hr_learning_session_org_status_idx").on(t.organizationId, t.status),
		check(
			"hr_learning_session_status_check",
			sql`${t.status} IN ('scheduled', 'in_progress', 'completed', 'cancelled')`,
		),
		check(
			"hr_learning_session_scheduled_range_check",
			sql`${t.scheduledEndsAt} >= ${t.scheduledStartsAt}`,
		),
		check(
			"hr_learning_session_actual_range_check",
			sql`${t.actualEndsAt} IS NULL OR ${t.actualStartsAt} IS NULL OR ${t.actualEndsAt} >= ${t.actualStartsAt}`,
		),
	],
);

export const hrLearningAssignment = pgTable(
	"hr_learning_assignment",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		employeeId: uuid("employee_id")
			.notNull()
			.references(() => hrEmployee.id),
		courseId: uuid("course_id")
			.notNull()
			.references(() => hrLearningCourse.id),
		sessionId: uuid("session_id").references(() => hrLearningSession.id),
		assignedBy: text("assigned_by").notNull(),
		assignedAt: timestamp("assigned_at", { withTimezone: true }).notNull(),
		dueOn: date("due_on"),
		/** pending | in_progress | completed | withdrawn */
		status: text("status").notNull(),
		createIdempotencyKey: text("create_idempotency_key"),
		createRequestFingerprint: text("create_request_fingerprint"),
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
		index("hr_learning_assignment_org_id_idx").on(t.organizationId, t.id),
		index("hr_learning_assignment_org_employee_idx").on(
			t.organizationId,
			t.employeeId,
		),
		index("hr_learning_assignment_org_course_idx").on(
			t.organizationId,
			t.courseId,
		),
		index("hr_learning_assignment_org_session_idx").on(
			t.organizationId,
			t.sessionId,
		),
		uniqueIndex("hr_learning_assignment_org_employee_course_active_uidx")
			.on(t.organizationId, t.employeeId, t.courseId)
			.where(sql`${t.status} IN ('pending', 'in_progress')`),
		uniqueIndex("hr_learning_assignment_org_create_idempotency_uidx")
			.on(t.organizationId, t.createIdempotencyKey)
			.where(sql`${t.createIdempotencyKey} IS NOT NULL`),
		check(
			"hr_learning_assignment_status_check",
			sql`${t.status} IN ('pending', 'in_progress', 'completed', 'withdrawn')`,
		),
	],
);

export const hrLearningCompletion = pgTable(
	"hr_learning_completion",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		assignmentId: uuid("assignment_id")
			.notNull()
			.references(() => hrLearningAssignment.id),
		employeeId: uuid("employee_id")
			.notNull()
			.references(() => hrEmployee.id),
		courseId: uuid("course_id")
			.notNull()
			.references(() => hrLearningCourse.id),
		sessionId: uuid("session_id").references(() => hrLearningSession.id),
		completedAt: timestamp("completed_at", { withTimezone: true }).notNull(),
		/** passed | failed | attended */
		outcome: text("outcome").notNull(),
		assessorUserId: text("assessor_user_id"),
		notes: text("notes"),
		createIdempotencyKey: text("create_idempotency_key"),
		createRequestFingerprint: text("create_request_fingerprint"),
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
		index("hr_learning_completion_org_id_idx").on(t.organizationId, t.id),
		index("hr_learning_completion_org_employee_idx").on(
			t.organizationId,
			t.employeeId,
		),
		index("hr_learning_completion_org_course_idx").on(
			t.organizationId,
			t.courseId,
		),
		uniqueIndex("hr_learning_completion_org_assignment_uidx").on(
			t.organizationId,
			t.assignmentId,
		),
		uniqueIndex("hr_learning_completion_org_create_idempotency_uidx")
			.on(t.organizationId, t.createIdempotencyKey)
			.where(sql`${t.createIdempotencyKey} IS NOT NULL`),
		check(
			"hr_learning_completion_outcome_check",
			sql`${t.outcome} IN ('passed', 'failed', 'attended')`,
		),
	],
);

export const hrEmployeeCertification = pgTable(
	"hr_employee_certification",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		employeeId: uuid("employee_id")
			.notNull()
			.references(() => hrEmployee.id),
		courseId: uuid("course_id")
			.notNull()
			.references(() => hrLearningCourse.id),
		completionId: uuid("completion_id")
			.notNull()
			.references(() => hrLearningCompletion.id),
		certificationCode: text("certification_code").notNull(),
		issuedOn: date("issued_on").notNull(),
		expiresOn: date("expires_on"),
		/** active | expired | revoked */
		status: text("status").notNull(),
		revokedAt: timestamp("revoked_at", { withTimezone: true }),
		revokedBy: text("revoked_by"),
		renewedFromCertificationId: uuid(
			"renewed_from_certification_id",
		).references((): AnyPgColumn => hrEmployeeCertification.id),
		createIdempotencyKey: text("create_idempotency_key"),
		createRequestFingerprint: text("create_request_fingerprint"),
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
		index("hr_employee_certification_org_id_idx").on(t.organizationId, t.id),
		index("hr_employee_certification_org_employee_idx").on(
			t.organizationId,
			t.employeeId,
		),
		index("hr_employee_certification_org_course_idx").on(
			t.organizationId,
			t.courseId,
		),
		uniqueIndex("hr_employee_certification_org_completion_uidx").on(
			t.organizationId,
			t.completionId,
		),
		uniqueIndex("hr_employee_certification_org_create_idempotency_uidx")
			.on(t.organizationId, t.createIdempotencyKey)
			.where(sql`${t.createIdempotencyKey} IS NOT NULL`),
		index("hr_employee_certification_org_status_idx").on(
			t.organizationId,
			t.status,
		),
		check(
			"hr_employee_certification_status_check",
			sql`${t.status} IN ('active', 'expired', 'revoked')`,
		),
		check(
			"hr_employee_certification_expiry_check",
			sql`${t.expiresOn} IS NULL OR ${t.expiresOn} >= ${t.issuedOn}`,
		),
	],
);

export const hrLearningProgram = createErpScaffoldTable("hr_learning_program");
export const hrLearningAttendance = pgTable(
	"hr_learning_attendance",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		sessionId: uuid("session_id")
			.notNull()
			.references(() => hrLearningSession.id),
		assignmentId: uuid("assignment_id")
			.notNull()
			.references(() => hrLearningAssignment.id),
		employeeId: uuid("employee_id")
			.notNull()
			.references(() => hrEmployee.id),
		/** present | absent | late | excused */
		status: text("status").notNull(),
		recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull(),
		recordedBy: text("recorded_by").notNull(),
		createIdempotencyKey: text("create_idempotency_key"),
		createRequestFingerprint: text("create_request_fingerprint"),
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
		index("hr_learning_attendance_org_id_idx").on(t.organizationId, t.id),
		index("hr_learning_attendance_org_session_idx").on(
			t.organizationId,
			t.sessionId,
		),
		index("hr_learning_attendance_org_employee_idx").on(
			t.organizationId,
			t.employeeId,
		),
		uniqueIndex("hr_learning_attendance_org_assignment_session_uidx").on(
			t.organizationId,
			t.assignmentId,
			t.sessionId,
		),
		uniqueIndex("hr_learning_attendance_org_create_idempotency_uidx")
			.on(t.organizationId, t.createIdempotencyKey)
			.where(sql`${t.createIdempotencyKey} IS NOT NULL`),
		check(
			"hr_learning_attendance_status_check",
			sql`${t.status} IN ('present', 'absent', 'late', 'excused')`,
		),
	],
);
export const hrLearningAssessment = createErpScaffoldTable(
	"hr_learning_assessment",
);
export const hrDevelopmentPlan = createErpScaffoldTable("hr_development_plan");

export const hrCompensationGrade = pgTable(
	"hr_compensation_grade",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		code: text("code").notNull(),
		name: text("name").notNull(),
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
		index("hr_compensation_grade_org_id_idx").on(t.organizationId, t.id),
		index("hr_compensation_grade_org_status_idx").on(
			t.organizationId,
			t.status,
		),
		uniqueIndex("hr_compensation_grade_org_code_uidx").on(
			t.organizationId,
			t.code,
		),
	],
);

export const hrSalaryBand = pgTable(
	"hr_salary_band",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		gradeId: uuid("grade_id")
			.notNull()
			.references(() => hrCompensationGrade.id),
		minimumAmount: text("minimum_amount").notNull(),
		midpointAmount: text("midpoint_amount").notNull(),
		maximumAmount: text("maximum_amount").notNull(),
		currencyCode: text("currency_code").notNull(),
		effectiveFrom: date("effective_from").notNull(),
		effectiveTo: date("effective_to"),
		supersedesSalaryBandId: uuid("supersedes_salary_band_id").references(
			(): AnyPgColumn => hrSalaryBand.id,
		),
		/** active | superseded | archived */
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
		index("hr_salary_band_org_id_idx").on(t.organizationId, t.id),
		index("hr_salary_band_org_grade_idx").on(t.organizationId, t.gradeId),
		index("hr_salary_band_org_status_idx").on(t.organizationId, t.status),
		index("hr_salary_band_org_supersedes_idx").on(
			t.organizationId,
			t.supersedesSalaryBandId,
		),
		check(
			"hr_salary_band_effective_range_ck",
			sql`${t.effectiveTo} IS NULL OR ${t.effectiveFrom} <= ${t.effectiveTo}`,
		),
	],
);

export const hrCompensationGradeProgressionRule = pgTable(
	"hr_compensation_grade_progression_rule",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		fromGradeId: uuid("from_grade_id")
			.notNull()
			.references(() => hrCompensationGrade.id),
		toGradeId: uuid("to_grade_id")
			.notNull()
			.references(() => hrCompensationGrade.id),
		effectiveFrom: date("effective_from").notNull(),
		effectiveTo: date("effective_to"),
		minMonthsInGrade: integer("min_months_in_grade"),
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
		index("hr_compensation_grade_progression_rule_org_from_idx").on(
			t.organizationId,
			t.fromGradeId,
		),
		index("hr_compensation_grade_progression_rule_org_status_idx").on(
			t.organizationId,
			t.status,
		),
		check(
			"hr_compensation_grade_progression_rule_effective_range_ck",
			sql`${t.effectiveTo} IS NULL OR ${t.effectiveFrom} <= ${t.effectiveTo}`,
		),
		check(
			"hr_compensation_grade_progression_rule_from_to_ck",
			sql`${t.fromGradeId} <> ${t.toGradeId}`,
		),
	],
);

export const hrEmployeeCompensation = pgTable(
	"hr_employee_compensation",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		employeeId: uuid("employee_id")
			.notNull()
			.references(() => hrEmployee.id),
		employmentId: uuid("employment_id")
			.notNull()
			.references(() => hrEmployment.id),
		gradeId: uuid("grade_id").references(() => hrCompensationGrade.id),
		salaryBandId: uuid("salary_band_id").references(() => hrSalaryBand.id),
		baseAmount: text("base_amount").notNull(),
		currencyCode: text("currency_code").notNull(),
		payFrequency: text("pay_frequency").notNull(),
		effectiveFrom: date("effective_from").notNull(),
		effectiveTo: date("effective_to"),
		reason: text("reason").notNull(),
		confidentialNote: text("confidential_note"),
		supersedesCompensationId: uuid("supersedes_compensation_id"),
		approvedAt: timestamp("approved_at", { withTimezone: true }),
		approvedBy: text("approved_by"),
		/** draft | scheduled | active | ended | superseded */
		status: text("status").notNull(),
		sourceReviewId: uuid("source_review_id"),
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
		index("hr_employee_compensation_org_id_idx").on(t.organizationId, t.id),
		index("hr_employee_compensation_org_employee_idx").on(
			t.organizationId,
			t.employeeId,
		),
		index("hr_employee_compensation_org_employment_idx").on(
			t.organizationId,
			t.employmentId,
		),
		uniqueIndex("hr_employee_compensation_org_employment_active_uidx")
			.on(t.organizationId, t.employmentId)
			.where(sql`${t.status} = 'active'`),
		uniqueIndex("hr_employee_compensation_org_employment_scheduled_uidx")
			.on(t.organizationId, t.employmentId)
			.where(sql`${t.status} = 'scheduled'`),
		uniqueIndex("hr_employee_compensation_org_employment_draft_uidx")
			.on(t.organizationId, t.employmentId)
			.where(sql`${t.status} = 'draft'`),
		uniqueIndex("hr_employee_compensation_org_create_idempotency_uidx").on(
			t.organizationId,
			t.createIdempotencyKey,
		),
		check(
			"hr_employee_compensation_effective_range_ck",
			sql`${t.effectiveTo} IS NULL OR ${t.effectiveFrom} <= ${t.effectiveTo}`,
		),
	],
);

export const hrAllowanceEntitlement = createErpScaffoldTable(
	"hr_allowance_entitlement",
);
export const hrBonusEligibility = createErpScaffoldTable(
	"hr_bonus_eligibility",
);

export const hrBenefitPlan = pgTable(
	"hr_benefit_plan",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		code: text("code").notNull(),
		name: text("name").notNull(),
		eligibilityNote: text("eligibility_note"),
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
		index("hr_benefit_plan_org_id_idx").on(t.organizationId, t.id),
		index("hr_benefit_plan_org_status_idx").on(t.organizationId, t.status),
		uniqueIndex("hr_benefit_plan_org_code_uidx").on(t.organizationId, t.code),
	],
);

export const hrBenefitEligibility = pgTable(
	"hr_benefit_eligibility",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		planId: uuid("plan_id")
			.notNull()
			.references(() => hrBenefitPlan.id),
		minTenureDays: integer("min_tenure_days"),
		allowedEmploymentStatuses: text("allowed_employment_statuses").notNull(),
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
		index("hr_benefit_eligibility_org_id_idx").on(t.organizationId, t.id),
		index("hr_benefit_eligibility_org_plan_idx").on(t.organizationId, t.planId),
		uniqueIndex("hr_benefit_eligibility_org_plan_uidx").on(
			t.organizationId,
			t.planId,
		),
	],
);

export const hrBenefitEnrollment = pgTable(
	"hr_benefit_enrollment",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		employeeId: uuid("employee_id")
			.notNull()
			.references(() => hrEmployee.id),
		employmentId: uuid("employment_id")
			.notNull()
			.references(() => hrEmployment.id),
		planId: uuid("plan_id")
			.notNull()
			.references(() => hrBenefitPlan.id),
		effectiveFrom: date("effective_from").notNull(),
		effectiveTo: date("effective_to"),
		/** active | ended | cancelled | waived */
		status: text("status").notNull(),
		employeeContributionAmount: text("employee_contribution_amount"),
		employerContributionAmount: text("employer_contribution_amount"),
		contributionCurrencyCode: text("contribution_currency_code"),
		contributionFrequency: text("contribution_frequency"),
		waiverReason: text("waiver_reason"),
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
		index("hr_benefit_enrollment_org_id_idx").on(t.organizationId, t.id),
		index("hr_benefit_enrollment_org_employee_idx").on(
			t.organizationId,
			t.employeeId,
		),
		index("hr_benefit_enrollment_org_plan_idx").on(t.organizationId, t.planId),
		uniqueIndex("hr_benefit_enrollment_org_employee_plan_open_uidx")
			.on(t.organizationId, t.employeeId, t.planId)
			.where(sql`${t.status} IN ('active', 'waived')`),
		uniqueIndex("hr_benefit_enrollment_org_create_idempotency_uidx").on(
			t.organizationId,
			t.createIdempotencyKey,
		),
		check(
			"hr_benefit_enrollment_effective_range_ck",
			sql`${t.effectiveTo} IS NULL OR ${t.effectiveFrom} <= ${t.effectiveTo}`,
		),
	],
);

export const hrBenefitEnrollmentDependent = pgTable(
	"hr_benefit_enrollment_dependent",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		enrollmentId: uuid("enrollment_id")
			.notNull()
			.references(() => hrBenefitEnrollment.id),
		dependentName: text("dependent_name").notNull(),
		/** spouse | child | other */
		relationship: text("relationship").notNull(),
		effectiveFrom: date("effective_from").notNull(),
		effectiveTo: date("effective_to"),
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
		index("hr_benefit_enrollment_dependent_org_id_idx").on(
			t.organizationId,
			t.id,
		),
		index("hr_benefit_enrollment_dependent_org_enrollment_idx").on(
			t.organizationId,
			t.enrollmentId,
		),
		check(
			"hr_benefit_enrollment_dependent_effective_range_ck",
			sql`${t.effectiveTo} IS NULL OR ${t.effectiveFrom} <= ${t.effectiveTo}`,
		),
	],
);

export const hrCompensationReviewCycle = pgTable(
	"hr_compensation_review_cycle",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		code: text("code").notNull(),
		name: text("name").notNull(),
		periodStart: date("period_start").notNull(),
		periodEnd: date("period_end").notNull(),
		status: text("status").notNull(),
		budgetTotalAmount: text("budget_total_amount").notNull(),
		budgetCurrencyCode: text("budget_currency_code").notNull(),
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
		index("hr_compensation_review_cycle_org_id_idx").on(t.organizationId, t.id),
		index("hr_compensation_review_cycle_org_status_idx").on(
			t.organizationId,
			t.status,
		),
		uniqueIndex("hr_compensation_review_cycle_org_code_uidx").on(
			t.organizationId,
			t.code,
		),
		uniqueIndex("hr_compensation_review_cycle_org_create_idempotency_uidx").on(
			t.organizationId,
			t.createIdempotencyKey,
		),
		check(
			"hr_compensation_review_cycle_status_check",
			sql`${t.status} IN ('draft', 'open', 'closed', 'cancelled')`,
		),
		check(
			"hr_compensation_review_cycle_period_range_check",
			sql`${t.periodEnd} >= ${t.periodStart}`,
		),
	],
);

export const hrCompensationReview = pgTable(
	"hr_compensation_review",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		cycleId: uuid("cycle_id")
			.notNull()
			.references(() => hrCompensationReviewCycle.id),
		employeeId: uuid("employee_id")
			.notNull()
			.references(() => hrEmployee.id),
		employmentId: uuid("employment_id")
			.notNull()
			.references(() => hrEmployment.id),
		/** draft | recorded | finalized */
		status: text("status").notNull(),
		proposedBaseAmount: text("proposed_base_amount"),
		proposedCurrencyCode: text("proposed_currency_code"),
		proposedGradeId: uuid("proposed_grade_id").references(
			() => hrCompensationGrade.id,
		),
		proposedSalaryBandId: uuid("proposed_salary_band_id").references(
			() => hrSalaryBand.id,
		),
		recommendationNote: text("recommendation_note"),
		effectiveFrom: date("effective_from"),
		finalizedAt: timestamp("finalized_at", { withTimezone: true }),
		appliedCompensationId: uuid("applied_compensation_id").references(
			() => hrEmployeeCompensation.id,
		),
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
		index("hr_compensation_review_org_id_idx").on(t.organizationId, t.id),
		index("hr_compensation_review_org_employee_idx").on(
			t.organizationId,
			t.employeeId,
		),
		index("hr_compensation_review_org_employment_idx").on(
			t.organizationId,
			t.employmentId,
		),
		uniqueIndex("hr_compensation_review_org_create_idempotency_uidx").on(
			t.organizationId,
			t.createIdempotencyKey,
		),
	],
);

export const hrLeavePolicy = pgTable(
	"hr_leave_policy",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		code: text("code").notNull(),
		name: text("name").notNull(),
		leaveType: text("leave_type").notNull(),
		unit: text("unit").notNull(),
		paid: boolean("paid").notNull(),
		sensitive: boolean("sensitive").notNull().default(false),
		allowsNegativeBalance: boolean("allows_negative_balance")
			.notNull()
			.default(false),
		allowSelfApproval: boolean("allow_self_approval").notNull().default(false),
		allowsPartialDay: boolean("allows_partial_day").notNull().default(false),
		accrualBasis: text("accrual_basis").notNull().default("none"),
		accrualFrequency: text("accrual_frequency"),
		accrualQuantityPerPeriod: text("accrual_quantity_per_period"),
		carryForwardEnabled: boolean("carry_forward_enabled")
			.notNull()
			.default(false),
		carryForwardMaxQuantity: text("carry_forward_max_quantity"),
		entitlementExpiryRule: text("entitlement_expiry_rule")
			.notNull()
			.default("none"),
		entitlementExpiryDays: integer("entitlement_expiry_days"),
		effectiveFrom: date("effective_from").notNull(),
		effectiveTo: date("effective_to"),
		status: text("status").notNull(),
		supersedesPolicyId: uuid("supersedes_policy_id").references(
			(): AnyPgColumn => hrLeavePolicy.id,
		),
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
		index("hr_leave_policy_org_id_idx").on(t.organizationId, t.id),
		index("hr_leave_policy_org_status_idx").on(t.organizationId, t.status),
		uniqueIndex("hr_leave_policy_org_code_effective_uidx").on(
			t.organizationId,
			t.code,
			t.effectiveFrom,
		),
		check(
			"hr_leave_policy_status_check",
			sql`${t.status} IN ('draft', 'published', 'superseded', 'archived')`,
		),
		check("hr_leave_policy_unit_check", sql`${t.unit} IN ('days', 'hours')`),
		check(
			"hr_leave_policy_leave_type_check",
			sql`${t.leaveType} IN ('annual', 'sick', 'unpaid', 'other')`,
		),
		check(
			"hr_leave_policy_date_range_check",
			sql`${t.effectiveTo} IS NULL OR ${t.effectiveTo} >= ${t.effectiveFrom}`,
		),
		check(
			"hr_leave_policy_accrual_basis_check",
			sql`${t.accrualBasis} IN ('none', 'periodic', 'anniversary')`,
		),
		check(
			"hr_leave_policy_accrual_frequency_check",
			sql`${t.accrualFrequency} IS NULL OR ${t.accrualFrequency} IN ('monthly', 'annual')`,
		),
		check(
			"hr_leave_policy_entitlement_expiry_rule_check",
			sql`${t.entitlementExpiryRule} IN ('none', 'period_end', 'days_after_period_end')`,
		),
		check(
			"hr_leave_policy_accrual_config_check",
			sql`(${t.accrualBasis} = 'none' AND ${t.accrualFrequency} IS NULL AND ${t.accrualQuantityPerPeriod} IS NULL) OR (${t.accrualBasis} <> 'none' AND ${t.accrualFrequency} IS NOT NULL AND ${t.accrualQuantityPerPeriod} IS NOT NULL)`,
		),
		check(
			"hr_leave_policy_carry_forward_check",
			sql`(${t.carryForwardEnabled} = false AND ${t.carryForwardMaxQuantity} IS NULL) OR (${t.carryForwardEnabled} = true)`,
		),
		check(
			"hr_leave_policy_entitlement_expiry_days_check",
			sql`(${t.entitlementExpiryRule} = 'days_after_period_end' AND ${t.entitlementExpiryDays} IS NOT NULL) OR (${t.entitlementExpiryRule} <> 'days_after_period_end' AND ${t.entitlementExpiryDays} IS NULL)`,
		),
	],
);

export const hrLeavePolicyEligibility = pgTable(
	"hr_leave_policy_eligibility",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		policyId: uuid("policy_id")
			.notNull()
			.references(() => hrLeavePolicy.id),
		minTenureDays: integer("min_tenure_days"),
		allowedEmploymentStatuses: text("allowed_employment_statuses").notNull(),
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
		index("hr_leave_policy_eligibility_org_id_idx").on(t.organizationId, t.id),
		index("hr_leave_policy_eligibility_org_policy_idx").on(
			t.organizationId,
			t.policyId,
		),
	],
);

export const hrLeaveEntitlement = pgTable(
	"hr_leave_entitlement",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		employeeId: uuid("employee_id")
			.notNull()
			.references(() => hrEmployee.id),
		employmentId: uuid("employment_id")
			.notNull()
			.references(() => hrEmployment.id),
		policyId: uuid("policy_id")
			.notNull()
			.references(() => hrLeavePolicy.id),
		periodStart: date("period_start").notNull(),
		periodEnd: date("period_end").notNull(),
		openingQuantity: text("opening_quantity").notNull(),
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
		index("hr_leave_entitlement_org_id_idx").on(t.organizationId, t.id),
		index("hr_leave_entitlement_org_employee_idx").on(
			t.organizationId,
			t.employeeId,
		),
		index("hr_leave_entitlement_org_employment_idx").on(
			t.organizationId,
			t.employmentId,
		),
		index("hr_leave_entitlement_org_policy_idx").on(
			t.organizationId,
			t.policyId,
		),
		uniqueIndex("hr_leave_entitlement_org_create_idempotency_uidx").on(
			t.organizationId,
			t.createIdempotencyKey,
		),
		uniqueIndex("hr_leave_entitlement_org_employment_policy_period_active_uidx")
			.on(t.organizationId, t.employmentId, t.policyId, t.periodStart)
			.where(sql`${t.status} = 'active'`),
		check(
			"hr_leave_entitlement_status_check",
			sql`${t.status} IN ('active', 'expired', 'carried_forward', 'closed')`,
		),
		check(
			"hr_leave_entitlement_period_range_check",
			sql`${t.periodEnd} >= ${t.periodStart}`,
		),
		check(
			"hr_leave_entitlement_opening_nonneg_check",
			sql`${t.openingQuantity}::numeric >= 0`,
		),
	],
);

export const hrLeaveRequest = pgTable(
	"hr_leave_request",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		employeeId: uuid("employee_id")
			.notNull()
			.references(() => hrEmployee.id),
		employmentId: uuid("employment_id")
			.notNull()
			.references(() => hrEmployment.id),
		entitlementId: uuid("entitlement_id")
			.notNull()
			.references(() => hrLeaveEntitlement.id),
		policyId: uuid("policy_id")
			.notNull()
			.references(() => hrLeavePolicy.id),
		startDate: date("start_date").notNull(),
		endDate: date("end_date").notNull(),
		requestedQuantity: text("requested_quantity").notNull(),
		unit: text("unit").notNull(),
		status: text("status").notNull(),
		isBackdated: boolean("is_backdated").notNull().default(false),
		backdateJustification: text("backdate_justification"),
		approvedAt: timestamp("approved_at", { withTimezone: true }),
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
		index("hr_leave_request_org_id_idx").on(t.organizationId, t.id),
		index("hr_leave_request_org_employee_idx").on(
			t.organizationId,
			t.employeeId,
		),
		index("hr_leave_request_org_employment_idx").on(
			t.organizationId,
			t.employmentId,
		),
		index("hr_leave_request_org_status_idx").on(t.organizationId, t.status),
		uniqueIndex("hr_leave_request_org_create_idempotency_uidx").on(
			t.organizationId,
			t.createIdempotencyKey,
		),
		check(
			"hr_leave_request_status_check",
			sql`${t.status} IN ('draft', 'submitted', 'returned', 'approved', 'rejected', 'withdrawn', 'cancelled')`,
		),
		check("hr_leave_request_unit_check", sql`${t.unit} IN ('days', 'hours')`),
		check(
			"hr_leave_request_date_range_check",
			sql`${t.endDate} >= ${t.startDate}`,
		),
		check(
			"hr_leave_request_quantity_pos_check",
			sql`${t.requestedQuantity}::numeric > 0`,
		),
	],
);

export const hrLeaveAdjustment = pgTable(
	"hr_leave_adjustment",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		entitlementId: uuid("entitlement_id")
			.notNull()
			.references(() => hrLeaveEntitlement.id),
		sourceRequestId: uuid("source_request_id").references(
			() => hrLeaveRequest.id,
		),
		kind: text("kind").notNull(),
		delta: text("delta").notNull(),
		reason: text("reason").notNull(),
		source: text("source").notNull(),
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
		index("hr_leave_adjustment_org_id_idx").on(t.organizationId, t.id),
		index("hr_leave_adjustment_org_entitlement_idx").on(
			t.organizationId,
			t.entitlementId,
		),
		uniqueIndex("hr_leave_adjustment_org_create_idempotency_uidx").on(
			t.organizationId,
			t.createIdempotencyKey,
		),
		check(
			"hr_leave_adjustment_kind_check",
			sql`${t.kind} IN ('manual', 'accrual', 'carry_forward', 'expiry', 'consumption', 'cancellation_reversal')`,
		),
		check("hr_leave_adjustment_status_check", sql`${t.status} IN ('posted')`),
		check(
			"hr_leave_adjustment_delta_nonzero_check",
			sql`${t.delta}::numeric <> 0`,
		),
	],
);

export const hrLeaveRequestSegment = pgTable(
	"hr_leave_request_segment",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		requestId: uuid("request_id")
			.notNull()
			.references(() => hrLeaveRequest.id),
		segmentDate: date("segment_date").notNull(),
		quantity: text("quantity").notNull(),
		dayPortion: text("day_portion").notNull(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => [
		index("hr_leave_request_segment_org_id_idx").on(t.organizationId, t.id),
		index("hr_leave_request_segment_org_request_idx").on(
			t.organizationId,
			t.requestId,
		),
		check(
			"hr_leave_request_segment_day_portion_check",
			sql`${t.dayPortion} IN ('morning', 'afternoon', 'full')`,
		),
	],
);

export const hrLeaveApprovalDecision = pgTable(
	"hr_leave_approval_decision",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		requestId: uuid("request_id")
			.notNull()
			.references(() => hrLeaveRequest.id),
		decision: text("decision").notNull(),
		decidedBy: text("decided_by").notNull(),
		decidedAt: timestamp("decided_at", { withTimezone: true }).notNull(),
		note: text("note"),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => [
		index("hr_leave_approval_decision_org_id_idx").on(t.organizationId, t.id),
		index("hr_leave_approval_decision_org_request_idx").on(
			t.organizationId,
			t.requestId,
		),
		check(
			"hr_leave_approval_decision_decision_check",
			sql`${t.decision} IN ('approved', 'rejected', 'returned', 'cancelled')`,
		),
	],
);

export const hrPerformanceCycle = pgTable(
	"hr_performance_cycle",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		code: text("code").notNull(),
		name: text("name").notNull(),
		periodStart: date("period_start").notNull(),
		periodEnd: date("period_end").notNull(),
		ratingScale: jsonb("rating_scale").notNull(),
		weightingModel: text("weighting_model").notNull(),
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
		index("hr_performance_cycle_org_id_idx").on(t.organizationId, t.id),
		index("hr_performance_cycle_org_status_idx").on(t.organizationId, t.status),
		uniqueIndex("hr_performance_cycle_org_code_uidx").on(
			t.organizationId,
			t.code,
		),
		uniqueIndex("hr_performance_cycle_org_create_idempotency_uidx").on(
			t.organizationId,
			t.createIdempotencyKey,
		),
		check(
			"hr_performance_cycle_status_check",
			sql`${t.status} IN ('draft', 'published', 'open', 'closed', 'cancelled')`,
		),
		check(
			"hr_performance_cycle_weighting_model_check",
			sql`${t.weightingModel} IN ('none', 'percent100')`,
		),
		check(
			"hr_performance_cycle_period_range_check",
			sql`${t.periodEnd} >= ${t.periodStart}`,
		),
	],
);

export const hrPerformanceCycleParticipant = pgTable(
	"hr_performance_cycle_participant",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		cycleId: uuid("cycle_id")
			.notNull()
			.references(() => hrPerformanceCycle.id),
		employeeId: uuid("employee_id")
			.notNull()
			.references(() => hrEmployee.id),
		employmentId: uuid("employment_id")
			.notNull()
			.references(() => hrEmployment.id),
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
		index("hr_performance_cycle_participant_org_id_idx").on(
			t.organizationId,
			t.id,
		),
		index("hr_performance_cycle_participant_org_cycle_idx").on(
			t.organizationId,
			t.cycleId,
		),
		uniqueIndex(
			"hr_performance_cycle_participant_org_cycle_employment_active_uidx",
		)
			.on(t.organizationId, t.cycleId, t.employmentId)
			.where(sql`${t.status} = 'active'`),
		check(
			"hr_performance_cycle_participant_status_check",
			sql`${t.status} IN ('active', 'removed')`,
		),
	],
);

export const hrPerformanceCycleReviewPeriod = pgTable(
	"hr_performance_cycle_review_period",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		cycleId: uuid("cycle_id")
			.notNull()
			.references(() => hrPerformanceCycle.id),
		kind: text("kind").notNull(),
		periodStart: date("period_start").notNull(),
		periodEnd: date("period_end").notNull(),
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
		index("hr_performance_cycle_review_period_org_id_idx").on(
			t.organizationId,
			t.id,
		),
		index("hr_performance_cycle_review_period_org_cycle_idx").on(
			t.organizationId,
			t.cycleId,
		),
		uniqueIndex("hr_performance_cycle_review_period_org_cycle_kind_uidx").on(
			t.organizationId,
			t.cycleId,
			t.kind,
		),
		check(
			"hr_performance_cycle_review_period_kind_check",
			sql`${t.kind} IN ('goal_setting', 'self_review', 'manager_review', 'calibration')`,
		),
		check(
			"hr_performance_cycle_review_period_range_check",
			sql`${t.periodEnd} >= ${t.periodStart}`,
		),
	],
);

export const hrPerformanceCycleEligibility = pgTable(
	"hr_performance_cycle_eligibility",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		cycleId: uuid("cycle_id")
			.notNull()
			.references(() => hrPerformanceCycle.id),
		minTenureDays: integer("min_tenure_days"),
		allowedEmploymentStatuses: text("allowed_employment_statuses").notNull(),
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
		index("hr_performance_cycle_eligibility_org_id_idx").on(
			t.organizationId,
			t.id,
		),
		uniqueIndex("hr_performance_cycle_eligibility_org_cycle_uidx").on(
			t.organizationId,
			t.cycleId,
		),
	],
);

export const hrPerformanceGoal = pgTable(
	"hr_performance_goal",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		cycleId: uuid("cycle_id")
			.notNull()
			.references(() => hrPerformanceCycle.id),
		employeeId: uuid("employee_id")
			.notNull()
			.references(() => hrEmployee.id),
		employmentId: uuid("employment_id")
			.notNull()
			.references(() => hrEmployment.id),
		title: text("title").notNull(),
		description: text("description"),
		weight: text("weight"),
		periodStart: date("period_start").notNull(),
		periodEnd: date("period_end").notNull(),
		exceptionOutsideCycle: boolean("exception_outside_cycle")
			.notNull()
			.default(false),
		goalKind: text("goal_kind").notNull().default("employee"),
		alignedToGoalId: uuid("aligned_to_goal_id").references(
			(): AnyPgColumn => hrPerformanceGoal.id,
		),
		completionNote: text("completion_note"),
		completionEvidenceReference: text("completion_evidence_reference"),
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
		index("hr_performance_goal_org_id_idx").on(t.organizationId, t.id),
		index("hr_performance_goal_org_cycle_idx").on(t.organizationId, t.cycleId),
		index("hr_performance_goal_org_employee_idx").on(
			t.organizationId,
			t.employeeId,
		),
		index("hr_performance_goal_org_aligned_idx").on(
			t.organizationId,
			t.alignedToGoalId,
		),
		uniqueIndex("hr_performance_goal_org_create_idempotency_uidx").on(
			t.organizationId,
			t.createIdempotencyKey,
		),
		check(
			"hr_performance_goal_status_check",
			sql`${t.status} IN ('draft', 'submitted', 'approved', 'rejected', 'active', 'closed', 'cancelled')`,
		),
		check(
			"hr_performance_goal_goal_kind_check",
			sql`${t.goalKind} IN ('employee', 'manager')`,
		),
		check(
			"hr_performance_goal_period_range_check",
			sql`${t.periodEnd} >= ${t.periodStart}`,
		),
	],
);

export const hrPerformanceGoalProgress = pgTable(
	"hr_performance_goal_progress",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		goalId: uuid("goal_id")
			.notNull()
			.references(() => hrPerformanceGoal.id),
		recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull(),
		progressNote: text("progress_note").notNull(),
		progressValue: text("progress_value"),
		evidenceReference: text("evidence_reference"),
		recordedBy: text("recorded_by").notNull(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => [
		index("hr_performance_goal_progress_org_id_idx").on(t.organizationId, t.id),
		index("hr_performance_goal_progress_org_goal_idx").on(
			t.organizationId,
			t.goalId,
		),
	],
);

export const hrPerformanceReview = pgTable(
	"hr_performance_review",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		cycleId: uuid("cycle_id")
			.notNull()
			.references(() => hrPerformanceCycle.id),
		employeeId: uuid("employee_id")
			.notNull()
			.references(() => hrEmployee.id),
		employmentId: uuid("employment_id")
			.notNull()
			.references(() => hrEmployment.id),
		overallRating: text("overall_rating"),
		acknowledgementNote: text("acknowledgement_note"),
		calibrationNote: text("calibration_note"),
		status: text("status").notNull(),
		finalizeIdempotencyKey: text("finalize_idempotency_key"),
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
		index("hr_performance_review_org_id_idx").on(t.organizationId, t.id),
		index("hr_performance_review_org_cycle_idx").on(
			t.organizationId,
			t.cycleId,
		),
		index("hr_performance_review_org_employee_idx").on(
			t.organizationId,
			t.employeeId,
		),
		uniqueIndex("hr_performance_review_org_finalize_idempotency_uidx")
			.on(t.organizationId, t.finalizeIdempotencyKey)
			.where(sql`${t.finalizeIdempotencyKey} IS NOT NULL`),
		check(
			"hr_performance_review_status_check",
			sql`${t.status} IN ('draft', 'self_submitted', 'manager_submitted', 'returned', 'acknowledged', 'finalized', 'reopened')`,
		),
	],
);

export const hrPerformanceReviewParticipant = pgTable(
	"hr_performance_review_participant",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		reviewId: uuid("review_id")
			.notNull()
			.references(() => hrPerformanceReview.id),
		role: text("role").notNull(),
		employeeId: uuid("employee_id").references(() => hrEmployee.id),
		userId: text("user_id"),
		sequenceNumber: integer("sequence_number").notNull().default(0),
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
		index("hr_performance_review_participant_org_id_idx").on(
			t.organizationId,
			t.id,
		),
		index("hr_performance_review_participant_org_review_idx").on(
			t.organizationId,
			t.reviewId,
		),
		check(
			"hr_performance_review_participant_role_check",
			sql`${t.role} IN ('self', 'manager', 'delegated')`,
		),
	],
);

export const hrPerformanceAssessment = pgTable(
	"hr_performance_assessment",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		reviewId: uuid("review_id")
			.notNull()
			.references(() => hrPerformanceReview.id),
		participantId: uuid("participant_id")
			.notNull()
			.references(() => hrPerformanceReviewParticipant.id),
		kind: text("kind").notNull(),
		rating: text("rating"),
		commentsSensitive: text("comments_sensitive"),
		submittedAt: timestamp("submitted_at", { withTimezone: true }),
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
		index("hr_performance_assessment_org_id_idx").on(t.organizationId, t.id),
		index("hr_performance_assessment_org_review_idx").on(
			t.organizationId,
			t.reviewId,
		),
		uniqueIndex("hr_performance_assessment_org_review_participant_uidx").on(
			t.organizationId,
			t.reviewId,
			t.participantId,
		),
		check(
			"hr_performance_assessment_kind_check",
			sql`${t.kind} IN ('self', 'manager', 'delegated')`,
		),
	],
);

export const hrPerformanceImprovementPlan = pgTable(
	"hr_performance_improvement_plan",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		reviewId: uuid("review_id")
			.notNull()
			.references(() => hrPerformanceReview.id),
		employeeId: uuid("employee_id")
			.notNull()
			.references(() => hrEmployee.id),
		employmentId: uuid("employment_id")
			.notNull()
			.references(() => hrEmployment.id),
		performanceGap: text("performance_gap").notNull(),
		expectedOutcome: text("expected_outcome").notNull(),
		measurableActions: text("measurable_actions").notNull(),
		supportResources: text("support_resources").notNull(),
		dueDate: date("due_date").notNull(),
		accountableManagerEmployeeId: uuid("accountable_manager_employee_id")
			.notNull()
			.references(() => hrEmployee.id),
		status: text("status").notNull(),
		outcomeReason: text("outcome_reason"),
		outcomeEvidenceReference: text("outcome_evidence_reference"),
		lastExtensionReason: text("last_extension_reason"),
		lastExtensionEvidenceReference: text("last_extension_evidence_reference"),
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
		index("hr_performance_improvement_plan_org_id_idx").on(
			t.organizationId,
			t.id,
		),
		index("hr_performance_improvement_plan_org_review_idx").on(
			t.organizationId,
			t.reviewId,
		),
		uniqueIndex(
			"hr_performance_improvement_plan_org_create_idempotency_uidx",
		).on(t.organizationId, t.createIdempotencyKey),
		check(
			"hr_performance_improvement_plan_status_check",
			sql`${t.status} IN ('draft', 'open', 'acknowledged', 'completed', 'unsuccessful', 'cancelled')`,
		),
	],
);

export const hrPerformanceImprovementCheckpoint = pgTable(
	"hr_performance_improvement_checkpoint",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		planId: uuid("plan_id")
			.notNull()
			.references(() => hrPerformanceImprovementPlan.id),
		sequenceNumber: integer("sequence_number").notNull(),
		dueDate: date("due_date").notNull(),
		outcome: text("outcome").notNull(),
		notes: text("notes"),
		evidenceReference: text("evidence_reference"),
		recordedBy: text("recorded_by"),
		recordedAt: timestamp("recorded_at", { withTimezone: true }),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => [
		index("hr_performance_improvement_checkpoint_org_id_idx").on(
			t.organizationId,
			t.id,
		),
		index("hr_performance_improvement_checkpoint_org_plan_idx").on(
			t.organizationId,
			t.planId,
		),
		uniqueIndex(
			"hr_performance_improvement_checkpoint_org_plan_sequence_uidx",
		).on(t.organizationId, t.planId, t.sequenceNumber),
		check(
			"hr_performance_improvement_checkpoint_outcome_check",
			sql`${t.outcome} IN ('pending', 'met', 'missed')`,
		),
	],
);

export const hrHeadcountPlan = pgTable(
	"hr_headcount_plan",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		code: text("code").notNull(),
		title: text("title").notNull(),
		planningScopeKey: text("planning_scope_key").notNull(),
		periodStart: date("period_start").notNull(),
		periodEnd: date("period_end").notNull(),
		/** draft | submitted | approved | rejected | superseded | closed */
		status: text("status").notNull(),
		planVersion: integer("plan_version").notNull().default(1),
		supersedesPlanId: uuid("supersedes_plan_id").references(
			(): AnyPgColumn => hrHeadcountPlan.id,
		),
		approvedBy: text("approved_by"),
		approvedAt: timestamp("approved_at", { withTimezone: true }),
		rejectedBy: text("rejected_by"),
		rejectedAt: timestamp("rejected_at", { withTimezone: true }),
		rejectionReason: text("rejection_reason"),
		costEnvelopeAmount: text("cost_envelope_amount"),
		costEnvelopeCurrencyCode: text("cost_envelope_currency_code"),
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
		index("hr_headcount_plan_org_id_idx").on(t.organizationId, t.id),
		index("hr_headcount_plan_org_status_idx").on(t.organizationId, t.status),
		uniqueIndex("hr_headcount_plan_org_code_uidx").on(t.organizationId, t.code),
		uniqueIndex("hr_headcount_plan_org_create_idempotency_uidx").on(
			t.organizationId,
			t.createIdempotencyKey,
		),
		uniqueIndex("hr_headcount_plan_org_scope_period_approved_uidx")
			.on(t.organizationId, t.planningScopeKey, t.periodStart, t.periodEnd)
			.where(sql`${t.status} = 'approved'`),
		check(
			"hr_headcount_plan_status_check",
			sql`${t.status} IN ('draft', 'submitted', 'approved', 'rejected', 'superseded', 'closed')`,
		),
		check(
			"hr_headcount_plan_period_range_check",
			sql`${t.periodEnd} >= ${t.periodStart}`,
		),
	],
);

export const hrHeadcountPlanLine = pgTable(
	"hr_headcount_plan_line",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		planId: uuid("plan_id")
			.notNull()
			.references(() => hrHeadcountPlan.id),
		departmentId: uuid("department_id").references(() => hrDepartment.id),
		jobId: uuid("job_id").references(() => hrJob.id),
		positionId: uuid("position_id").references(() => hrPosition.id),
		locationCode: text("location_code"),
		/** full_time | part_time | contract | temporary | intern */
		employmentType: text("employment_type"),
		plannedFte: numeric("planned_fte", { precision: 10, scale: 4 }).notNull(),
		plannedHeadcount: integer("planned_headcount").notNull(),
		costEnvelopeAmount: text("cost_envelope_amount"),
		costEnvelopeCurrencyCode: text("cost_envelope_currency_code"),
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
		index("hr_headcount_plan_line_org_id_idx").on(t.organizationId, t.id),
		index("hr_headcount_plan_line_org_plan_idx").on(t.organizationId, t.planId),
		check(
			"hr_headcount_plan_line_employment_type_check",
			sql`${t.employmentType} IS NULL OR ${t.employmentType} IN ('full_time', 'part_time', 'contract', 'temporary', 'intern')`,
		),
		check(
			"hr_headcount_plan_line_planned_fte_nonneg_check",
			sql`${t.plannedFte} >= 0`,
		),
		check(
			"hr_headcount_plan_line_planned_headcount_nonneg_check",
			sql`${t.plannedHeadcount} >= 0`,
		),
		check(
			"hr_headcount_plan_line_capacity_positive_check",
			sql`${t.plannedFte} > 0 OR ${t.plannedHeadcount} > 0`,
		),
	],
);

export const hrHeadcountReservation = pgTable(
	"hr_headcount_reservation",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		planId: uuid("plan_id")
			.notNull()
			.references(() => hrHeadcountPlan.id),
		planLineId: uuid("plan_line_id")
			.notNull()
			.references(() => hrHeadcountPlanLine.id),
		requisitionId: uuid("requisition_id")
			.notNull()
			.references(() => hrJobRequisition.id),
		reservedFte: numeric("reserved_fte", { precision: 10, scale: 4 }).notNull(),
		reservedHeadcount: integer("reserved_headcount").notNull(),
		/** active | released | consumed */
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
		index("hr_headcount_reservation_org_id_idx").on(t.organizationId, t.id),
		index("hr_headcount_reservation_org_plan_idx").on(
			t.organizationId,
			t.planId,
		),
		index("hr_headcount_reservation_org_plan_line_idx").on(
			t.organizationId,
			t.planLineId,
		),
		index("hr_headcount_reservation_org_requisition_idx").on(
			t.organizationId,
			t.requisitionId,
		),
		index("hr_headcount_reservation_org_status_idx").on(
			t.organizationId,
			t.status,
		),
		uniqueIndex("hr_headcount_reservation_org_create_idempotency_uidx").on(
			t.organizationId,
			t.createIdempotencyKey,
		),
		uniqueIndex("hr_headcount_reservation_org_requisition_active_uidx")
			.on(t.organizationId, t.requisitionId)
			.where(sql`${t.status} = 'active'`),
		check(
			"hr_headcount_reservation_status_check",
			sql`${t.status} IN ('active', 'released', 'consumed')`,
		),
		check(
			"hr_headcount_reservation_reserved_fte_nonneg_check",
			sql`${t.reservedFte} >= 0`,
		),
		check(
			"hr_headcount_reservation_reserved_headcount_nonneg_check",
			sql`${t.reservedHeadcount} >= 0`,
		),
		check(
			"hr_headcount_reservation_capacity_positive_check",
			sql`${t.reservedFte} > 0 OR ${t.reservedHeadcount} > 0`,
		),
	],
);

export const hrCompetency = pgTable(
	"hr_competency",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		code: text("code").notNull(),
		name: text("name").notNull(),
		description: text("description"),
		category: text("category"),
		scaleCode: text("scale_code").notNull(),
		status: text("status").notNull(),
		createIdempotencyKey: text("create_idempotency_key"),
		createRequestFingerprint: text("create_request_fingerprint"),
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
		index("hr_competency_org_id_idx").on(t.organizationId, t.id),
		index("hr_competency_org_status_idx").on(t.organizationId, t.status),
		uniqueIndex("hr_competency_org_code_uidx").on(t.organizationId, t.code),
		uniqueIndex("hr_competency_org_create_idempotency_uidx")
			.on(t.organizationId, t.createIdempotencyKey)
			.where(sql`${t.createIdempotencyKey} IS NOT NULL`),
		check(
			"hr_competency_status_check",
			sql`${t.status} IN ('active', 'retired')`,
		),
		check(
			"hr_competency_scale_code_check",
			sql`${t.scaleCode} IN ('five_point', 'behavioral_anchor')`,
		),
	],
);

export const hrJobCompetency = pgTable(
	"hr_job_competency",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		jobId: uuid("job_id")
			.notNull()
			.references(() => hrJob.id),
		competencyId: uuid("competency_id")
			.notNull()
			.references(() => hrCompetency.id),
		requiredLevel: integer("required_level").notNull(),
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
		index("hr_job_competency_org_id_idx").on(t.organizationId, t.id),
		index("hr_job_competency_org_job_idx").on(t.organizationId, t.jobId),
		uniqueIndex("hr_job_competency_org_job_competency_active_uidx")
			.on(t.organizationId, t.jobId, t.competencyId)
			.where(sql`${t.status} = 'active'`),
		check(
			"hr_job_competency_status_check",
			sql`${t.status} IN ('active', 'removed')`,
		),
		check(
			"hr_job_competency_required_level_check",
			sql`${t.requiredLevel} >= 1 AND ${t.requiredLevel} <= 5`,
		),
	],
);

export const hrCompetencyAssessment = pgTable(
	"hr_competency_assessment",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		employeeId: uuid("employee_id")
			.notNull()
			.references(() => hrEmployee.id),
		competencyId: uuid("competency_id")
			.notNull()
			.references(() => hrCompetency.id),
		assessorUserId: text("assessor_user_id").notNull(),
		evidenceSource: text("evidence_source").notNull(),
		scaleCode: text("scale_code").notNull(),
		level: integer("level").notNull(),
		effectiveOn: date("effective_on").notNull(),
		expiresOn: date("expires_on"),
		status: text("status").notNull(),
		supersedesAssessmentId: uuid("supersedes_assessment_id").references(
			(): AnyPgColumn => hrCompetencyAssessment.id,
		),
		supersededByAssessmentId: uuid("superseded_by_assessment_id").references(
			(): AnyPgColumn => hrCompetencyAssessment.id,
		),
		createIdempotencyKey: text("create_idempotency_key"),
		createRequestFingerprint: text("create_request_fingerprint"),
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
		index("hr_competency_assessment_org_id_idx").on(t.organizationId, t.id),
		index("hr_competency_assessment_org_employee_idx").on(
			t.organizationId,
			t.employeeId,
		),
		index("hr_competency_assessment_org_competency_idx").on(
			t.organizationId,
			t.competencyId,
		),
		uniqueIndex("hr_competency_assessment_org_create_idempotency_uidx")
			.on(t.organizationId, t.createIdempotencyKey)
			.where(sql`${t.createIdempotencyKey} IS NOT NULL`),
		check(
			"hr_competency_assessment_status_check",
			sql`${t.status} IN ('current', 'superseded', 'expired')`,
		),
		check(
			"hr_competency_assessment_scale_code_check",
			sql`${t.scaleCode} IN ('five_point', 'behavioral_anchor')`,
		),
		check(
			"hr_competency_assessment_level_check",
			sql`${t.level} >= 1 AND ${t.level} <= 5`,
		),
		check(
			"hr_competency_assessment_expires_after_effective_ck",
			sql`${t.expiresOn} IS NULL OR ${t.expiresOn} > ${t.effectiveOn}`,
		),
	],
);

export const hrTalentProfile = pgTable(
	"hr_talent_profile",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		employeeId: uuid("employee_id")
			.notNull()
			.references(() => hrEmployee.id),
		summary: text("summary"),
		currentClassification: text("current_classification"),
		status: text("status").notNull(),
		createIdempotencyKey: text("create_idempotency_key"),
		createRequestFingerprint: text("create_request_fingerprint"),
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
		index("hr_talent_profile_org_id_idx").on(t.organizationId, t.id),
		uniqueIndex("hr_talent_profile_org_employee_uidx").on(
			t.organizationId,
			t.employeeId,
		),
		uniqueIndex("hr_talent_profile_org_create_idempotency_uidx")
			.on(t.organizationId, t.createIdempotencyKey)
			.where(sql`${t.createIdempotencyKey} IS NOT NULL`),
		check(
			"hr_talent_profile_status_check",
			sql`${t.status} IN ('active', 'archived')`,
		),
	],
);

export const hrTalentProfileAssessment = pgTable(
	"hr_talent_profile_assessment",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		talentProfileId: uuid("talent_profile_id")
			.notNull()
			.references(() => hrTalentProfile.id),
		methodCode: text("method_code").notNull(),
		classification: text("classification").notNull(),
		evidenceSummary: text("evidence_summary").notNull(),
		assessorUserId: text("assessor_user_id").notNull(),
		status: text("status").notNull(),
		confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
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
		index("hr_talent_profile_assessment_org_id_idx").on(t.organizationId, t.id),
		index("hr_talent_profile_assessment_org_profile_idx").on(
			t.organizationId,
			t.talentProfileId,
		),
		check(
			"hr_talent_profile_assessment_status_check",
			sql`${t.status} IN ('draft', 'confirmed', 'superseded')`,
		),
		check(
			"hr_talent_profile_assessment_method_code_check",
			sql`${t.methodCode} IN ('calibration_panel', 'assessment_center', 'manager_evidence_review')`,
		),
	],
);

export const hrTalentPool = pgTable(
	"hr_talent_pool",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		code: text("code").notNull(),
		name: text("name").notNull(),
		description: text("description"),
		status: text("status").notNull(),
		createIdempotencyKey: text("create_idempotency_key"),
		createRequestFingerprint: text("create_request_fingerprint"),
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
		index("hr_talent_pool_org_id_idx").on(t.organizationId, t.id),
		index("hr_talent_pool_org_status_idx").on(t.organizationId, t.status),
		uniqueIndex("hr_talent_pool_org_code_uidx").on(t.organizationId, t.code),
		uniqueIndex("hr_talent_pool_org_create_idempotency_uidx")
			.on(t.organizationId, t.createIdempotencyKey)
			.where(sql`${t.createIdempotencyKey} IS NOT NULL`),
		check(
			"hr_talent_pool_status_check",
			sql`${t.status} IN ('open', 'closed')`,
		),
	],
);

export const hrTalentPoolMember = pgTable(
	"hr_talent_pool_member",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		poolId: uuid("pool_id")
			.notNull()
			.references(() => hrTalentPool.id),
		employeeId: uuid("employee_id")
			.notNull()
			.references(() => hrEmployee.id),
		nominatorUserId: text("nominator_user_id").notNull(),
		status: text("status").notNull(),
		nominatedAt: timestamp("nominated_at", { withTimezone: true }).notNull(),
		approvedAt: timestamp("approved_at", { withTimezone: true }),
		removedAt: timestamp("removed_at", { withTimezone: true }),
		approverUserId: text("approver_user_id"),
		createIdempotencyKey: text("create_idempotency_key"),
		createRequestFingerprint: text("create_request_fingerprint"),
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
		index("hr_talent_pool_member_org_id_idx").on(t.organizationId, t.id),
		index("hr_talent_pool_member_org_pool_idx").on(t.organizationId, t.poolId),
		uniqueIndex("hr_talent_pool_member_org_pool_employee_active_uidx")
			.on(t.organizationId, t.poolId, t.employeeId)
			.where(sql`${t.status} IN ('nominated', 'approved')`),
		uniqueIndex("hr_talent_pool_member_org_create_idempotency_uidx")
			.on(t.organizationId, t.createIdempotencyKey)
			.where(sql`${t.createIdempotencyKey} IS NOT NULL`),
		check(
			"hr_talent_pool_member_status_check",
			sql`${t.status} IN ('nominated', 'approved', 'removed')`,
		),
	],
);

export const hrTalentProfileMobility = pgTable(
	"hr_talent_profile_mobility",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		talentProfileId: uuid("talent_profile_id")
			.notNull()
			.references(() => hrTalentProfile.id),
		dimension: text("dimension").notNull(),
		preferenceCode: text("preference_code").notNull(),
		scopeDetail: text("scope_detail"),
		evidenceSummary: text("evidence_summary").notNull(),
		effectiveFrom: date("effective_from", { mode: "string" }).notNull(),
		effectiveTo: date("effective_to", { mode: "string" }),
		status: text("status").notNull(),
		createIdempotencyKey: text("create_idempotency_key"),
		createRequestFingerprint: text("create_request_fingerprint"),
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
		index("hr_talent_profile_mobility_org_id_idx").on(t.organizationId, t.id),
		index("hr_talent_profile_mobility_org_profile_idx").on(
			t.organizationId,
			t.talentProfileId,
		),
		uniqueIndex("hr_talent_profile_mobility_org_profile_dimension_current_uidx")
			.on(t.organizationId, t.talentProfileId, t.dimension)
			.where(sql`${t.status} = 'current'`),
		uniqueIndex("hr_talent_profile_mobility_org_create_idempotency_uidx")
			.on(t.organizationId, t.createIdempotencyKey)
			.where(sql`${t.createIdempotencyKey} IS NOT NULL`),
		check(
			"hr_talent_profile_mobility_dimension_check",
			sql`${t.dimension} IN ('geographic', 'functional', 'organizational')`,
		),
		check(
			"hr_talent_profile_mobility_preference_code_check",
			sql`${t.preferenceCode} IN ('open', 'limited', 'not_open')`,
		),
		check(
			"hr_talent_profile_mobility_status_check",
			sql`${t.status} IN ('current', 'superseded')`,
		),
		check(
			"hr_talent_profile_mobility_effective_range_check",
			sql`${t.effectiveTo} IS NULL OR ${t.effectiveTo} >= ${t.effectiveFrom}`,
		),
	],
);

export const hrTalentCriticalRoleReadiness = pgTable(
	"hr_talent_critical_role_readiness",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		talentProfileId: uuid("talent_profile_id")
			.notNull()
			.references(() => hrTalentProfile.id),
		positionId: uuid("position_id")
			.notNull()
			.references(() => hrPosition.id),
		readiness: text("readiness").notNull(),
		readinessEffectiveOn: date("readiness_effective_on", {
			mode: "string",
		}).notNull(),
		evidenceSummary: text("evidence_summary").notNull(),
		assessorUserId: text("assessor_user_id").notNull(),
		status: text("status").notNull(),
		createIdempotencyKey: text("create_idempotency_key"),
		createRequestFingerprint: text("create_request_fingerprint"),
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
		index("hr_talent_critical_role_readiness_org_id_idx").on(
			t.organizationId,
			t.id,
		),
		index("hr_talent_critical_role_readiness_org_profile_idx").on(
			t.organizationId,
			t.talentProfileId,
		),
		index("hr_talent_critical_role_readiness_org_position_idx").on(
			t.organizationId,
			t.positionId,
		),
		uniqueIndex(
			"hr_talent_critical_role_readiness_org_profile_position_current_uidx",
		)
			.on(t.organizationId, t.talentProfileId, t.positionId)
			.where(sql`${t.status} = 'current'`),
		uniqueIndex("hr_talent_critical_role_readiness_org_create_idempotency_uidx")
			.on(t.organizationId, t.createIdempotencyKey)
			.where(sql`${t.createIdempotencyKey} IS NOT NULL`),
		check(
			"hr_talent_critical_role_readiness_status_check",
			sql`${t.status} IN ('current', 'superseded')`,
		),
		check(
			"hr_talent_critical_role_readiness_readiness_check",
			sql`${t.readiness} IN ('not_ready', 'ready_soon', 'ready_now', 'emerging')`,
		),
	],
);

export const hrCareerPlan = pgTable(
	"hr_career_plan",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		employeeId: uuid("employee_id")
			.notNull()
			.references(() => hrEmployee.id),
		ownerUserId: text("owner_user_id").notNull(),
		code: text("code").notNull(),
		title: text("title").notNull(),
		status: text("status").notNull(),
		acknowledgedAt: timestamp("acknowledged_at", { withTimezone: true }),
		createIdempotencyKey: text("create_idempotency_key"),
		createRequestFingerprint: text("create_request_fingerprint"),
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
		index("hr_career_plan_org_id_idx").on(t.organizationId, t.id),
		index("hr_career_plan_org_employee_idx").on(t.organizationId, t.employeeId),
		uniqueIndex("hr_career_plan_org_code_uidx").on(t.organizationId, t.code),
		uniqueIndex("hr_career_plan_org_create_idempotency_uidx")
			.on(t.organizationId, t.createIdempotencyKey)
			.where(sql`${t.createIdempotencyKey} IS NOT NULL`),
		check(
			"hr_career_plan_status_check",
			sql`${t.status} IN ('draft', 'acknowledged', 'active', 'closed')`,
		),
	],
);

export const hrCareerPlanAction = pgTable(
	"hr_career_plan_action",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		careerPlanId: uuid("career_plan_id")
			.notNull()
			.references(() => hrCareerPlan.id),
		title: text("title").notNull(),
		dueOn: date("due_on"),
		status: text("status").notNull(),
		learningAssignmentId: uuid("learning_assignment_id").references(
			() => hrLearningAssignment.id,
		),
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
		index("hr_career_plan_action_org_id_idx").on(t.organizationId, t.id),
		index("hr_career_plan_action_org_plan_idx").on(
			t.organizationId,
			t.careerPlanId,
		),
		check(
			"hr_career_plan_action_status_check",
			sql`${t.status} IN ('open', 'done', 'cancelled')`,
		),
	],
);

export const hrSuccessionPlan = pgTable(
	"hr_succession_plan",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		code: text("code").notNull(),
		title: text("title").notNull(),
		positionId: uuid("position_id")
			.notNull()
			.references(() => hrPosition.id),
		status: text("status").notNull(),
		allowsExternalCandidates: boolean("allows_external_candidates")
			.notNull()
			.default(false),
		createIdempotencyKey: text("create_idempotency_key"),
		createRequestFingerprint: text("create_request_fingerprint"),
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
		index("hr_succession_plan_org_id_idx").on(t.organizationId, t.id),
		index("hr_succession_plan_org_position_idx").on(
			t.organizationId,
			t.positionId,
		),
		uniqueIndex("hr_succession_plan_org_code_uidx").on(
			t.organizationId,
			t.code,
		),
		uniqueIndex("hr_succession_plan_org_create_idempotency_uidx")
			.on(t.organizationId, t.createIdempotencyKey)
			.where(sql`${t.createIdempotencyKey} IS NOT NULL`),
		check(
			"hr_succession_plan_status_check",
			sql`${t.status} IN ('draft', 'active', 'closed')`,
		),
	],
);

export const hrSuccessionCandidate = pgTable(
	"hr_succession_candidate",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		successionPlanId: uuid("succession_plan_id")
			.notNull()
			.references(() => hrSuccessionPlan.id),
		employeeId: uuid("employee_id").references(() => hrEmployee.id),
		externalCandidateRef: text("external_candidate_ref"),
		nominatorUserId: text("nominator_user_id").notNull(),
		readiness: text("readiness").notNull(),
		readinessEffectiveOn: date("readiness_effective_on").notNull(),
		evidenceSummary: text("evidence_summary").notNull(),
		status: text("status").notNull(),
		createIdempotencyKey: text("create_idempotency_key"),
		createRequestFingerprint: text("create_request_fingerprint"),
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
		index("hr_succession_candidate_org_id_idx").on(t.organizationId, t.id),
		index("hr_succession_candidate_org_plan_idx").on(
			t.organizationId,
			t.successionPlanId,
		),
		index("hr_succession_candidate_org_employee_idx").on(
			t.organizationId,
			t.employeeId,
		),
		uniqueIndex("hr_succession_candidate_org_create_idempotency_uidx")
			.on(t.organizationId, t.createIdempotencyKey)
			.where(sql`${t.createIdempotencyKey} IS NOT NULL`),
		check(
			"hr_succession_candidate_status_check",
			sql`${t.status} IN ('nominated', 'approved', 'removed')`,
		),
		check(
			"hr_succession_candidate_readiness_check",
			sql`${t.readiness} IN ('not_ready', 'ready_soon', 'ready_now', 'emerging')`,
		),
	],
);

export const hrEmployeeCase = pgTable(
	"hr_employee_case",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		employeeId: uuid("employee_id")
			.notNull()
			.references(() => hrEmployee.id),
		employmentId: uuid("employment_id")
			.notNull()
			.references(() => hrEmployment.id),
		caseType: text("case_type").notNull(),
		status: text("status").notNull(),
		severity: text("severity").notNull(),
		allegationSummary: text("allegation_summary").notNull(),
		classificationCode: text("classification_code").notNull(),
		ownerActorUserId: text("owner_actor_user_id").notNull(),
		subjectActorUserId: text("subject_actor_user_id"),
		participants: jsonb("participants").notNull().default([]),
		conflictedActorUserIds: jsonb("conflicted_actor_user_ids")
			.notNull()
			.default([]),
		interimAuthority: text("interim_authority"),
		interimReason: text("interim_reason"),
		interimStartsOn: date("interim_starts_on"),
		interimReviewOn: date("interim_review_on"),
		interimStatus: text("interim_status"),
		findingCode: text("finding_code"),
		findingSummary: text("finding_summary"),
		findingRecordedBy: text("finding_recorded_by"),
		findingRecordedAt: timestamp("finding_recorded_at", { withTimezone: true }),
		outcomeCode: text("outcome_code"),
		closedAt: timestamp("closed_at", { withTimezone: true }),
		closedBy: text("closed_by"),
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
		index("hr_employee_case_org_id_idx").on(t.organizationId, t.id),
		index("hr_employee_case_org_employee_idx").on(
			t.organizationId,
			t.employeeId,
		),
		index("hr_employee_case_org_status_idx").on(t.organizationId, t.status),
		index("hr_employee_case_org_owner_idx").on(
			t.organizationId,
			t.ownerActorUserId,
		),
		uniqueIndex("hr_employee_case_org_create_idempotency_uidx").on(
			t.organizationId,
			t.createIdempotencyKey,
		),
		check(
			"hr_employee_case_case_type_check",
			sql`${t.caseType} IN ('grievance', 'conduct', 'attendance_misconduct', 'workplace_conflict', 'harassment', 'policy_breach', 'disciplinary_review')`,
		),
		check(
			"hr_employee_case_status_check",
			sql`${t.status} IN ('open', 'investigating', 'finding_recorded', 'action_pending', 'action_approved', 'under_appeal', 'closed')`,
		),
		check(
			"hr_employee_case_severity_check",
			sql`${t.severity} IN ('low', 'medium', 'high', 'critical')`,
		),
		check(
			"hr_employee_case_interim_status_check",
			sql`${t.interimStatus} IS NULL OR ${t.interimStatus} IN ('active', 'expired', 'lifted')`,
		),
	],
);

export const hrEmployeeCaseEvent = pgTable(
	"hr_employee_case_event",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		caseId: uuid("case_id")
			.notNull()
			.references(() => hrEmployeeCase.id),
		eventKind: text("event_kind").notNull(),
		sequenceNo: integer("sequence_no").notNull(),
		documentRef: text("document_ref"),
		payloadJson: jsonb("payload_json"),
		redactsEventId: uuid("redacts_event_id"),
		recordedBy: text("recorded_by").notNull(),
		recordedAt: timestamp("recorded_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => [
		index("hr_employee_case_event_org_id_idx").on(t.organizationId, t.id),
		index("hr_employee_case_event_org_case_idx").on(t.organizationId, t.caseId),
		uniqueIndex("hr_employee_case_event_org_case_sequence_uidx").on(
			t.organizationId,
			t.caseId,
			t.sequenceNo,
		),
	],
);

export const hrEmployeeCaseAction = pgTable(
	"hr_employee_case_action",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		caseId: uuid("case_id")
			.notNull()
			.references(() => hrEmployeeCase.id),
		actionType: text("action_type").notNull(),
		status: text("status").notNull(),
		recommendedBy: text("recommended_by").notNull(),
		approvedBy: text("approved_by"),
		policyValidationRecorded: boolean("policy_validation_recorded")
			.notNull()
			.default(false),
		recommendationNote: text("recommendation_note"),
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
		index("hr_employee_case_action_org_id_idx").on(t.organizationId, t.id),
		index("hr_employee_case_action_org_case_idx").on(
			t.organizationId,
			t.caseId,
		),
		uniqueIndex("hr_employee_case_action_org_create_idempotency_uidx").on(
			t.organizationId,
			t.createIdempotencyKey,
		),
		check(
			"hr_employee_case_action_action_type_check",
			sql`${t.actionType} IN ('warning', 'training', 'suspension_recommendation', 'termination_recommendation', 'other_policy_action')`,
		),
		check(
			"hr_employee_case_action_status_check",
			sql`${t.status} IN ('recommended', 'approved', 'rejected')`,
		),
	],
);

export const hrEmployeeCaseAppeal = pgTable(
	"hr_employee_case_appeal",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		caseId: uuid("case_id")
			.notNull()
			.references(() => hrEmployeeCase.id),
		originalFindingCode: text("original_finding_code").notNull(),
		originalFindingRecordedAt: timestamp("original_finding_recorded_at", {
			withTimezone: true,
		}).notNull(),
		appealGroundsSummary: text("appeal_grounds_summary").notNull(),
		status: text("status").notNull(),
		appealOutcomeCode: text("appeal_outcome_code"),
		resolvedBy: text("resolved_by"),
		resolvedAt: timestamp("resolved_at", { withTimezone: true }),
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
		index("hr_employee_case_appeal_org_id_idx").on(t.organizationId, t.id),
		index("hr_employee_case_appeal_org_case_idx").on(
			t.organizationId,
			t.caseId,
		),
		uniqueIndex("hr_employee_case_appeal_org_create_idempotency_uidx").on(
			t.organizationId,
			t.createIdempotencyKey,
		),
		check(
			"hr_employee_case_appeal_status_check",
			sql`${t.status} IN ('open', 'resolved')`,
		),
	],
);

export const hrDocumentRequirement = pgTable(
	"hr_document_requirement",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		code: text("code").notNull(),
		name: text("name").notNull(),
		documentType: text("document_type").notNull(),
		issuingJurisdiction: text("issuing_jurisdiction"),
		appliesToNote: text("applies_to_note"),
		applicabilityJson: jsonb("applicability_json")
			.notNull()
			.default(sql`'{"kind":"all_employees"}'::jsonb`),
		/** draft | published | retired */
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
		index("hr_document_requirement_org_id_idx").on(t.organizationId, t.id),
		index("hr_document_requirement_org_status_idx").on(
			t.organizationId,
			t.status,
		),
		uniqueIndex("hr_document_requirement_org_code_uidx").on(
			t.organizationId,
			t.code,
		),
		check(
			"hr_document_requirement_status_check",
			sql`${t.status} IN ('draft', 'published', 'retired')`,
		),
		check(
			"hr_document_requirement_applicability_shape_check",
			sql`jsonb_typeof(${t.applicabilityJson}) = 'object' AND (${t.applicabilityJson}->>'kind' = 'all_employees' OR (${t.applicabilityJson}->>'kind' = 'employee_ids' AND jsonb_typeof(${t.applicabilityJson}->'employeeIds') = 'array' AND jsonb_array_length(${t.applicabilityJson}->'employeeIds') > 0))`,
		),
	],
);

export const hrEmployeeDocument = pgTable(
	"hr_employee_document",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		employeeId: uuid("employee_id")
			.notNull()
			.references(() => hrEmployee.id),
		requirementId: uuid("requirement_id").references(
			() => hrDocumentRequirement.id,
		),
		documentType: text("document_type").notNull(),
		issuingJurisdiction: text("issuing_jurisdiction"),
		issuedOn: date("issued_on").notNull(),
		expiresOn: date("expires_on"),
		/** pending | verified | rejected | revoked | expired */
		verificationStatus: text("verification_status").notNull(),
		verifiedBy: text("verified_by"),
		verifiedAt: timestamp("verified_at", { withTimezone: true }),
		rejectionReason: text("rejection_reason"),
		documentRef: text("document_ref").notNull(),
		identifierLast4: text("identifier_last4"),
		identifierFingerprint: text("identifier_fingerprint"),
		metadataJson: jsonb("metadata_json"),
		createIdempotencyKey: text("create_idempotency_key"),
		createRequestFingerprint: text("create_request_fingerprint"),
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
		index("hr_employee_document_org_id_idx").on(t.organizationId, t.id),
		index("hr_employee_document_org_employee_idx").on(
			t.organizationId,
			t.employeeId,
		),
		index("hr_employee_document_org_requirement_idx").on(
			t.organizationId,
			t.requirementId,
		),
		index("hr_employee_document_org_status_idx").on(
			t.organizationId,
			t.verificationStatus,
		),
		index("hr_employee_document_org_expires_idx").on(
			t.organizationId,
			t.expiresOn,
		),
		uniqueIndex("hr_employee_document_org_create_idempotency_uidx")
			.on(t.organizationId, t.createIdempotencyKey)
			.where(sql`${t.createIdempotencyKey} IS NOT NULL`),
		check(
			"hr_employee_document_verification_status_check",
			sql`${t.verificationStatus} IN ('pending', 'verified', 'rejected', 'revoked', 'expired')`,
		),
		check(
			"hr_employee_document_expiry_check",
			sql`${t.expiresOn} IS NULL OR ${t.expiresOn} >= ${t.issuedOn}`,
		),
	],
);

export const hrWorkEligibility = pgTable(
	"hr_work_eligibility",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		employeeId: uuid("employee_id")
			.notNull()
			.references(() => hrEmployee.id),
		countryCode: text("country_code").notNull(),
		jurisdiction: text("jurisdiction"),
		/** pending | active | suspended | expired | closed */
		status: text("status").notNull(),
		issuedOn: date("issued_on").notNull(),
		expiresOn: date("expires_on"),
		verifiedBy: text("verified_by"),
		verifiedAt: timestamp("verified_at", { withTimezone: true }),
		documentRef: text("document_ref"),
		createIdempotencyKey: text("create_idempotency_key"),
		createRequestFingerprint: text("create_request_fingerprint"),
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
		index("hr_work_eligibility_org_id_idx").on(t.organizationId, t.id),
		index("hr_work_eligibility_org_employee_idx").on(
			t.organizationId,
			t.employeeId,
		),
		index("hr_work_eligibility_org_status_idx").on(t.organizationId, t.status),
		index("hr_work_eligibility_org_country_idx").on(
			t.organizationId,
			t.countryCode,
		),
		uniqueIndex("hr_work_eligibility_org_create_idempotency_uidx")
			.on(t.organizationId, t.createIdempotencyKey)
			.where(sql`${t.createIdempotencyKey} IS NOT NULL`),
		check(
			"hr_work_eligibility_status_check",
			sql`${t.status} IN ('pending', 'active', 'suspended', 'expired', 'closed')`,
		),
		check(
			"hr_work_eligibility_expiry_check",
			sql`${t.expiresOn} IS NULL OR ${t.expiresOn} >= ${t.issuedOn}`,
		),
	],
);

export const hrPolicyAcknowledgement = pgTable(
	"hr_policy_acknowledgement",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		employeeId: uuid("employee_id")
			.notNull()
			.references(() => hrEmployee.id),
		policyCode: text("policy_code").notNull(),
		policyVersion: text("policy_version").notNull(),
		/** outstanding | acknowledged | revoked | superseded */
		requirementStatus: text("requirement_status").notNull(),
		issuedAt: timestamp("issued_at", { withTimezone: true }).notNull(),
		dueOn: date("due_on").notNull(),
		acknowledgedAt: timestamp("acknowledged_at", { withTimezone: true }),
		acknowledgedBy: text("acknowledged_by"),
		supersedesAcknowledgementId: uuid(
			"supersedes_acknowledgement_id",
		).references((): AnyPgColumn => hrPolicyAcknowledgement.id),
		createIdempotencyKey: text("create_idempotency_key"),
		createRequestFingerprint: text("create_request_fingerprint"),
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
		index("hr_policy_acknowledgement_org_id_idx").on(t.organizationId, t.id),
		index("hr_policy_acknowledgement_org_employee_idx").on(
			t.organizationId,
			t.employeeId,
		),
		index("hr_policy_acknowledgement_org_policy_idx").on(
			t.organizationId,
			t.policyCode,
			t.policyVersion,
		),
		index("hr_policy_acknowledgement_org_status_idx").on(
			t.organizationId,
			t.requirementStatus,
		),
		index("hr_policy_acknowledgement_org_status_due_idx").on(
			t.organizationId,
			t.requirementStatus,
			t.dueOn,
		),
		uniqueIndex("hr_policy_acknowledgement_org_create_idempotency_uidx")
			.on(t.organizationId, t.createIdempotencyKey)
			.where(sql`${t.createIdempotencyKey} IS NOT NULL`),
		check(
			"hr_policy_acknowledgement_status_check",
			sql`${t.requirementStatus} IN ('outstanding', 'acknowledged', 'revoked', 'superseded')`,
		),
	],
);

/** Organization work calendar — leave segment expansion / working-day resolution. */
export const hrWorkCalendar = pgTable(
	"hr_work_calendar",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		code: text("code").notNull(),
		name: text("name").notNull(),
		timezone: text("timezone").notNull(),
		/** Monotonic calendar rule version used in leave calculations. */
		calendarVersion: text("calendar_version").notNull(),
		/**
		 * Working-week pattern JSON:
		 * [{ dayOfWeek: 0-6, isWorkingDay, standardStartTime?, standardEndTime?, standardMinutes? }]
		 */
		workWeekJson: jsonb("work_week_json").notNull(),
		standardHoursPerDay: numeric("standard_hours_per_day", {
			precision: 6,
			scale: 2,
		}).notNull(),
		/** active | archived */
		status: text("status").notNull(),
		effectiveFrom: date("effective_from", { mode: "string" }).notNull(),
		effectiveTo: date("effective_to", { mode: "string" }),
		supersedesCalendarId: uuid("supersedes_calendar_id").references(
			(): AnyPgColumn => hrWorkCalendar.id,
		),
		version: integer("version").notNull().default(1),
		createIdempotencyKey: text("create_idempotency_key").notNull(),
		createRequestFingerprint: text("create_request_fingerprint").notNull(),
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
		index("hr_work_calendar_org_id_idx").on(t.organizationId, t.id),
		index("hr_work_calendar_org_status_idx").on(t.organizationId, t.status),
		uniqueIndex("hr_work_calendar_org_code_from_uidx").on(
			t.organizationId,
			t.code,
			t.effectiveFrom,
		),
		uniqueIndex("hr_work_calendar_org_create_idempotency_uidx").on(
			t.organizationId,
			t.createIdempotencyKey,
		),
		check(
			"hr_work_calendar_status_check",
			sql`${t.status} IN ('active', 'superseded', 'archived')`,
		),
		check(
			"hr_work_calendar_hours_pos_check",
			sql`${t.standardHoursPerDay}::numeric > 0`,
		),
		check(
			"hr_work_calendar_effective_range_check",
			sql`${t.effectiveTo} IS NULL OR ${t.effectiveTo} >= ${t.effectiveFrom}`,
		),
	],
);

export const hrWorkCalendarHoliday = pgTable(
	"hr_work_calendar_holiday",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		calendarId: uuid("calendar_id")
			.notNull()
			.references(() => hrWorkCalendar.id),
		holidayDate: date("holiday_date", { mode: "string" }).notNull(),
		label: text("label"),
		locationCode: text("location_code"),
		jurisdiction: text("jurisdiction"),
		overrideKind: text("override_kind").notNull().default("holiday"),
		isWorkingDay: boolean("is_working_day").notNull().default(false),
		expectedMinutes: integer("expected_minutes"),
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
		index("hr_work_calendar_holiday_org_id_idx").on(t.organizationId, t.id),
		index("hr_work_calendar_holiday_org_calendar_idx").on(
			t.organizationId,
			t.calendarId,
		),
		index("hr_work_calendar_holiday_org_date_idx").on(
			t.organizationId,
			t.holidayDate,
		),
		uniqueIndex("hr_work_calendar_holiday_org_calendar_date_loc_jur_uidx").on(
			t.organizationId,
			t.calendarId,
			t.holidayDate,
			t.locationCode,
			t.jurisdiction,
		),
		check(
			"hr_work_calendar_holiday_override_kind_check",
			sql`${t.overrideKind} IN ('holiday', 'half_day', 'shortened_day', 'replacement_workday', 'closure')`,
		),
		check(
			"hr_work_calendar_holiday_expected_minutes_pos_check",
			sql`${t.expectedMinutes} IS NULL OR ${t.expectedMinutes} > 0`,
		),
		check(
			"hr_work_calendar_holiday_override_consistency_check",
			sql`(
				(${t.overrideKind} IN ('holiday', 'closure') AND ${t.isWorkingDay} = false)
				OR (
					${t.overrideKind} IN ('half_day', 'shortened_day', 'replacement_workday')
					AND ${t.isWorkingDay} = true
				)
			)`,
		),
	],
);

export const hrEmploymentCalendarAssignment = pgTable(
	"hr_employment_calendar_assignment",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		employeeId: uuid("employee_id")
			.notNull()
			.references(() => hrEmployee.id),
		employmentId: uuid("employment_id")
			.notNull()
			.references(() => hrEmployment.id),
		calendarId: uuid("calendar_id")
			.notNull()
			.references(() => hrWorkCalendar.id),
		effectiveFrom: date("effective_from", { mode: "string" }).notNull(),
		effectiveTo: date("effective_to", { mode: "string" }),
		locationCode: text("location_code"),
		jurisdiction: text("jurisdiction"),
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
		index("hr_employment_calendar_assignment_org_id_idx").on(
			t.organizationId,
			t.id,
		),
		index("hr_employment_calendar_assignment_org_employment_idx").on(
			t.organizationId,
			t.employmentId,
		),
		index("hr_employment_calendar_assignment_org_employee_idx").on(
			t.organizationId,
			t.employeeId,
		),
		uniqueIndex(
			"hr_employment_calendar_assignment_org_employment_from_uidx",
		).on(t.organizationId, t.employmentId, t.effectiveFrom),
		check(
			"hr_employment_calendar_assignment_effective_range_check",
			sql`${t.effectiveTo} IS NULL OR ${t.effectiveTo} >= ${t.effectiveFrom}`,
		),
	],
);

export const hrWorkCalendarScopeAssignment = pgTable(
	"hr_work_calendar_scope_assignment",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		scopeType: text("scope_type").notNull(),
		scopeKey: text("scope_key").notNull(),
		calendarId: uuid("calendar_id")
			.notNull()
			.references(() => hrWorkCalendar.id),
		effectiveFrom: date("effective_from", { mode: "string" }).notNull(),
		effectiveTo: date("effective_to", { mode: "string" }),
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
		index("hr_work_calendar_scope_assignment_org_id_idx").on(
			t.organizationId,
			t.id,
		),
		index("hr_work_calendar_scope_assignment_org_scope_idx").on(
			t.organizationId,
			t.scopeType,
			t.scopeKey,
		),
		uniqueIndex("hr_work_calendar_scope_assignment_org_scope_from_uidx").on(
			t.organizationId,
			t.scopeType,
			t.scopeKey,
			t.effectiveFrom,
		),
		check(
			"hr_work_calendar_scope_assignment_scope_type_check",
			sql`${t.scopeType} IN ('employment', 'employee', 'location', 'department', 'legal_entity', 'organization')`,
		),
		check(
			"hr_work_calendar_scope_assignment_effective_range_check",
			sql`${t.effectiveTo} IS NULL OR ${t.effectiveTo} >= ${t.effectiveFrom}`,
		),
	],
);

export const hrTimePolicy = pgTable(
	"hr_time_policy",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		code: text("code").notNull(),
		name: text("name").notNull(),
		status: text("status").notNull().default("draft"),
		effectiveFrom: date("effective_from", { mode: "string" }).notNull(),
		effectiveTo: date("effective_to", { mode: "string" }),
		minimumRestMinutes: integer("minimum_rest_minutes").notNull(),
		automaticBreakAfterMinutes: integer("automatic_break_after_minutes"),
		automaticBreakMinutes: integer("automatic_break_minutes")
			.notNull()
			.default(0),
		approvalSteps: jsonb("approval_steps").notNull().default(["line_manager"]),
		supersedesPolicyId: uuid("supersedes_policy_id").references(
			(): AnyPgColumn => hrTimePolicy.id,
		),
		version: integer("version").notNull().default(1),
		createIdempotencyKey: text("create_idempotency_key").notNull(),
		createRequestFingerprint: text("create_request_fingerprint").notNull(),
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
		index("hr_time_policy_org_id_idx").on(t.organizationId, t.id),
		uniqueIndex("hr_time_policy_org_code_from_uidx").on(
			t.organizationId,
			t.code,
			t.effectiveFrom,
		),
		uniqueIndex("hr_time_policy_org_create_idem_uidx").on(
			t.organizationId,
			t.createIdempotencyKey,
		),
		check(
			"hr_time_policy_status_check",
			sql`${t.status} IN ('draft', 'active', 'superseded', 'archived')`,
		),
		check(
			"hr_time_policy_effective_range_check",
			sql`${t.effectiveTo} IS NULL OR ${t.effectiveTo} >= ${t.effectiveFrom}`,
		),
		check(
			"hr_time_policy_minimum_rest_check",
			sql`${t.minimumRestMinutes} >= 0 AND ${t.minimumRestMinutes} <= 2880`,
		),
		check(
			"hr_time_policy_break_check",
			sql`
				${t.automaticBreakMinutes} >= 0
				AND ${t.automaticBreakMinutes} <= 1440
				AND (
					(${t.automaticBreakAfterMinutes} IS NULL AND ${t.automaticBreakMinutes} = 0)
					OR (
						${t.automaticBreakAfterMinutes} > 0
						AND ${t.automaticBreakAfterMinutes} <= 1440
						AND ${t.automaticBreakMinutes} <= ${t.automaticBreakAfterMinutes}
					)
				)
			`,
		),
		check(
			"hr_time_policy_approval_steps_check",
			sql`
				jsonb_typeof(${t.approvalSteps}) = 'array'
				AND jsonb_array_length(${t.approvalSteps}) BETWEEN 1 AND 4
				AND ${t.approvalSteps} <@ '["line_manager", "department", "hr", "payroll"]'::jsonb
				AND (
					jsonb_array_length(${t.approvalSteps}) = 1
					OR (
						jsonb_array_length(${t.approvalSteps}) = 2
						AND ${t.approvalSteps}->>0 <> ${t.approvalSteps}->>1
					)
					OR (
						jsonb_array_length(${t.approvalSteps}) = 3
						AND ${t.approvalSteps}->>0 <> ${t.approvalSteps}->>1
						AND ${t.approvalSteps}->>0 <> ${t.approvalSteps}->>2
						AND ${t.approvalSteps}->>1 <> ${t.approvalSteps}->>2
					)
					OR (
						jsonb_array_length(${t.approvalSteps}) = 4
						AND ${t.approvalSteps}->>0 <> ${t.approvalSteps}->>1
						AND ${t.approvalSteps}->>0 <> ${t.approvalSteps}->>2
						AND ${t.approvalSteps}->>0 <> ${t.approvalSteps}->>3
						AND ${t.approvalSteps}->>1 <> ${t.approvalSteps}->>2
						AND ${t.approvalSteps}->>1 <> ${t.approvalSteps}->>3
						AND ${t.approvalSteps}->>2 <> ${t.approvalSteps}->>3
					)
				)
			`,
		),
	],
);

export const hrTimePolicyAssignment = pgTable(
	"hr_time_policy_assignment",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		policyId: uuid("policy_id")
			.notNull()
			.references(() => hrTimePolicy.id),
		employmentId: uuid("employment_id")
			.notNull()
			.references(() => hrEmployment.id),
		effectiveFrom: date("effective_from", { mode: "string" }).notNull(),
		effectiveTo: date("effective_to", { mode: "string" }),
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
		index("hr_time_policy_assignment_org_id_idx").on(t.organizationId, t.id),
		index("hr_time_policy_assignment_org_employment_idx").on(
			t.organizationId,
			t.employmentId,
		),
		uniqueIndex("hr_time_policy_assignment_org_employment_from_uidx").on(
			t.organizationId,
			t.employmentId,
			t.effectiveFrom,
		),
		check(
			"hr_time_policy_assignment_effective_range_check",
			sql`${t.effectiveTo} IS NULL OR ${t.effectiveTo} >= ${t.effectiveFrom}`,
		),
	],
);

export const hrTimeApprovalAuthorityAssignment = pgTable(
	"hr_time_approval_authority_assignment",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		actorUserId: text("actor_user_id").notNull(),
		authority: text("authority").notNull(),
		effectiveFrom: date("effective_from", { mode: "string" }).notNull(),
		effectiveTo: date("effective_to", { mode: "string" }),
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
		index("hr_time_approval_authority_assignment_org_id_idx").on(
			t.organizationId,
			t.id,
		),
		index("hr_time_approval_authority_assignment_org_actor_idx").on(
			t.organizationId,
			t.actorUserId,
		),
		uniqueIndex(
			"hr_time_approval_authority_assignment_org_actor_authority_from_uidx",
		).on(t.organizationId, t.actorUserId, t.authority, t.effectiveFrom),
		check(
			"hr_time_approval_authority_assignment_authority_check",
			sql`${t.authority} IN ('line_manager', 'department', 'hr', 'payroll')`,
		),
		check(
			"hr_time_approval_authority_assignment_effective_range_check",
			sql`${t.effectiveTo} IS NULL OR ${t.effectiveTo} >= ${t.effectiveFrom}`,
		),
	],
);

/** Reusable shift definition — time.md §2.2 / §9. */
export const hrShift = pgTable(
	"hr_shift",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		code: text("code").notNull(),
		name: text("name").notNull(),
		shiftKind: text("shift_kind").notNull(),
		startLocal: text("start_local").notNull(),
		endLocal: text("end_local").notNull(),
		isOvernight: boolean("is_overnight").notNull().default(false),
		expectedMinutes: integer("expected_minutes").notNull(),
		graceEarlyMinutes: integer("grace_early_minutes").notNull().default(0),
		graceLateMinutes: integer("grace_late_minutes").notNull().default(0),
		minDurationMinutes: integer("min_duration_minutes"),
		maxDurationMinutes: integer("max_duration_minutes"),
		earliestClockInLocal: text("earliest_clock_in_local"),
		latestClockOutLocal: text("latest_clock_out_local"),
		overtimeEligible: boolean("overtime_eligible").notNull().default(true),
		timezone: text("timezone"),
		locationKey: text("location_key"),
		status: text("status").notNull(),
		effectiveFrom: date("effective_from", { mode: "string" }).notNull(),
		effectiveTo: date("effective_to", { mode: "string" }),
		supersedesShiftId: uuid("supersedes_shift_id").references(
			(): AnyPgColumn => hrShift.id,
		),
		version: integer("version").notNull().default(1),
		createIdempotencyKey: text("create_idempotency_key").notNull(),
		createRequestFingerprint: text("create_request_fingerprint").notNull(),
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
		index("hr_shift_org_id_idx").on(t.organizationId, t.id),
		index("hr_shift_org_status_idx").on(t.organizationId, t.status),
		uniqueIndex("hr_shift_org_code_effective_uidx").on(
			t.organizationId,
			t.code,
			t.effectiveFrom,
		),
		uniqueIndex("hr_shift_org_create_idempotency_uidx").on(
			t.organizationId,
			t.createIdempotencyKey,
		),
		check(
			"hr_shift_kind_check",
			sql`${t.shiftKind} IN ('fixed', 'flexible', 'split', 'rest_day', 'public_holiday')`,
		),
		check(
			"hr_shift_status_check",
			sql`${t.status} IN ('draft', 'active', 'superseded', 'inactive')`,
		),
		check(
			"hr_shift_expected_minutes_check",
			sql`${t.expectedMinutes} > 0 AND ${t.expectedMinutes} <= 1440`,
		),
		check(
			"hr_shift_effective_range_ck",
			sql`${t.effectiveTo} IS NULL OR ${t.effectiveFrom} <= ${t.effectiveTo}`,
		),
	],
);

export const hrShiftBreak = pgTable(
	"hr_shift_break",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		shiftId: uuid("shift_id")
			.notNull()
			.references(() => hrShift.id),
		breakOrder: integer("break_order").notNull().default(1),
		startOffsetMinutes: integer("start_offset_minutes"),
		durationMinutes: integer("duration_minutes").notNull(),
		isPaid: boolean("is_paid").notNull().default(false),
		label: text("label"),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => [
		index("hr_shift_break_org_id_idx").on(t.organizationId, t.id),
		index("hr_shift_break_org_shift_idx").on(t.organizationId, t.shiftId),
		check(
			"hr_shift_break_duration_check",
			sql`${t.durationMinutes} > 0 AND ${t.durationMinutes} <= 720`,
		),
	],
);

export const hrShiftAssignment = pgTable(
	"hr_shift_assignment",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		employeeId: uuid("employee_id")
			.notNull()
			.references(() => hrEmployee.id),
		employmentId: uuid("employment_id").references(() => hrEmployment.id),
		shiftId: uuid("shift_id")
			.notNull()
			.references(() => hrShift.id),
		scheduledDate: date("scheduled_date", { mode: "string" }).notNull(),
		startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
		endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
		locationKey: text("location_key"),
		timezone: text("timezone").notNull(),
		publicationStatus: text("publication_status").notNull(),
		assignmentSource: text("assignment_source").notNull().default("manual"),
		version: integer("version").notNull().default(1),
		createIdempotencyKey: text("create_idempotency_key").notNull(),
		createRequestFingerprint: text("create_request_fingerprint").notNull(),
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
		index("hr_shift_assignment_org_id_idx").on(t.organizationId, t.id),
		index("hr_shift_assignment_org_employee_date_idx").on(
			t.organizationId,
			t.employeeId,
			t.scheduledDate,
		),
		index("hr_shift_assignment_org_status_idx").on(
			t.organizationId,
			t.publicationStatus,
		),
		uniqueIndex("hr_shift_assignment_org_create_idempotency_uidx").on(
			t.organizationId,
			t.createIdempotencyKey,
		),
		check(
			"hr_shift_assignment_status_check",
			sql`${t.publicationStatus} IN ('planned', 'published', 'changed', 'cancelled', 'completed')`,
		),
		check("hr_shift_assignment_range_check", sql`${t.endsAt} > ${t.startsAt}`),
	],
);

export const hrShiftAssignmentSegment = pgTable(
	"hr_shift_assignment_segment",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		assignmentId: uuid("assignment_id")
			.notNull()
			.references(() => hrShiftAssignment.id),
		segmentOrder: integer("segment_order").notNull().default(1),
		startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
		endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => [
		index("hr_shift_assignment_segment_org_id_idx").on(t.organizationId, t.id),
		index("hr_shift_assignment_segment_org_assignment_idx").on(
			t.organizationId,
			t.assignmentId,
		),
		check(
			"hr_shift_assignment_segment_range_check",
			sql`${t.endsAt} > ${t.startsAt}`,
		),
	],
);

export const hrAttendanceEvent = pgTable(
	"hr_attendance_event",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		employeeId: uuid("employee_id")
			.notNull()
			.references(() => hrEmployee.id),
		employmentId: uuid("employment_id").references(() => hrEmployment.id),
		shiftAssignmentId: uuid("shift_assignment_id").references(
			() => hrShiftAssignment.id,
		),
		eventType: text("event_type").notNull(),
		capturedOccurredAt: timestamp("captured_occurred_at", {
			withTimezone: true,
		}),
		occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
		sourceSequence: integer("source_sequence").notNull(),
		sourceTimezone: text("source_timezone").notNull(),
		localWorkDate: date("local_work_date", { mode: "string" }).notNull(),
		source: text("source").notNull(),
		sourceReference: text("source_reference"),
		deviceMetadata: jsonb("device_metadata"),
		locationKey: text("location_key"),
		capturedNotes: text("captured_notes"),
		notes: text("notes"),
		payloadChecksum: text("payload_checksum"),
		voidedAt: timestamp("voided_at", { withTimezone: true }),
		voidReason: text("void_reason"),
		version: integer("version").notNull().default(1),
		createIdempotencyKey: text("create_idempotency_key").notNull(),
		createRequestFingerprint: text("create_request_fingerprint").notNull(),
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
		index("hr_attendance_event_org_id_idx").on(t.organizationId, t.id),
		index("hr_attendance_event_org_employee_date_idx").on(
			t.organizationId,
			t.employeeId,
			t.localWorkDate,
		),
		uniqueIndex("hr_attendance_event_org_create_idempotency_uidx").on(
			t.organizationId,
			t.createIdempotencyKey,
		),
		uniqueIndex("hr_attendance_event_org_source_ref_uidx")
			.on(t.organizationId, t.source, t.sourceReference)
			.where(sql`${t.sourceReference} IS NOT NULL`),
		check(
			"hr_attendance_event_type_check",
			sql`${t.eventType} IN ('clock_in', 'clock_out', 'break_start', 'break_end', 'manual_adjustment')`,
		),
		check(
			"hr_attendance_event_source_check",
			sql`${t.source} IN ('self', 'supervisor', 'import', 'system', 'manual')`,
		),
	],
);

export const hrAttendanceSession = pgTable(
	"hr_attendance_session",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		employeeId: uuid("employee_id")
			.notNull()
			.references(() => hrEmployee.id),
		employmentId: uuid("employment_id").references(() => hrEmployment.id),
		shiftAssignmentId: uuid("shift_assignment_id").references(
			() => hrShiftAssignment.id,
		),
		localWorkDate: date("local_work_date", { mode: "string" }).notNull(),
		timezone: text("timezone").notNull(),
		firstClockInAt: timestamp("first_clock_in_at", { withTimezone: true }),
		finalClockOutAt: timestamp("final_clock_out_at", { withTimezone: true }),
		breakMinutes: integer("break_minutes").notNull().default(0),
		workedMinutes: integer("worked_minutes").notNull().default(0),
		grossMinutes: integer("gross_minutes").notNull().default(0),
		resolutionStatus: text("resolution_status").notNull(),
		requiresReview: boolean("requires_review").notNull().default(false),
		provenance: jsonb("provenance"),
		version: integer("version").notNull().default(1),
		createIdempotencyKey: text("create_idempotency_key").notNull(),
		createRequestFingerprint: text("create_request_fingerprint").notNull(),
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
		index("hr_attendance_session_org_id_idx").on(t.organizationId, t.id),
		index("hr_attendance_session_org_employee_date_idx").on(
			t.organizationId,
			t.employeeId,
			t.localWorkDate,
		),
		uniqueIndex("hr_attendance_session_org_create_idempotency_uidx").on(
			t.organizationId,
			t.createIdempotencyKey,
		),
		check(
			"hr_attendance_session_status_check",
			sql`${t.resolutionStatus} IN ('incomplete', 'resolved', 'needs_review', 'voided')`,
		),
		check(
			"hr_attendance_session_minutes_check",
			sql`${t.breakMinutes} >= 0 AND ${t.workedMinutes} >= 0 AND ${t.grossMinutes} >= 0`,
		),
	],
);

export const hrAttendanceBreakWaiverDecision = pgTable(
	"hr_attendance_break_waiver_decision",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		sessionId: uuid("session_id")
			.notNull()
			.references(() => hrAttendanceSession.id),
		policyId: uuid("policy_id")
			.notNull()
			.references(() => hrTimePolicy.id),
		authorityAssignmentId: uuid("authority_assignment_id")
			.notNull()
			.references(() => hrTimeApprovalAuthorityAssignment.id),
		authority: text("authority").notNull(),
		actorUserId: text("actor_user_id").notNull(),
		reason: text("reason").notNull(),
		evidenceReference: text("evidence_reference").notNull(),
		automaticBreakMinutes: integer("automatic_break_minutes").notNull(),
		recordedBreakMinutes: integer("recorded_break_minutes").notNull(),
		sessionVersion: integer("session_version").notNull(),
		correlationId: text("correlation_id").notNull(),
		decidedAt: timestamp("decided_at", { withTimezone: true }).notNull(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => [
		index("hr_attendance_break_waiver_decision_org_id_idx").on(
			t.organizationId,
			t.id,
		),
		index("hr_attendance_break_waiver_decision_org_session_idx").on(
			t.organizationId,
			t.sessionId,
		),
		uniqueIndex(
			"hr_attendance_break_waiver_decision_org_session_version_uidx",
		).on(t.organizationId, t.sessionId, t.sessionVersion),
		check(
			"hr_attendance_break_waiver_decision_authority_check",
			sql`${t.authority} IN ('line_manager', 'department', 'hr', 'payroll')`,
		),
		check(
			"hr_attendance_break_waiver_decision_minutes_check",
			sql`${t.automaticBreakMinutes} > 0 AND ${t.recordedBreakMinutes} >= 0 AND ${t.recordedBreakMinutes} < ${t.automaticBreakMinutes}`,
		),
		check(
			"hr_attendance_break_waiver_decision_version_check",
			sql`${t.sessionVersion} > 0`,
		),
	],
);

export const hrAttendanceException = pgTable(
	"hr_attendance_exception",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		employeeId: uuid("employee_id")
			.notNull()
			.references(() => hrEmployee.id),
		sessionId: uuid("session_id").references(() => hrAttendanceSession.id),
		eventId: uuid("event_id").references(() => hrAttendanceEvent.id),
		shiftAssignmentId: uuid("shift_assignment_id").references(
			() => hrShiftAssignment.id,
		),
		exceptionType: text("exception_type").notNull(),
		severity: text("severity").notNull(),
		detectedFacts: jsonb("detected_facts"),
		reviewStatus: text("review_status").notNull(),
		resolution: text("resolution"),
		reviewerUserId: text("reviewer_user_id"),
		evidenceReference: text("evidence_reference"),
		remarks: text("remarks"),
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
		index("hr_attendance_exception_org_id_idx").on(t.organizationId, t.id),
		index("hr_attendance_exception_org_employee_idx").on(
			t.organizationId,
			t.employeeId,
		),
		index("hr_attendance_exception_org_status_idx").on(
			t.organizationId,
			t.reviewStatus,
		),
		check(
			"hr_attendance_exception_type_check",
			sql`${t.exceptionType} IN ('late_arrival', 'early_departure', 'absence', 'missing_clock_in', 'missing_clock_out', 'unplanned_attendance', 'overlapping_attendance', 'excessive_break', 'insufficient_rest', 'schedule_mismatch', 'location_mismatch', 'overtime_candidate')`,
		),
		check(
			"hr_attendance_exception_severity_check",
			sql`${t.severity} IN ('info', 'warning', 'critical')`,
		),
		check(
			"hr_attendance_exception_status_check",
			sql`${t.reviewStatus} IN ('open', 'in_review', 'excused', 'rejected', 'resolved')`,
		),
	],
);

export const hrAttendanceAdjustment = pgTable(
	"hr_attendance_adjustment",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		eventId: uuid("event_id")
			.notNull()
			.references(() => hrAttendanceEvent.id),
		sequence: integer("sequence"),
		eventVersionBefore: integer("event_version_before"),
		eventVersionAfter: integer("event_version_after"),
		previousOccurredAt: timestamp("previous_occurred_at", {
			withTimezone: true,
		}).notNull(),
		newOccurredAt: timestamp("new_occurred_at", {
			withTimezone: true,
		}).notNull(),
		previousNotes: text("previous_notes"),
		newNotes: text("new_notes"),
		adjustmentReason: text("adjustment_reason").notNull(),
		evidenceReference: text("evidence_reference"),
		actorUserId: text("actor_user_id").notNull(),
		correlationId: text("correlation_id"),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => [
		index("hr_attendance_adjustment_org_id_idx").on(t.organizationId, t.id),
		index("hr_attendance_adjustment_org_event_idx").on(
			t.organizationId,
			t.eventId,
		),
		uniqueIndex("hr_attendance_adjustment_org_event_sequence_uq")
			.on(t.organizationId, t.eventId, t.sequence)
			.where(sql`${t.sequence} IS NOT NULL`),
	],
);

export const hrTimesheet = pgTable(
	"hr_timesheet",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		employeeId: uuid("employee_id")
			.notNull()
			.references(() => hrEmployee.id),
		employmentId: uuid("employment_id").references(() => hrEmployment.id),
		periodStart: date("period_start", { mode: "string" }).notNull(),
		periodEnd: date("period_end", { mode: "string" }).notNull(),
		status: text("status").notNull(),
		totalRecordedMinutes: integer("total_recorded_minutes")
			.notNull()
			.default(0),
		totalApprovedMinutes: integer("total_approved_minutes")
			.notNull()
			.default(0),
		submittedAt: timestamp("submitted_at", { withTimezone: true }),
		submissionReference: uuid("submission_reference"),
		approvalPolicyId: uuid("approval_policy_id").references(
			() => hrTimePolicy.id,
		),
		requiredApprovalSteps: jsonb("required_approval_steps")
			.notNull()
			.default([]),
		completedApprovalSteps: integer("completed_approval_steps")
			.notNull()
			.default(0),
		approvedAt: timestamp("approved_at", { withTimezone: true }),
		approvedBy: text("approved_by"),
		returnedAt: timestamp("returned_at", { withTimezone: true }),
		rejectedAt: timestamp("rejected_at", { withTimezone: true }),
		lockedAt: timestamp("locked_at", { withTimezone: true }),
		approverNotes: text("approver_notes"),
		rejectionReason: text("rejection_reason"),
		supersedesTimesheetId: uuid("supersedes_timesheet_id").references(
			(): AnyPgColumn => hrTimesheet.id,
		),
		version: integer("version").notNull().default(1),
		createIdempotencyKey: text("create_idempotency_key").notNull(),
		createRequestFingerprint: text("create_request_fingerprint").notNull(),
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
		index("hr_timesheet_org_id_idx").on(t.organizationId, t.id),
		index("hr_timesheet_org_employee_idx").on(t.organizationId, t.employeeId),
		index("hr_timesheet_org_status_idx").on(t.organizationId, t.status),
		uniqueIndex("hr_timesheet_org_create_idempotency_uidx").on(
			t.organizationId,
			t.createIdempotencyKey,
		),
		uniqueIndex("hr_timesheet_org_submission_reference_uidx")
			.on(t.organizationId, t.submissionReference)
			.where(sql`${t.submissionReference} IS NOT NULL`),
		uniqueIndex("hr_timesheet_org_employee_period_active_uidx")
			.on(t.organizationId, t.employeeId, t.periodStart, t.periodEnd)
			.where(sql`${t.status} NOT IN ('superseded', 'rejected')`),
		check(
			"hr_timesheet_status_check",
			sql`${t.status} IN ('draft', 'submitted', 'returned', 'approved', 'rejected', 'locked', 'superseded')`,
		),
		check("hr_timesheet_period_check", sql`${t.periodEnd} >= ${t.periodStart}`),
		check(
			"hr_timesheet_minutes_check",
			sql`${t.totalRecordedMinutes} >= 0 AND ${t.totalApprovedMinutes} >= 0`,
		),
		check(
			"hr_timesheet_approval_progress_check",
			sql`
				jsonb_typeof(${t.requiredApprovalSteps}) = 'array'
				AND jsonb_array_length(${t.requiredApprovalSteps}) <= 4
				AND ${t.requiredApprovalSteps} <@ '["line_manager", "department", "hr", "payroll"]'::jsonb
				AND (
					${t.status} <> 'submitted'
					OR jsonb_array_length(${t.requiredApprovalSteps}) >= 1
				)
				AND (
					jsonb_array_length(${t.requiredApprovalSteps}) <= 1
					OR (
						jsonb_array_length(${t.requiredApprovalSteps}) = 2
						AND ${t.requiredApprovalSteps}->>0 <> ${t.requiredApprovalSteps}->>1
					)
					OR (
						jsonb_array_length(${t.requiredApprovalSteps}) = 3
						AND ${t.requiredApprovalSteps}->>0 <> ${t.requiredApprovalSteps}->>1
						AND ${t.requiredApprovalSteps}->>0 <> ${t.requiredApprovalSteps}->>2
						AND ${t.requiredApprovalSteps}->>1 <> ${t.requiredApprovalSteps}->>2
					)
					OR (
						jsonb_array_length(${t.requiredApprovalSteps}) = 4
						AND ${t.requiredApprovalSteps}->>0 <> ${t.requiredApprovalSteps}->>1
						AND ${t.requiredApprovalSteps}->>0 <> ${t.requiredApprovalSteps}->>2
						AND ${t.requiredApprovalSteps}->>0 <> ${t.requiredApprovalSteps}->>3
						AND ${t.requiredApprovalSteps}->>1 <> ${t.requiredApprovalSteps}->>2
						AND ${t.requiredApprovalSteps}->>1 <> ${t.requiredApprovalSteps}->>3
						AND ${t.requiredApprovalSteps}->>2 <> ${t.requiredApprovalSteps}->>3
					)
				)
				AND ${t.completedApprovalSteps} >= 0
				AND ${t.completedApprovalSteps} <= jsonb_array_length(${t.requiredApprovalSteps})
			`,
		),
	],
);

export const hrTimesheetApprovalDecision = pgTable(
	"hr_timesheet_approval_decision",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		timesheetId: uuid("timesheet_id")
			.notNull()
			.references(() => hrTimesheet.id),
		submissionReference: uuid("submission_reference").notNull(),
		policyId: uuid("policy_id").references(() => hrTimePolicy.id),
		authorityAssignmentId: uuid("authority_assignment_id")
			.notNull()
			.references(() => hrTimeApprovalAuthorityAssignment.id),
		stepIndex: integer("step_index").notNull(),
		authority: text("authority").notNull(),
		actorUserId: text("actor_user_id").notNull(),
		comment: text("comment"),
		versionApproved: integer("version_approved").notNull(),
		correlationId: text("correlation_id").notNull(),
		decidedAt: timestamp("decided_at", { withTimezone: true }).notNull(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => [
		index("hr_timesheet_approval_decision_org_id_idx").on(
			t.organizationId,
			t.id,
		),
		index("hr_timesheet_approval_decision_org_timesheet_idx").on(
			t.organizationId,
			t.timesheetId,
		),
		uniqueIndex("hr_timesheet_approval_decision_org_submission_step_uidx").on(
			t.organizationId,
			t.submissionReference,
			t.stepIndex,
		),
		check(
			"hr_timesheet_approval_decision_step_check",
			sql`${t.stepIndex} >= 0`,
		),
		check(
			"hr_timesheet_approval_decision_authority_check",
			sql`${t.authority} IN ('line_manager', 'department', 'hr', 'payroll')`,
		),
	],
);

export const hrTimesheetEntry = pgTable(
	"hr_timesheet_entry",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		timesheetId: uuid("timesheet_id")
			.notNull()
			.references(() => hrTimesheet.id),
		employeeId: uuid("employee_id")
			.notNull()
			.references(() => hrEmployee.id),
		workDate: date("work_date", { mode: "string" }).notNull(),
		timezone: text("timezone").notNull(),
		sourceType: text("source_type").notNull(),
		sourceReference: text("source_reference"),
		timeType: text("time_type").notNull(),
		startedAt: timestamp("started_at", { withTimezone: true }),
		endedAt: timestamp("ended_at", { withTimezone: true }),
		recordedMinutes: integer("recorded_minutes").notNull(),
		approvedMinutes: integer("approved_minutes").notNull(),
		costCenterId: text("cost_center_id"),
		projectId: text("project_id"),
		locationId: text("location_id"),
		departmentId: text("department_id"),
		approvalReference: text("approval_reference"),
		evidenceReference: text("evidence_reference"),
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
		index("hr_timesheet_entry_org_id_idx").on(t.organizationId, t.id),
		index("hr_timesheet_entry_org_timesheet_idx").on(
			t.organizationId,
			t.timesheetId,
		),
		index("hr_timesheet_entry_org_employee_date_idx").on(
			t.organizationId,
			t.employeeId,
			t.workDate,
		),
		check(
			"hr_timesheet_entry_source_type_check",
			sql`${t.sourceType} IN ('attendance', 'schedule', 'manual', 'leave', 'external')`,
		),
		check(
			"hr_timesheet_entry_time_type_check",
			sql`${t.timeType} IN ('regular', 'overtime', 'rest_day', 'public_holiday', 'night', 'call_back', 'training', 'travel', 'standby', 'unpaid')`,
		),
		check(
			"hr_timesheet_entry_minutes_check",
			sql`${t.recordedMinutes} >= 0 AND ${t.approvedMinutes} >= 0`,
		),
	],
);

export const hrOvertimeRequest = pgTable(
	"hr_overtime_request",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		employeeId: uuid("employee_id")
			.notNull()
			.references(() => hrEmployee.id),
		employmentId: uuid("employment_id").references(() => hrEmployment.id),
		overtimeType: text("overtime_type").notNull(),
		requestedStartsAt: timestamp("requested_starts_at", {
			withTimezone: true,
		}).notNull(),
		requestedEndsAt: timestamp("requested_ends_at", {
			withTimezone: true,
		}).notNull(),
		requestedMinutes: integer("requested_minutes").notNull(),
		approvedMaximumMinutes: integer("approved_maximum_minutes"),
		actualMinutes: integer("actual_minutes"),
		payrollApprovedMinutes: integer("payroll_approved_minutes"),
		reason: text("reason").notNull(),
		evidenceReference: text("evidence_reference"),
		status: text("status").notNull(),
		version: integer("version").notNull().default(1),
		createIdempotencyKey: text("create_idempotency_key").notNull(),
		createRequestFingerprint: text("create_request_fingerprint").notNull(),
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
		index("hr_overtime_request_org_id_idx").on(t.organizationId, t.id),
		index("hr_overtime_request_org_employee_idx").on(
			t.organizationId,
			t.employeeId,
		),
		index("hr_overtime_request_org_status_idx").on(t.organizationId, t.status),
		uniqueIndex("hr_overtime_request_org_create_idempotency_uidx").on(
			t.organizationId,
			t.createIdempotencyKey,
		),
		check(
			"hr_overtime_request_type_check",
			sql`${t.overtimeType} IN ('weekday_overtime', 'rest_day_overtime', 'public_holiday_overtime', 'night_overtime', 'call_back', 'emergency_overtime')`,
		),
		check(
			"hr_overtime_request_status_check",
			sql`${t.status} IN ('requested', 'approved', 'rejected', 'worked', 'verified', 'cancelled')`,
		),
		check(
			"hr_overtime_request_range_check",
			sql`${t.requestedEndsAt} > ${t.requestedStartsAt}`,
		),
		check("hr_overtime_request_minutes_check", sql`${t.requestedMinutes} > 0`),
	],
);

export const hrOvertimeApproval = pgTable(
	"hr_overtime_approval",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		overtimeRequestId: uuid("overtime_request_id")
			.notNull()
			.references(() => hrOvertimeRequest.id),
		decision: text("decision").notNull(),
		approvedMaximumMinutes: integer("approved_maximum_minutes"),
		actorUserId: text("actor_user_id").notNull(),
		authority: text("authority"),
		comment: text("comment"),
		decidedAt: timestamp("decided_at", { withTimezone: true }).notNull(),
		correlationId: text("correlation_id"),
		versionApproved: integer("version_approved").notNull(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => [
		index("hr_overtime_approval_org_id_idx").on(t.organizationId, t.id),
		index("hr_overtime_approval_org_request_idx").on(
			t.organizationId,
			t.overtimeRequestId,
		),
		check(
			"hr_overtime_approval_decision_check",
			sql`${t.decision} IN ('approved', 'rejected', 'verified', 'cancelled')`,
		),
	],
);

export const hrAttendanceImportBatch = pgTable(
	"hr_attendance_import_batch",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		batchId: text("batch_id").notNull(),
		sourceKey: text("source_key").notNull(),
		status: text("status").notNull(),
		acceptedCount: integer("accepted_count").notNull().default(0),
		skippedCount: integer("skipped_count").notNull().default(0),
		rejectedCount: integer("rejected_count").notNull().default(0),
		createIdempotencyKey: text("create_idempotency_key").notNull(),
		createRequestFingerprint: text("create_request_fingerprint").notNull(),
		resultSnapshot: jsonb("result_snapshot").notNull(),
		createdBy: text("created_by").notNull(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		completedAt: timestamp("completed_at", { withTimezone: true }),
	},
	(t) => [
		index("hr_attendance_import_batch_org_id_idx").on(t.organizationId, t.id),
		index("hr_attendance_import_batch_org_batch_idx").on(
			t.organizationId,
			t.batchId,
		),
		uniqueIndex("hr_attendance_import_batch_org_create_idempotency_uidx").on(
			t.organizationId,
			t.createIdempotencyKey,
		),
		check(
			"hr_attendance_import_batch_status_check",
			sql`${t.status} IN ('completed', 'partial', 'failed')`,
		),
	],
);

export const hrAttendanceImportError = pgTable(
	"hr_attendance_import_error",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		importBatchId: uuid("import_batch_id")
			.notNull()
			.references(() => hrAttendanceImportBatch.id),
		rowIndex: integer("row_index").notNull(),
		sourceReference: text("source_reference"),
		errorCode: text("error_code").notNull(),
		errorMessage: text("error_message").notNull(),
		payloadChecksum: text("payload_checksum"),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => [
		index("hr_attendance_import_error_org_batch_idx").on(
			t.organizationId,
			t.importBatchId,
		),
	],
);

export const hrPayrollHandoffDelivery = pgTable(
	"hr_payroll_handoff_delivery",
	{
		id: uuid("id").primaryKey(),
		organizationId: text("organization_id").notNull(),
		correlationId: text("correlation_id").notNull(),
		idempotencyKey: text("idempotency_key").notNull(),
		requestFingerprint: text("request_fingerprint").notNull(),
		payloadHash: text("payload_hash").notNull(),
		payload: jsonb("payload").notNull(),
		status: text("status").notNull(),
		version: integer("version").notNull().default(1),
		attemptCount: integer("attempt_count").notNull().default(0),
		maxAttempts: integer("max_attempts").notNull(),
		lastAttemptAt: timestamp("last_attempt_at", { withTimezone: true }),
		lastError: text("last_error"),
		deliveredAt: timestamp("delivered_at", { withTimezone: true }),
		producerReceiptId: text("producer_receipt_id"),
		feedbackAt: timestamp("feedback_at", { withTimezone: true }),
		feedbackBy: text("feedback_by"),
		feedbackReason: text("feedback_reason"),
		supersedesDeliveryId: uuid("supersedes_delivery_id").references(
			(): AnyPgColumn => hrPayrollHandoffDelivery.id,
		),
		supersededByDeliveryId: uuid("superseded_by_delivery_id").references(
			(): AnyPgColumn => hrPayrollHandoffDelivery.id,
		),
		createdBy: text("created_by").notNull(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedBy: text("updated_by").notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => [
		uniqueIndex("hr_payroll_handoff_delivery_org_idempotency_uidx").on(
			t.organizationId,
			t.idempotencyKey,
		),
		uniqueIndex("hr_payroll_handoff_delivery_org_supersedes_uidx")
			.on(t.organizationId, t.supersedesDeliveryId)
			.where(sql`${t.supersedesDeliveryId} IS NOT NULL`),
		index("hr_payroll_handoff_delivery_org_status_created_idx").on(
			t.organizationId,
			t.status,
			t.createdAt,
			t.id,
		),
		check(
			"hr_payroll_handoff_delivery_status_check",
			sql`${t.status} IN ('pending', 'delivered', 'acknowledged', 'rejected', 'correction_required', 'failed')`,
		),
		check("hr_payroll_handoff_delivery_version_check", sql`${t.version} > 0`),
		check(
			"hr_payroll_handoff_delivery_attempt_check",
			sql`${t.attemptCount} >= 0 AND ${t.maxAttempts} > 0 AND ${t.attemptCount} <= ${t.maxAttempts}`,
		),
		check(
			"hr_payroll_handoff_delivery_hash_check",
			sql`length(${t.payloadHash}) = 64 AND length(${t.requestFingerprint}) = 64`,
		),
		check(
			"hr_payroll_handoff_delivery_lineage_check",
			sql`${t.supersedesDeliveryId} IS NULL OR ${t.supersedesDeliveryId} <> ${t.id}`,
		),
	],
);

export const hrBulkImportCheckpoint = pgTable(
	"hr_bulk_import_checkpoint",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		batchId: text("batch_id").notNull(),
		entityType: text("entity_type").notNull(),
		idempotencyKey: text("idempotency_key").notNull(),
		requestFingerprint: text("request_fingerprint").notNull(),
		status: text("status").notNull(),
		nextRowIndex: integer("next_row_index").notNull(),
		version: integer("version").notNull(),
		rows: jsonb("rows").notNull(),
		retryableFailure: jsonb("retryable_failure"),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => [
		uniqueIndex("hr_bulk_import_checkpoint_org_idempotency_uidx").on(
			t.organizationId,
			t.idempotencyKey,
		),
		uniqueIndex("hr_bulk_import_checkpoint_org_batch_uidx").on(
			t.organizationId,
			t.batchId,
		),
		unique("hr_bulk_import_checkpoint_org_id_uidx").on(t.organizationId, t.id),
		check(
			"hr_bulk_import_checkpoint_entity_check",
			sql`${t.entityType} IN ('employee', 'assignment', 'leave_entitlement', 'attendance', 'compensation', 'learning_assignment')`,
		),
		check(
			"hr_bulk_import_checkpoint_status_check",
			sql`${t.status} IN ('checkpointed', 'completed', 'completed_with_rejections', 'retryable_failed')`,
		),
		check(
			"hr_bulk_import_checkpoint_version_check",
			sql`${t.version} > 0 AND ${t.nextRowIndex} >= 0`,
		),
		check(
			"hr_bulk_import_checkpoint_hash_check",
			sql`length(${t.requestFingerprint}) = 64`,
		),
	],
);

export const hrBulkImportAudit = pgTable(
	"hr_bulk_import_audit",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		checkpointId: uuid("checkpoint_id").notNull(),
		sequence: integer("sequence").notNull(),
		event: text("event").notNull(),
		rowIndex: integer("row_index"),
		checkpointVersion: integer("checkpoint_version").notNull(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => [
		foreignKey({
			columns: [t.organizationId, t.checkpointId],
			foreignColumns: [
				hrBulkImportCheckpoint.organizationId,
				hrBulkImportCheckpoint.id,
			],
			name: "hr_bulk_import_audit_checkpoint_fk",
		}),
		uniqueIndex("hr_bulk_import_audit_org_checkpoint_sequence_uidx").on(
			t.organizationId,
			t.checkpointId,
			t.sequence,
		),
		index("hr_bulk_import_audit_org_created_idx").on(
			t.organizationId,
			t.createdAt,
			t.id,
		),
		check(
			"hr_bulk_import_audit_event_check",
			sql`${t.event} IN ('BATCH_STARTED', 'ROW_ACCEPTED', 'ROW_REJECTED', 'BATCH_CHECKPOINTED', 'BATCH_COMPLETED', 'BATCH_RETRYABLE_FAILED')`,
		),
		check(
			"hr_bulk_import_audit_sequence_check",
			sql`${t.sequence} > 0 AND ${t.checkpointVersion} > 0 AND (${t.rowIndex} IS NULL OR ${t.rowIndex} >= 0)`,
		),
	],
);

export const hrBulkImportErrorArtifact = pgTable(
	"hr_bulk_import_error_artifact",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		checkpointId: uuid("checkpoint_id").notNull(),
		checkpointVersion: integer("checkpoint_version").notNull(),
		contentType: text("content_type").notNull().default("text/csv"),
		content: text("content").notNull(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => [
		foreignKey({
			columns: [t.organizationId, t.checkpointId],
			foreignColumns: [
				hrBulkImportCheckpoint.organizationId,
				hrBulkImportCheckpoint.id,
			],
			name: "hr_bulk_import_error_artifact_checkpoint_fk",
		}),
		uniqueIndex("hr_bulk_import_error_artifact_org_checkpoint_version_uidx").on(
			t.organizationId,
			t.checkpointId,
			t.checkpointVersion,
		),
		check(
			"hr_bulk_import_error_artifact_version_check",
			sql`${t.checkpointVersion} > 0`,
		),
		check(
			"hr_bulk_import_error_artifact_content_check",
			sql`${t.contentType} = 'text/csv' AND length(${t.content}) > 0`,
		),
	],
);

export const hrBulkImportJob = pgTable(
	"hr_bulk_import_job",
	{
		id: uuid("id").primaryKey(),
		organizationId: text("organization_id").notNull(),
		batchId: text("batch_id").notNull(),
		entityType: text("entity_type").notNull(),
		actorUserId: text("actor_user_id").notNull(),
		correlationId: text("correlation_id").notNull(),
		requiredPermission: text("required_permission").notNull(),
		idempotencyKey: text("idempotency_key").notNull(),
		requestFingerprint: text("request_fingerprint").notNull(),
		status: text("status").notNull(),
		version: integer("version").notNull().default(1),
		rowCount: integer("row_count").notNull(),
		maxRowsPerRun: integer("max_rows_per_run").notNull(),
		checkpointVersion: integer("checkpoint_version"),
		lastErrorCode: text("last_error_code"),
		lastErrorMessage: text("last_error_message"),
		payloadPurgeAt: timestamp("payload_purge_at", { withTimezone: true }),
		payloadPurgedAt: timestamp("payload_purged_at", { withTimezone: true }),
		completedAt: timestamp("completed_at", { withTimezone: true }),
		createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
	},
	(t) => [
		uniqueIndex("hr_bulk_import_job_org_idempotency_uidx").on(
			t.organizationId,
			t.idempotencyKey,
		),
		unique("hr_bulk_import_job_org_id_uidx").on(t.organizationId, t.id),
		index("hr_bulk_import_job_org_status_updated_idx").on(
			t.organizationId,
			t.status,
			t.updatedAt,
			t.id,
		),
		check(
			"hr_bulk_import_job_entity_check",
			sql`${t.entityType} IN ('employee', 'assignment', 'leave_entitlement', 'attendance', 'compensation', 'learning_assignment')`,
		),
		check(
			"hr_bulk_import_job_status_check",
			sql`${t.status} IN ('queued', 'running', 'completed', 'completed_with_rejections', 'failed')`,
		),
		check(
			"hr_bulk_import_job_bounds_check",
			sql`${t.version} > 0 AND ${t.rowCount} BETWEEN 1 AND 500 AND ${t.maxRowsPerRun} BETWEEN 1 AND 500`,
		),
		check(
			"hr_bulk_import_job_hash_check",
			sql`length(${t.requestFingerprint}) = 64`,
		),
	],
);

export const hrBulkImportJobRow = pgTable(
	"hr_bulk_import_job_row",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		jobId: uuid("job_id").notNull(),
		rowIndex: integer("row_index").notNull(),
		sourceReference: text("source_reference").notNull(),
		payload: jsonb("payload"),
		payloadHash: text("payload_hash").notNull(),
		createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
	},
	(t) => [
		foreignKey({
			columns: [t.organizationId, t.jobId],
			foreignColumns: [hrBulkImportJob.organizationId, hrBulkImportJob.id],
			name: "hr_bulk_import_job_row_job_fk",
		}).onDelete("cascade"),
		uniqueIndex("hr_bulk_import_job_row_org_job_index_uidx").on(
			t.organizationId,
			t.jobId,
			t.rowIndex,
		),
		uniqueIndex("hr_bulk_import_job_row_org_job_source_uidx").on(
			t.organizationId,
			t.jobId,
			t.sourceReference,
		),
		check(
			"hr_bulk_import_job_row_bounds_check",
			sql`${t.rowIndex} >= 0 AND length(${t.payloadHash}) = 64 AND char_length(btrim(${t.sourceReference})) > 0`,
		),
	],
);

export const hrBulkExportJob = pgTable(
	"hr_bulk_export_job",
	{
		id: uuid("id").primaryKey(),
		organizationId: text("organization_id").notNull(),
		actorUserId: text("actor_user_id").notNull(),
		correlationId: text("correlation_id").notNull(),
		requiredPermission: text("required_permission").notNull(),
		exportType: text("export_type").notNull(),
		requestedFields: jsonb("requested_fields").notNull(),
		dateFrom: date("date_from"),
		dateTo: date("date_to"),
		effectiveOn: date("effective_on"),
		idempotencyKey: text("idempotency_key").notNull(),
		requestFingerprint: text("request_fingerprint").notNull(),
		status: text("status").notNull(),
		version: integer("version").notNull().default(1),
		nextPage: integer("next_page").notNull().default(1),
		rowCount: integer("row_count").notNull().default(0),
		privacyEvidenceId: text("privacy_evidence_id"),
		artifactSha256: text("artifact_sha256"),
		artifactByteCount: integer("artifact_byte_count"),
		artifactExpiresAt: timestamp("artifact_expires_at", { withTimezone: true }),
		artifactPurgedAt: timestamp("artifact_purged_at", { withTimezone: true }),
		lastErrorCode: text("last_error_code"),
		lastErrorMessage: text("last_error_message"),
		completedAt: timestamp("completed_at", { withTimezone: true }),
		createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
	},
	(t) => [
		uniqueIndex("hr_bulk_export_job_org_idempotency_uidx").on(
			t.organizationId,
			t.idempotencyKey,
		),
		unique("hr_bulk_export_job_org_id_uidx").on(t.organizationId, t.id),
		index("hr_bulk_export_job_org_status_updated_idx").on(
			t.organizationId,
			t.status,
			t.updatedAt,
			t.id,
		),
		check(
			"hr_bulk_export_job_type_check",
			sql`${t.exportType} IN ('employee', 'assignment', 'leave_entitlement', 'attendance', 'compensation', 'learning_assignment')`,
		),
		check(
			"hr_bulk_export_job_status_check",
			sql`${t.status} IN ('queued', 'running', 'completed', 'completed_with_rejections', 'failed')`,
		),
		check(
			"hr_bulk_export_job_bounds_check",
			sql`${t.version} > 0 AND ${t.nextPage} > 0 AND ${t.rowCount} BETWEEN 0 AND 5000`,
		),
		check(
			"hr_bulk_export_job_hash_check",
			sql`length(${t.requestFingerprint}) = 64 AND (${t.artifactSha256} IS NULL OR length(${t.artifactSha256}) = 64)`,
		),
	],
);

export const hrBulkExportArtifactChunk = pgTable(
	"hr_bulk_export_artifact_chunk",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		jobId: uuid("job_id").notNull(),
		chunkIndex: integer("chunk_index").notNull(),
		content: text("content").notNull(),
		contentSha256: text("content_sha256").notNull(),
		byteCount: integer("byte_count").notNull(),
		rowCount: integer("row_count").notNull(),
		createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
	},
	(t) => [
		foreignKey({
			columns: [t.organizationId, t.jobId],
			foreignColumns: [hrBulkExportJob.organizationId, hrBulkExportJob.id],
			name: "hr_bulk_export_artifact_chunk_job_fk",
		}).onDelete("cascade"),
		uniqueIndex("hr_bulk_export_artifact_chunk_org_job_index_uidx").on(
			t.organizationId,
			t.jobId,
			t.chunkIndex,
		),
		check(
			"hr_bulk_export_artifact_chunk_content_check",
			sql`${t.chunkIndex} >= 0 AND ${t.byteCount} > 0 AND ${t.rowCount} >= 0 AND length(${t.contentSha256}) = 64 AND length(${t.content}) > 0`,
		),
	],
);

export const hrReliabilityWorkItem = pgTable(
	"hr_reliability_work_item",
	{
		id: uuid("id").primaryKey(),
		organizationId: text("organization_id").notNull(),
		connector: text("connector").notNull(),
		operation: text("operation").notNull(),
		targetType: text("target_type").notNull(),
		targetId: text("target_id").notNull(),
		correlationId: text("correlation_id").notNull(),
		idempotencyKey: text("idempotency_key").notNull(),
		requestFingerprint: text("request_fingerprint").notNull(),
		status: text("status").notNull(),
		version: integer("version").notNull(),
		attemptCount: integer("attempt_count").notNull(),
		nextAttemptAt: timestamp("next_attempt_at", { withTimezone: true }),
		lastAttemptAt: timestamp("last_attempt_at", { withTimezone: true }),
		lastErrorCode: text("last_error_code"),
		lastErrorMessage: text("last_error_message"),
		receiptId: text("receipt_id"),
		acknowledgementDeadlineAt: timestamp("acknowledgement_deadline_at", {
			withTimezone: true,
		}),
		leaseOwner: text("lease_owner"),
		leaseExpiresAt: timestamp("lease_expires_at", { withTimezone: true }),
		createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
	},
	(t) => [
		uniqueIndex("hr_reliability_work_item_org_connector_idempotency_uidx").on(
			t.organizationId,
			t.connector,
			t.idempotencyKey,
		),
		unique("hr_reliability_work_item_org_id_uidx").on(t.organizationId, t.id),
		index("hr_reliability_work_item_org_status_due_idx").on(
			t.organizationId,
			t.status,
			t.nextAttemptAt,
			t.id,
		),
		index("hr_reliability_work_item_status_due_global_idx").on(
			t.status,
			t.nextAttemptAt,
			t.acknowledgementDeadlineAt,
			t.organizationId,
			t.id,
		),
		check(
			"hr_reliability_work_item_status_check",
			sql`${t.status} IN ('pending', 'processing', 'awaiting_acknowledgement', 'succeeded', 'dead_lettered')`,
		),
		check(
			"hr_reliability_work_item_lease_check",
			sql`(${t.status} = 'processing' AND ${t.leaseOwner} IS NOT NULL AND ${t.leaseExpiresAt} IS NOT NULL) OR (${t.status} <> 'processing' AND ${t.leaseOwner} IS NULL AND ${t.leaseExpiresAt} IS NULL)`,
		),
		check(
			"hr_reliability_work_item_ack_check",
			sql`(${t.status} = 'awaiting_acknowledgement' AND ${t.receiptId} IS NOT NULL AND ${t.acknowledgementDeadlineAt} IS NOT NULL) OR (${t.status} <> 'awaiting_acknowledgement' AND ${t.acknowledgementDeadlineAt} IS NULL)`,
		),
		check(
			"hr_reliability_work_item_version_check",
			sql`${t.version} > 0 AND ${t.attemptCount} >= 0`,
		),
	],
);

export const hrReliabilityDeadLetter = pgTable(
	"hr_reliability_dead_letter",
	{
		id: uuid("id").primaryKey(),
		organizationId: text("organization_id").notNull(),
		workItemId: uuid("work_item_id").notNull(),
		connector: text("connector").notNull(),
		operation: text("operation").notNull(),
		targetType: text("target_type").notNull(),
		targetId: text("target_id").notNull(),
		correlationId: text("correlation_id").notNull(),
		idempotencyKey: text("idempotency_key").notNull(),
		requestFingerprint: text("request_fingerprint").notNull(),
		attemptCount: integer("attempt_count").notNull(),
		errorCode: text("error_code").notNull(),
		errorMessage: text("error_message").notNull(),
		failedAt: timestamp("failed_at", { withTimezone: true }).notNull(),
		replayedByWorkItemId: uuid("replayed_by_work_item_id"),
	},
	(t) => [
		foreignKey({
			columns: [t.organizationId, t.workItemId],
			foreignColumns: [
				hrReliabilityWorkItem.organizationId,
				hrReliabilityWorkItem.id,
			],
			name: "hr_reliability_dead_letter_work_item_fk",
		}),
		foreignKey({
			columns: [t.organizationId, t.replayedByWorkItemId],
			foreignColumns: [
				hrReliabilityWorkItem.organizationId,
				hrReliabilityWorkItem.id,
			],
			name: "hr_reliability_dead_letter_replay_fk",
		}),
		uniqueIndex("hr_reliability_dead_letter_org_work_item_uidx").on(
			t.organizationId,
			t.workItemId,
		),
		index("hr_reliability_dead_letter_org_failed_idx").on(
			t.organizationId,
			t.failedAt,
			t.id,
		),
		check(
			"hr_reliability_dead_letter_attempt_check",
			sql`${t.attemptCount} > 0`,
		),
		check(
			"hr_reliability_dead_letter_lineage_check",
			sql`${t.replayedByWorkItemId} IS NULL OR ${t.replayedByWorkItemId} <> ${t.workItemId}`,
		),
	],
);

export const hrConnectorCursor = pgTable(
	"hr_connector_cursor",
	{
		organizationId: text("organization_id").notNull(),
		connector: text("connector").notNull(),
		stream: text("stream").notNull(),
		cursor: text("cursor"),
		version: integer("version").notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
	},
	(t) => [
		primaryKey({
			columns: [t.organizationId, t.connector, t.stream],
			name: "hr_connector_cursor_pk",
		}),
		check("hr_connector_cursor_version_check", sql`${t.version} > 0`),
	],
);

/**
 * D0 statutory-fact capture — HR-owned inputs the payroll statutory math needs.
 * Effective-dated with supersession; one open active profile per employee.
 */
export const hrStatutoryProfile = pgTable(
	"hr_statutory_profile",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		employeeId: uuid("employee_id").notNull(),
		jurisdictionCode: text("jurisdiction_code").notNull(),
		taxResidencyStatus: text("tax_residency_status").notNull(),
		nationalityCountryCode: text("nationality_country_code").notNull(),
		expatriate: boolean("expatriate").notNull().default(false),
		minimumWageZone: text("minimum_wage_zone"),
		taxFileNumber: text("tax_file_number"),
		employeeProvidentFundNumber: text("employee_provident_fund_number"),
		socialSecurityNumber: text("social_security_number"),
		socialInsuranceBookNumber: text("social_insurance_book_number"),
		dependantCount: integer("dependant_count").notNull().default(0),
		reliefDeclarationVersion: text("relief_declaration_version").notNull(),
		reliefDeclarations: jsonb("relief_declarations").notNull(),
		effectiveFrom: date("effective_from").notNull(),
		effectiveTo: date("effective_to"),
		status: text("status").notNull().default("active"),
		supersedesStatutoryProfileId: uuid("supersedes_statutory_profile_id"),
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
		index("hr_statutory_profile_org_id_idx").on(t.organizationId, t.id),
		index("hr_statutory_profile_org_employee_idx").on(
			t.organizationId,
			t.employeeId,
			t.effectiveFrom,
		),
		unique("hr_statutory_profile_org_id_uidx").on(t.organizationId, t.id),
		uniqueIndex("hr_statutory_profile_org_create_idempotency_uidx").on(
			t.organizationId,
			t.createIdempotencyKey,
		),
		uniqueIndex("hr_statutory_profile_org_employee_open_uidx")
			.on(t.organizationId, t.employeeId)
			.where(sql`${t.effectiveTo} IS NULL AND ${t.status} = 'active'`),
		foreignKey({
			columns: [t.organizationId, t.employeeId],
			foreignColumns: [hrEmployee.organizationId, hrEmployee.id],
			name: "hr_statutory_profile_org_employee_fk",
		}),
		check(
			"hr_statutory_profile_jurisdiction_check",
			sql`${t.jurisdictionCode} IN ('MY', 'VN')`,
		),
		check(
			"hr_statutory_profile_residency_check",
			sql`${t.taxResidencyStatus} IN ('resident', 'non_resident')`,
		),
		check(
			"hr_statutory_profile_status_check",
			sql`${t.status} IN ('active', 'superseded')`,
		),
		check(
			"hr_statutory_profile_minimum_wage_zone_check",
			sql`${t.minimumWageZone} IS NULL OR (${t.jurisdictionCode} = 'VN' AND ${t.minimumWageZone} IN ('I', 'II', 'III', 'IV'))`,
		),
		check(
			"hr_statutory_profile_dependant_count_check",
			sql`${t.dependantCount} >= 0`,
		),
		check(
			"hr_statutory_profile_date_range_check",
			sql`${t.effectiveTo} IS NULL OR ${t.effectiveTo} >= ${t.effectiveFrom}`,
		),
		check(
			"hr_statutory_profile_supersession_check",
			sql`(${t.status} = 'superseded' AND ${t.effectiveTo} IS NOT NULL) OR ${t.status} = 'active'`,
		),
	],
);

/** Prior-employer year-to-date figures for a mid-year joiner's hire year. */
export const hrPriorEmployerYtd = pgTable(
	"hr_prior_employer_ytd",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		employeeId: uuid("employee_id").notNull(),
		jurisdictionCode: text("jurisdiction_code").notNull(),
		taxYear: integer("tax_year").notNull(),
		priorEmployerName: text("prior_employer_name"),
		grossAmount: text("gross_amount").notNull(),
		taxWithheldAmount: text("tax_withheld_amount").notNull(),
		statutoryContributionAmount: text(
			"statutory_contribution_amount",
		).notNull(),
		currencyCode: text("currency_code").notNull(),
		recordedOn: date("recorded_on").notNull(),
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
		index("hr_prior_employer_ytd_org_id_idx").on(t.organizationId, t.id),
		index("hr_prior_employer_ytd_org_employee_idx").on(
			t.organizationId,
			t.employeeId,
			t.taxYear,
		),
		unique("hr_prior_employer_ytd_org_id_uidx").on(t.organizationId, t.id),
		uniqueIndex("hr_prior_employer_ytd_org_create_idempotency_uidx").on(
			t.organizationId,
			t.createIdempotencyKey,
		),
		uniqueIndex("hr_prior_employer_ytd_org_employee_year_uidx").on(
			t.organizationId,
			t.employeeId,
			t.taxYear,
			t.jurisdictionCode,
		),
		foreignKey({
			columns: [t.organizationId, t.employeeId],
			foreignColumns: [hrEmployee.organizationId, hrEmployee.id],
			name: "hr_prior_employer_ytd_org_employee_fk",
		}),
		check(
			"hr_prior_employer_ytd_jurisdiction_check",
			sql`${t.jurisdictionCode} IN ('MY', 'VN')`,
		),
		check(
			"hr_prior_employer_ytd_tax_year_check",
			sql`${t.taxYear} BETWEEN 1900 AND 9999`,
		),
		check(
			"hr_prior_employer_ytd_currency_check",
			sql`char_length(${t.currencyCode}) = 3`,
		),
	],
);
