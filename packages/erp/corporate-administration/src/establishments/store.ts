import type { Result } from "@afenda/errors/result";
import type { LegalCompanyStore } from "../company/store";
import type {
	LegalCompanyId,
	LegalEstablishmentId,
	OrganizationId,
	PremiseId,
	UserId,
} from "../kernel/brands";
import type { CanonicalDate, CanonicalInstant } from "../kernel/dates";
import type { CorporateAdministrationTransactionContext } from "../ports";
import type {
	EstablishmentStatusHistory,
	LegalEstablishment,
	LegalEstablishmentStatus,
	LegalEstablishmentType,
	Premise,
	PremiseType,
	RegisteredAddress,
	RegisteredAddressType,
	StatutoryAddressSnapshot,
} from "./types";

type TransactionalWrite = Readonly<{
	transaction?: CorporateAdministrationTransactionContext;
}>;

export type RegisterLegalEstablishmentStoreInput = TransactionalWrite &
	Readonly<{
		organizationId: OrganizationId;
		legalCompanyId: LegalCompanyId;
		establishmentType: LegalEstablishmentType;
		jurisdictionCode: string;
		registrationIdentifier: string;
		normalizedRegistrationIdentifier: string;
		displayName: string;
		registeredFrom: CanonicalDate;
		recordedAt: CanonicalInstant;
		recordedBy: UserId;
		sourceDocumentId: string;
		expectedCompanyVersion: number;
	}>;

export type UpdateLegalEstablishmentStoreInput = TransactionalWrite &
	Readonly<{
		organizationId: OrganizationId;
		legalEstablishmentId: LegalEstablishmentId;
		displayName: string;
		recordedAt: CanonicalInstant;
		recordedBy: UserId;
		sourceDocumentId: string;
		expectedVersion: number;
	}>;

export type TransitionLegalEstablishmentStoreInput = TransactionalWrite &
	Readonly<{
		organizationId: OrganizationId;
		legalEstablishmentId: LegalEstablishmentId;
		status: Exclude<LegalEstablishmentStatus, "registered">;
		effectiveFrom: CanonicalDate;
		reason: string;
		recordedAt: CanonicalInstant;
		recordedBy: UserId;
		sourceDocumentId: string;
		expectedVersion: number;
	}>;

export type SetRegisteredAddressStoreInput = TransactionalWrite &
	Readonly<{
		organizationId: OrganizationId;
		legalCompanyId: LegalCompanyId;
		legalEstablishmentId: LegalEstablishmentId | null;
		addressType: RegisteredAddressType;
		address: StatutoryAddressSnapshot;
		effectiveFrom: CanonicalDate;
		effectiveTo: CanonicalDate | null;
		recordedAt: CanonicalInstant;
		recordedBy: UserId;
		sourceDocumentId: string;
	}>;

export type RegisterPremiseStoreInput = TransactionalWrite &
	Readonly<{
		organizationId: OrganizationId;
		legalCompanyId: LegalCompanyId;
		legalEstablishmentId: LegalEstablishmentId | null;
		premiseType: PremiseType;
		displayName: string;
		address: StatutoryAddressSnapshot;
		effectiveFrom: CanonicalDate;
		effectiveTo: CanonicalDate | null;
		recordedAt: CanonicalInstant;
		recordedBy: UserId;
		sourceDocumentId: string;
	}>;

export type EndPremiseStoreInput = TransactionalWrite &
	Readonly<{
		organizationId: OrganizationId;
		premiseId: PremiseId;
		endedOn: CanonicalDate;
		reason: string;
		recordedAt: CanonicalInstant;
		recordedBy: UserId;
		sourceDocumentId: string;
		expectedVersion: number;
	}>;

export interface EstablishmentStore {
	getLegalEstablishment(input: {
		organizationId: OrganizationId;
		legalEstablishmentId: LegalEstablishmentId;
	}): Promise<Result<LegalEstablishment | null>>;
	listLegalEstablishmentsAsOf(input: {
		organizationId: OrganizationId;
		legalCompanyId: LegalCompanyId;
		asOf: CanonicalDate;
		knownAt?: CanonicalInstant | undefined;
		status?: LegalEstablishmentStatus | undefined;
	}): Promise<Result<readonly LegalEstablishment[]>>;
	listEstablishmentStatusHistory(input: {
		organizationId: OrganizationId;
		legalEstablishmentId: LegalEstablishmentId;
	}): Promise<Result<readonly EstablishmentStatusHistory[]>>;
	registerLegalEstablishment(
		input: RegisterLegalEstablishmentStoreInput,
	): Promise<Result<LegalEstablishment>>;
	updateLegalEstablishment(
		input: UpdateLegalEstablishmentStoreInput,
	): Promise<Result<LegalEstablishment>>;
	transitionLegalEstablishment(
		input: TransitionLegalEstablishmentStoreInput,
	): Promise<Result<LegalEstablishment>>;
	findRegisteredAddressAsOf(input: {
		organizationId: OrganizationId;
		legalCompanyId: LegalCompanyId;
		legalEstablishmentId: LegalEstablishmentId | null;
		addressType: RegisteredAddressType;
		asOf: CanonicalDate;
		knownAt?: CanonicalInstant | undefined;
	}): Promise<Result<RegisteredAddress | null>>;
	listRegisteredAddresses(input: {
		organizationId: OrganizationId;
		legalCompanyId: LegalCompanyId;
		legalEstablishmentId: LegalEstablishmentId | null;
		addressType: RegisteredAddressType;
	}): Promise<Result<readonly RegisteredAddress[]>>;
	setRegisteredAddress(
		input: SetRegisteredAddressStoreInput,
	): Promise<Result<RegisteredAddress>>;
	getPremise(input: {
		organizationId: OrganizationId;
		premiseId: PremiseId;
	}): Promise<Result<Premise | null>>;
	listPremisesAsOf(input: {
		organizationId: OrganizationId;
		legalCompanyId: LegalCompanyId;
		legalEstablishmentId?: LegalEstablishmentId | undefined;
		premiseType?: PremiseType | undefined;
		asOf: CanonicalDate;
		knownAt?: CanonicalInstant | undefined;
	}): Promise<Result<readonly Premise[]>>;
	registerPremise(input: RegisterPremiseStoreInput): Promise<Result<Premise>>;
	endPremise(input: EndPremiseStoreInput): Promise<Result<Premise>>;
}

export type AddressReference = StatutoryAddressSnapshot &
	Readonly<{
		organizationId: OrganizationId;
		partyId: string;
		active: boolean;
	}>;

export interface AddressReferencePort {
	getPartyAddress(input: {
		organizationId: OrganizationId;
		partyId: string;
		partyAddressId: string;
		asOf: CanonicalDate;
	}): Promise<Result<AddressReference | null>>;
}

export type EstablishmentCommandDependencies = Readonly<{
	companyStore: LegalCompanyStore;
	establishmentStore: EstablishmentStore;
	addressReferences: AddressReferencePort;
	referenceData: Readonly<{
		resolveCountry(input: {
			organizationId: OrganizationId;
			countryCode: string;
			effectiveDate?: CanonicalDate | undefined;
		}): Promise<Result<{ code: string; active: boolean } | null>>;
		validateSourceDocument(input: {
			organizationId: OrganizationId;
			sourceDocumentId: string;
		}): Promise<Result<{ sourceDocumentId: string; active: boolean } | null>>;
	}>;
}>;

export type EstablishmentQueryDependencies = Readonly<{
	establishmentStore: EstablishmentStore;
}>;
