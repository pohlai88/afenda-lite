import type { Result } from "@afenda/errors";

export const PAYROLL_RETENTION_CLASSIFICATIONS = [
	"payslip_evidence",
	"statutory_identifier",
	"contribution_evidence",
	"tax_withholding_evidence",
] as const;

export type PayrollRetentionClassification =
	(typeof PAYROLL_RETENTION_CLASSIFICATIONS)[number];

export const PAYROLL_FIELD_SENSITIVITY = [
	"standard",
	"sensitive",
	"highly_restricted",
] as const;

export type PayrollFieldSensitivity =
	(typeof PAYROLL_FIELD_SENSITIVITY)[number];

export interface PayrollPrivacyRequestContext {
	actorUserId: string;
	correlationId: string;
	legalBasis: string;
	organizationId: string;
	requestedAt: string;
	subjectEmployeeId: string;
}

export interface PayrollRestrictionEvaluation {
	reasonCode?: string;
	restricted: boolean;
}

export interface PayrollRetentionEvidence {
	classifications: readonly PayrollRetentionClassification[];
	clockStartedAt: string;
	eligibleForErasure: boolean;
	evidenceId: string;
	legalBasis: string;
	minimumRetentionMonths: number;
	organizationId: string;
	subjectEmployeeId: string;
}

export interface PayrollSubjectAccessExport {
	exportReference: string;
	projectionScope: "read-own" | "read-all";
	recordCount: number;
	records: readonly {
		entity: string;
		fields: Readonly<Record<string, unknown>>;
		recordId: string;
		sensitivity: PayrollFieldSensitivity;
	}[];
}

export interface PayrollProjectedFields {
	employeeId: string;
	fields: Readonly<Record<string, unknown>>;
	omittedFieldNames: readonly string[];
	organizationId: string;
	projectionScope: "read-own" | "read-all";
	runId: string;
}

/**
 * Restriction ≠ erasure (A3/C7). Payroll evidence survives HR privacy deletes
 * and remains restricted until a counsel-cited retention clock expires.
 */
export interface PayrollPrivacyPort {
	evaluateRestriction: (
		input: PayrollPrivacyRequestContext,
	) => Promise<Result<PayrollRestrictionEvaluation>>;
	expireRetention: (input: {
		actorUserId: string;
		correlationId: string;
		evidenceId: string;
		expiredAt: string;
		organizationId: string;
	}) => Promise<Result<PayrollRetentionEvidence>>;
	exportSubjectAccess: (
		input: PayrollPrivacyRequestContext & {
			projectionScope: "read-own" | "read-all";
			records: PayrollSubjectAccessExport["records"];
		},
	) => Promise<Result<PayrollSubjectAccessExport>>;
	liftRestriction: (input: {
		actorUserId: string;
		correlationId: string;
		liftedAt: string;
		organizationId: string;
		reason: string;
		restrictionId: string;
	}) => Promise<Result<void>>;
	recordRetentionEvidence: (
		input: PayrollPrivacyRequestContext & {
			classifications: readonly PayrollRetentionClassification[];
			clockStartedAt: string;
			minimumRetentionMonths: number;
		},
	) => Promise<Result<PayrollRetentionEvidence>>;
	restrictSubject: (
		input: PayrollPrivacyRequestContext & {
			classifications: readonly PayrollRetentionClassification[];
			restrictionReference: string;
		},
	) => Promise<Result<{ restrictionId: string }>>;
}
