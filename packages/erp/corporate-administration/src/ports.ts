import type { Change } from "@afenda/audit";
import type { Result } from "@afenda/errors/result";
import type { CorporateAdministrationEventType } from "@afenda/events/schemas";
import type {
	OrganizationDimensionReference,
	Party,
} from "@afenda/master-data";

import type {
	CaAuthorityMandate,
	CaCompanyIdentifier,
	CaCompanyName,
	CaCompanyPremise,
	CaCompanyStatusHistory,
	CaGovernanceBody,
	CaGovernanceMeeting,
	CaGovernanceMembership,
	CaLegalCompany,
	CaLegalCompanyDetail,
	CaOfficerAppointment,
	CaResolution,
} from "./schemas";
import type {
	CaBankAccountRegistration,
	CaBankAccountRegistrationPublic,
	CaBankMandate,
	CaBeneficialOwnerDisclosure,
	CaCharge,
	CaCorporateAsset,
	CaCorporateDocument,
	CaCorporateRecordSearchHit,
	CaFilingObligation,
	CaFilingSubmission,
	CaGroupControlRelationship,
	CaInsurancePolicy,
	CaIntellectualPropertyRight,
	CaLicencePermit,
	CaMaterialAgreement,
	CaPropertyHolding,
	CaShareCertificate,
	CaShareClass,
	CaShareHolding,
	CaShareTransaction,
	CaShareTransactionDetail,
	CaShareTransactionLeg,
} from "./slice-types";

export type AuditFactInput = {
	organizationId: string;
	actorUserId: string;
	correlationId: string;
	entity: string;
	entityId: string;
	action: "CREATE" | "UPDATE" | "DELETE";
	changes: Change[];
	oldValue?: Record<string, unknown> | null;
	newValue?: Record<string, unknown> | null;
};

export type AuditFactPort = {
	record(input: AuditFactInput): Promise<Result<{ id: string }>>;
};

export type OutboxFactInput = {
	organizationId: string;
	actorUserId: string;
	correlationId: string;
	type: CorporateAdministrationEventType;
	payload: Record<string, unknown>;
};

export type OutboxPort = {
	append(input: OutboxFactInput): Promise<Result<{ id: string }>>;
};

export type MutationPorts = {
	audit: AuditFactPort;
	outbox: OutboxPort;
	record(input: {
		audit: AuditFactInput;
		outbox: OutboxFactInput;
	}): Promise<Result<{ auditId: string; eventId: string }>>;
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
};

export type LegalCompanyCreateRecord = Omit<
	CaLegalCompany,
	| "id"
	| "version"
	| "activatedAt"
	| "activatedBy"
	| "suspendedAt"
	| "suspendedBy"
	| "dissolvedAt"
	| "dissolvedBy"
	| "archivedAt"
	| "archivedBy"
	| "createdAt"
	| "updatedAt"
>;

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
	): Promise<Result<CaOfficerAppointment>>;
	getOfficerAppointmentById(
		organizationId: string,
		officerAppointmentId: string,
	): Promise<Result<CaOfficerAppointment | null>>;
	listOfficerAppointments(
		organizationId: string,
		legalCompanyId: string,
	): Promise<Result<CaOfficerAppointment[]>>;
	getGovernanceBodyByIdempotencyKey(
		organizationId: string,
		idempotencyKey: string,
	): Promise<Result<CaGovernanceBody | null>>;
	createGovernanceBody(
		record: Omit<
			CaGovernanceBody,
			"id" | "version" | "createdAt" | "updatedAt"
		>,
	): Promise<Result<CaGovernanceBody>>;
	getGovernanceBodyById(
		organizationId: string,
		governanceBodyId: string,
	): Promise<Result<CaGovernanceBody | null>>;
	listGovernanceBodies(
		organizationId: string,
		legalCompanyId: string,
	): Promise<Result<CaGovernanceBody[]>>;
	getGovernanceMembershipByIdempotencyKey(
		organizationId: string,
		idempotencyKey: string,
	): Promise<Result<CaGovernanceMembership | null>>;
	createGovernanceMembership(
		record: Omit<
			CaGovernanceMembership,
			"id" | "version" | "createdAt" | "updatedAt"
		>,
	): Promise<Result<CaGovernanceMembership>>;
	getGovernanceMembershipById(
		organizationId: string,
		governanceMembershipId: string,
	): Promise<Result<CaGovernanceMembership | null>>;
	listGovernanceMemberships(
		organizationId: string,
		legalCompanyId: string,
	): Promise<Result<CaGovernanceMembership[]>>;
	getAuthorityMandateByIdempotencyKey(
		organizationId: string,
		idempotencyKey: string,
	): Promise<Result<CaAuthorityMandate | null>>;
	createAuthorityMandate(
		record: Omit<
			CaAuthorityMandate,
			"id" | "version" | "createdAt" | "updatedAt"
		>,
	): Promise<Result<CaAuthorityMandate>>;
	getAuthorityMandateById(
		organizationId: string,
		authorityMandateId: string,
	): Promise<Result<CaAuthorityMandate | null>>;
	listAuthorityMandates(
		organizationId: string,
		legalCompanyId: string,
	): Promise<Result<CaAuthorityMandate[]>>;
	getCompanyPremiseByIdempotencyKey(
		organizationId: string,
		idempotencyKey: string,
	): Promise<Result<CaCompanyPremise | null>>;
	createCompanyPremise(
		record: Omit<
			CaCompanyPremise,
			"id" | "version" | "createdAt" | "updatedAt"
		>,
	): Promise<Result<CaCompanyPremise>>;
	getCompanyPremiseById(
		organizationId: string,
		companyPremiseId: string,
	): Promise<Result<CaCompanyPremise | null>>;
	listCompanyPremises(
		organizationId: string,
		legalCompanyId: string,
	): Promise<Result<CaCompanyPremise[]>>;
	getGovernanceMeetingByIdempotencyKey(
		organizationId: string,
		idempotencyKey: string,
	): Promise<Result<CaGovernanceMeeting | null>>;
	createGovernanceMeeting(
		record: Omit<
			CaGovernanceMeeting,
			"id" | "version" | "createdAt" | "updatedAt"
		>,
	): Promise<Result<CaGovernanceMeeting>>;
	getGovernanceMeetingById(
		organizationId: string,
		governanceMeetingId: string,
	): Promise<Result<CaGovernanceMeeting | null>>;
	listGovernanceMeetings(
		organizationId: string,
		legalCompanyId: string,
	): Promise<Result<CaGovernanceMeeting[]>>;
	getResolutionByIdempotencyKey(
		organizationId: string,
		idempotencyKey: string,
	): Promise<Result<CaResolution | null>>;
	createResolution(
		record: Omit<CaResolution, "id" | "version" | "createdAt" | "updatedAt">,
	): Promise<Result<CaResolution>>;
	getResolutionById(
		organizationId: string,
		resolutionId: string,
	): Promise<Result<CaResolution | null>>;
	listResolutions(
		organizationId: string,
		legalCompanyId: string,
	): Promise<Result<CaResolution[]>>;
};

export type SlicesStore = {
	getShareClassByIdempotencyKey(
		organizationId: string,
		idempotencyKey: string,
	): Promise<Result<CaShareClass | null>>;
	createShareClass(
		record: Omit<CaShareClass, "id" | "version" | "createdAt" | "updatedAt">,
	): Promise<Result<CaShareClass>>;
	getShareClassById(
		organizationId: string,
		shareClassId: string,
	): Promise<Result<CaShareClass | null>>;
	listShareClasses(
		organizationId: string,
		legalCompanyId: string,
	): Promise<Result<CaShareClass[]>>;
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
	): Promise<Result<CaShareTransactionDetail>>;
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
	): Promise<Result<CaBeneficialOwnerDisclosure>>;
	getBeneficialOwnerDisclosureById(
		organizationId: string,
		beneficialOwnerDisclosureId: string,
	): Promise<Result<CaBeneficialOwnerDisclosure | null>>;
	listBeneficialOwnerDisclosures(
		organizationId: string,
		legalCompanyId: string,
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
	): Promise<Result<CaIntellectualPropertyRight>>;
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
	): Promise<Result<CaInsurancePolicy>>;
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
	): Promise<Result<CaCharge>>;
	getChargeById(
		organizationId: string,
		chargeId: string,
	): Promise<Result<CaCharge | null>>;
	listCharges(
		organizationId: string,
		legalCompanyId: string,
	): Promise<Result<CaCharge[]>>;
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

export type CorporateAdministrationCompanyStore = {
	getByCreateIdempotencyKey(
		organizationId: string,
		idempotencyKey: string,
	): Promise<Result<CaLegalCompany | null>>;
	getById(
		organizationId: string,
		legalCompanyId: string,
	): Promise<Result<CaLegalCompany | null>>;
	list(
		organizationId: string,
		filter: {
			status?: CaLegalCompany["status"];
			page: number;
			pageSize: number;
		},
	): Promise<Result<{ items: CaLegalCompany[]; total: number }>>;
	getDetail(
		organizationId: string,
		legalCompanyId: string,
	): Promise<Result<CaLegalCompanyDetail | null>>;
	createCompany(
		record: LegalCompanyCreateRecord,
		ports: MutationPorts,
		meta: {
			correlationId: string;
			eventType: CorporateAdministrationEventType;
		},
	): Promise<Result<CaLegalCompany>>;
	updateCompany(
		record: CaLegalCompany,
		ports: MutationPorts,
		meta: {
			correlationId: string;
			eventType: CorporateAdministrationEventType;
			statusHistory?: Omit<CaCompanyStatusHistory, "id" | "createdAt">;
			statusChangedEventType?: CorporateAdministrationEventType;
		},
	): Promise<Result<CaLegalCompany>>;
	appendStatusHistory(
		record: Omit<CaCompanyStatusHistory, "id" | "createdAt">,
	): Promise<Result<CaCompanyStatusHistory>>;
	getStatusHistoryByIdempotencyKey(
		organizationId: string,
		idempotencyKey: string,
	): Promise<Result<CaCompanyStatusHistory | null>>;
	getNameByIdempotencyKey(
		organizationId: string,
		idempotencyKey: string,
	): Promise<Result<CaCompanyName | null>>;
	getIdentifierByIdempotencyKey(
		organizationId: string,
		idempotencyKey: string,
	): Promise<Result<CaCompanyIdentifier | null>>;
	addName(
		record: Omit<CaCompanyName, "id" | "version" | "createdAt" | "updatedAt">,
		ports: MutationPorts,
		meta: {
			correlationId: string;
			eventType: CorporateAdministrationEventType;
			legalCompanyCode: string;
		},
	): Promise<Result<CaCompanyName>>;
	listNames(
		organizationId: string,
		legalCompanyId: string,
	): Promise<Result<CaCompanyName[]>>;
	addIdentifier(
		record: Omit<
			CaCompanyIdentifier,
			"id" | "version" | "createdAt" | "updatedAt"
		>,
		ports: MutationPorts,
		meta: {
			correlationId: string;
			eventType: CorporateAdministrationEventType;
			legalCompanyCode: string;
		},
	): Promise<Result<CaCompanyIdentifier>>;
	listIdentifiers(
		organizationId: string,
		legalCompanyId: string,
	): Promise<Result<CaCompanyIdentifier[]>>;
	listStatusHistory(
		organizationId: string,
		legalCompanyId: string,
	): Promise<Result<CaCompanyStatusHistory[]>>;
	endName(
		record: CaCompanyName,
		ports: MutationPorts,
		meta: {
			correlationId: string;
			eventType: CorporateAdministrationEventType;
			legalCompanyCode: string;
		},
	): Promise<Result<CaCompanyName>>;
	updateIdentifier(
		record: CaCompanyIdentifier,
		ports: MutationPorts,
		meta: {
			correlationId: string;
			eventType: CorporateAdministrationEventType;
			legalCompanyCode: string;
		},
	): Promise<Result<CaCompanyIdentifier>>;
	getNameById(
		organizationId: string,
		companyNameId: string,
	): Promise<Result<CaCompanyName | null>>;
	getIdentifierById(
		organizationId: string,
		companyIdentifierId: string,
	): Promise<Result<CaCompanyIdentifier | null>>;
};
