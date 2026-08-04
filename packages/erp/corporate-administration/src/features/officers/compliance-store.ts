import type { Result } from "@afenda/errors";
import type {
	LegalCompanyId,
	OfficerAppointmentId,
	OfficerConflictDisclosureId,
	OfficerDeclarationId,
	OfficerDisqualificationId,
	OrganizationId,
	UserId,
} from "../../kernel/brands";
import type { CanonicalDate, CanonicalInstant } from "../../kernel/dates";
import type { CorporateAdministrationTransactionContext } from "../../kernel/execution/ports";
import type { OpaqueCursor } from "../../kernel/pagination";
import type {
	ConflictDisclosure,
	ConflictDisclosureListPage,
	ConflictMatterType,
	OfficerDeclaration,
	OfficerDeclarationListPage,
	OfficerDeclarationType,
	OfficerDisqualification,
	OfficerDisqualificationListPage,
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

export type ExpiringOfficerDeclarationsQuery = Readonly<{
	organizationId: OrganizationId;
	legalCompanyId: LegalCompanyId;
	asOf: CanonicalDate;
	windowDays: number;
	declarationType?: OfficerDeclarationType | undefined;
	cursor?: OpaqueCursor | undefined;
	pageSize?: number | undefined;
}>;

export type ActiveOfficerDisqualificationsQuery = Readonly<{
	organizationId: OrganizationId;
	legalCompanyId: LegalCompanyId;
	asOf: CanonicalDate;
	officerAppointmentId?: OfficerAppointmentId | undefined;
	cursor?: OpaqueCursor | undefined;
	pageSize?: number | undefined;
}>;

export type ConflictsForMatterQuery = Readonly<{
	organizationId: OrganizationId;
	legalCompanyId: LegalCompanyId;
	matterType: ConflictMatterType;
	matterId: string;
	includeCleared?: boolean | undefined;
	cursor?: OpaqueCursor | undefined;
	pageSize?: number | undefined;
}>;

export interface OfficerComplianceStore {
	discloseConflict: (
		input: DiscloseConflictStoreInput,
	) => Promise<Result<ConflictDisclosure>>;
	endOfficerDisqualification: (
		input: EndOfficerDisqualificationStoreInput,
	) => Promise<Result<OfficerDisqualification>>;
	getConflictDisclosure: (input: {
		organizationId: OrganizationId;
		conflictDisclosureId: OfficerConflictDisclosureId;
	}) => Promise<Result<ConflictDisclosure | null>>;
	getOfficerDeclaration: (input: {
		organizationId: OrganizationId;
		officerDeclarationId: OfficerDeclarationId;
	}) => Promise<Result<OfficerDeclaration | null>>;
	getOfficerDisqualification: (input: {
		organizationId: OrganizationId;
		officerDisqualificationId: OfficerDisqualificationId;
	}) => Promise<Result<OfficerDisqualification | null>>;
	listActiveDisqualifications: (
		input: ActiveOfficerDisqualificationsQuery,
	) => Promise<Result<OfficerDisqualificationListPage>>;
	listConflictsForMatter: (
		input: ConflictsForMatterQuery,
	) => Promise<Result<ConflictDisclosureListPage>>;
	listExpiringDeclarations: (
		input: ExpiringOfficerDeclarationsQuery,
	) => Promise<Result<OfficerDeclarationListPage>>;
	listOfficerDeclarations: (input: {
		organizationId: OrganizationId;
		officerAppointmentId: OfficerAppointmentId;
	}) => Promise<Result<readonly OfficerDeclaration[]>>;
	listOfficerDisqualifications: (input: {
		organizationId: OrganizationId;
		officerAppointmentId: OfficerAppointmentId;
	}) => Promise<Result<readonly OfficerDisqualification[]>>;
	recordOfficerDeclaration: (
		input: RecordOfficerDeclarationStoreInput,
	) => Promise<Result<OfficerDeclaration>>;
	recordOfficerDisqualification: (
		input: RecordOfficerDisqualificationStoreInput,
	) => Promise<Result<OfficerDisqualification>>;
	recordRecusal: (
		input: RecordRecusalStoreInput,
	) => Promise<Result<ConflictDisclosure>>;
	supersedeOfficerDeclaration: (
		input: SupersedeOfficerDeclarationStoreInput,
	) => Promise<Result<OfficerDeclaration>>;
}
