import type { Result } from "@afenda/errors/result";
import type {
	LegalCompanyId,
	OfficerAppointmentId,
	OfficerConflictDisclosureId,
	OfficerDeclarationId,
	OfficerDisqualificationId,
	OrganizationId,
	UserId,
} from "../kernel/brands";
import type { CanonicalDate, CanonicalInstant } from "../kernel/dates";
import type { CorporateAdministrationTransactionContext } from "../ports";
import type {
	ConflictDisclosure,
	ConflictMatterType,
	OfficerDeclaration,
	OfficerDeclarationType,
	OfficerDisqualification,
} from "./compliance-types";

type TransactionalWrite = Readonly<{
	transaction?: CorporateAdministrationTransactionContext;
}>;

export type RecordOfficerDeclarationStoreInput = TransactionalWrite &
	Readonly<{
		organizationId: OrganizationId;
		legalCompanyId: LegalCompanyId;
		officerAppointmentId: OfficerAppointmentId;
		declarationType: OfficerDeclarationType;
		effectiveFrom: CanonicalDate;
		expiresOn: CanonicalDate | null;
		sensitiveDetailRef: string | null;
		maskedSummary: string | null;
		sourceDocumentId: string;
		recordedAt: CanonicalInstant;
		recordedBy: UserId;
		expectedAppointmentVersion: number;
	}>;

export type SupersedeOfficerDeclarationStoreInput = TransactionalWrite &
	Readonly<{
		organizationId: OrganizationId;
		officerDeclarationId: OfficerDeclarationId;
		supersededByDeclarationId: OfficerDeclarationId;
		sourceDocumentId: string;
		recordedAt: CanonicalInstant;
		recordedBy: UserId;
		expectedVersion: number;
	}>;

export type RecordOfficerDisqualificationStoreInput = TransactionalWrite &
	Readonly<{
		organizationId: OrganizationId;
		legalCompanyId: LegalCompanyId;
		officerAppointmentId: OfficerAppointmentId;
		reasonCode: string;
		authorityReference: string | null;
		sourceDocumentId: string;
		effectiveFrom: CanonicalDate;
		effectiveTo: CanonicalDate | null;
		recordedAt: CanonicalInstant;
		recordedBy: UserId;
		expectedAppointmentVersion: number;
	}>;

export type EndOfficerDisqualificationStoreInput = TransactionalWrite &
	Readonly<{
		organizationId: OrganizationId;
		officerDisqualificationId: OfficerDisqualificationId;
		endedOn: CanonicalDate;
		reason: string;
		sourceDocumentId: string;
		recordedAt: CanonicalInstant;
		recordedBy: UserId;
		expectedVersion: number;
	}>;

export type DiscloseConflictStoreInput = TransactionalWrite &
	Readonly<{
		organizationId: OrganizationId;
		legalCompanyId: LegalCompanyId;
		officerAppointmentId: OfficerAppointmentId;
		matterType: ConflictMatterType;
		matterId: string;
		conflictTypeCode: string;
		sensitiveDetailRef: string | null;
		maskedSummary: string | null;
		disclosedAt: Date;
		sourceDocumentId: string;
		recordedAt: CanonicalInstant;
		recordedBy: UserId;
		expectedAppointmentVersion: number;
	}>;

export type RecordRecusalStoreInput = TransactionalWrite &
	Readonly<{
		organizationId: OrganizationId;
		conflictDisclosureId: OfficerConflictDisclosureId;
		recusalReason: string;
		sourceDocumentId: string;
		recordedAt: CanonicalInstant;
		recordedBy: UserId;
		expectedVersion: number;
	}>;

export interface OfficerComplianceStore {
	getOfficerDeclaration(input: {
		organizationId: OrganizationId;
		officerDeclarationId: OfficerDeclarationId;
	}): Promise<Result<OfficerDeclaration | null>>;
	listOfficerDeclarations(input: {
		organizationId: OrganizationId;
		officerAppointmentId: OfficerAppointmentId;
	}): Promise<Result<readonly OfficerDeclaration[]>>;
	listExpiringDeclarations(input: {
		organizationId: OrganizationId;
		legalCompanyId: LegalCompanyId;
		asOf: CanonicalDate;
		windowDays: number;
		declarationType?: OfficerDeclarationType;
	}): Promise<Result<readonly OfficerDeclaration[]>>;
	recordOfficerDeclaration(
		input: RecordOfficerDeclarationStoreInput,
	): Promise<Result<OfficerDeclaration>>;
	supersedeOfficerDeclaration(
		input: SupersedeOfficerDeclarationStoreInput,
	): Promise<Result<OfficerDeclaration>>;
	getOfficerDisqualification(input: {
		organizationId: OrganizationId;
		officerDisqualificationId: OfficerDisqualificationId;
	}): Promise<Result<OfficerDisqualification | null>>;
	listOfficerDisqualifications(input: {
		organizationId: OrganizationId;
		officerAppointmentId: OfficerAppointmentId;
	}): Promise<Result<readonly OfficerDisqualification[]>>;
	listActiveDisqualifications(input: {
		organizationId: OrganizationId;
		legalCompanyId: LegalCompanyId;
		asOf: CanonicalDate;
		officerAppointmentId?: OfficerAppointmentId;
	}): Promise<Result<readonly OfficerDisqualification[]>>;
	recordOfficerDisqualification(
		input: RecordOfficerDisqualificationStoreInput,
	): Promise<Result<OfficerDisqualification>>;
	endOfficerDisqualification(
		input: EndOfficerDisqualificationStoreInput,
	): Promise<Result<OfficerDisqualification>>;
	getConflictDisclosure(input: {
		organizationId: OrganizationId;
		conflictDisclosureId: OfficerConflictDisclosureId;
	}): Promise<Result<ConflictDisclosure | null>>;
	listConflictsForMatter(input: {
		organizationId: OrganizationId;
		legalCompanyId: LegalCompanyId;
		matterType: ConflictMatterType;
		matterId: string;
		includeCleared?: boolean;
	}): Promise<Result<readonly ConflictDisclosure[]>>;
	discloseConflict(
		input: DiscloseConflictStoreInput,
	): Promise<Result<ConflictDisclosure>>;
	recordRecusal(
		input: RecordRecusalStoreInput,
	): Promise<Result<ConflictDisclosure>>;
}
