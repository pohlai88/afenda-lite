/**
 * Phase 2 module validators — stop gates from packages_refactor_v2.3 / Living monorepo.
 */

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { parse as parseYaml } from "yaml";

/** @typedef {import("@afenda/db/module-manifest").AfendaModuleManifest} AfendaModuleManifest */

const DEEP_AFENDA_SRC_IMPORT_PATTERN = /from\s+["']@afenda\/[^"']+\/src\//;
const BARE_METRICS_IMPORT_PATTERN = /from\s+["']@afenda\/metrics["']/;
const DEEP_METRICS_IMPORT_PATTERN = /from\s+["']@afenda\/metrics\/src\//;
const DEEP_OPENAPI_IMPORT_PATTERN = /from\s+["']@afenda\/openapi\/src\//;
const LEGACY_OPENAPI_DOCUMENT_IMPORT_PATTERN =
	/from\s+["']@afenda\/openapi\/document["']/;
const DB_NAMED_IMPORT_PATTERN =
	/import\s*\{([^}]+)\}\s*from\s*["']@afenda\/db["']/g;
const IMPORT_ALIAS_SPLIT_PATTERN = /\s+as\s+/;
const PACKAGE_PATH_SEPARATOR_PATTERN = /[/\\]/;
const TS_SOURCE_FILENAME_PATTERN = /\.(ts|tsx|mts|cts)$/;

export const LIVING_ERP_MANIFEST_PACKAGES = [
	{
		id: "master-data",
		packageName: "@afenda/master-data",
		dir: "packages/erp/master-data",
		manifestExport: "masterDataModuleManifest",
	},
	{
		id: "sales",
		packageName: "@afenda/sales",
		dir: "packages/erp/sales",
		manifestExport: "salesModuleManifest",
	},
	{
		id: "purchasing",
		packageName: "@afenda/purchasing",
		dir: "packages/erp/purchasing",
		manifestExport: "purchasingModuleManifest",
	},
	{
		id: "inventory",
		packageName: "@afenda/inventory",
		dir: "packages/erp/inventory",
		manifestExport: "inventoryModuleManifest",
	},
	{
		id: "receiving",
		packageName: "@afenda/receiving",
		dir: "packages/erp/receiving",
		manifestExport: "receivingModuleManifest",
	},
	{
		id: "fulfillment",
		packageName: "@afenda/fulfillment",
		dir: "packages/erp/fulfillment",
		manifestExport: "fulfillmentModuleManifest",
	},
	{
		id: "receivables",
		packageName: "@afenda/receivables",
		dir: "packages/erp/receivables",
		manifestExport: "receivablesModuleManifest",
	},
	{
		id: "payables",
		packageName: "@afenda/payables",
		dir: "packages/erp/payables",
		manifestExport: "payablesModuleManifest",
	},
	{
		id: "payments",
		packageName: "@afenda/payments",
		dir: "packages/erp/payments",
		manifestExport: "paymentsModuleManifest",
	},
	{
		id: "accounting",
		packageName: "@afenda/accounting",
		dir: "packages/erp/accounting",
		manifestExport: "accountingModuleManifest",
	},
	{
		id: "human-resources",
		packageName: "@afenda/human-resources",
		dir: "packages/erp/human-resources",
		manifestExport: "humanResourcesModuleManifest",
	},
	{
		id: "payroll",
		packageName: "@afenda/payroll",
		dir: "packages/erp/payroll",
		manifestExport: "payrollModuleManifest",
	},
	{
		id: "corporate-administration",
		packageName: "@afenda/corporate-administration",
		dir: "packages/erp/corporate-administration",
		manifestExport: "corporateAdministrationModuleManifest",
	},
];

export const FORBIDDEN_PHASE_PACKAGE_DIRS = [
	"module-catalog",
	"authorization",
	"jobs",
	"workflow",
	"transaction-core",
];

/** Dev / tooling workspace deps that dual-control does not govern. */
export const WORKSPACE_EDGE_IGNORE_TO = new Set(["@afenda/config"]);

/** Schema table symbols allowed for platform outbox/audit adapters. */
export const PLATFORM_SCHEMA_SYMBOLS = new Set([
	"platformAuditLog",
	"platformDomainEvent",
	"platformNotification",
	"platformSearchDocument",
	"platformPermission",
	"platformRole",
	"platformRoleAssignment",
	"platformRolePermission",
	"platformRbacAudit",
]);

/** Global reference tables — master-data may read; never claimed as foreign ERP write. */
export const REF_SCHEMA_SYMBOLS = new Set([
	"refCountry",
	"refCurrency",
	"refLanguage",
	"refTimeZone",
	"refUom",
	"refUomDimension",
]);

export const SCHEMA_SYMBOL_TO_TABLE = {
	caLegalCompany: "ca_legal_company",
	caCompanyStatusHistory: "ca_company_status_history",
	caCompanyJurisdictionProfile: "ca_company_jurisdiction_profile",
	caCompanyName: "ca_company_name",
	caCompanyLegalFormHistory: "ca_company_legal_form_history",
	caCompanyIdentifier: "ca_company_identifier",
	caCompanyFinancialYear: "ca_company_financial_year",
	caCompanyActivity: "ca_company_activity",
	caLegalEstablishment: "ca_legal_establishment",
	caEstablishmentStatusHistory: "ca_establishment_status_history",
	caRegisteredAddress: "ca_registered_address",
	caPremise: "ca_premise",
	caGovernanceBody: "ca_governance_body",
	caGovernanceMembership: "ca_governance_membership",
	caStatutoryOffice: "ca_statutory_office",
	caOfficerAppointment: "ca_officer_appointment",
	caOfficerQualification: "ca_officer_qualification",
	caOfficerDeclaration: "ca_officer_declaration",
	caOfficerDisqualification: "ca_officer_disqualification",
	caConflictDisclosure: "ca_conflict_disclosure",
	caGovernanceMeeting: "ca_governance_meeting",
	caMeetingNotice: "ca_meeting_notice",
	caMeetingParticipant: "ca_meeting_participant",
	caMeetingQuorumResult: "ca_meeting_quorum_result",
	caMeetingVote: "ca_meeting_vote",
	caResolution: "ca_resolution",
	caResolutionAction: "ca_resolution_action",
	caMutationReceipt: "ca_mutation_receipt",
	mdParty: "md_party",
	mdItemGroup: "md_item_group",
	mdItem: "md_item",
	mdWarehouse: "md_warehouse",
	mdPaymentTerm: "md_payment_term",
	mdTaxRegistration: "md_tax_registration",
	mdPartyRole: "md_party_role",
	mdPartyAddress: "md_party_address",
	mdPartyContact: "md_party_contact",
	mdPartyExternalId: "md_party_external_id",
	mdPartyRelationship: "md_party_relationship",
	mdItemUom: "md_item_uom",
	mdItemBarcode: "md_item_barcode",
	mdItemExternalId: "md_item_external_id",
	mdItemAlias: "md_item_alias",
	mdWarehouseExternalId: "md_warehouse_external_id",
	mdItemTemplate: "md_item_template",
	mdItemTemplateAttribute: "md_item_template_attribute",
	mdItemTemplateAttributeOption: "md_item_template_attribute_option",
	mdItemVariant: "md_item_variant",
	mdItemVariantAttributeValue: "md_item_variant_attribute_value",
	mdItemVariantAttributeValueOption: "md_item_variant_attribute_value_option",
	mdChangeRequest: "md_change_request",
	mdImportBatch: "md_import_batch",
	mdOrganizationDimension: "md_organization_dimension",
	salesOrder: "sales_order",
	salesOrderLine: "sales_order_line",
	salesOrderSchedule: "sales_order_schedule",
	salesOrderHold: "sales_order_hold",
	salesPriceBook: "sales_price_book",
	salesPriceBookEntry: "sales_price_book_entry",
	salesQuotation: "sales_quotation",
	salesQuotationLine: "sales_quotation_line",
	salesReturnAuthorization: "sales_return_authorization",
	salesReturnAuthorizationLine: "sales_return_authorization_line",
	purchaseOrder: "purchase_order",
	purchaseOrderLine: "purchase_order_line",
	stockMovement: "stock_movement",
	stockMovementLine: "stock_movement_line",
	stockBalance: "stock_balance",
	stockLedgerEntry: "stock_ledger_entry",
	stockReservation: "stock_reservation",
	goodsReceipt: "goods_receipt",
	goodsReceiptLine: "goods_receipt_line",
	receivingDiscrepancy: "receiving_discrepancy",
	delivery: "delivery",
	deliveryLine: "delivery_line",
	deliveryPick: "delivery_pick",
	deliveryPack: "delivery_pack",
	proofOfDelivery: "proof_of_delivery",
	salesInvoice: "sales_invoice",
	salesInvoiceLine: "sales_invoice_line",
	salesCreditNote: "sales_credit_note",
	customerAllocation: "customer_allocation",
	customerBalanceProjection: "customer_balance_projection",
	supplierInvoice: "supplier_invoice",
	supplierInvoiceLine: "supplier_invoice_line",
	supplierCreditNote: "supplier_credit_note",
	supplierCreditNoteLine: "supplier_credit_note_line",
	supplierAllocation: "supplier_allocation",
	supplierBalanceProjection: "supplier_balance_projection",
	threeWayMatchResult: "three_way_match_result",
	payment: "payment",
	paymentAccount: "payment_account",
	paymentAllocation: "payment_allocation",
	paymentReversal: "payment_reversal",
	journal: "journal",
	journalLine: "journal_line",
	ledgerPosting: "ledger_posting",
	accountingPeriod: "accounting_period",
	chartOfAccount: "chart_of_account",
	ledgerAccount: "ledger_account",
	accountRoleMapping: "account_role_mapping",
	postingProfile: "posting_profile",
	postingProfileLine: "posting_profile_line",
	sourcePostingLink: "source_posting_link",
	financialPostingException: "financial_posting_exception",
	hrPerson: "hr_person",
	hrPersonIdentityVersion: "hr_person_identity_version",
	hrPersonContact: "hr_person_contact",
	hrPersonIdentifier: "hr_person_identifier",
	hrEmployee: "hr_employee",
	hrWorker: "hr_worker",
	hrWorkerClassificationVersion: "hr_worker_classification_version",
	hrEmployment: "hr_employment",
	hrEmploymentStatusHistory: "hr_employment_status_history",
	hrEmploymentContract: "hr_employment_contract",
	hrWorkAssignment: "hr_work_assignment",
	hrDepartment: "hr_department",
	hrDepartmentStructureVersion: "hr_department_structure_version",
	hrJob: "hr_job",
	hrJobDefinitionVersion: "hr_job_definition_version",
	hrPosition: "hr_position",
	hrPositionDefinitionVersion: "hr_position_definition_version",
	hrReportingLine: "hr_reporting_line",
	hrEmploymentMovement: "hr_employment_movement",
	hrJobRequisition: "hr_job_requisition",
	hrCandidate: "hr_candidate",
	hrCandidateApplication: "hr_candidate_application",
	hrCandidateApplicationStatusHistory:
		"hr_candidate_application_status_history",
	hrInterview: "hr_interview",
	hrInterviewEvaluation: "hr_interview_evaluation",
	hrEmploymentOffer: "hr_employment_offer",
	hrHireAttempt: "hr_hire_attempt",
	hrOnboardingCase: "hr_onboarding_case",
	hrOnboardingTask: "hr_onboarding_task",
	hrOnboardingOrientation: "hr_onboarding_orientation",
	hrOnboardingEquipmentHandoff: "hr_onboarding_equipment_handoff",
	hrOnboardingAccessHandoff: "hr_onboarding_access_handoff",
	hrProbationReview: "hr_probation_review",
	hrProbationAssessment: "hr_probation_assessment",
	hrEmploymentConfirmation: "hr_employment_confirmation",
	hrTermination: "hr_termination",
	hrOffboardingCase: "hr_offboarding_case",
	hrOffboardingTask: "hr_offboarding_task",
	hrExitInterview: "hr_exit_interview",
	hrClearance: "hr_clearance",
	hrOffboardingAccessRevocation: "hr_offboarding_access_revocation",
	hrOffboardingPayrollHandoff: "hr_offboarding_payroll_handoff",
	hrLearningCourse: "hr_learning_course",
	hrLearningProgram: "hr_learning_program",
	hrLearningSession: "hr_learning_session",
	hrLearningAssignment: "hr_learning_assignment",
	hrLearningAttendance: "hr_learning_attendance",
	hrLearningAssessment: "hr_learning_assessment",
	hrLearningCompletion: "hr_learning_completion",
	hrEmployeeCertification: "hr_employee_certification",
	hrDevelopmentPlan: "hr_development_plan",
	hrCompensationGrade: "hr_compensation_grade",
	hrCompensationGradeProgressionRule: "hr_compensation_grade_progression_rule",
	hrCompensationProposal: "hr_compensation_proposal",
	hrSalaryBand: "hr_salary_band",
	hrEmployeeCompensation: "hr_employee_compensation",
	hrAllowanceEntitlement: "hr_allowance_entitlement",
	hrBonusEligibility: "hr_bonus_eligibility",
	hrBenefitPlan: "hr_benefit_plan",
	hrBenefitEligibility: "hr_benefit_eligibility",
	hrBenefitEnrollment: "hr_benefit_enrollment",
	hrBenefitEnrollmentDependent: "hr_benefit_enrollment_dependent",
	hrCompensationReviewCycle: "hr_compensation_review_cycle",
	hrCompensationReview: "hr_compensation_review",
	hrLeavePolicy: "hr_leave_policy",
	hrLeavePolicyEligibility: "hr_leave_policy_eligibility",
	hrLeaveEntitlement: "hr_leave_entitlement",
	hrLeaveAdjustment: "hr_leave_adjustment",
	hrLeaveRequest: "hr_leave_request",
	hrLeaveRequestSegment: "hr_leave_request_segment",
	hrLeaveApprovalDecision: "hr_leave_approval_decision",
	hrPerformanceCycle: "hr_performance_cycle",
	hrPerformanceCycleReviewPeriod: "hr_performance_cycle_review_period",
	hrPerformanceCycleEligibility: "hr_performance_cycle_eligibility",
	hrPerformanceCycleParticipant: "hr_performance_cycle_participant",
	hrPerformanceGoal: "hr_performance_goal",
	hrPerformanceGoalProgress: "hr_performance_goal_progress",
	hrPerformanceReview: "hr_performance_review",
	hrPerformanceReviewParticipant: "hr_performance_review_participant",
	hrPerformanceAssessment: "hr_performance_assessment",
	hrPerformanceImprovementPlan: "hr_performance_improvement_plan",
	hrPerformanceImprovementCheckpoint: "hr_performance_improvement_checkpoint",
	hrHeadcountPlan: "hr_headcount_plan",
	hrHeadcountPlanLine: "hr_headcount_plan_line",
	hrHeadcountReservation: "hr_headcount_reservation",
	hrCompetency: "hr_competency",
	hrJobCompetency: "hr_job_competency",
	hrCompetencyAssessment: "hr_competency_assessment",
	hrTalentProfile: "hr_talent_profile",
	hrTalentProfileAssessment: "hr_talent_profile_assessment",
	hrTalentProfileMobility: "hr_talent_profile_mobility",
	hrTalentCriticalRoleReadiness: "hr_talent_critical_role_readiness",
	hrTalentPool: "hr_talent_pool",
	hrTalentPoolMember: "hr_talent_pool_member",
	hrCareerPlan: "hr_career_plan",
	hrCareerPlanAction: "hr_career_plan_action",
	hrSuccessionPlan: "hr_succession_plan",
	hrSuccessionCandidate: "hr_succession_candidate",
	hrEmployeeCase: "hr_employee_case",
	hrEmployeeCaseEvent: "hr_employee_case_event",
	hrEmployeeCaseAction: "hr_employee_case_action",
	hrEmployeeCaseAppeal: "hr_employee_case_appeal",
	hrDocumentRequirement: "hr_document_requirement",
	hrEmployeeDocument: "hr_employee_document",
	hrWorkEligibility: "hr_work_eligibility",
	hrPolicyAcknowledgement: "hr_policy_acknowledgement",
	hrWorkCalendar: "hr_work_calendar",
	hrWorkCalendarHoliday: "hr_work_calendar_holiday",
	hrEmploymentCalendarAssignment: "hr_employment_calendar_assignment",
	hrWorkCalendarScopeAssignment: "hr_work_calendar_scope_assignment",
	hrShift: "hr_shift",
	hrShiftBreak: "hr_shift_break",
	hrShiftAssignment: "hr_shift_assignment",
	hrShiftAssignmentSegment: "hr_shift_assignment_segment",
	hrAttendanceEvent: "hr_attendance_event",
	hrAttendanceSession: "hr_attendance_session",
	hrAttendanceBreakWaiverDecision: "hr_attendance_break_waiver_decision",
	hrAttendanceException: "hr_attendance_exception",
	hrAttendanceAdjustment: "hr_attendance_adjustment",
	hrAttendanceImportBatch: "hr_attendance_import_batch",
	hrAttendanceImportError: "hr_attendance_import_error",
	hrTimePolicy: "hr_time_policy",
	hrTimePolicyAssignment: "hr_time_policy_assignment",
	hrTimeApprovalAuthorityAssignment: "hr_time_approval_authority_assignment",
	hrTimesheet: "hr_timesheet",
	hrTimesheetApprovalDecision: "hr_timesheet_approval_decision",
	hrTimesheetEntry: "hr_timesheet_entry",
	hrOvertimeRequest: "hr_overtime_request",
	hrOvertimeApproval: "hr_overtime_approval",
	hrPayrollHandoffDelivery: "hr_payroll_handoff_delivery",
	hrBulkImportCheckpoint: "hr_bulk_import_checkpoint",
	hrBulkImportAudit: "hr_bulk_import_audit",
	hrBulkImportErrorArtifact: "hr_bulk_import_error_artifact",
	hrReliabilityWorkItem: "hr_reliability_work_item",
	hrReliabilityDeadLetter: "hr_reliability_dead_letter",
	hrConnectorCursor: "hr_connector_cursor",
	payrollCalendar: "payroll_calendar",
	payrollPayGroup: "payroll_pay_group",
	payrollPeriod: "payroll_period",
	payrollEmployeeAssignment: "payroll_employee_assignment",
	payrollEarningRule: "payroll_earning_rule",
	payrollDeductionRule: "payroll_deduction_rule",
	payrollStatutoryRule: "payroll_statutory_rule",
	payrollRecurringEarning: "payroll_recurring_earning",
	payrollRecurringDeduction: "payroll_recurring_deduction",
	payrollVariableInput: "payroll_variable_input",
	payrollRun: "payroll_run",
	payrollRunEmployee: "payroll_run_employee",
	payrollResultLine: "payroll_result_line",
	payrollStatutoryResult: "payroll_statutory_result",
	payrollException: "payroll_exception",
	payrollPayslip: "payroll_payslip",
	payrollAdjustment: "payroll_adjustment",
	payrollReconciliation: "payroll_reconciliation",
	payrollRuleFinalizedUsage: "payroll_rule_finalized_usage",
	platformAuditLog: "platform_audit_log",
	platformDomainEvent: "platform_domain_event",
	platformSearchDocument: "platform_search_document",
	platformNotification: "platform_notification",
	platformRbacAudit: "platform_rbac_audit",
	refCountry: "ref_country",
	refCurrency: "ref_currency",
	refLanguage: "ref_language",
	refTimeZone: "ref_time_zone",
	refUom: "ref_uom",
	refUomDimension: "ref_uom_dimension",
};

/**
 * @param {AfendaModuleManifest[]} manifests
 * @returns {string[]}
 */
export function validateModuleIdentity(manifests) {
	/** @type {string[]} */
	const errors = [];
	const ids = new Map();
	const packages = new Map();
	for (const m of manifests) {
		if (ids.has(m.id)) {
			errors.push(`duplicate module id: ${m.id}`);
		}
		ids.set(m.id, m.packageName);
		if (packages.has(m.packageName)) {
			errors.push(`duplicate packageName: ${m.packageName}`);
		}
		packages.set(m.packageName, m.id);
		if (m.band !== "R1-F") {
			errors.push(`module ${m.id} band must be R1-F (got ${m.band})`);
		}
		const expectedPkg = `@afenda/${m.id}`;
		if (m.packageName !== expectedPkg) {
			errors.push(
				`module ${m.id} packageName mismatch: ${m.packageName} !== ${expectedPkg}`,
			);
		}
	}
	return errors;
}

/**
 * @param {AfendaModuleManifest[]} manifests
 */
export function validatePersistenceOwnership(manifests) {
	/** @type {string[]} */
	const errors = [];
	const owners = new Map();
	for (const m of manifests) {
		if (m.persistence.schemaOwner !== "@afenda/db") {
			errors.push(
				`module ${m.id} schemaOwner must be @afenda/db (got ${m.persistence.schemaOwner})`,
			);
		}
		for (const table of m.persistence.mutationTables) {
			if (owners.has(table)) {
				errors.push(
					`duplicate mutation-table authority: ${table} (${owners.get(table)} and ${m.id})`,
				);
			} else {
				owners.set(table, m.id);
			}
		}
	}
	return errors;
}

/**
 * @param {AfendaModuleManifest[]} manifests
 */
export function validateCommandsQueries(manifests) {
	/** @type {string[]} */
	const errors = [];
	const commands = new Map();
	const queries = new Map();
	for (const m of manifests) {
		errors.push(
			...validateOwnedOperations({
				ids: m.owns.commands,
				owners: commands,
				moduleId: m.id,
				authorization: m.authorization.commands,
				kind: "command",
			}),
			...validateOwnedOperations({
				ids: m.owns.queries,
				owners: queries,
				moduleId: m.id,
				authorization: m.authorization.queries,
				kind: "query",
			}),
			...validateAuthorizationMappings({
				authorization: m.authorization.commands,
				ownedIds: m.owns.commands,
				permissionCodes: m.permissions.codes,
				kind: "command",
			}),
			...validateAuthorizationMappings({
				authorization: m.authorization.queries,
				ownedIds: m.owns.queries,
				permissionCodes: m.permissions.codes,
				kind: "query",
			}),
		);
	}
	return errors;
}

/**
 * @param {{
 *   ids: readonly string[],
 *   owners: Map<string, string>,
 *   moduleId: string,
 *   authorization: Record<string, string>,
 *   kind: "command" | "query",
 * }} input
 */
function validateOwnedOperations(input) {
	const errors = [];
	for (const id of input.ids) {
		const existingOwner = input.owners.get(id);
		if (existingOwner) {
			errors.push(
				`duplicate ${input.kind} id: ${id} (${existingOwner} and ${input.moduleId})`,
			);
		} else {
			input.owners.set(id, input.moduleId);
		}
		if (!(id in input.authorization)) {
			errors.push(
				`public ERP operation without authorization mapping: ${input.kind} ${id}`,
			);
		}
	}
	return errors;
}

/**
 * @param {{
 *   authorization: Record<string, string>,
 *   ownedIds: readonly string[],
 *   permissionCodes: readonly string[],
 *   kind: "command" | "query",
 * }} input
 */
function validateAuthorizationMappings(input) {
	const errors = [];
	for (const [operation, permission] of Object.entries(input.authorization)) {
		if (!input.ownedIds.includes(operation)) {
			errors.push(
				`authorization ${input.kind} map references undeclared ${input.kind}: ${operation}`,
			);
		}
		if (!input.permissionCodes.includes(permission)) {
			errors.push(
				`authorization maps to undeclared permission: ${permission} (${operation})`,
			);
		}
	}
	return errors;
}

/**
 * @param {AfendaModuleManifest[]} manifests
 */
export function validateEvents(manifests) {
	/** @type {string[]} */
	const errors = [];
	const events = new Map();
	for (const m of manifests) {
		for (const id of m.events.emits) {
			if (events.has(id)) {
				errors.push(
					`duplicate event id: ${id} (${events.get(id)} and ${m.id})`,
				);
			} else {
				events.set(id, m.id);
			}
		}
	}
	return errors;
}

/**
 * @param {AfendaModuleManifest[]} manifests
 * @param {ReadonlySet<string>} platformPermissionCodes
 */
export function validatePermissions(manifests, platformPermissionCodes) {
	/** @type {string[]} */
	const errors = [];
	const codes = new Map();
	for (const m of manifests) {
		for (const code of m.permissions.codes) {
			if (codes.has(code)) {
				errors.push(
					`duplicate permission code: ${code} (${codes.get(code)} and ${m.id})`,
				);
			} else {
				codes.set(code, m.id);
			}
			if (!platformPermissionCodes.has(code)) {
				errors.push(
					`permission code not in platform catalog: ${code} (module ${m.id})`,
				);
			}
		}
	}
	return errors;
}

/**
 * @param {AfendaModuleManifest[]} manifests
 * @param {{ id: string }[]} roadmapModules
 */
export function validateModuleReferences(manifests, roadmapModules) {
	/** @type {string[]} */
	const errors = [];
	const known = new Set([
		...manifests.map((m) => m.id),
		...roadmapModules.map((m) => m.id),
	]);
	for (const m of manifests) {
		for (const dep of m.moduleDependencies.required) {
			if (!known.has(dep)) {
				errors.push(`unresolved moduleId: ${dep} (required by ${m.id})`);
			}
		}
		for (const row of m.optionalIntegratesWith) {
			if (!known.has(row.moduleId)) {
				errors.push(
					`unresolved moduleId: ${row.moduleId} (optionalIntegratesWith of ${m.id})`,
				);
			}
		}
	}
	return errors;
}

/**
 * @param {AfendaModuleManifest[]} manifests
 */
export function validateDependencyDag(manifests) {
	/** @type {string[]} */
	const errors = [];
	const byId = new Map(manifests.map((m) => [m.id, m]));
	/** @type {Map<string, number>} */
	const visiting = new Map();

	/**
	 * @param {string} id
	 * @param {string[]} stack
	 */
	function visit(id, stack) {
		const state = visiting.get(id) ?? 0;
		if (state === 1) {
			errors.push(
				`DAG cycle involving moduleId: ${[...stack, id].join(" → ")}`,
			);
			return;
		}
		if (state === 2) {
			return;
		}
		visiting.set(id, 1);
		const mod = byId.get(id);
		if (mod) {
			for (const dep of mod.moduleDependencies.required) {
				if (byId.has(dep)) {
					visit(dep, [...stack, id]);
				}
			}
		}
		visiting.set(id, 2);
	}

	for (const m of manifests) {
		visit(m.id, []);
	}
	return errors;
}

/**
 * @param {string} root
 * @param {string} edgeRegisterPath
 */
export function validateWorkspaceEdges(root, edgeRegisterPath) {
	const raw = readFileSync(edgeRegisterPath, "utf8");
	const doc = parseYaml(raw);
	const edges = Array.isArray(doc?.edges) ? doc.edges : [];
	/** @type {string[]} */
	const approved = [];
	for (const edge of edges) {
		if (edge?.status === "approved" && edge.from && edge.to) {
			approved.push(`${edge.from}→${edge.to}`);
		}
	}

	const packageDirs = listPackageDirs(root);
	/** @type {Map<string, Set<string>>} */
	const realized = new Map();

	for (const dir of packageDirs) {
		const pkgPath = join(root, "packages", dir, "package.json");
		const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
		const { name } = pkg;
		if (typeof name !== "string" || !name.startsWith("@afenda/")) {
			continue;
		}
		const deps = {
			...(pkg.dependencies ?? {}),
			...(pkg.optionalDependencies ?? {}),
		};
		const targets = new Set();
		for (const dep of Object.keys(deps)) {
			if (!dep.startsWith("@afenda/")) {
				continue;
			}
			if (WORKSPACE_EDGE_IGNORE_TO.has(dep)) {
				continue;
			}
			targets.add(dep);
		}
		realized.set(name, targets);
	}

	return reconcileWorkspaceEdges({
		approved,
		realized,
		erpPackages: LIVING_ERP_MANIFEST_PACKAGES.map((p) => p.packageName),
		governedOnly: true,
	});
}

/**
 * Living ERP packages must ship package authorization ports and web
 * composition-root adapters (Phase 2 operating law §4).
 *
 * @param {string} root
 */
export function validateErpAuthorizationPorts(root, manifests = []) {
	/** @type {string[]} */
	const errors = [];
	for (const meta of LIVING_ERP_MANIFEST_PACKAGES) {
		const manifest = manifests.find((candidate) => candidate.id === meta.id);
		if (
			manifest &&
			manifest.owns.commands.length === 0 &&
			manifest.owns.queries.length === 0
		) {
			continue;
		}
		const packageAuth = join(meta.dir, "src", "authorization.ts");
		if (!existsSync(join(root, packageAuth))) {
			errors.push(`missing ERP authorization.ts: ${packageAuth}`);
		}
		const webPort = join(
			"apps",
			"web",
			"lib",
			"erp",
			`${meta.id}-authorization-port.ts`,
		);
		if (!existsSync(join(root, webPort))) {
			errors.push(`missing ERP authorization-port: ${webPort}`);
		}
	}
	return errors;
}

/**
 * Scaffolded modules may reserve a table prefix before any DDL exists. Once
 * mutation tables are introduced, every owned table must honor that prefix.
 *
 * @param {AfendaModuleManifest[]} manifests
 * @param {string} ownershipPath
 */
export function validateSchemaPrefixReservations(manifests, ownershipPath) {
	/** @type {string[]} */
	const errors = [];
	const doc = parseYaml(readFileSync(ownershipPath, "utf8"));
	const reservations = Array.isArray(doc?.prefixReservations)
		? doc.prefixReservations
		: [];
	const byPrefix = new Map();

	for (const row of reservations) {
		if (
			typeof row?.prefix !== "string" ||
			typeof row?.writeOwner !== "string" ||
			typeof row?.moduleId !== "string"
		) {
			errors.push("invalid schema prefix reservation row");
			continue;
		}
		if (byPrefix.has(row.prefix)) {
			errors.push(`duplicate schema prefix reservation: ${row.prefix}`);
			continue;
		}
		byPrefix.set(row.prefix, row);
	}

	for (const [prefix, reservation] of byPrefix) {
		const manifest = manifests.find(
			(candidate) => candidate.id === reservation.moduleId,
		);
		if (!manifest) {
			errors.push(
				`schema prefix reservation references unknown module: ${prefix} (${reservation.moduleId})`,
			);
			continue;
		}
		if (reservation.writeOwner !== manifest.packageName) {
			errors.push(
				`schema prefix reservation mismatch: ${prefix} (module ${manifest.id}, owner ${manifest.packageName})`,
			);
		}
		for (const table of manifest.persistence.mutationTables) {
			if (!table.startsWith(prefix)) {
				errors.push(
					`mutation table outside reserved prefix ${prefix}: ${table} (module ${manifest.id})`,
				);
			}
		}
	}

	return errors;
}

/**
 * @param {string} root
 */
export function validateDeepImports(root) {
	/** @type {string[]} */
	const errors = [];
	const scanRoots = [join(root, "packages"), join(root, "apps", "web")];
	for (const scanRoot of scanRoots) {
		if (!existsSync(scanRoot)) {
			continue;
		}
		for (const file of walkTsFiles(scanRoot)) {
			const text = readFileSync(file, "utf8");
			if (DEEP_AFENDA_SRC_IMPORT_PATTERN.test(text)) {
				errors.push(
					`deep @afenda/*/src/* import: ${relative(root, file).replaceAll("\\", "/")}`,
				);
			}
		}
	}
	return errors;
}

/**
 * Validate @afenda/metrics runtime isolation — prevent bare/deep imports.
 * @param {string} root
 */
export function validateMetricsImports(root) {
	/** @type {string[]} */
	const errors = [];
	const scanRoots = [join(root, "packages"), join(root, "apps", "web")];
	for (const scanRoot of scanRoots) {
		if (!existsSync(scanRoot)) {
			continue;
		}
		for (const file of walkTsFiles(scanRoot)) {
			const text = readFileSync(file, "utf8");
			if (BARE_METRICS_IMPORT_PATTERN.test(text)) {
				errors.push(
					`bare @afenda/metrics import (use /core, /node, or /testing): ${relative(root, file).replaceAll("\\", "/")}`,
				);
			}
			if (DEEP_METRICS_IMPORT_PATTERN.test(text)) {
				errors.push(
					`deep @afenda/metrics/src/* import: ${relative(root, file).replaceAll("\\", "/")}`,
				);
			}
		}
	}
	return errors;
}

export function validateOpenApiImports(root) {
	/** @type {string[]} */
	const errors = [];
	const scanRoots = [
		join(root, "packages"),
		join(root, "apps", "web"),
		join(root, "scripts"),
	];
	for (const scanRoot of scanRoots) {
		if (!existsSync(scanRoot)) {
			continue;
		}
		for (const file of walkTsFiles(scanRoot)) {
			const text = readFileSync(file, "utf8");
			if (DEEP_OPENAPI_IMPORT_PATTERN.test(text)) {
				errors.push(
					`deep @afenda/openapi/src/* import: ${relative(root, file).replaceAll("\\", "/")}`,
				);
			}
			if (LEGACY_OPENAPI_DOCUMENT_IMPORT_PATTERN.test(text)) {
				errors.push(
					`legacy @afenda/openapi/document import (use /node): ${relative(root, file).replaceAll("\\", "/")}`,
				);
			}
		}
	}
	return errors;
}

/**
 * @param {string} root
 * @param {AfendaModuleManifest[]} manifests
 */
export function validateForeignSchemaImports(root, manifests) {
	const tableOwner = buildTableOwnerMap(manifests);
	const errors = [];
	for (const meta of LIVING_ERP_MANIFEST_PACKAGES) {
		const manifest = manifests.find((m) => m.id === meta.id);
		if (!manifest) {
			continue;
		}
		errors.push(
			...validateForeignSchemaPackage(root, meta, manifest, tableOwner),
		);
	}
	return errors;
}

function buildTableOwnerMap(manifests) {
	const tableOwner = new Map();
	for (const manifest of manifests) {
		for (const table of manifest.persistence.mutationTables) {
			tableOwner.set(table, manifest.id);
		}
	}
	return tableOwner;
}

function validateForeignSchemaPackage(root, meta, manifest, tableOwner) {
	const errors = [];
	const owned = new Set(manifest.persistence.mutationTables);
	const srcDir = join(root, meta.dir, "src");
	for (const file of walkTsFiles(srcDir)) {
		if (file.endsWith("module.manifest.ts")) {
			continue;
		}
		const source = readFileSync(file, "utf8");
		for (const name of extractNamedDbImports(source)) {
			const error = classifyForeignSchemaImport({
				root,
				file,
				name,
				moduleId: meta.id,
				owned,
				tableOwner,
			});
			if (error) {
				errors.push(error);
			}
		}
	}
	return errors;
}

function classifyForeignSchemaImport(input) {
	if (!Object.hasOwn(SCHEMA_SYMBOL_TO_TABLE, input.name)) {
		return null;
	}
	if (PLATFORM_SCHEMA_SYMBOLS.has(input.name)) {
		return null;
	}
	if (REF_SCHEMA_SYMBOLS.has(input.name) && input.moduleId === "master-data") {
		return null;
	}
	const table = SCHEMA_SYMBOL_TO_TABLE[input.name];
	if (input.owned.has(table)) {
		return null;
	}
	const owner = input.tableOwner.get(table);
	const sourcePath = relative(input.root, input.file).replaceAll("\\", "/");
	if (owner && owner !== input.moduleId) {
		return `foreign DB schema write-surface import: ${sourcePath} imports ${input.name} (owned by ${owner})`;
	}
	if (!REF_SCHEMA_SYMBOLS.has(input.name)) {
		return `foreign DB schema write-surface import: ${sourcePath} imports ${input.name} (not in ${input.moduleId} mutationTables)`;
	}
	return null;
}

/**
 * @param {AfendaModuleManifest[]} manifests
 * @param {ReadonlySet<string>} knownTables
 */
export function validateMutationTablesExist(manifests, knownTables) {
	/** @type {string[]} */
	const errors = [];
	for (const m of manifests) {
		for (const table of m.persistence.mutationTables) {
			if (!knownTables.has(table)) {
				errors.push(
					`mutation table missing from @afenda/db DDL: ${table} (module ${m.id})`,
				);
			}
		}
	}
	return errors;
}

/**
 * @param {AfendaModuleManifest[]} manifests
 * @param {ReadonlySet<string>} knownEvents
 */
export function validateEventContracts(manifests, knownEvents) {
	/** @type {string[]} */
	const errors = [];
	for (const m of manifests) {
		for (const id of m.events.emits) {
			if (!knownEvents.has(id)) {
				errors.push(
					`emitted event not in @afenda/events contracts: ${id} (module ${m.id})`,
				);
			}
		}
		for (const id of m.events.consumes) {
			if (!knownEvents.has(id)) {
				errors.push(
					`consumed event not in @afenda/events contracts: ${id} (module ${m.id})`,
				);
			}
		}
	}
	return errors;
}

/**
 * Pure dual-control edge reconcile — used by Living validate + negative fixtures.
 * @param {{
 *   approved: Iterable<string>,
 *   realized: Map<string, Set<string>>,
 *   erpPackages: Iterable<string>,
 *   governedOnly?: boolean,
 * }} input
 */
export function reconcileWorkspaceEdges(input) {
	const approved = new Set(input.approved);
	const erpPackages = new Set(input.erpPackages);
	const governedFrom =
		input.governedOnly === false
			? new Set([...input.realized.keys()])
			: new Set([...approved].map((key) => key.split("→")[0]).filter(Boolean));

	return [
		...findUndeclaredWorkspaceEdges(input.realized, governedFrom, approved),
		...findMissingApprovedEdges(input.realized, approved),
		...findUnapprovedPeerErpEdges(input.realized, erpPackages, approved),
	];
}

function findUndeclaredWorkspaceEdges(realized, governedFrom, approved) {
	const errors = [];
	for (const [from, targets] of realized) {
		if (!governedFrom.has(from)) {
			continue;
		}
		for (const to of targets) {
			const key = `${from}→${to}`;
			if (!approved.has(key)) {
				errors.push(`undeclared workspace dependency: ${key}`);
			}
		}
	}
	return errors;
}

function findMissingApprovedEdges(realized, approved) {
	const errors = [];
	for (const key of approved) {
		const [from, to] = key.split("→");
		if (!realized.get(from)?.has(to)) {
			errors.push(`approved edge missing from package.json: ${key}`);
		}
	}
	return errors;
}

function findUnapprovedPeerErpEdges(realized, erpPackages, approved) {
	const errors = [];
	for (const [from, targets] of realized) {
		if (!erpPackages.has(from)) {
			continue;
		}
		for (const to of targets) {
			if (!erpPackages.has(to) || to === from) {
				continue;
			}
			const key = `${from}→${to}`;
			if (!approved.has(key)) {
				errors.push(`peer ERP import without approved edge: ${key}`);
			}
		}
	}
	return errors;
}

/**
 * Catalog packages (physical path under packages/) — must match packages/README.md.
 * Category folders are not packages.
 */
export const CATALOG_EXPECTED_PACKAGES = [
	{ name: "@afenda/ui-system", path: "surfaces/ui-system" },
	{ name: "@afenda/ui-blocks", path: "surfaces/ui-blocks" },
	{ name: "@afenda/emails", path: "surfaces/emails" },
	{ name: "@afenda/config", path: "foundation/config" },
	{ name: "@afenda/env", path: "foundation/env" },
	{ name: "@afenda/errors", path: "foundation/errors" },
	{ name: "@afenda/testing", path: "foundation/testing" },
	{ name: "@afenda/logger", path: "runtime/logger" },
	{ name: "@afenda/http", path: "runtime/http" },
	{ name: "@afenda/security", path: "runtime/security" },
	{ name: "@afenda/metrics", path: "runtime/metrics" },
	{ name: "@afenda/openapi", path: "runtime/openapi" },
	{ name: "@afenda/rate-limit", path: "runtime/rate-limit" },
	{ name: "@afenda/cache", path: "runtime/cache" },
	{ name: "@afenda/db", path: "data-plane/db" },
	{ name: "@afenda/audit", path: "data-plane/audit" },
	{ name: "@afenda/events", path: "data-plane/events" },
	{ name: "@afenda/search", path: "data-plane/search" },
	{ name: "@afenda/notifications", path: "data-plane/notifications" },
	{ name: "@afenda/auth", path: "control-plane/auth" },
	{ name: "@afenda/admin", path: "control-plane/admin" },
	{ name: "@afenda/master-data", path: "erp/master-data" },
	{ name: "@afenda/sales", path: "erp/sales" },
	{ name: "@afenda/purchasing", path: "erp/purchasing" },
	{ name: "@afenda/inventory", path: "erp/inventory" },
	{ name: "@afenda/receiving", path: "erp/receiving" },
	{ name: "@afenda/fulfillment", path: "erp/fulfillment" },
	{ name: "@afenda/receivables", path: "erp/receivables" },
	{ name: "@afenda/payables", path: "erp/payables" },
	{ name: "@afenda/payments", path: "erp/payments" },
	{ name: "@afenda/accounting", path: "erp/accounting" },
	{ name: "@afenda/human-resources", path: "erp/human-resources" },
	{ name: "@afenda/payroll", path: "erp/payroll" },
	{
		name: "@afenda/corporate-administration",
		path: "erp/corporate-administration",
	},
	{ name: "@afenda/ai-the-machine", path: "intelligence/ai-the-machine" },
];

/**
 * Catalog-to-disk parity: every catalog row exists with matching package name,
 * and every on-disk package is listed in the catalog.
 *
 * @param {string} root
 */
export function validateCatalogDiskParity(root) {
	/** @type {string[]} */
	const errors = [];
	const onDisk = listPackageDirs(root);
	const onDiskSet = new Set(onDisk);
	const expectedPaths = new Set(CATALOG_EXPECTED_PACKAGES.map((p) => p.path));

	for (const row of CATALOG_EXPECTED_PACKAGES) {
		if (!onDiskSet.has(row.path)) {
			errors.push(
				`catalog package missing on disk: ${row.name} (expected packages/${row.path})`,
			);
			continue;
		}
		const pkgPath = join(root, "packages", row.path, "package.json");
		const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
		if (pkg.name !== row.name) {
			errors.push(
				`catalog package name mismatch at packages/${row.path}: expected ${row.name}, got ${pkg.name}`,
			);
		}
	}

	for (const dir of onDisk) {
		if (!expectedPaths.has(dir)) {
			errors.push(`on-disk package not in catalog: packages/${dir}`);
		}
	}

	return errors;
}

/**
 * Sole-mutator boundary: SCHEMA-OWNERSHIP-MANIFEST ↔ ERP manifests + static write scan.
 *
 * @param {string} root
 * @param {AfendaModuleManifest[]} manifests
 * @param {string} ownershipPath
 */
export function validateSoleMutatorBoundary(root, manifests, ownershipPath) {
	if (!existsSync(ownershipPath)) {
		return [`missing schema ownership manifest: ${ownershipPath}`];
	}

	const doc = parseYaml(readFileSync(ownershipPath, "utf8"));
	const rows = Array.isArray(doc?.tables) ? doc.tables : [];
	const ownership = parseSchemaOwnershipRows(rows);
	const manifestOwnership = validateManifestSchemaOwnership(
		manifests,
		ownership.writeOwnerByTable,
	);
	const errors = [
		...ownership.errors,
		...manifestOwnership.errors,
		...validateRegisteredErpOwnership(
			ownership.writeOwnerByTable,
			ownership.kindByTable,
			manifestOwnership.erpOwned,
		),
	];
	const tableToSymbol = new Map(
		Object.entries(SCHEMA_SYMBOL_TO_TABLE).map(([symbol, table]) => [
			table,
			symbol,
		]),
	);
	const inventory = loadPackageInventory(root);
	const webSources = loadWebSourceInventory(root);

	for (const [table, owner] of ownership.writeOwnerByTable) {
		const symbol = tableToSymbol.get(table);
		if (!symbol) {
			continue;
		}
		errors.push(
			...scanPackageWriteSurfaces(inventory, owner, symbol),
			...scanWebWriteSurfaces(webSources, owner, symbol),
		);
	}

	return errors;
}

/**
 * @param {unknown[]} rows
 */
function parseSchemaOwnershipRows(rows) {
	/** @type {string[]} */
	const errors = [];
	/** @type {Map<string, string>} */
	const writeOwnerByTable = new Map();
	/** @type {Map<string, string>} */
	const kindByTable = new Map();

	for (const row of rows) {
		if (!(row?.table && row.writeOwner)) {
			errors.push("schema ownership row missing table or writeOwner");
			continue;
		}
		if (writeOwnerByTable.has(row.table)) {
			errors.push(`duplicate schema writeOwner for table: ${row.table}`);
			continue;
		}
		writeOwnerByTable.set(row.table, row.writeOwner);
		kindByTable.set(row.table, row.kind ?? "unknown");
	}

	return { errors, kindByTable, writeOwnerByTable };
}

/**
 * @param {AfendaModuleManifest[]} manifests
 * @param {Map<string, string>} writeOwnerByTable
 */
function validateManifestSchemaOwnership(manifests, writeOwnerByTable) {
	/** @type {string[]} */
	const errors = [];
	/** @type {Map<string, Set<string>>} */
	const erpOwned = new Map();

	for (const manifest of manifests) {
		const mutationTables = new Set(manifest.persistence.mutationTables);
		erpOwned.set(manifest.packageName, mutationTables);
		for (const table of mutationTables) {
			const owner = writeOwnerByTable.get(table);
			if (!owner) {
				errors.push(
					`ERP mutation table missing from SCHEMA-OWNERSHIP-MANIFEST: ${table} (${manifest.packageName})`,
				);
				continue;
			}
			if (owner !== manifest.packageName) {
				errors.push(
					`schema writeOwner mismatch for ${table}: manifest ${manifest.packageName} vs register ${owner}`,
				);
			}
		}
	}

	return { erpOwned, errors };
}

/**
 * @param {Map<string, string>} writeOwnerByTable
 * @param {Map<string, string>} kindByTable
 * @param {Map<string, Set<string>>} erpOwned
 */
function validateRegisteredErpOwnership(
	writeOwnerByTable,
	kindByTable,
	erpOwned,
) {
	/** @type {string[]} */
	const errors = [];
	for (const [table, owner] of writeOwnerByTable) {
		if (kindByTable.get(table) !== "erp") {
			continue;
		}
		if (!erpOwned.get(owner)?.has(table)) {
			errors.push(
				`SCHEMA-OWNERSHIP-MANIFEST erp table not in owner mutationTables: ${table} (${owner})`,
			);
		}
	}
	return errors;
}

/**
 * @param {string} root
 */
function loadPackageInventory(root) {
	const packageDirs = listPackageDirs(root);
	/** @type {Map<string, string>} */
	const nameToDir = new Map();
	/** @type {{ dir: string, path: string, source: string, namedDbImports: string[] }[]} */
	const sources = [];
	for (const dir of packageDirs) {
		const pkg = JSON.parse(
			readFileSync(join(root, "packages", dir, "package.json"), "utf8"),
		);
		if (typeof pkg.name === "string") {
			nameToDir.set(pkg.name, dir);
		}
		for (const file of walkTsFiles(join(root, "packages", dir, "src"))) {
			if (isTestFile(file)) {
				continue;
			}
			const source = readFileSync(file, "utf8");
			sources.push({
				dir,
				path: relative(root, file).replaceAll("\\", "/"),
				source,
				namedDbImports: extractNamedDbImports(source),
			});
		}
	}
	return { nameToDir, sources };
}

/**
 * @param {string} root
 */
function loadWebSourceInventory(root) {
	/** @type {{ path: string, source: string }[]} */
	const sources = [];
	const scanRoots = [
		join(root, "apps", "web", "features"),
		join(root, "apps", "web", "app", "actions"),
		join(root, "apps", "web", "lib"),
		join(root, "apps", "web", "modules"),
	];

	for (const scanRoot of scanRoots) {
		if (!existsSync(scanRoot)) {
			continue;
		}
		for (const file of walkTsFiles(scanRoot)) {
			if (isTestFile(file)) {
				continue;
			}
			sources.push({
				path: relative(root, file).replaceAll("\\", "/"),
				source: readFileSync(file, "utf8"),
			});
		}
	}

	return sources;
}

/**
 * @param {{ nameToDir: Map<string, string>, sources: { dir: string, path: string, source: string, namedDbImports: string[] }[] }} inventory
 * @param {string} owner
 * @param {string} symbol
 */
function scanPackageWriteSurfaces(inventory, owner, symbol) {
	/** @type {string[]} */
	const errors = [];
	const ownerDir = inventory.nameToDir.get(owner);
	const mutation = createMutationPattern(symbol);

	for (const entry of inventory.sources) {
		if (entry.dir === "data-plane/db" || (ownerDir && entry.dir === ownerDir)) {
			continue;
		}
		if (entry.namedDbImports.includes(symbol)) {
			errors.push(
				`sole-mutator write-surface import: ${entry.path} imports ${symbol} (writeOwner ${owner})`,
			);
		}
		if (mutation.test(entry.source)) {
			errors.push(
				`sole-mutator foreign write: ${entry.path} mutates ${symbol} (writeOwner ${owner})`,
			);
		}
	}

	return errors;
}

/**
 * @param {{ path: string, source: string }[]} sources
 * @param {string} owner
 * @param {string} symbol
 */
function scanWebWriteSurfaces(sources, owner, symbol) {
	/** @type {string[]} */
	const errors = [];
	const mutation = createMutationPattern(symbol);

	for (const entry of sources) {
		if (mutation.test(entry.source)) {
			errors.push(
				`sole-mutator foreign write: ${entry.path} mutates ${symbol} (writeOwner ${owner})`,
			);
		}
	}

	return errors;
}

/**
 * @param {string} symbol
 */
function createMutationPattern(symbol) {
	return new RegExp(`\\.(?:insert|update|delete)\\(\\s*${symbol}\\b`);
}

/**
 * @param {string} file
 */
function isTestFile(file) {
	return file.includes(`${sep}__tests__${sep}`) || file.includes("/__tests__/");
}

/**
 * @param {string} root
 * @param {{ id: string }[]} roadmapModules
 */
export function validateCandidatePackagesAbsent(root, roadmapModules) {
	/** @type {Set<string>} */
	const errors = new Set();
	const livingIds = new Set(LIVING_ERP_MANIFEST_PACKAGES.map((p) => p.id));
	const packageDirs = listPackageDirs(root);
	const packageLeafNames = new Set(
		packageDirs.map(
			(rel) => rel.split(PACKAGE_PATH_SEPARATOR_PATTERN).at(-1) ?? rel,
		),
	);

	/**
	 * @param {string} name
	 */
	function flagCandidate(name) {
		if (
			packageLeafNames.has(name) ||
			existsSync(join(root, "packages", name))
		) {
			errors.add(
				`candidate module represented as an on-disk package: packages/${name}`,
			);
		}
	}

	for (const name of FORBIDDEN_PHASE_PACKAGE_DIRS) {
		flagCandidate(name);
	}
	for (const row of roadmapModules) {
		if (livingIds.has(row.id)) {
			continue;
		}
		flagCandidate(row.id);
	}
	return [...errors];
}

/**
 * Relative package dirs under packages/ (one-level category nesting).
 * Examples: `foundation/env`, `erp/sales`.
 *
 * @param {string} root
 * @returns {string[]}
 */
function listPackageDirs(root) {
	const packagesRoot = join(root, "packages");
	if (!existsSync(packagesRoot)) {
		return [];
	}
	/** @type {string[]} */
	const out = [];
	for (const entry of readdirSync(packagesRoot)) {
		const full = join(packagesRoot, entry);
		if (!statSync(full).isDirectory()) {
			continue;
		}
		if (existsSync(join(full, "package.json"))) {
			out.push(entry);
			continue;
		}
		for (const child of readdirSync(full)) {
			const childFull = join(full, child);
			if (
				statSync(childFull).isDirectory() &&
				existsSync(join(childFull, "package.json"))
			) {
				out.push(`${entry}/${child}`);
			}
		}
	}
	return out;
}

/**
 * @param {string} dir
 * @returns {string[]}
 */
function walkTsFiles(dir) {
	/** @type {string[]} */
	const out = [];
	if (!existsSync(dir)) {
		return out;
	}
	for (const entry of readdirSync(dir, { withFileTypes: true })) {
		const full = join(dir, entry.name);
		if (entry.isDirectory()) {
			if (
				entry.name === "node_modules" ||
				entry.name === "dist" ||
				entry.name === ".turbo"
			) {
				continue;
			}
			out.push(...walkTsFiles(full));
			continue;
		}
		if (entry.isFile() && TS_SOURCE_FILENAME_PATTERN.test(entry.name)) {
			out.push(full);
		}
	}
	return out;
}

/**
 * @param {string} source
 * @returns {string[]}
 */
function extractNamedDbImports(source) {
	const names = [];
	for (const match of source.matchAll(DB_NAMED_IMPORT_PATTERN)) {
		for (const specifier of (match[1] ?? "").split(",")) {
			const [name] = specifier.trim().split(IMPORT_ALIAS_SPLIT_PATTERN);
			if (name) {
				names.push(name.trim());
			}
		}
	}
	return names;
}

/**
 * @param {string} roadmapPath
 */
export function loadRoadmapModules(roadmapPath) {
	const doc = parseYaml(readFileSync(roadmapPath, "utf8"));
	const modules = Array.isArray(doc?.modules) ? doc.modules : [];
	return modules
		.filter((m) => m && typeof m.id === "string")
		.map((m) => ({ id: m.id }));
}
