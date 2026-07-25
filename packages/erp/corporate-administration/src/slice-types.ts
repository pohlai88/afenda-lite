import { z } from "zod";

const commandContext = z.object({
	organizationId: z.string().trim().min(1),
	actorUserId: z.string().trim().min(1),
	correlationId: z.string().trim().min(1),
	idempotencyKey: z.string().trim().min(1),
});

const companyCommandContext = commandContext.extend({
	legalCompanyId: z.uuid(),
});

const companyQueryContext = z.object({
	organizationId: z.string().trim().min(1),
	actorUserId: z.string().trim().min(1),
	legalCompanyId: z.uuid(),
});

const entityGetContext = companyQueryContext.extend({
	id: z.uuid(),
});

const decimalString = z
	.string()
	.trim()
	.min(1)
	.max(32)
	.regex(/^-?\d+(\.\d+)?$/, "Invalid decimal quantity");

export const CA_SHARE_CLASS_STATUSES = ["active", "closed"] as const;
export type CaShareClassStatus = (typeof CA_SHARE_CLASS_STATUSES)[number];

export type CaShareClass = {
	id: string;
	organizationId: string;
	legalCompanyId: string;
	code: string;
	normalizedCode: string;
	classType: string;
	currencyCode: string;
	parValue: string;
	authorizedQuantity: string;
	status: CaShareClassStatus;
	version: number;
	createIdempotencyKey: string;
	createdBy: string;
	updatedBy: string;
	createdAt: Date;
	updatedAt: Date;
};

export const CA_SHARE_TRANSACTION_TYPES = [
	"issuance",
	"transfer",
	"cancellation",
	"redemption",
	"conversion",
	"split",
	"consolidation",
	"correction",
] as const;
export type CaShareTransactionType =
	(typeof CA_SHARE_TRANSACTION_TYPES)[number];

export const CA_SHARE_TRANSACTION_STATUSES = ["posted", "reversed"] as const;
export type CaShareTransactionStatus =
	(typeof CA_SHARE_TRANSACTION_STATUSES)[number];

export type CaShareTransaction = {
	id: string;
	organizationId: string;
	legalCompanyId: string;
	shareClassId: string;
	transactionReference: string;
	transactionType: CaShareTransactionType;
	transactionDate: string;
	status: CaShareTransactionStatus;
	reversalOfId: string | null;
	createIdempotencyKey: string;
	createdBy: string;
	createdAt: Date;
};

export type CaShareTransactionLeg = {
	id: string;
	organizationId: string;
	legalCompanyId: string;
	shareTransactionId: string;
	shareClassId: string;
	holderPartyId: string;
	holderPartyCodeSnapshot: string | null;
	holderPartyNameSnapshot: string | null;
	quantityDelta: string;
	legSequence: number;
	createdAt: Date;
};

export type CaShareTransactionDetail = CaShareTransaction & {
	legs: CaShareTransactionLeg[];
};

export const CA_SHARE_CERTIFICATE_STATUSES = [
	"active",
	"cancelled",
	"replaced",
] as const;
export type CaShareCertificateStatus =
	(typeof CA_SHARE_CERTIFICATE_STATUSES)[number];

export type CaShareCertificate = {
	id: string;
	organizationId: string;
	legalCompanyId: string;
	shareClassId: string;
	shareTransactionId: string | null;
	certificateNumber: string;
	normalizedCertificateNumber: string;
	holderPartyId: string;
	holderPartyCodeSnapshot: string | null;
	holderPartyNameSnapshot: string | null;
	issuedDate: string;
	status: CaShareCertificateStatus;
	version: number;
	createIdempotencyKey: string;
	createdBy: string;
	updatedBy: string;
	createdAt: Date;
	updatedAt: Date;
};

export const CA_BENEFICIAL_OWNER_VERIFICATION_STATUSES = [
	"pending",
	"verified",
	"rejected",
] as const;
export type CaBeneficialOwnerVerificationStatus =
	(typeof CA_BENEFICIAL_OWNER_VERIFICATION_STATUSES)[number];

export type CaBeneficialOwnerDisclosure = {
	id: string;
	organizationId: string;
	legalCompanyId: string;
	partyId: string;
	partyCodeSnapshot: string | null;
	partyNameSnapshot: string | null;
	natureOfControlCodes: string;
	effectiveFrom: string;
	effectiveTo: string | null;
	verificationStatus: CaBeneficialOwnerVerificationStatus;
	evidenceReference: string | null;
	version: number;
	createIdempotencyKey: string;
	createdBy: string;
	updatedBy: string;
	createdAt: Date;
	updatedAt: Date;
};

export type CaShareHolding = {
	shareClassId: string;
	holderPartyId: string;
	holderPartyCodeSnapshot: string | null;
	holderPartyNameSnapshot: string | null;
	quantity: string;
};

export type CaPropertyHolding = {
	id: string;
	organizationId: string;
	legalCompanyId: string;
	code: string;
	normalizedCode: string;
	propertyType: string;
	titleReference: string;
	ownershipPercentage: string;
	acquiredDate: string | null;
	disposedDate: string | null;
	tenureType: string | null;
	status: "active" | "disposed";
	version: number;
	createIdempotencyKey: string;
	createdBy: string;
	updatedBy: string;
	createdAt: Date;
	updatedAt: Date;
};

export type CaCorporateAsset = {
	id: string;
	organizationId: string;
	legalCompanyId: string;
	code: string;
	normalizedCode: string;
	assetCategory: string;
	identifier: string | null;
	description: string;
	acquiredDate: string | null;
	disposedDate: string | null;
	status: "active" | "disposed" | "written_off";
	version: number;
	createIdempotencyKey: string;
	createdBy: string;
	updatedBy: string;
	createdAt: Date;
	updatedAt: Date;
};

export type CaIntellectualPropertyRight = {
	id: string;
	organizationId: string;
	legalCompanyId: string;
	code: string;
	normalizedCode: string;
	rightType: string;
	jurisdictionCode: string | null;
	registrationNumber: string | null;
	ownerPartyId: string | null;
	filingDate: string | null;
	grantDate: string | null;
	expiryDate: string | null;
	status: "pending" | "active" | "expired" | "lapsed";
	version: number;
	createIdempotencyKey: string;
	createdBy: string;
	updatedBy: string;
	createdAt: Date;
	updatedAt: Date;
};

export type CaInsurancePolicy = {
	id: string;
	organizationId: string;
	legalCompanyId: string;
	policyNumber: string;
	normalizedPolicyNumber: string;
	insurerPartyId: string | null;
	insurerPartyNameSnapshot: string | null;
	coveredSubject: string;
	effectiveFrom: string;
	effectiveTo: string | null;
	limitAmount: string | null;
	currencyCode: string | null;
	status: "active" | "expired" | "cancelled";
	version: number;
	createIdempotencyKey: string;
	createdBy: string;
	updatedBy: string;
	createdAt: Date;
	updatedAt: Date;
};

export type CaCharge = {
	id: string;
	organizationId: string;
	legalCompanyId: string;
	code: string;
	normalizedCode: string;
	chargeType: string;
	securedPartyId: string | null;
	securedPartyNameSnapshot: string | null;
	affectedSubjectReference: string;
	amount: string | null;
	currencyCode: string | null;
	createdDate: string;
	releasedDate: string | null;
	status: "active" | "released";
	version: number;
	createIdempotencyKey: string;
	createdBy: string;
	updatedBy: string;
	createdAt: Date;
	updatedAt: Date;
};

export type CaLicencePermit = {
	id: string;
	organizationId: string;
	legalCompanyId: string;
	licenceNumber: string;
	normalizedLicenceNumber: string;
	licenceType: string;
	authorityPartyId: string | null;
	authorityNameSnapshot: string | null;
	jurisdictionCode: string | null;
	scopeDescription: string | null;
	validFrom: string;
	validTo: string | null;
	status: "active" | "suspended" | "revoked" | "expired";
	version: number;
	createIdempotencyKey: string;
	createdBy: string;
	updatedBy: string;
	createdAt: Date;
	updatedAt: Date;
};

export type CaBankAccountRegistration = {
	id: string;
	organizationId: string;
	legalCompanyId: string;
	bankPartyId: string | null;
	bankPartyNameSnapshot: string | null;
	accountIdentityToken: string;
	displayMaskedAccount: string;
	countryCode: string;
	currencyCode: string;
	accountPurpose: string;
	openedDate: string;
	closedDate: string | null;
	status: "active" | "closed";
	version: number;
	createIdempotencyKey: string;
	createdBy: string;
	updatedBy: string;
	createdAt: Date;
	updatedAt: Date;
};

export type CaBankAccountRegistrationPublic = Omit<
	CaBankAccountRegistration,
	"accountIdentityToken"
>;

export type CaBankMandate = {
	id: string;
	organizationId: string;
	legalCompanyId: string;
	bankAccountRegistrationId: string;
	mandateDescription: string;
	signingRule: "single" | "joint";
	effectiveFrom: string;
	effectiveTo: string | null;
	status: "active" | "revoked";
	version: number;
	createIdempotencyKey: string;
	createdBy: string;
	updatedBy: string;
	createdAt: Date;
	updatedAt: Date;
};

export type CaGroupControlRelationship = {
	id: string;
	organizationId: string;
	legalCompanyId: string;
	relationshipType: string;
	counterpartyLegalCompanyId: string | null;
	counterpartyPartyId: string | null;
	counterpartyNameSnapshot: string | null;
	controlPercentage: string | null;
	effectiveFrom: string;
	effectiveTo: string | null;
	status: "active" | "ended";
	version: number;
	createIdempotencyKey: string;
	createdBy: string;
	updatedBy: string;
	createdAt: Date;
	updatedAt: Date;
};

export type CaMaterialAgreement = {
	id: string;
	organizationId: string;
	legalCompanyId: string;
	agreementCode: string;
	normalizedAgreementCode: string;
	agreementType: string;
	title: string;
	counterpartyPartyId: string | null;
	counterpartyNameSnapshot: string | null;
	effectiveFrom: string;
	effectiveTo: string | null;
	valueAmount: string | null;
	currencyCode: string | null;
	documentReference: string | null;
	status: "active" | "terminated" | "expired";
	version: number;
	createIdempotencyKey: string;
	createdBy: string;
	updatedBy: string;
	createdAt: Date;
	updatedAt: Date;
};

export type CaCorporateDocument = {
	id: string;
	organizationId: string;
	legalCompanyId: string;
	documentCode: string;
	normalizedDocumentCode: string;
	documentType: string;
	title: string;
	externalReference: string;
	checksum: string | null;
	classification: string | null;
	effectiveDate: string | null;
	expiryDate: string | null;
	supersedesId: string | null;
	version: number;
	createIdempotencyKey: string;
	createdBy: string;
	updatedBy: string;
	createdAt: Date;
	updatedAt: Date;
};

export const CA_FILING_OBLIGATION_STATUSES = [
	"pending",
	"due",
	"submitted",
	"acknowledged",
	"overdue",
	"waived",
] as const;
export type CaFilingObligationStatus =
	(typeof CA_FILING_OBLIGATION_STATUSES)[number];

export type CaFilingObligation = {
	id: string;
	organizationId: string;
	legalCompanyId: string;
	obligationCode: string;
	normalizedObligationCode: string;
	filingType: string;
	jurisdictionCode: string | null;
	authorityName: string;
	periodLabel: string;
	dueDate: string;
	extensionDate: string | null;
	status: CaFilingObligationStatus;
	version: number;
	createIdempotencyKey: string;
	createdBy: string;
	updatedBy: string;
	createdAt: Date;
	updatedAt: Date;
};

export const CA_FILING_SUBMISSION_STATUSES = [
	"submitted",
	"acknowledged",
	"rejected",
] as const;
export type CaFilingSubmissionStatus =
	(typeof CA_FILING_SUBMISSION_STATUSES)[number];

export type CaFilingSubmission = {
	id: string;
	organizationId: string;
	legalCompanyId: string;
	filingObligationId: string;
	submissionReference: string;
	submittedAt: Date;
	status: CaFilingSubmissionStatus;
	acknowledgementReference: string | null;
	rejectionReason: string | null;
	evidenceReference: string | null;
	createIdempotencyKey: string;
	createdBy: string;
	createdAt: Date;
};

export type CaCorporateRecordSearchHit = {
	entityType: string;
	entityId: string;
	legalCompanyId: string;
	title: string;
	subtitle: string | null;
};

export const createShareClassInputSchema = companyCommandContext
	.extend({
		code: z.string().trim().min(1).max(64),
		classType: z.string().trim().min(1).max(64),
		currencyCode: z.string().trim().length(3),
		parValue: decimalString,
		authorizedQuantity: decimalString,
	})
	.strict();

export const getShareClassInputSchema = entityGetContext.strict();
export const listShareClassesInputSchema = companyQueryContext.strict();

const shareTransactionLegInput = z
	.object({
		holderPartyId: z.uuid(),
		quantityDelta: decimalString,
	})
	.strict();

export const createShareTransactionInputSchema = companyCommandContext
	.extend({
		shareClassId: z.uuid(),
		transactionReference: z.string().trim().min(1).max(64),
		transactionType: z.enum(CA_SHARE_TRANSACTION_TYPES),
		transactionDate: z.iso.date(),
		legs: z.array(shareTransactionLegInput).min(1),
	})
	.strict();

export const getShareTransactionInputSchema = entityGetContext.strict();
export const listShareTransactionsInputSchema = companyQueryContext.strict();

export const createShareCertificateInputSchema = companyCommandContext
	.extend({
		shareClassId: z.uuid(),
		shareTransactionId: z.uuid().optional(),
		certificateNumber: z.string().trim().min(1).max(64),
		holderPartyId: z.uuid(),
		issuedDate: z.iso.date(),
	})
	.strict();

export const getShareCertificateInputSchema = entityGetContext.strict();
export const listShareCertificatesInputSchema = companyQueryContext.strict();

export const createBeneficialOwnerDisclosureInputSchema = companyCommandContext
	.extend({
		partyId: z.uuid(),
		natureOfControlCodes: z.string().trim().min(1).max(500),
		effectiveFrom: z.iso.date(),
		evidenceReference: z.string().trim().min(1).max(500).optional(),
	})
	.strict();

export const getBeneficialOwnerDisclosureInputSchema =
	entityGetContext.strict();
export const listBeneficialOwnerDisclosuresInputSchema =
	companyQueryContext.strict();

export const listShareHoldingsAsOfInputSchema = companyQueryContext
	.extend({
		asOf: z.iso.date(),
		shareClassId: z.uuid().optional(),
	})
	.strict();

export const createPropertyHoldingInputSchema = companyCommandContext
	.extend({
		code: z.string().trim().min(1).max(64),
		propertyType: z.string().trim().min(1).max(64),
		titleReference: z.string().trim().min(1).max(200),
		ownershipPercentage: decimalString,
		acquiredDate: z.iso.date().optional(),
		tenureType: z.string().trim().min(1).max(64).optional(),
	})
	.strict();

export const getPropertyHoldingInputSchema = entityGetContext.strict();
export const listPropertyHoldingsInputSchema = companyQueryContext.strict();

export const createCorporateAssetInputSchema = companyCommandContext
	.extend({
		code: z.string().trim().min(1).max(64),
		assetCategory: z.string().trim().min(1).max(64),
		description: z.string().trim().min(1).max(500),
		identifier: z.string().trim().min(1).max(200).optional(),
		acquiredDate: z.iso.date().optional(),
	})
	.strict();

export const getCorporateAssetInputSchema = entityGetContext.strict();
export const listCorporateAssetsInputSchema = companyQueryContext.strict();

export const createIntellectualPropertyRightInputSchema = companyCommandContext
	.extend({
		code: z.string().trim().min(1).max(64),
		rightType: z.string().trim().min(1).max(64),
		jurisdictionCode: z.string().trim().min(2).max(3).optional(),
		registrationNumber: z.string().trim().min(1).max(200).optional(),
		ownerPartyId: z.uuid().optional(),
		filingDate: z.iso.date().optional(),
		grantDate: z.iso.date().optional(),
		expiryDate: z.iso.date().optional(),
	})
	.strict();

export const getIntellectualPropertyRightInputSchema =
	entityGetContext.strict();
export const listIntellectualPropertyRightsInputSchema =
	companyQueryContext.strict();

export const createInsurancePolicyInputSchema = companyCommandContext
	.extend({
		policyNumber: z.string().trim().min(1).max(64),
		insurerPartyId: z.uuid().optional(),
		coveredSubject: z.string().trim().min(1).max(300),
		effectiveFrom: z.iso.date(),
		effectiveTo: z.iso.date().optional(),
		limitAmount: decimalString.optional(),
		currencyCode: z.string().trim().length(3).optional(),
	})
	.strict();

export const getInsurancePolicyInputSchema = entityGetContext.strict();
export const listInsurancePoliciesInputSchema = companyQueryContext.strict();

export const createChargeInputSchema = companyCommandContext
	.extend({
		code: z.string().trim().min(1).max(64),
		chargeType: z.string().trim().min(1).max(64),
		affectedSubjectReference: z.string().trim().min(1).max(300),
		securedPartyId: z.uuid().optional(),
		amount: decimalString.optional(),
		currencyCode: z.string().trim().length(3).optional(),
		createdDate: z.iso.date(),
	})
	.strict();

export const getChargeInputSchema = entityGetContext.strict();
export const listChargesInputSchema = companyQueryContext.strict();

export const createLicencePermitInputSchema = companyCommandContext
	.extend({
		licenceNumber: z.string().trim().min(1).max(64),
		licenceType: z.string().trim().min(1).max(64),
		authorityPartyId: z.uuid().optional(),
		jurisdictionCode: z.string().trim().min(2).max(3).optional(),
		scopeDescription: z.string().trim().min(1).max(1000).optional(),
		validFrom: z.iso.date(),
		validTo: z.iso.date().optional(),
	})
	.strict();

export const getLicencePermitInputSchema = entityGetContext.strict();
export const listLicencePermitsInputSchema = companyQueryContext.strict();

export const createBankAccountRegistrationInputSchema = companyCommandContext
	.extend({
		bankPartyId: z.uuid().optional(),
		accountIdentity: z.string().trim().min(4).max(200),
		countryCode: z.string().trim().min(2).max(3),
		currencyCode: z.string().trim().length(3),
		accountPurpose: z.string().trim().min(1).max(200),
		openedDate: z.iso.date(),
	})
	.strict();

export const getBankAccountRegistrationInputSchema = entityGetContext.strict();
export const listBankAccountRegistrationsInputSchema =
	companyQueryContext.strict();

export const createBankMandateInputSchema = companyCommandContext
	.extend({
		bankAccountRegistrationId: z.uuid(),
		mandateDescription: z.string().trim().min(1).max(1000),
		signingRule: z.enum(["single", "joint"]).default("single"),
		effectiveFrom: z.iso.date(),
	})
	.strict();

export const getBankMandateInputSchema = entityGetContext.strict();
export const listBankMandatesInputSchema = companyQueryContext.strict();

export const createGroupControlRelationshipInputSchema = companyCommandContext
	.extend({
		relationshipType: z.string().trim().min(1).max(64),
		counterpartyLegalCompanyId: z.uuid().optional(),
		counterpartyPartyId: z.uuid().optional(),
		controlPercentage: decimalString.optional(),
		effectiveFrom: z.iso.date(),
	})
	.strict();

export const getGroupControlRelationshipInputSchema = entityGetContext.strict();
export const listGroupControlRelationshipsInputSchema =
	companyQueryContext.strict();

export const createMaterialAgreementInputSchema = companyCommandContext
	.extend({
		agreementCode: z.string().trim().min(1).max(64),
		agreementType: z.string().trim().min(1).max(64),
		title: z.string().trim().min(1).max(300),
		counterpartyPartyId: z.uuid().optional(),
		effectiveFrom: z.iso.date(),
		effectiveTo: z.iso.date().optional(),
		valueAmount: decimalString.optional(),
		currencyCode: z.string().trim().length(3).optional(),
		documentReference: z.string().trim().min(1).max(500).optional(),
	})
	.strict();

export const getMaterialAgreementInputSchema = entityGetContext.strict();
export const listMaterialAgreementsInputSchema = companyQueryContext.strict();

export const createCorporateDocumentInputSchema = companyCommandContext
	.extend({
		documentCode: z.string().trim().min(1).max(64),
		documentType: z.string().trim().min(1).max(64),
		title: z.string().trim().min(1).max(300),
		externalReference: z.string().trim().min(1).max(500),
		checksum: z.string().trim().min(1).max(128).optional(),
		classification: z.string().trim().min(1).max(64).optional(),
		effectiveDate: z.iso.date().optional(),
		expiryDate: z.iso.date().optional(),
	})
	.strict();

export const getCorporateDocumentInputSchema = entityGetContext.strict();
export const listCorporateDocumentsInputSchema = companyQueryContext.strict();

export const createFilingObligationInputSchema = companyCommandContext
	.extend({
		obligationCode: z.string().trim().min(1).max(64),
		filingType: z.string().trim().min(1).max(64),
		jurisdictionCode: z.string().trim().min(2).max(3).optional(),
		authorityName: z.string().trim().min(1).max(200),
		periodLabel: z.string().trim().min(1).max(100),
		dueDate: z.iso.date(),
	})
	.strict();

export const getFilingObligationInputSchema = entityGetContext.strict();
export const listFilingObligationsInputSchema = companyQueryContext.strict();

export const createFilingSubmissionInputSchema = companyCommandContext
	.extend({
		filingObligationId: z.uuid(),
		submissionReference: z.string().trim().min(1).max(200),
		submittedAt: z.iso.datetime(),
		status: z.enum(CA_FILING_SUBMISSION_STATUSES).default("submitted"),
		acknowledgementReference: z.string().trim().min(1).max(200).optional(),
		rejectionReason: z.string().trim().min(1).max(1000).optional(),
		evidenceReference: z.string().trim().min(1).max(500).optional(),
	})
	.strict();

export const getFilingSubmissionInputSchema = entityGetContext.strict();
export const listFilingSubmissionsInputSchema = companyQueryContext.strict();

export const listDueFilingsInputSchema = z
	.object({
		organizationId: z.string().trim().min(1),
		actorUserId: z.string().trim().min(1),
		legalCompanyId: z.uuid().optional(),
		asOf: z.iso.date(),
	})
	.strict();

export const listOverdueFilingsInputSchema = listDueFilingsInputSchema;

export const searchCorporateRecordsInputSchema = z
	.object({
		organizationId: z.string().trim().min(1),
		actorUserId: z.string().trim().min(1),
		query: z.string().trim().min(1).max(200),
		legalCompanyId: z.uuid().optional(),
		limit: z.number().int().positive().max(100).default(20),
	})
	.strict();
