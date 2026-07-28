import type { Result } from "@afenda/errors/result";
import type { CorporateAdministrationApprovalVerificationDependencies } from "../authorization";
import type { CorporateAdministrationCommandOptions } from "../command-options";
import type { LegalCompanyStore } from "../company/store";
import type {
	LegalCompanyId,
	OfficerAppointmentId,
	OrganizationId,
	StatutoryOfficeId,
	UserId,
} from "../kernel/brands";
import type { CanonicalDate, CanonicalInstant } from "../kernel/dates";
import type {
	CorporateAdministrationTransactionContext,
	PartyReferencePort,
} from "../ports";
import type {
	OfficerAppointingAuthorityType,
	OfficerAppointment,
	OfficerAppointmentMethod,
	OfficerQualification,
	OfficerQualificationVerificationStatus,
	StatutoryOffice,
} from "./types";

type TransactionalWrite = Readonly<{
	transaction?: CorporateAdministrationTransactionContext;
}>;

export type DefineStatutoryOfficeStoreInput = TransactionalWrite &
	Readonly<{
		organizationId: OrganizationId;
		legalCompanyId: LegalCompanyId;
		officeTypeCode: string;
		jurisdictionCode: string;
		displayName: string;
		description: string | null;
		required: boolean;
		minimumHolders: number;
		maximumHolders: number | null;
		vacancyGraceDays: number;
		protectedRole: boolean;
		effectiveFrom: CanonicalDate;
		recordedAt: CanonicalInstant;
		recordedBy: UserId;
		sourceDocumentId: string;
		expectedCompanyVersion: number;
	}>;

export type AppointOfficerStoreInput = TransactionalWrite &
	Readonly<{
		organizationId: OrganizationId;
		legalCompanyId: LegalCompanyId;
		statutoryOfficeId: StatutoryOfficeId;
		officerPartyId: string;
		appointmentMethod: OfficerAppointmentMethod;
		appointingAuthorityType: OfficerAppointingAuthorityType;
		appointingAuthorityId: string | null;
		consentDocumentId: string;
		sourceDocumentId: string;
		effectiveFrom: CanonicalDate;
		effectiveTo: CanonicalDate | null;
		recordedAt: CanonicalInstant;
		recordedBy: UserId;
		expectedOfficeVersion: number;
	}>;

export type AmendOfficerAppointmentStoreInput = TransactionalWrite &
	Readonly<{
		organizationId: OrganizationId;
		officerAppointmentId: OfficerAppointmentId;
		appointmentMethod: OfficerAppointmentMethod;
		appointingAuthorityType: OfficerAppointingAuthorityType;
		appointingAuthorityId: string | null;
		consentDocumentId: string;
		sourceDocumentId: string;
		effectiveFrom: CanonicalDate;
		effectiveTo: CanonicalDate | null;
		recordedAt: CanonicalInstant;
		recordedBy: UserId;
		expectedVersion: number;
	}>;

export type RecordOfficerQualificationStoreInput = TransactionalWrite &
	Readonly<{
		organizationId: OrganizationId;
		legalCompanyId: LegalCompanyId;
		officerAppointmentId: OfficerAppointmentId;
		qualificationTypeCode: string;
		issuer: string;
		referenceNumber: string | null;
		validFrom: CanonicalDate;
		validTo: CanonicalDate | null;
		verificationStatus: OfficerQualificationVerificationStatus;
		verifiedAt: Date | null;
		recordedAt: CanonicalInstant;
		recordedBy: UserId;
		sourceDocumentId: string;
		expectedAppointmentVersion: number;
	}>;

export type EndOfficerAppointmentStoreInput = TransactionalWrite &
	Readonly<{
		organizationId: OrganizationId;
		officerAppointmentId: OfficerAppointmentId;
		endedOn: CanonicalDate;
		status: "resigned" | "removed";
		reason: string;
		recordedAt: CanonicalInstant;
		recordedBy: UserId;
		sourceDocumentId: string;
		expectedVersion: number;
	}>;

export interface OfficerStore {
	getStatutoryOffice(input: {
		organizationId: OrganizationId;
		statutoryOfficeId: StatutoryOfficeId;
	}): Promise<Result<StatutoryOffice | null>>;
	listStatutoryOffices(input: {
		organizationId: OrganizationId;
		legalCompanyId: LegalCompanyId;
	}): Promise<Result<readonly StatutoryOffice[]>>;
	listRequiredStatutoryOffices(input: {
		organizationId: OrganizationId;
		legalCompanyId: LegalCompanyId;
		asOf: CanonicalDate;
		jurisdictionCode?: string;
		includeOptional?: boolean;
	}): Promise<Result<readonly StatutoryOffice[]>>;
	defineStatutoryOffice(
		input: DefineStatutoryOfficeStoreInput,
	): Promise<Result<StatutoryOffice>>;
	getOfficerAppointment(input: {
		organizationId: OrganizationId;
		officerAppointmentId: OfficerAppointmentId;
	}): Promise<Result<OfficerAppointment | null>>;
	listOfficerAppointments(input: {
		organizationId: OrganizationId;
		statutoryOfficeId: StatutoryOfficeId;
	}): Promise<Result<readonly OfficerAppointment[]>>;
	listOfficersAsOf(input: {
		organizationId: OrganizationId;
		legalCompanyId: LegalCompanyId;
		asOf: CanonicalDate;
		statutoryOfficeId?: StatutoryOfficeId;
		officerPartyId?: string;
	}): Promise<Result<readonly OfficerAppointment[]>>;
	appointOfficer(
		input: AppointOfficerStoreInput,
	): Promise<Result<OfficerAppointment>>;
	amendOfficerAppointment(
		input: AmendOfficerAppointmentStoreInput,
	): Promise<Result<OfficerAppointment>>;
	endOfficerAppointment(
		input: EndOfficerAppointmentStoreInput,
	): Promise<Result<OfficerAppointment>>;
	recordOfficerQualification(
		input: RecordOfficerQualificationStoreInput,
	): Promise<Result<OfficerQualification>>;
	listOfficerQualifications(input: {
		organizationId: OrganizationId;
		officerAppointmentId: OfficerAppointmentId;
	}): Promise<Result<readonly OfficerQualification[]>>;
}

export type OfficerReferencePort = Readonly<{
	validateSourceDocument(input: {
		organizationId: OrganizationId;
		sourceDocumentId: string;
	}): Promise<Result<{ sourceDocumentId: string; active: boolean } | null>>;
}>;

export type OfficerCommandDependencies =
	CorporateAdministrationApprovalVerificationDependencies &
		Readonly<{
			companyStore: LegalCompanyStore;
			officerStore: OfficerStore;
			referenceData: OfficerReferencePort;
			partyReferences: PartyReferencePort;
		}>;

export type OfficerQueryDependencies = Readonly<{
	officerStore: OfficerStore;
}>;

export type OfficerCommandContext = CorporateAdministrationCommandOptions;
