import type { Result } from "@afenda/errors/result";
import type { CorporateAdministrationEventType } from "@afenda/events/schemas";
import type {
	OrganizationDimensionReference,
	Party,
	PartyAddress,
	RefCountry,
	RefCurrency,
} from "@afenda/master-data";

import type {
	CaAuthorityMandate,
	CaAuthorityMandateDetail,
	CaAuthorityMandateHolder,
	CaCompanyPremise,
	CaGovernanceBody,
	CaGovernanceMeeting,
	CaGovernanceMembership,
	CaOfficerAppointment,
	CaResolution,
} from "./schemas";
import type {
	CaBankAccountRegistration,
	CaBankAccountRegistrationPublic,
	CaBankMandate,
	CaBeneficialOwnerDisclosure,
	CaCharge,
	CaChargeVariation,
	CaCorporateAsset,
	CaCorporateDocument,
	CaCorporateRecordSearchHit,
	CaFilingObligation,
	CaFilingSubmission,
	CaGroupControlRelationship,
	CaInsurancePolicy,
	CaInsurancePolicyRenewal,
	CaIntellectualPropertyRenewal,
	CaIntellectualPropertyRight,
	CaLicencePermit,
	CaMaterialAgreement,
	CaPropertyAssetMutationReceipt,
	CaPropertyHolding,
	CaShareCertificate,
	CaShareClass,
	CaShareHolding,
	CaShareTransaction,
	CaShareTransactionDetail,
	CaShareTransactionLeg,
} from "./slice-types";
import type { CorporateAdministrationCompanyStore } from "./store";

export type {
	AuditFactInput,
	AuditFactPort,
	MutationPorts,
	OutboxFactInput,
	OutboxPort,
} from "./mutation-ports";

export type ShareCapitalMutationMeta = {
	correlationId: string;
	eventType: CorporateAdministrationEventType;
};

export type ShareCapitalMutationContext = {
	ports: MutationPorts;
	meta: ShareCapitalMutationMeta;
};

export type Ca4MutationContext = {
	ports: MutationPorts;
	meta: {
		correlationId: string;
		eventType: CorporateAdministrationEventType;
		commandId: string;
		requestFingerprint: string;
		idempotencyKey: string;
	};
};

export type CorporateAdministrationMasterLookupPort = {
	getEffectiveLegalEntity(input: {
		organizationId: string;
		actorUserId: string;
		id: string;
		asOf: string;
	}): Promise<Result<OrganizationDimensionReference | null>>;
	getPartyById(input: {
		organizationId: string;
		actorUserId: string;
		partyId: string;
	}): Promise<Result<Party | null>>;
	getPartyAddressById(input: {
		organizationId: string;
		actorUserId: string;
		partyId: string;
		partyAddressId: string;
	}): Promise<Result<PartyAddress | null>>;
	getCountryByCode(input: {
		organizationId: string;
		actorUserId: string;
		code: string;
	}): Promise<Result<RefCountry | null>>;
	getCurrencyByCode(input: {
		organizationId: string;
		actorUserId: string;
		code: string;
	}): Promise<Result<RefCurrency | null>>;
};

export type CorporateAdministrationGovernancePolicyPort = {
	validateOfficerAppointment(input: {
		organizationId: string;
		legalCompanyId: string;
		partyId: string;
		officerRole: CaOfficerAppointment["officerRole"];
		effectiveFrom: string;
		effectiveTo: string | null;
		existingAppointments: readonly CaOfficerAppointment[];
	}): Promise<Result<void>>;
};

export type {
	CorporateAdministrationCompanyStore,
	CorporateAdministrationMutationMeta,
	CorporateAdministrationMutationReceipt,
	LegalCompanyCreateRecord,
} from "./store";

import type { MutationPorts } from "./mutation-ports";
import type { GovernanceMutationMeta } from "./shared/governance-mutation-facts";

export type { GovernanceMutationMeta };

export type GovernanceStore = {
	getOfficerByIdempotencyKey(
		organizationId: string,
		idempotencyKey: string,
	): Promise<Result<CaOfficerAppointment | null>>;
	createOfficerAppointment(
		record: Omit<
			CaOfficerAppointment,
			"id" | "version" | "createdAt" | "updatedAt"
		>,
		ports: MutationPorts,
		meta: GovernanceMutationMeta,
	): Promise<Result<CaOfficerAppointment>>;
	getOfficerAppointmentById(
		organizationId: string,
		officerAppointmentId: string,
	): Promise<Result<CaOfficerAppointment | null>>;
	listOfficerAppointments(
		organizationId: string,
		legalCompanyId: string,
	): Promise<Result<CaOfficerAppointment[]>>;
	supersedeOfficerAppointment(
		current: CaOfficerAppointment,
		replacement: Omit<
			CaOfficerAppointment,
			"id" | "version" | "createdAt" | "updatedAt"
		>,
		expectedVersion: number,
		ports: MutationPorts,
		meta: GovernanceMutationMeta,
	): Promise<Result<CaOfficerAppointment>>;
	endOfficerAppointment(
		record: CaOfficerAppointment,
		expectedVersion: number,
		ports: MutationPorts,
		meta: GovernanceMutationMeta,
	): Promise<Result<CaOfficerAppointment>>;
	getGovernanceBodyByIdempotencyKey(
		organizationId: string,
		idempotencyKey: string,
	): Promise<Result<CaGovernanceBody | null>>;
	createGovernanceBody(
		record: Omit<
			CaGovernanceBody,
			"id" | "version" | "createdAt" | "updatedAt"
		>,
		ports: MutationPorts,
		meta: GovernanceMutationMeta,
	): Promise<Result<CaGovernanceBody>>;
	getGovernanceBodyById(
		organizationId: string,
		governanceBodyId: string,
	): Promise<Result<CaGovernanceBody | null>>;
	listGovernanceBodies(
		organizationId: string,
		legalCompanyId: string,
	): Promise<Result<CaGovernanceBody[]>>;
	updateGovernanceBody(
		record: CaGovernanceBody,
		expectedVersion: number,
		ports: MutationPorts,
		meta: GovernanceMutationMeta,
	): Promise<Result<CaGovernanceBody>>;
	getGovernanceMembershipByIdempotencyKey(
		organizationId: string,
		idempotencyKey: string,
	): Promise<Result<CaGovernanceMembership | null>>;
	createGovernanceMembership(
		record: Omit<
			CaGovernanceMembership,
			"id" | "version" | "createdAt" | "updatedAt"
		>,
		ports: MutationPorts,
		meta: GovernanceMutationMeta,
	): Promise<Result<CaGovernanceMembership>>;
	getGovernanceMembershipById(
		organizationId: string,
		governanceMembershipId: string,
	): Promise<Result<CaGovernanceMembership | null>>;
	listGovernanceMemberships(
		organizationId: string,
		legalCompanyId: string,
	): Promise<Result<CaGovernanceMembership[]>>;
	endGovernanceMembership(
		record: CaGovernanceMembership,
		expectedVersion: number,
		ports: MutationPorts,
		meta: GovernanceMutationMeta,
	): Promise<Result<CaGovernanceMembership>>;
	getAuthorityMandateByIdempotencyKey(
		organizationId: string,
		idempotencyKey: string,
	): Promise<Result<CaAuthorityMandate | null>>;
	createAuthorityMandate(
		record: Omit<
			CaAuthorityMandate,
			"id" | "version" | "createdAt" | "updatedAt"
		>,
		holders: ReadonlyArray<
			Omit<CaAuthorityMandateHolder, "id" | "authorityMandateId" | "createdAt">
		>,
		ports: MutationPorts,
		meta: GovernanceMutationMeta,
	): Promise<Result<CaAuthorityMandateDetail>>;
	getAuthorityMandateById(
		organizationId: string,
		authorityMandateId: string,
	): Promise<Result<CaAuthorityMandateDetail | null>>;
	listAuthorityMandates(
		organizationId: string,
		legalCompanyId: string,
	): Promise<Result<CaAuthorityMandateDetail[]>>;
	supersedeAuthorityMandate(
		current: CaAuthorityMandateDetail,
		replacement: Omit<
			CaAuthorityMandate,
			"id" | "version" | "createdAt" | "updatedAt"
		>,
		holders: ReadonlyArray<
			Omit<CaAuthorityMandateHolder, "id" | "authorityMandateId" | "createdAt">
		>,
		expectedVersion: number,
		ports: MutationPorts,
		meta: GovernanceMutationMeta,
	): Promise<Result<CaAuthorityMandateDetail>>;
	revokeAuthorityMandate(
		record: CaAuthorityMandateDetail,
		expectedVersion: number,
		ports: MutationPorts,
		meta: GovernanceMutationMeta,
	): Promise<Result<CaAuthorityMandateDetail>>;
	getCompanyPremiseByIdempotencyKey(
		organizationId: string,
		idempotencyKey: string,
	): Promise<Result<CaCompanyPremise | null>>;
	createCompanyPremise(
		record: Omit<
			CaCompanyPremise,
			"id" | "version" | "createdAt" | "updatedAt"
		>,
		ports: MutationPorts,
		meta: GovernanceMutationMeta,
	): Promise<Result<CaCompanyPremise>>;
	getCompanyPremiseById(
		organizationId: string,
		companyPremiseId: string,
	): Promise<Result<CaCompanyPremise | null>>;
	listCompanyPremises(
		organizationId: string,
		legalCompanyId: string,
	): Promise<Result<CaCompanyPremise[]>>;
	supersedeCompanyPremise(
		current: CaCompanyPremise,
		replacement: Omit<
			CaCompanyPremise,
			"id" | "version" | "createdAt" | "updatedAt"
		>,
		expectedVersion: number,
		ports: MutationPorts,
		meta: GovernanceMutationMeta,
	): Promise<Result<CaCompanyPremise>>;
	retireCompanyPremise(
		record: CaCompanyPremise,
		expectedVersion: number,
		ports: MutationPorts,
		meta: GovernanceMutationMeta,
	): Promise<Result<CaCompanyPremise>>;
	getGovernanceMeetingByIdempotencyKey(
		organizationId: string,
		idempotencyKey: string,
	): Promise<Result<CaGovernanceMeeting | null>>;
	createGovernanceMeeting(
		record: Omit<
			CaGovernanceMeeting,
			"id" | "version" | "createdAt" | "updatedAt"
		>,
		ports: MutationPorts,
		meta: GovernanceMutationMeta,
	): Promise<Result<CaGovernanceMeeting>>;
	getGovernanceMeetingById(
		organizationId: string,
		governanceMeetingId: string,
	): Promise<Result<CaGovernanceMeeting | null>>;
	listGovernanceMeetings(
		organizationId: string,
		legalCompanyId: string,
	): Promise<Result<CaGovernanceMeeting[]>>;
	closeGovernanceMeeting(
		record: CaGovernanceMeeting,
		expectedVersion: number,
		ports: MutationPorts,
		meta: GovernanceMutationMeta,
	): Promise<Result<CaGovernanceMeeting>>;
	getResolutionByIdempotencyKey(
		organizationId: string,
		idempotencyKey: string,
	): Promise<Result<CaResolution | null>>;
	createResolution(
		record: Omit<CaResolution, "id" | "version" | "createdAt" | "updatedAt">,
		ports: MutationPorts,
		meta: GovernanceMutationMeta,
	): Promise<Result<CaResolution>>;
	getResolutionById(
		organizationId: string,
		resolutionId: string,
	): Promise<Result<CaResolution | null>>;
	listResolutions(
		organizationId: string,
		legalCompanyId: string,
	): Promise<Result<CaResolution[]>>;
	approveResolution(
		record: CaResolution,
		expectedVersion: number,
		ports: MutationPorts,
		meta: GovernanceMutationMeta,
		predecessor?: CaResolution,
		predecessorMeta?: GovernanceMutationMeta,
	): Promise<Result<CaResolution>>;
	revokeResolution(
		record: CaResolution,
		expectedVersion: number,
		ports: MutationPorts,
		meta: GovernanceMutationMeta,
	): Promise<Result<CaResolution>>;
};

export type SlicesStore = {
	getShareClassByIdempotencyKey(
		organizationId: string,
		idempotencyKey: string,
	): Promise<Result<CaShareClass | null>>;
	createShareClass(
		record: Omit<CaShareClass, "id" | "version" | "createdAt" | "updatedAt">,
		mutation?: ShareCapitalMutationContext,
	): Promise<Result<CaShareClass>>;
	getShareClassById(
		organizationId: string,
		shareClassId: string,
	): Promise<Result<CaShareClass | null>>;
	listShareClasses(
		organizationId: string,
		legalCompanyId: string,
	): Promise<Result<CaShareClass[]>>;
	updateShareClass(
		record: CaShareClass,
		expectedVersion: number,
		mutation?: ShareCapitalMutationContext,
	): Promise<Result<CaShareClass>>;
	closeShareClass(
		record: CaShareClass,
		expectedVersion: number,
		mutation?: ShareCapitalMutationContext,
	): Promise<Result<CaShareClass>>;
	getShareTransactionByIdempotencyKey(
		organizationId: string,
		idempotencyKey: string,
	): Promise<Result<CaShareTransaction | null>>;
	createShareTransaction(
		record: Omit<CaShareTransaction, "id" | "createdAt">,
		legs: Omit<
			CaShareTransactionLeg,
			"id" | "createdAt" | "shareTransactionId" | "legSequence"
		>[],
		mutation?: ShareCapitalMutationContext,
	): Promise<Result<CaShareTransactionDetail>>;
	reverseShareTransaction(input: {
		organizationId: string;
		legalCompanyId: string;
		originalTransactionId: string;
		reversalReference: string;
		reversalDate: string;
		createIdempotencyKey: string;
		createdBy: string;
		correlationId: string;
		mutation?: ShareCapitalMutationContext;
	}): Promise<Result<CaShareTransactionDetail>>;
	getShareTransactionById(
		organizationId: string,
		shareTransactionId: string,
	): Promise<Result<CaShareTransactionDetail | null>>;
	listShareTransactions(
		organizationId: string,
		legalCompanyId: string,
	): Promise<Result<CaShareTransaction[]>>;
	listShareHoldingsAsOf(
		organizationId: string,
		legalCompanyId: string,
		asOf: string,
		shareClassId?: string,
	): Promise<Result<CaShareHolding[]>>;
	getShareCertificateByIdempotencyKey(
		organizationId: string,
		idempotencyKey: string,
	): Promise<Result<CaShareCertificate | null>>;
	createShareCertificate(
		record: Omit<
			CaShareCertificate,
			"id" | "version" | "createdAt" | "updatedAt"
		>,
		mutation?: ShareCapitalMutationContext,
	): Promise<Result<CaShareCertificate>>;
	replaceShareCertificate(input: {
		prior: CaShareCertificate;
		replacement: Omit<
			CaShareCertificate,
			"id" | "version" | "createdAt" | "updatedAt"
		>;
		mutation?: ShareCapitalMutationContext;
	}): Promise<Result<CaShareCertificate>>;
	cancelShareCertificate(
		record: CaShareCertificate,
		expectedVersion: number,
		mutation?: ShareCapitalMutationContext,
	): Promise<Result<CaShareCertificate>>;
	getShareCertificateById(
		organizationId: string,
		shareCertificateId: string,
	): Promise<Result<CaShareCertificate | null>>;
	listShareCertificates(
		organizationId: string,
		legalCompanyId: string,
	): Promise<Result<CaShareCertificate[]>>;
	getBeneficialOwnerDisclosureByIdempotencyKey(
		organizationId: string,
		idempotencyKey: string,
	): Promise<Result<CaBeneficialOwnerDisclosure | null>>;
	createBeneficialOwnerDisclosure(
		record: Omit<
			CaBeneficialOwnerDisclosure,
			"id" | "version" | "createdAt" | "updatedAt"
		>,
		mutation?: ShareCapitalMutationContext,
	): Promise<Result<CaBeneficialOwnerDisclosure>>;
	updateBeneficialOwnerDisclosure(
		record: CaBeneficialOwnerDisclosure,
		expectedVersion: number,
		mutation?: ShareCapitalMutationContext,
	): Promise<Result<CaBeneficialOwnerDisclosure>>;
	endBeneficialOwnerDisclosure(
		record: CaBeneficialOwnerDisclosure,
		expectedVersion: number,
		mutation?: ShareCapitalMutationContext,
	): Promise<Result<CaBeneficialOwnerDisclosure>>;
	getBeneficialOwnerDisclosureById(
		organizationId: string,
		beneficialOwnerDisclosureId: string,
	): Promise<Result<CaBeneficialOwnerDisclosure | null>>;
	listBeneficialOwnerDisclosures(
		organizationId: string,
		legalCompanyId: string,
	): Promise<Result<CaBeneficialOwnerDisclosure[]>>;
	listBeneficialOwnerDisclosuresAsOf(
		organizationId: string,
		legalCompanyId: string,
		asOf: string,
	): Promise<Result<CaBeneficialOwnerDisclosure[]>>;
	getPropertyHoldingByIdempotencyKey(
		organizationId: string,
		idempotencyKey: string,
	): Promise<Result<CaPropertyHolding | null>>;
	createPropertyHolding(
		record: Omit<
			CaPropertyHolding,
			"id" | "version" | "createdAt" | "updatedAt"
		>,
		mutation?: Ca4MutationContext,
	): Promise<Result<CaPropertyHolding>>;
	updatePropertyHolding(
		record: CaPropertyHolding,
		expectedVersion: number,
		mutation?: Ca4MutationContext,
	): Promise<Result<CaPropertyHolding>>;
	getPropertyHoldingById(
		organizationId: string,
		propertyHoldingId: string,
	): Promise<Result<CaPropertyHolding | null>>;
	listPropertyHoldings(
		organizationId: string,
		legalCompanyId: string,
	): Promise<Result<CaPropertyHolding[]>>;
	getCorporateAssetByIdempotencyKey(
		organizationId: string,
		idempotencyKey: string,
	): Promise<Result<CaCorporateAsset | null>>;
	createCorporateAsset(
		record: Omit<
			CaCorporateAsset,
			"id" | "version" | "createdAt" | "updatedAt"
		>,
		mutation?: Ca4MutationContext,
	): Promise<Result<CaCorporateAsset>>;
	updateCorporateAsset(
		record: CaCorporateAsset,
		expectedVersion: number,
		mutation?: Ca4MutationContext,
	): Promise<Result<CaCorporateAsset>>;
	getCorporateAssetById(
		organizationId: string,
		corporateAssetId: string,
	): Promise<Result<CaCorporateAsset | null>>;
	listCorporateAssets(
		organizationId: string,
		legalCompanyId: string,
	): Promise<Result<CaCorporateAsset[]>>;
	getIntellectualPropertyRightByIdempotencyKey(
		organizationId: string,
		idempotencyKey: string,
	): Promise<Result<CaIntellectualPropertyRight | null>>;
	createIntellectualPropertyRight(
		record: Omit<
			CaIntellectualPropertyRight,
			"id" | "version" | "createdAt" | "updatedAt"
		>,
		mutation?: Ca4MutationContext,
	): Promise<Result<CaIntellectualPropertyRight>>;
	updateIntellectualPropertyRight(
		record: CaIntellectualPropertyRight,
		expectedVersion: number,
		renewal: Omit<CaIntellectualPropertyRenewal, "id" | "createdAt"> | null,
		mutation?: Ca4MutationContext,
	): Promise<Result<CaIntellectualPropertyRight>>;
	listIntellectualPropertyRenewals(
		organizationId: string,
		intellectualPropertyRightId: string,
	): Promise<Result<CaIntellectualPropertyRenewal[]>>;
	getIntellectualPropertyRightById(
		organizationId: string,
		intellectualPropertyRightId: string,
	): Promise<Result<CaIntellectualPropertyRight | null>>;
	listIntellectualPropertyRights(
		organizationId: string,
		legalCompanyId: string,
	): Promise<Result<CaIntellectualPropertyRight[]>>;
	getInsurancePolicyByIdempotencyKey(
		organizationId: string,
		idempotencyKey: string,
	): Promise<Result<CaInsurancePolicy | null>>;
	createInsurancePolicy(
		record: Omit<
			CaInsurancePolicy,
			"id" | "version" | "createdAt" | "updatedAt"
		>,
		mutation?: Ca4MutationContext,
	): Promise<Result<CaInsurancePolicy>>;
	updateInsurancePolicy(
		record: CaInsurancePolicy,
		expectedVersion: number,
		renewal: Omit<CaInsurancePolicyRenewal, "id" | "createdAt"> | null,
		mutation?: Ca4MutationContext,
	): Promise<Result<CaInsurancePolicy>>;
	listInsurancePolicyRenewals(
		organizationId: string,
		insurancePolicyId: string,
	): Promise<Result<CaInsurancePolicyRenewal[]>>;
	getInsurancePolicyById(
		organizationId: string,
		insurancePolicyId: string,
	): Promise<Result<CaInsurancePolicy | null>>;
	listInsurancePolicies(
		organizationId: string,
		legalCompanyId: string,
	): Promise<Result<CaInsurancePolicy[]>>;
	getChargeByIdempotencyKey(
		organizationId: string,
		idempotencyKey: string,
	): Promise<Result<CaCharge | null>>;
	createCharge(
		record: Omit<CaCharge, "id" | "version" | "createdAt" | "updatedAt">,
		mutation?: Ca4MutationContext,
	): Promise<Result<CaCharge>>;
	updateCharge(
		record: CaCharge,
		expectedVersion: number,
		variation: Omit<CaChargeVariation, "id" | "createdAt"> | null,
		mutation?: Ca4MutationContext,
	): Promise<Result<CaCharge>>;
	listChargeVariations(
		organizationId: string,
		chargeId: string,
	): Promise<Result<CaChargeVariation[]>>;
	getChargeById(
		organizationId: string,
		chargeId: string,
	): Promise<Result<CaCharge | null>>;
	listCharges(
		organizationId: string,
		legalCompanyId: string,
	): Promise<Result<CaCharge[]>>;
	getPropertyAssetMutationReceipt(
		organizationId: string,
		idempotencyKey: string,
	): Promise<Result<CaPropertyAssetMutationReceipt | null>>;
	getLicencePermitByIdempotencyKey(
		organizationId: string,
		idempotencyKey: string,
	): Promise<Result<CaLicencePermit | null>>;
	createLicencePermit(
		record: Omit<CaLicencePermit, "id" | "version" | "createdAt" | "updatedAt">,
	): Promise<Result<CaLicencePermit>>;
	getLicencePermitById(
		organizationId: string,
		licencePermitId: string,
	): Promise<Result<CaLicencePermit | null>>;
	listLicencePermits(
		organizationId: string,
		legalCompanyId: string,
	): Promise<Result<CaLicencePermit[]>>;
	getBankAccountRegistrationByIdempotencyKey(
		organizationId: string,
		idempotencyKey: string,
	): Promise<Result<CaBankAccountRegistration | null>>;
	createBankAccountRegistration(
		record: Omit<
			CaBankAccountRegistration,
			"id" | "version" | "createdAt" | "updatedAt"
		>,
	): Promise<Result<CaBankAccountRegistration>>;
	getBankAccountRegistrationById(
		organizationId: string,
		bankAccountRegistrationId: string,
	): Promise<Result<CaBankAccountRegistration | null>>;
	listBankAccountRegistrations(
		organizationId: string,
		legalCompanyId: string,
	): Promise<Result<CaBankAccountRegistrationPublic[]>>;
	getBankMandateByIdempotencyKey(
		organizationId: string,
		idempotencyKey: string,
	): Promise<Result<CaBankMandate | null>>;
	createBankMandate(
		record: Omit<CaBankMandate, "id" | "version" | "createdAt" | "updatedAt">,
	): Promise<Result<CaBankMandate>>;
	getBankMandateById(
		organizationId: string,
		bankMandateId: string,
	): Promise<Result<CaBankMandate | null>>;
	listBankMandates(
		organizationId: string,
		legalCompanyId: string,
	): Promise<Result<CaBankMandate[]>>;
	getGroupControlRelationshipByIdempotencyKey(
		organizationId: string,
		idempotencyKey: string,
	): Promise<Result<CaGroupControlRelationship | null>>;
	createGroupControlRelationship(
		record: Omit<
			CaGroupControlRelationship,
			"id" | "version" | "createdAt" | "updatedAt"
		>,
	): Promise<Result<CaGroupControlRelationship>>;
	getGroupControlRelationshipById(
		organizationId: string,
		groupControlRelationshipId: string,
	): Promise<Result<CaGroupControlRelationship | null>>;
	listGroupControlRelationships(
		organizationId: string,
		legalCompanyId: string,
	): Promise<Result<CaGroupControlRelationship[]>>;
	getMaterialAgreementByIdempotencyKey(
		organizationId: string,
		idempotencyKey: string,
	): Promise<Result<CaMaterialAgreement | null>>;
	createMaterialAgreement(
		record: Omit<
			CaMaterialAgreement,
			"id" | "version" | "createdAt" | "updatedAt"
		>,
	): Promise<Result<CaMaterialAgreement>>;
	getMaterialAgreementById(
		organizationId: string,
		materialAgreementId: string,
	): Promise<Result<CaMaterialAgreement | null>>;
	listMaterialAgreements(
		organizationId: string,
		legalCompanyId: string,
	): Promise<Result<CaMaterialAgreement[]>>;
	getCorporateDocumentByIdempotencyKey(
		organizationId: string,
		idempotencyKey: string,
	): Promise<Result<CaCorporateDocument | null>>;
	createCorporateDocument(
		record: Omit<
			CaCorporateDocument,
			"id" | "version" | "createdAt" | "updatedAt"
		>,
	): Promise<Result<CaCorporateDocument>>;
	getCorporateDocumentById(
		organizationId: string,
		corporateDocumentId: string,
	): Promise<Result<CaCorporateDocument | null>>;
	listCorporateDocuments(
		organizationId: string,
		legalCompanyId: string,
	): Promise<Result<CaCorporateDocument[]>>;
	getFilingObligationByIdempotencyKey(
		organizationId: string,
		idempotencyKey: string,
	): Promise<Result<CaFilingObligation | null>>;
	createFilingObligation(
		record: Omit<
			CaFilingObligation,
			"id" | "version" | "createdAt" | "updatedAt"
		>,
	): Promise<Result<CaFilingObligation>>;
	getFilingObligationById(
		organizationId: string,
		filingObligationId: string,
	): Promise<Result<CaFilingObligation | null>>;
	listFilingObligations(
		organizationId: string,
		legalCompanyId: string,
	): Promise<Result<CaFilingObligation[]>>;
	getFilingSubmissionByIdempotencyKey(
		organizationId: string,
		idempotencyKey: string,
	): Promise<Result<CaFilingSubmission | null>>;
	createFilingSubmission(
		record: Omit<CaFilingSubmission, "id" | "createdAt">,
	): Promise<Result<CaFilingSubmission>>;
	getFilingSubmissionById(
		organizationId: string,
		filingSubmissionId: string,
	): Promise<Result<CaFilingSubmission | null>>;
	listFilingSubmissions(
		organizationId: string,
		legalCompanyId: string,
	): Promise<Result<CaFilingSubmission[]>>;
	listDueFilings(
		organizationId: string,
		asOf: string,
		legalCompanyId?: string,
	): Promise<Result<CaFilingObligation[]>>;
	listOverdueFilings(
		organizationId: string,
		asOf: string,
		legalCompanyId?: string,
	): Promise<Result<CaFilingObligation[]>>;
	searchCorporateRecords(
		organizationId: string,
		query: string,
		limit: number,
		legalCompanyId?: string,
	): Promise<Result<CaCorporateRecordSearchHit[]>>;
};

export type CorporateAdministrationStore = CorporateAdministrationCompanyStore &
	GovernanceStore &
	SlicesStore;
