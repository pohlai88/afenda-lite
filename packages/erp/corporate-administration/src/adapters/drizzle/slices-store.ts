import { randomUUID } from "node:crypto";

import {
	and,
	asc,
	caBankAccountRegistration,
	caBankMandate,
	caBeneficialOwnerDisclosure,
	caCharge,
	caChargeVariation,
	caCorporateAsset,
	caCorporateDocument,
	caFilingObligation,
	caFilingSubmission,
	caGroupControlRelationship,
	caInsurancePolicy,
	caInsurancePolicyRenewal,
	caIntellectualPropertyRenewal,
	caIntellectualPropertyRight,
	caLicencePermit,
	caMaterialAgreement,
	caPropertyAssetMutationReceipt,
	caPropertyHolding,
	caShareCertificate,
	caShareClass,
	caShareTransaction,
	caShareTransactionLeg,
	db,
	eq,
	isNull,
	lte,
	type NeonHttpSql,
	or,
	runNeonHttpTransaction,
	sql,
} from "@afenda/db";
import { fail, failFromUnknown, ok } from "@afenda/errors/result";

import {
	CA_ERROR_CODE_CONFLICT,
	CA_ERROR_IDEMPOTENCY_CONFLICT,
	caErrorDetails,
} from "../../error-codes";
import type { Ca4MutationContext, SlicesStore } from "../../ports";
import {
	addDecimal,
	isNegativeDecimal,
	isZeroDecimal,
	negateDecimal,
	sumDecimals,
} from "../../shared/decimal";
import type {
	Ca4Subject,
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
} from "../../slice-types";

type ShareClassRow = typeof caShareClass.$inferSelect;
type ShareTransactionRow = typeof caShareTransaction.$inferSelect;
type ShareTransactionLegRow = typeof caShareTransactionLeg.$inferSelect;
type ShareCertificateRow = typeof caShareCertificate.$inferSelect;
type BeneficialOwnerDisclosureRow =
	typeof caBeneficialOwnerDisclosure.$inferSelect;
type PropertyHoldingRow = typeof caPropertyHolding.$inferSelect;
type CorporateAssetRow = typeof caCorporateAsset.$inferSelect;
type IntellectualPropertyRightRow =
	typeof caIntellectualPropertyRight.$inferSelect;
type InsurancePolicyRow = typeof caInsurancePolicy.$inferSelect;
type ChargeRow = typeof caCharge.$inferSelect;
type ChargeVariationRow = typeof caChargeVariation.$inferSelect;
type IntellectualPropertyRenewalRow =
	typeof caIntellectualPropertyRenewal.$inferSelect;
type InsurancePolicyRenewalRow = typeof caInsurancePolicyRenewal.$inferSelect;
type PropertyAssetMutationReceiptRow =
	typeof caPropertyAssetMutationReceipt.$inferSelect;
type LicencePermitRow = typeof caLicencePermit.$inferSelect;
type BankAccountRegistrationRow = typeof caBankAccountRegistration.$inferSelect;
type BankMandateRow = typeof caBankMandate.$inferSelect;
type GroupControlRelationshipRow =
	typeof caGroupControlRelationship.$inferSelect;
type MaterialAgreementRow = typeof caMaterialAgreement.$inferSelect;
type CorporateDocumentRow = typeof caCorporateDocument.$inferSelect;
type FilingObligationRow = typeof caFilingObligation.$inferSelect;
type FilingSubmissionRow = typeof caFilingSubmission.$inferSelect;

function isUniqueViolation(error: unknown): boolean {
	return (
		typeof error === "object" &&
		error !== null &&
		"code" in error &&
		error.code === "23505"
	);
}

function toPublicBankAccount(
	row: CaBankAccountRegistration,
): CaBankAccountRegistrationPublic {
	const { accountIdentityToken: _token, ...rest } = row;
	return rest;
}

function mapShareClass(row: ShareClassRow): CaShareClass {
	return {
		id: row.id,
		organizationId: row.organizationId,
		legalCompanyId: row.legalCompanyId,
		code: row.code,
		normalizedCode: row.normalizedCode,
		classType: row.classType,
		currencyCode: row.currencyCode ?? "",
		parValue: row.parValue != null ? String(row.parValue) : "0",
		authorizedQuantity:
			row.authorizedQuantity != null ? String(row.authorizedQuantity) : "0",
		status: row.status as CaShareClass["status"],
		version: row.version,
		createIdempotencyKey: row.createIdempotencyKey,
		createdBy: row.createdBy,
		updatedBy: row.updatedBy,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	};
}

function mapShareTransaction(row: ShareTransactionRow): CaShareTransaction {
	return {
		id: row.id,
		organizationId: row.organizationId,
		legalCompanyId: row.legalCompanyId,
		shareClassId: row.shareClassId,
		transactionReference: row.transactionReference,
		transactionType:
			row.transactionType as CaShareTransaction["transactionType"],
		transactionDate: row.transactionDate,
		status: row.status as CaShareTransaction["status"],
		reversalOfId: row.reversalOfId,
		createIdempotencyKey: row.createIdempotencyKey,
		createdBy: row.createdBy,
		createdAt: row.createdAt,
	};
}

function mapShareTransactionLeg(
	row: ShareTransactionLegRow,
): CaShareTransactionLeg {
	return {
		id: row.id,
		organizationId: row.organizationId,
		legalCompanyId: row.legalCompanyId,
		shareTransactionId: row.shareTransactionId,
		shareClassId: row.shareClassId,
		holderPartyId: row.holderPartyId,
		holderPartyCodeSnapshot: row.holderPartyCodeSnapshot,
		holderPartyNameSnapshot: row.holderPartyNameSnapshot,
		quantityDelta: String(row.quantityDelta),
		legSequence: row.legSequence,
		createdAt: row.createdAt,
	};
}

function mapShareCertificate(row: ShareCertificateRow): CaShareCertificate {
	return {
		id: row.id,
		organizationId: row.organizationId,
		legalCompanyId: row.legalCompanyId,
		shareClassId: row.shareClassId,
		shareTransactionId: row.shareTransactionId,
		certificateNumber: row.certificateNumber,
		normalizedCertificateNumber: row.normalizedCertificateNumber,
		holderPartyId: row.holderPartyId,
		holderPartyCodeSnapshot: row.holderPartyCodeSnapshot,
		holderPartyNameSnapshot: row.holderPartyNameSnapshot,
		issuedDate: row.issuedDate,
		status: row.status as CaShareCertificate["status"],
		version: row.version,
		createIdempotencyKey: row.createIdempotencyKey,
		createdBy: row.createdBy,
		updatedBy: row.updatedBy,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	};
}

function mapBeneficialOwnerDisclosure(
	row: BeneficialOwnerDisclosureRow,
): CaBeneficialOwnerDisclosure {
	return {
		id: row.id,
		organizationId: row.organizationId,
		legalCompanyId: row.legalCompanyId,
		partyId: row.partyId,
		partyCodeSnapshot: row.partyCodeSnapshot,
		partyNameSnapshot: row.partyNameSnapshot,
		natureOfControlCodes: row.natureOfControlCodes,
		effectiveFrom: row.effectiveFrom,
		effectiveTo: row.effectiveTo,
		verificationStatus:
			row.verificationStatus as CaBeneficialOwnerDisclosure["verificationStatus"],
		evidenceReference: row.evidenceReference,
		version: row.version,
		createIdempotencyKey: row.createIdempotencyKey,
		createdBy: row.createdBy,
		updatedBy: row.updatedBy,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	};
}

function mapPropertyHolding(row: PropertyHoldingRow): CaPropertyHolding {
	return {
		id: row.id,
		organizationId: row.organizationId,
		legalCompanyId: row.legalCompanyId,
		code: row.code,
		normalizedCode: row.normalizedCode,
		propertyType: row.propertyType,
		titleReference: row.titleReference,
		normalizedTitleReference: row.normalizedTitleReference,
		propertyDescription: row.propertyDescription,
		ownershipPercentage: String(row.ownershipPercentage),
		acquisitionDate: row.acquisitionDate,
		disposalDate: row.disposalDate,
		tenureType: row.tenureType,
		valuationReference: row.valuationReference,
		disposalReason: row.disposalReason,
		disposalEvidenceReference: row.disposalEvidenceReference,
		status: row.status as CaPropertyHolding["status"],
		version: row.version,
		createIdempotencyKey: row.createIdempotencyKey,
		createRequestFingerprint: row.createRequestFingerprint,
		createdBy: row.createdBy,
		updatedBy: row.updatedBy,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	};
}

function mapCorporateAsset(row: CorporateAssetRow): CaCorporateAsset {
	return {
		id: row.id,
		organizationId: row.organizationId,
		legalCompanyId: row.legalCompanyId,
		code: row.code,
		normalizedCode: row.normalizedCode,
		assetCategory: row.assetCategory,
		identifier: row.identifier,
		normalizedIdentifier: row.normalizedIdentifier,
		description: row.description,
		custodianPartyId: row.custodianPartyId,
		custodianPartyCodeSnapshot: row.custodianPartyCodeSnapshot,
		custodianPartyNameSnapshot: row.custodianPartyNameSnapshot,
		acquisitionDate: row.acquisitionDate,
		disposalDate: row.disposalDate,
		writeOffDate: row.writeOffDate,
		terminalReason: row.terminalReason,
		terminalEvidenceReference: row.terminalEvidenceReference,
		status: row.status as CaCorporateAsset["status"],
		version: row.version,
		createIdempotencyKey: row.createIdempotencyKey,
		createRequestFingerprint: row.createRequestFingerprint,
		createdBy: row.createdBy,
		updatedBy: row.updatedBy,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	};
}

function mapIntellectualPropertyRight(
	row: IntellectualPropertyRightRow,
): CaIntellectualPropertyRight {
	return {
		id: row.id,
		organizationId: row.organizationId,
		legalCompanyId: row.legalCompanyId,
		code: row.code,
		normalizedCode: row.normalizedCode,
		rightType: row.rightType,
		jurisdictionCode: row.jurisdictionCode,
		applicationNumber: row.applicationNumber,
		registrationNumber: row.registrationNumber,
		normalizedRightNumber: row.normalizedRightNumber,
		ownerPartyId: row.ownerPartyId,
		ownerPartyCodeSnapshot: row.ownerPartyCodeSnapshot,
		ownerPartyNameSnapshot: row.ownerPartyNameSnapshot,
		filingDate: row.filingDate,
		grantDate: row.grantDate,
		expiryDate: row.expiryDate,
		lastRenewalDate: row.lastRenewalDate,
		disposalDate: row.disposalDate,
		terminalReason: row.terminalReason,
		terminalEvidenceReference: row.terminalEvidenceReference,
		status: row.status as CaIntellectualPropertyRight["status"],
		version: row.version,
		createIdempotencyKey: row.createIdempotencyKey,
		createRequestFingerprint: row.createRequestFingerprint,
		createdBy: row.createdBy,
		updatedBy: row.updatedBy,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	};
}

function mapSubject(
	kind: string,
	propertyHoldingId: string | null,
	corporateAssetId: string | null,
	intellectualPropertyRightId: string | null,
	description: string | null,
): Ca4Subject {
	if (kind === "property" && propertyHoldingId) {
		return { kind: "property", propertyHoldingId };
	}
	if (kind === "corporate-asset" && corporateAssetId) {
		return { kind: "corporate-asset", corporateAssetId };
	}
	if (kind === "intellectual-property" && intellectualPropertyRightId) {
		return { kind: "intellectual-property", intellectualPropertyRightId };
	}
	if (kind === "other" && description) return { kind: "other", description };
	return { kind: "company" };
}

function mapInsurancePolicy(row: InsurancePolicyRow): CaInsurancePolicy {
	return {
		id: row.id,
		organizationId: row.organizationId,
		legalCompanyId: row.legalCompanyId,
		policyNumber: row.policyNumber,
		normalizedPolicyNumber: row.normalizedPolicyNumber,
		insurerPartyId: row.insurerPartyId,
		insurerPartyCodeSnapshot: row.insurerPartyCodeSnapshot,
		insurerPartyNameSnapshot: row.insurerPartyNameSnapshot,
		coveredSubject: mapSubject(
			row.coveredSubjectKind,
			row.coveredPropertyHoldingId,
			row.coveredCorporateAssetId,
			row.coveredIntellectualPropertyRightId,
			row.coveredSubjectDescription,
		),
		effectiveFrom: row.effectiveFrom,
		effectiveTo: row.effectiveTo,
		limitAmount: row.limitAmount != null ? String(row.limitAmount) : null,
		currencyCode: row.currencyCode,
		documentReference: row.documentReference,
		cancellationDate: row.cancellationDate,
		cancellationReason: row.cancellationReason,
		cancellationEvidenceReference: row.cancellationEvidenceReference,
		status: row.status as CaInsurancePolicy["status"],
		version: row.version,
		createIdempotencyKey: row.createIdempotencyKey,
		createRequestFingerprint: row.createRequestFingerprint,
		createdBy: row.createdBy,
		updatedBy: row.updatedBy,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	};
}

function mapCharge(row: ChargeRow): CaCharge {
	return {
		id: row.id,
		organizationId: row.organizationId,
		legalCompanyId: row.legalCompanyId,
		code: row.code,
		normalizedCode: row.normalizedCode,
		chargeType: row.chargeType,
		securedPartyId: row.securedPartyId,
		securedPartyCodeSnapshot: row.securedPartyCodeSnapshot,
		securedPartyNameSnapshot: row.securedPartyNameSnapshot,
		affectedSubject: mapSubject(
			row.affectedSubjectKind,
			row.affectedPropertyHoldingId,
			row.affectedCorporateAssetId,
			row.affectedIntellectualPropertyRightId,
			row.affectedSubjectDescription,
		),
		amount: row.amount != null ? String(row.amount) : null,
		currencyCode: row.currencyCode,
		priorityRank: row.priorityRank,
		createdDate: row.createdDate,
		releasedDate: row.releasedDate,
		creationEvidenceReference: row.creationEvidenceReference,
		releaseReason: row.releaseReason,
		releaseEvidenceReference: row.releaseEvidenceReference,
		status: row.status as CaCharge["status"],
		version: row.version,
		createIdempotencyKey: row.createIdempotencyKey,
		createRequestFingerprint: row.createRequestFingerprint,
		createdBy: row.createdBy,
		updatedBy: row.updatedBy,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	};
}

function mapIntellectualPropertyRenewal(
	row: IntellectualPropertyRenewalRow,
): CaIntellectualPropertyRenewal {
	return {
		...row,
	};
}

function mapInsurancePolicyRenewal(
	row: InsurancePolicyRenewalRow,
): CaInsurancePolicyRenewal {
	return {
		...row,
		limitAmount: row.limitAmount === null ? null : String(row.limitAmount),
	};
}

function mapChargeVariation(row: ChargeVariationRow): CaChargeVariation {
	return {
		...row,
		amount: row.amount === null ? null : String(row.amount),
	};
}

function mapPropertyAssetMutationReceipt(
	row: PropertyAssetMutationReceiptRow,
): CaPropertyAssetMutationReceipt {
	const entityType =
		row.entityType === "property" ||
		row.entityType === "asset" ||
		row.entityType === "intellectual-property" ||
		row.entityType === "insurance-policy" ||
		row.entityType === "charge"
			? row.entityType
			: "property";
	return { ...row, entityType };
}

function subjectColumns(subject: Ca4Subject) {
	return {
		kind: subject.kind,
		propertyHoldingId:
			subject.kind === "property" ? subject.propertyHoldingId : null,
		corporateAssetId:
			subject.kind === "corporate-asset" ? subject.corporateAssetId : null,
		intellectualPropertyRightId:
			subject.kind === "intellectual-property"
				? subject.intellectualPropertyRightId
				: null,
		description: subject.kind === "other" ? subject.description : null,
	};
}

async function insertCa4Receipt(
	entity: {
		id: string;
		organizationId: string;
		version: number;
	},
	entityType: CaPropertyAssetMutationReceipt["entityType"],
	mutation?: Ca4MutationContext,
) {
	if (!mutation) return;
	await db
		.insert(caPropertyAssetMutationReceipt)
		.values({
			id: randomUUID(),
			organizationId: entity.organizationId,
			commandId: mutation.meta.commandId,
			entityType,
			entityId: entity.id,
			resultVersion: entity.version,
			idempotencyKey: mutation.meta.idempotencyKey,
			requestFingerprint: mutation.meta.requestFingerprint,
		})
		.onConflictDoNothing();
}

function mapLicencePermit(row: LicencePermitRow): CaLicencePermit {
	return {
		id: row.id,
		organizationId: row.organizationId,
		legalCompanyId: row.legalCompanyId,
		licenceNumber: row.licenceNumber,
		normalizedLicenceNumber: row.normalizedLicenceNumber,
		licenceType: row.licenceType,
		authorityPartyId: row.authorityPartyId,
		authorityNameSnapshot: row.authorityNameSnapshot,
		jurisdictionCode: row.jurisdictionCode,
		scopeDescription: row.scopeDescription,
		validFrom: row.validFrom,
		validTo: row.validTo,
		status: row.status as CaLicencePermit["status"],
		version: row.version,
		createIdempotencyKey: row.createIdempotencyKey,
		createdBy: row.createdBy,
		updatedBy: row.updatedBy,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	};
}

function mapBankAccountRegistration(
	row: BankAccountRegistrationRow,
): CaBankAccountRegistration {
	return {
		id: row.id,
		organizationId: row.organizationId,
		legalCompanyId: row.legalCompanyId,
		bankPartyId: row.bankPartyId,
		bankPartyNameSnapshot: row.bankPartyNameSnapshot,
		accountIdentityToken: row.accountIdentityToken,
		displayMaskedAccount: row.displayMaskedAccount,
		countryCode: row.countryCode,
		currencyCode: row.currencyCode,
		accountPurpose: row.accountPurpose,
		openedDate: row.openedDate,
		closedDate: row.closedDate,
		status: row.status as CaBankAccountRegistration["status"],
		version: row.version,
		createIdempotencyKey: row.createIdempotencyKey,
		createdBy: row.createdBy,
		updatedBy: row.updatedBy,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	};
}

function mapBankMandate(row: BankMandateRow): CaBankMandate {
	return {
		id: row.id,
		organizationId: row.organizationId,
		legalCompanyId: row.legalCompanyId,
		bankAccountRegistrationId: row.bankAccountRegistrationId,
		mandateDescription: row.mandateDescription,
		signingRule: row.signingRule as CaBankMandate["signingRule"],
		effectiveFrom: row.effectiveFrom,
		effectiveTo: row.effectiveTo,
		status: row.status as CaBankMandate["status"],
		version: row.version,
		createIdempotencyKey: row.createIdempotencyKey,
		createdBy: row.createdBy,
		updatedBy: row.updatedBy,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	};
}

function mapGroupControlRelationship(
	row: GroupControlRelationshipRow,
): CaGroupControlRelationship {
	return {
		id: row.id,
		organizationId: row.organizationId,
		legalCompanyId: row.legalCompanyId,
		relationshipType: row.relationshipType,
		counterpartyLegalCompanyId: row.counterpartyLegalCompanyId,
		counterpartyPartyId: row.counterpartyPartyId,
		counterpartyNameSnapshot: row.counterpartyNameSnapshot,
		controlPercentage:
			row.controlPercentage != null ? String(row.controlPercentage) : null,
		effectiveFrom: row.effectiveFrom,
		effectiveTo: row.effectiveTo,
		status: row.status as CaGroupControlRelationship["status"],
		version: row.version,
		createIdempotencyKey: row.createIdempotencyKey,
		createdBy: row.createdBy,
		updatedBy: row.updatedBy,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	};
}

function mapMaterialAgreement(row: MaterialAgreementRow): CaMaterialAgreement {
	return {
		id: row.id,
		organizationId: row.organizationId,
		legalCompanyId: row.legalCompanyId,
		agreementCode: row.agreementCode,
		normalizedAgreementCode: row.normalizedAgreementCode,
		agreementType: row.agreementType,
		title: row.title,
		counterpartyPartyId: row.counterpartyPartyId,
		counterpartyNameSnapshot: row.counterpartyNameSnapshot,
		effectiveFrom: row.effectiveFrom,
		effectiveTo: row.effectiveTo,
		valueAmount: row.valueAmount != null ? String(row.valueAmount) : null,
		currencyCode: row.currencyCode,
		documentReference: row.documentReference,
		status: row.status as CaMaterialAgreement["status"],
		version: row.version,
		createIdempotencyKey: row.createIdempotencyKey,
		createdBy: row.createdBy,
		updatedBy: row.updatedBy,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	};
}

function mapCorporateDocument(row: CorporateDocumentRow): CaCorporateDocument {
	return {
		id: row.id,
		organizationId: row.organizationId,
		legalCompanyId: row.legalCompanyId,
		documentCode: row.documentCode,
		normalizedDocumentCode: row.normalizedDocumentCode,
		documentType: row.documentType,
		title: row.title,
		externalReference: row.externalReference,
		checksum: row.checksum,
		classification: row.classification,
		effectiveDate: row.effectiveDate,
		expiryDate: row.expiryDate,
		supersedesId: row.supersedesId,
		version: row.version,
		createIdempotencyKey: row.createIdempotencyKey,
		createdBy: row.createdBy,
		updatedBy: row.updatedBy,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	};
}

function mapFilingObligation(row: FilingObligationRow): CaFilingObligation {
	return {
		id: row.id,
		organizationId: row.organizationId,
		legalCompanyId: row.legalCompanyId,
		obligationCode: row.obligationCode,
		normalizedObligationCode: row.normalizedObligationCode,
		filingType: row.filingType,
		jurisdictionCode: row.jurisdictionCode,
		authorityName: row.authorityName,
		periodLabel: row.periodLabel,
		dueDate: row.dueDate,
		extensionDate: row.extensionDate,
		status: row.status as CaFilingObligation["status"],
		version: row.version,
		createIdempotencyKey: row.createIdempotencyKey,
		createdBy: row.createdBy,
		updatedBy: row.updatedBy,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	};
}

function mapFilingSubmission(row: FilingSubmissionRow): CaFilingSubmission {
	return {
		id: row.id,
		organizationId: row.organizationId,
		legalCompanyId: row.legalCompanyId,
		filingObligationId: row.filingObligationId,
		submissionReference: row.submissionReference,
		submittedAt: row.submittedAt,
		status: row.status as CaFilingSubmission["status"],
		acknowledgementReference: row.acknowledgementReference,
		rejectionReason: row.rejectionReason,
		evidenceReference: row.evidenceReference,
		createIdempotencyKey: row.createIdempotencyKey,
		createdBy: row.createdBy,
		createdAt: row.createdAt,
	};
}

async function fetchShareTransactionDetail(
	organizationId: string,
	shareTransactionId: string,
): Promise<CaShareTransactionDetail | null> {
	const transactions = await db
		.select()
		.from(caShareTransaction)
		.where(
			and(
				eq(caShareTransaction.organizationId, organizationId),
				eq(caShareTransaction.id, shareTransactionId),
			),
		)
		.limit(1);
	const transaction = transactions[0];
	if (!transaction) return null;
	const legs = await db
		.select()
		.from(caShareTransactionLeg)
		.where(
			and(
				eq(caShareTransactionLeg.organizationId, organizationId),
				eq(caShareTransactionLeg.shareTransactionId, shareTransactionId),
			),
		)
		.orderBy(asc(caShareTransactionLeg.legSequence));
	return {
		...mapShareTransaction(transaction),
		legs: legs.map(mapShareTransactionLeg),
	};
}

async function queryShareHoldingsAsOf(
	organizationId: string,
	legalCompanyId: string,
	asOf: string,
	shareClassId?: string,
): Promise<CaShareHolding[]> {
	const transactionConditions = [
		eq(caShareTransaction.organizationId, organizationId),
		eq(caShareTransaction.legalCompanyId, legalCompanyId),
		eq(caShareTransaction.status, "posted"),
		isNull(caShareTransaction.reversalOfId),
		lte(caShareTransaction.transactionDate, asOf),
	];
	if (shareClassId) {
		transactionConditions.push(
			eq(caShareTransaction.shareClassId, shareClassId),
		);
	}
	const transactions = await db
		.select()
		.from(caShareTransaction)
		.where(and(...transactionConditions));
	if (transactions.length === 0) return [];
	const transactionIds = transactions.map((row) => row.id);
	const legs = await db
		.select()
		.from(caShareTransactionLeg)
		.where(
			and(
				eq(caShareTransactionLeg.organizationId, organizationId),
				or(
					...transactionIds.map((id) =>
						eq(caShareTransactionLeg.shareTransactionId, id),
					),
				),
			),
		);
	const holdings = new Map<string, CaShareHolding>();
	const postedTransactionIds = new Set(transactionIds);
	for (const leg of legs) {
		if (!postedTransactionIds.has(leg.shareTransactionId)) continue;
		if (shareClassId && leg.shareClassId !== shareClassId) continue;
		const key = `${leg.shareClassId}:${leg.holderPartyId}`;
		const existing = holdings.get(key);
		const quantity = addDecimal(
			existing?.quantity ?? "0",
			String(leg.quantityDelta),
		);
		if (isZeroDecimal(quantity)) {
			holdings.delete(key);
			continue;
		}
		holdings.set(key, {
			shareClassId: leg.shareClassId,
			holderPartyId: leg.holderPartyId,
			holderPartyCodeSnapshot: leg.holderPartyCodeSnapshot,
			holderPartyNameSnapshot: leg.holderPartyNameSnapshot,
			quantity,
		});
	}
	return [...holdings.values()];
}

async function computeHoldingQuantity(
	organizationId: string,
	legalCompanyId: string,
	shareClassId: string,
	holderPartyId: string,
	asOf: string,
): Promise<string> {
	const holdings = await queryShareHoldingsAsOf(
		organizationId,
		legalCompanyId,
		asOf,
		shareClassId,
	);
	const match = holdings.find((row) => row.holderPartyId === holderPartyId);
	return match?.quantity ?? "0";
}

type ShareCapitalFactsInput = {
	auditId: string;
	eventId: string;
	organizationId: string;
	actorUserId: string;
	correlationId: string;
	eventType: string;
	entityType: string;
	entityId: string;
	legalCompanyId: string;
	status: string;
	version?: number | null;
	reversalOfId?: string | null;
};

function shareCapitalHolderLockKeys(
	organizationId: string,
	legs: ReadonlyArray<{
		shareClassId: string;
		holderPartyId: string;
	}>,
): string[] {
	const keys = new Set<string>();
	for (const leg of legs) {
		keys.add(`${organizationId}:${leg.shareClassId}:${leg.holderPartyId}`);
	}
	return [...keys];
}

function shareCapitalFactsStatements(
	neonSql: NeonHttpSql,
	input: ShareCapitalFactsInput,
	emitOutbox: boolean,
) {
	const statements = [
		neonSql`
			INSERT INTO platform_audit_log (
				id, organization_id, actor_user_id, correlation_id, module,
				entity, entity_id, action, changes
			) VALUES (
				${input.auditId}::uuid, ${input.organizationId}::text, ${input.actorUserId}::text,
				${input.correlationId}::text, 'corporate-administration', ${input.entityType}::text,
				${input.entityId}::text, 'CREATE', '[]'::jsonb
			)
		`,
	];
	if (emitOutbox) {
		statements.push(
			neonSql`
				INSERT INTO platform_domain_event (
					id, organization_id, type, source_module, correlation_id,
					actor_user_id, payload, status, attempts
				) VALUES (
					${input.eventId}::uuid, ${input.organizationId}::text, ${input.eventType}::text,
					'corporate-administration', ${input.correlationId}::text, ${input.actorUserId}::text,
					jsonb_build_object(
						'organizationId', ${input.organizationId}::text,
						'legalCompanyId', ${input.legalCompanyId}::uuid,
						'entityType', ${input.entityType}::text,
						'entityId', ${input.entityId}::uuid,
						'version', ${input.version ?? null}::integer,
						'actorId', ${input.actorUserId}::text,
						'correlationId', ${input.correlationId}::text,
						'status', ${input.status}::text,
						'reversalOfId', ${input.reversalOfId ?? null}::uuid
					), 'pending', 0
				)
			`,
		);
	}
	return statements;
}

export function createDrizzleSlicesStore(): SlicesStore {
	return {
		async getShareClassByIdempotencyKey(organizationId, idempotencyKey) {
			try {
				const rows = await db
					.select()
					.from(caShareClass)
					.where(
						and(
							eq(caShareClass.organizationId, organizationId),
							eq(caShareClass.createIdempotencyKey, idempotencyKey),
						),
					)
					.limit(1);
				return ok(rows[0] ? mapShareClass(rows[0]) : null);
			} catch (error) {
				return failFromUnknown(
					error,
					"Failed to load share class by idempotency key",
				);
			}
		},
		async createShareClass(record, mutation) {
			try {
				const existing = await db
					.select()
					.from(caShareClass)
					.where(
						and(
							eq(caShareClass.organizationId, record.organizationId),
							eq(
								caShareClass.createIdempotencyKey,
								record.createIdempotencyKey,
							),
						),
					)
					.limit(1);
				if (existing[0]) {
					return ok(mapShareClass(existing[0]));
				}
				const shareClassId = randomUUID();
				await runNeonHttpTransaction((neonSql) => [
					neonSql`
						INSERT INTO ca_share_class (
							id, organization_id, legal_company_id, code, normalized_code,
							class_type, par_value, currency_code, authorized_quantity, status,
							version, create_idempotency_key, created_by, updated_by
						) VALUES (
							${shareClassId}::uuid, ${record.organizationId}::text, ${record.legalCompanyId}::uuid,
							${record.code}::text, ${record.normalizedCode}::text, ${record.classType}::text,
							${record.parValue}::numeric, ${record.currencyCode}::text, ${record.authorizedQuantity}::numeric,
							${record.status}::text, 1, ${record.createIdempotencyKey}::text,
							${record.createdBy}::text, ${record.updatedBy}::text
						)
					`,
					...(mutation
						? shareCapitalFactsStatements(
								neonSql,
								{
									auditId: randomUUID(),
									eventId: randomUUID(),
									organizationId: record.organizationId,
									actorUserId: record.createdBy,
									correlationId: mutation.meta.correlationId,
									eventType: mutation.meta.eventType,
									entityType: "share_class",
									entityId: shareClassId,
									legalCompanyId: record.legalCompanyId,
									status: record.status,
									version: 1,
								},
								false,
							)
						: []),
				]);
				const rows = await db
					.select()
					.from(caShareClass)
					.where(
						and(
							eq(caShareClass.organizationId, record.organizationId),
							eq(caShareClass.id, shareClassId),
						),
					)
					.limit(1);
				const row = rows[0];
				if (!row) {
					return fail("INTERNAL_ERROR", "Failed to create share class");
				}
				return ok(mapShareClass(row));
			} catch (error) {
				if (isUniqueViolation(error)) {
					const byIdempotency = await db
						.select()
						.from(caShareClass)
						.where(
							and(
								eq(caShareClass.organizationId, record.organizationId),
								eq(
									caShareClass.createIdempotencyKey,
									record.createIdempotencyKey,
								),
							),
						)
						.limit(1);
					if (byIdempotency[0]) {
						return ok(mapShareClass(byIdempotency[0]));
					}
					return fail(
						"CONFLICT",
						"Share class code already exists",
						caErrorDetails(CA_ERROR_CODE_CONFLICT),
					);
				}
				return failFromUnknown(error, "Failed to create share class");
			}
		},
		async getShareClassById(organizationId, shareClassId) {
			try {
				const rows = await db
					.select()
					.from(caShareClass)
					.where(
						and(
							eq(caShareClass.organizationId, organizationId),
							eq(caShareClass.id, shareClassId),
						),
					)
					.limit(1);
				return ok(rows[0] ? mapShareClass(rows[0]) : null);
			} catch (error) {
				return failFromUnknown(error, "Failed to load share class");
			}
		},
		async listShareClasses(organizationId, legalCompanyId) {
			try {
				const rows = await db
					.select()
					.from(caShareClass)
					.where(
						and(
							eq(caShareClass.organizationId, organizationId),
							eq(caShareClass.legalCompanyId, legalCompanyId),
						),
					);
				return ok(rows.map(mapShareClass));
			} catch (error) {
				return failFromUnknown(error, "Failed to list share classes");
			}
		},
		async updateShareClass(record, expectedVersion) {
			try {
				const rows = await db
					.update(caShareClass)
					.set({
						classType: record.classType,
						parValue: record.parValue,
						authorizedQuantity: record.authorizedQuantity,
						status: record.status,
						version: record.version,
						updatedBy: record.updatedBy,
						updatedAt: new Date(),
					})
					.where(
						and(
							eq(caShareClass.organizationId, record.organizationId),
							eq(caShareClass.id, record.id),
							eq(caShareClass.version, expectedVersion),
						),
					)
					.returning();
				const row = rows[0];
				if (!row) {
					return fail("CONFLICT", "Share class version conflict");
				}
				return ok(mapShareClass(row));
			} catch (error) {
				return failFromUnknown(error, "Failed to update share class");
			}
		},
		async closeShareClass(record, expectedVersion, _mutation) {
			try {
				const rows = await db
					.update(caShareClass)
					.set({
						status: record.status,
						version: record.version,
						updatedBy: record.updatedBy,
						updatedAt: new Date(),
					})
					.where(
						and(
							eq(caShareClass.organizationId, record.organizationId),
							eq(caShareClass.id, record.id),
							eq(caShareClass.version, expectedVersion),
						),
					)
					.returning();
				const row = rows[0];
				if (!row) {
					return fail("CONFLICT", "Share class version conflict");
				}
				return ok(mapShareClass(row));
			} catch (error) {
				return failFromUnknown(error, "Failed to close share class");
			}
		},
		async getShareTransactionByIdempotencyKey(organizationId, idempotencyKey) {
			try {
				const rows = await db
					.select()
					.from(caShareTransaction)
					.where(
						and(
							eq(caShareTransaction.organizationId, organizationId),
							eq(caShareTransaction.createIdempotencyKey, idempotencyKey),
						),
					)
					.limit(1);
				return ok(rows[0] ? mapShareTransaction(rows[0]) : null);
			} catch (error) {
				return failFromUnknown(
					error,
					"Failed to load share transaction by idempotency key",
				);
			}
		},
		async createShareTransaction(record, legs, mutation) {
			try {
				const existing = await db
					.select()
					.from(caShareTransaction)
					.where(
						and(
							eq(caShareTransaction.organizationId, record.organizationId),
							eq(
								caShareTransaction.createIdempotencyKey,
								record.createIdempotencyKey,
							),
						),
					)
					.limit(1);
				if (existing[0]) {
					const detail = await fetchShareTransactionDetail(
						record.organizationId,
						existing[0].id,
					);
					if (!detail) {
						return fail("NOT_FOUND", "Share transaction not found");
					}
					return ok(detail);
				}
				const shareClassRows = await db
					.select()
					.from(caShareClass)
					.where(
						and(
							eq(caShareClass.organizationId, record.organizationId),
							eq(caShareClass.id, record.shareClassId),
						),
					)
					.limit(1);
				const shareClass = shareClassRows[0];
				if (
					!shareClass ||
					shareClass.legalCompanyId !== record.legalCompanyId
				) {
					return fail("NOT_FOUND", "Share class not found");
				}
				if (shareClass.status === "closed") {
					return fail("CONFLICT", "Share class is closed");
				}
				const legDeltas = legs.map((leg) => leg.quantityDelta);
				const totalDelta = sumDecimals(legDeltas);
				if (
					record.transactionType === "transfer" &&
					!isZeroDecimal(totalDelta)
				) {
					return fail("CONFLICT", "Transfer transaction legs must sum to zero");
				}
				if (record.transactionType === "issuance") {
					for (const delta of legDeltas) {
						if (isNegativeDecimal(delta) || isZeroDecimal(delta)) {
							return fail("CONFLICT", "Issuance legs must be positive");
						}
					}
				}
				for (const leg of legs) {
					if (isZeroDecimal(leg.quantityDelta)) {
						return fail(
							"CONFLICT",
							"Share transaction leg quantity cannot be zero",
						);
					}
					const current = await computeHoldingQuantity(
						record.organizationId,
						record.legalCompanyId,
						leg.shareClassId,
						leg.holderPartyId,
						record.transactionDate,
					);
					const next = addDecimal(current, leg.quantityDelta);
					if (isNegativeDecimal(next)) {
						return fail(
							"CONFLICT",
							"Insufficient share holding for transaction leg",
						);
					}
				}
				const transactionId = randomUUID();
				const normalizedReference = record.transactionReference
					.trim()
					.toUpperCase();
				const correlationId =
					mutation?.meta.correlationId ?? record.createIdempotencyKey;
				const auditId = randomUUID();
				const eventId = randomUUID();
				const savedLegs: CaShareTransactionLeg[] = legs.map((leg, index) => ({
					id: randomUUID(),
					organizationId: leg.organizationId,
					legalCompanyId: leg.legalCompanyId,
					shareTransactionId: transactionId,
					shareClassId: leg.shareClassId,
					holderPartyId: leg.holderPartyId,
					holderPartyCodeSnapshot: leg.holderPartyCodeSnapshot,
					holderPartyNameSnapshot: leg.holderPartyNameSnapshot,
					quantityDelta: leg.quantityDelta,
					legSequence: index + 1,
					createdAt: new Date(),
				}));
				const lockKeys = shareCapitalHolderLockKeys(
					record.organizationId,
					legs,
				);
				try {
					await runNeonHttpTransaction((neonSql) => [
						...lockKeys.map(
							(key) =>
								neonSql`SELECT pg_advisory_xact_lock(hashtextextended(${key}, 0))`,
						),
						neonSql`
							INSERT INTO ca_share_transaction (
								id, organization_id, legal_company_id, share_class_id,
								transaction_reference, normalized_reference, transaction_type,
								status, transaction_date, reversal_of_id,
								create_idempotency_key, correlation_id, created_by
							) VALUES (
								${transactionId}, ${record.organizationId}, ${record.legalCompanyId},
								${record.shareClassId}, ${record.transactionReference}, ${normalizedReference},
								${record.transactionType}, ${record.status}, ${record.transactionDate},
								${record.reversalOfId}, ${record.createIdempotencyKey}, ${correlationId},
								${record.createdBy}
							)
						`,
						...savedLegs.map(
							(leg) => neonSql`
								INSERT INTO ca_share_transaction_leg (
									id, organization_id, legal_company_id, share_transaction_id,
									share_class_id, holder_party_id, holder_party_code_snapshot,
									holder_party_name_snapshot, quantity_delta, leg_sequence
								) VALUES (
									${leg.id}, ${leg.organizationId}, ${leg.legalCompanyId},
									${leg.shareTransactionId}, ${leg.shareClassId}, ${leg.holderPartyId},
									${leg.holderPartyCodeSnapshot}, ${leg.holderPartyNameSnapshot},
									${leg.quantityDelta}, ${leg.legSequence}
								)
							`,
						),
						...(mutation
							? shareCapitalFactsStatements(
									neonSql,
									{
										auditId,
										eventId,
										organizationId: record.organizationId,
										actorUserId: record.createdBy,
										correlationId: mutation.meta.correlationId,
										eventType: mutation.meta.eventType,
										entityType: "share_transaction",
										entityId: transactionId,
										legalCompanyId: record.legalCompanyId,
										status: record.status,
										reversalOfId: record.reversalOfId,
									},
									true,
								)
							: []),
					]);
				} catch (error) {
					if (isUniqueViolation(error)) {
						const byIdempotency = await db
							.select()
							.from(caShareTransaction)
							.where(
								and(
									eq(caShareTransaction.organizationId, record.organizationId),
									eq(
										caShareTransaction.createIdempotencyKey,
										record.createIdempotencyKey,
									),
								),
							)
							.limit(1);
						if (byIdempotency[0]) {
							const detail = await fetchShareTransactionDetail(
								record.organizationId,
								byIdempotency[0].id,
							);
							if (detail) return ok(detail);
						}
						return fail(
							"CONFLICT",
							"Share transaction reference already exists",
							caErrorDetails(CA_ERROR_CODE_CONFLICT),
						);
					}
					throw error;
				}
				const detail = await fetchShareTransactionDetail(
					record.organizationId,
					transactionId,
				);
				if (!detail) {
					return fail("INTERNAL_ERROR", "Failed to create share transaction");
				}
				return ok(detail);
			} catch (error) {
				return failFromUnknown(error, "Failed to create share transaction");
			}
		},
		async getShareTransactionById(organizationId, shareTransactionId) {
			try {
				const detail = await fetchShareTransactionDetail(
					organizationId,
					shareTransactionId,
				);
				return ok(detail);
			} catch (error) {
				return failFromUnknown(error, "Failed to load share transaction");
			}
		},
		async listShareTransactions(organizationId, legalCompanyId) {
			try {
				const rows = await db
					.select()
					.from(caShareTransaction)
					.where(
						and(
							eq(caShareTransaction.organizationId, organizationId),
							eq(caShareTransaction.legalCompanyId, legalCompanyId),
						),
					);
				return ok(rows.map(mapShareTransaction));
			} catch (error) {
				return failFromUnknown(error, "Failed to list share transactions");
			}
		},
		async reverseShareTransaction(input) {
			try {
				const existing = await db
					.select()
					.from(caShareTransaction)
					.where(
						and(
							eq(caShareTransaction.organizationId, input.organizationId),
							eq(
								caShareTransaction.createIdempotencyKey,
								input.createIdempotencyKey,
							),
						),
					)
					.limit(1);
				if (existing[0]) {
					const detail = await fetchShareTransactionDetail(
						input.organizationId,
						existing[0].id,
					);
					if (!detail) {
						return fail("NOT_FOUND", "Share transaction not found");
					}
					return ok(detail);
				}
				const original = await fetchShareTransactionDetail(
					input.organizationId,
					input.originalTransactionId,
				);
				if (
					!original ||
					original.legalCompanyId !== input.legalCompanyId ||
					original.status !== "posted" ||
					original.reversalOfId
				) {
					return fail("NOT_FOUND", "Share transaction not found");
				}
				const reversalLegs = original.legs.map((leg) => ({
					...leg,
					quantityDelta: negateDecimal(leg.quantityDelta),
				}));
				for (const leg of reversalLegs) {
					const current = await computeHoldingQuantity(
						input.organizationId,
						input.legalCompanyId,
						leg.shareClassId,
						leg.holderPartyId,
						input.reversalDate,
					);
					if (isNegativeDecimal(addDecimal(current, leg.quantityDelta))) {
						return fail(
							"CONFLICT",
							"Insufficient share holding for reversal leg",
						);
					}
				}
				const reversalId = randomUUID();
				const normalizedReference = input.reversalReference
					.trim()
					.toUpperCase();
				const auditId = randomUUID();
				const eventId = randomUUID();
				const lockKeys = shareCapitalHolderLockKeys(
					input.organizationId,
					reversalLegs,
				);
				await runNeonHttpTransaction((neonSql) => [
					...lockKeys.map(
						(key) =>
							neonSql`SELECT pg_advisory_xact_lock(hashtextextended(${key}, 0))`,
					),
					neonSql`
						UPDATE ca_share_transaction
						SET status = 'reversed'
						WHERE organization_id = ${input.organizationId}
							AND id = ${input.originalTransactionId}
							AND status = 'posted'
					`,
					neonSql`
						INSERT INTO ca_share_transaction (
							id, organization_id, legal_company_id, share_class_id,
							transaction_reference, normalized_reference, transaction_type,
							status, transaction_date, reversal_of_id,
							create_idempotency_key, correlation_id, created_by
						) VALUES (
							${reversalId}, ${input.organizationId}, ${input.legalCompanyId},
							${original.shareClassId}, ${input.reversalReference}, ${normalizedReference},
							'correction', 'posted', ${input.reversalDate}, ${input.originalTransactionId},
							${input.createIdempotencyKey}, ${input.correlationId}, ${input.createdBy}
						)
					`,
					...reversalLegs.map(
						(leg, index) => neonSql`
							INSERT INTO ca_share_transaction_leg (
								id, organization_id, legal_company_id, share_transaction_id,
								share_class_id, holder_party_id, holder_party_code_snapshot,
								holder_party_name_snapshot, quantity_delta, leg_sequence
							) VALUES (
								${randomUUID()}, ${leg.organizationId}, ${leg.legalCompanyId},
								${reversalId}, ${leg.shareClassId}, ${leg.holderPartyId},
								${leg.holderPartyCodeSnapshot}, ${leg.holderPartyNameSnapshot},
								${leg.quantityDelta}, ${index + 1}
							)
						`,
					),
					...(input.mutation
						? shareCapitalFactsStatements(
								neonSql,
								{
									auditId,
									eventId,
									organizationId: input.organizationId,
									actorUserId: input.createdBy,
									correlationId: input.mutation.meta.correlationId,
									eventType: input.mutation.meta.eventType,
									entityType: "share_transaction",
									entityId: reversalId,
									legalCompanyId: input.legalCompanyId,
									status: "posted",
									reversalOfId: input.originalTransactionId,
								},
								true,
							)
						: []),
				]);
				const detail = await fetchShareTransactionDetail(
					input.organizationId,
					reversalId,
				);
				if (!detail) {
					return fail("INTERNAL_ERROR", "Failed to reverse share transaction");
				}
				return ok(detail);
			} catch (error) {
				return failFromUnknown(error, "Failed to reverse share transaction");
			}
		},
		async listShareHoldingsAsOf(
			organizationId,
			legalCompanyId,
			asOf,
			shareClassId,
		) {
			try {
				return ok(
					await queryShareHoldingsAsOf(
						organizationId,
						legalCompanyId,
						asOf,
						shareClassId,
					),
				);
			} catch (error) {
				return failFromUnknown(error, "Failed to list share holdings");
			}
		},
		async getShareCertificateByIdempotencyKey(organizationId, idempotencyKey) {
			try {
				const rows = await db
					.select()
					.from(caShareCertificate)
					.where(
						and(
							eq(caShareCertificate.organizationId, organizationId),
							eq(caShareCertificate.createIdempotencyKey, idempotencyKey),
						),
					)
					.limit(1);
				return ok(rows[0] ? mapShareCertificate(rows[0]) : null);
			} catch (error) {
				return failFromUnknown(
					error,
					"Failed to load share certificate by idempotency key",
				);
			}
		},
		async createShareCertificate(record) {
			try {
				const existing = await db
					.select()
					.from(caShareCertificate)
					.where(
						and(
							eq(caShareCertificate.organizationId, record.organizationId),
							eq(
								caShareCertificate.createIdempotencyKey,
								record.createIdempotencyKey,
							),
						),
					)
					.limit(1);
				if (existing[0]) {
					return ok(mapShareCertificate(existing[0]));
				}
				const rows = await db
					.insert(caShareCertificate)
					.values({
						id: randomUUID(),
						organizationId: record.organizationId,
						legalCompanyId: record.legalCompanyId,
						shareClassId: record.shareClassId,
						shareTransactionId: record.shareTransactionId,
						certificateNumber: record.certificateNumber,
						normalizedCertificateNumber: record.normalizedCertificateNumber,
						holderPartyId: record.holderPartyId,
						holderPartyCodeSnapshot: record.holderPartyCodeSnapshot,
						holderPartyNameSnapshot: record.holderPartyNameSnapshot,
						issuedDate: record.issuedDate,
						status: record.status,
						version: 1,
						createIdempotencyKey: record.createIdempotencyKey,
						createdBy: record.createdBy,
						updatedBy: record.updatedBy,
					})
					.returning();
				const row = rows[0];
				if (!row) {
					return fail("INTERNAL_ERROR", "Failed to create share certificate");
				}
				return ok(mapShareCertificate(row));
			} catch (error) {
				if (isUniqueViolation(error)) {
					const byIdempotency = await db
						.select()
						.from(caShareCertificate)
						.where(
							and(
								eq(caShareCertificate.organizationId, record.organizationId),
								eq(
									caShareCertificate.createIdempotencyKey,
									record.createIdempotencyKey,
								),
							),
						)
						.limit(1);
					if (byIdempotency[0]) {
						return ok(mapShareCertificate(byIdempotency[0]));
					}
					return fail(
						"CONFLICT",
						"Share certificate number already exists",
						caErrorDetails(CA_ERROR_CODE_CONFLICT),
					);
				}
				return failFromUnknown(error, "Failed to create share certificate");
			}
		},
		async getShareCertificateById(organizationId, shareCertificateId) {
			try {
				const rows = await db
					.select()
					.from(caShareCertificate)
					.where(
						and(
							eq(caShareCertificate.organizationId, organizationId),
							eq(caShareCertificate.id, shareCertificateId),
						),
					)
					.limit(1);
				return ok(rows[0] ? mapShareCertificate(rows[0]) : null);
			} catch (error) {
				return failFromUnknown(error, "Failed to load share certificate");
			}
		},
		async listShareCertificates(organizationId, legalCompanyId) {
			try {
				const rows = await db
					.select()
					.from(caShareCertificate)
					.where(
						and(
							eq(caShareCertificate.organizationId, organizationId),
							eq(caShareCertificate.legalCompanyId, legalCompanyId),
						),
					);
				return ok(rows.map(mapShareCertificate));
			} catch (error) {
				return failFromUnknown(error, "Failed to list share certificates");
			}
		},
		async replaceShareCertificate(input) {
			try {
				const existing = await db
					.select()
					.from(caShareCertificate)
					.where(
						and(
							eq(
								caShareCertificate.organizationId,
								input.replacement.organizationId,
							),
							eq(
								caShareCertificate.createIdempotencyKey,
								input.replacement.createIdempotencyKey,
							),
						),
					)
					.limit(1);
				if (existing[0]) {
					return ok(mapShareCertificate(existing[0]));
				}
				await db
					.update(caShareCertificate)
					.set({
						status: "replaced",
						version: input.prior.version + 1,
						updatedBy: input.replacement.updatedBy,
						updatedAt: new Date(),
					})
					.where(
						and(
							eq(caShareCertificate.organizationId, input.prior.organizationId),
							eq(caShareCertificate.id, input.prior.id),
							eq(caShareCertificate.version, input.prior.version),
						),
					);
				const rows = await db
					.insert(caShareCertificate)
					.values({
						id: randomUUID(),
						organizationId: input.replacement.organizationId,
						legalCompanyId: input.replacement.legalCompanyId,
						shareClassId: input.replacement.shareClassId,
						shareTransactionId: input.replacement.shareTransactionId,
						certificateNumber: input.replacement.certificateNumber,
						normalizedCertificateNumber:
							input.replacement.normalizedCertificateNumber,
						holderPartyId: input.replacement.holderPartyId,
						holderPartyCodeSnapshot: input.replacement.holderPartyCodeSnapshot,
						holderPartyNameSnapshot: input.replacement.holderPartyNameSnapshot,
						issuedDate: input.replacement.issuedDate,
						status: input.replacement.status,
						version: 1,
						createIdempotencyKey: input.replacement.createIdempotencyKey,
						createdBy: input.replacement.createdBy,
						updatedBy: input.replacement.updatedBy,
					})
					.returning();
				const row = rows[0];
				if (!row) {
					return fail("INTERNAL_ERROR", "Failed to replace share certificate");
				}
				return ok(mapShareCertificate(row));
			} catch (error) {
				return failFromUnknown(error, "Failed to replace share certificate");
			}
		},
		async cancelShareCertificate(record, expectedVersion) {
			try {
				const rows = await db
					.update(caShareCertificate)
					.set({
						status: record.status,
						version: record.version,
						updatedBy: record.updatedBy,
						updatedAt: new Date(),
					})
					.where(
						and(
							eq(caShareCertificate.organizationId, record.organizationId),
							eq(caShareCertificate.id, record.id),
							eq(caShareCertificate.version, expectedVersion),
						),
					)
					.returning();
				const row = rows[0];
				if (!row) {
					return fail("CONFLICT", "Share certificate version conflict");
				}
				return ok(mapShareCertificate(row));
			} catch (error) {
				return failFromUnknown(error, "Failed to cancel share certificate");
			}
		},
		async getBeneficialOwnerDisclosureByIdempotencyKey(
			organizationId,
			idempotencyKey,
		) {
			try {
				const rows = await db
					.select()
					.from(caBeneficialOwnerDisclosure)
					.where(
						and(
							eq(caBeneficialOwnerDisclosure.organizationId, organizationId),
							eq(
								caBeneficialOwnerDisclosure.createIdempotencyKey,
								idempotencyKey,
							),
						),
					)
					.limit(1);
				return ok(rows[0] ? mapBeneficialOwnerDisclosure(rows[0]) : null);
			} catch (error) {
				return failFromUnknown(
					error,
					"Failed to load beneficial owner disclosure by idempotency key",
				);
			}
		},
		async createBeneficialOwnerDisclosure(record) {
			try {
				const existing = await db
					.select()
					.from(caBeneficialOwnerDisclosure)
					.where(
						and(
							eq(
								caBeneficialOwnerDisclosure.organizationId,
								record.organizationId,
							),
							eq(
								caBeneficialOwnerDisclosure.createIdempotencyKey,
								record.createIdempotencyKey,
							),
						),
					)
					.limit(1);
				if (existing[0]) {
					return ok(mapBeneficialOwnerDisclosure(existing[0]));
				}
				const rows = await db
					.insert(caBeneficialOwnerDisclosure)
					.values({
						id: randomUUID(),
						organizationId: record.organizationId,
						legalCompanyId: record.legalCompanyId,
						partyId: record.partyId,
						partyCodeSnapshot: record.partyCodeSnapshot,
						partyNameSnapshot: record.partyNameSnapshot,
						natureOfControlCodes: record.natureOfControlCodes,
						effectiveFrom: record.effectiveFrom,
						effectiveTo: record.effectiveTo,
						verificationStatus: record.verificationStatus,
						evidenceReference: record.evidenceReference,
						version: 1,
						createIdempotencyKey: record.createIdempotencyKey,
						createdBy: record.createdBy,
						updatedBy: record.updatedBy,
					})
					.returning();
				const row = rows[0];
				if (!row) {
					return fail(
						"INTERNAL_ERROR",
						"Failed to create beneficial owner disclosure",
					);
				}
				return ok(mapBeneficialOwnerDisclosure(row));
			} catch (error) {
				if (isUniqueViolation(error)) {
					const rows = await db
						.select()
						.from(caBeneficialOwnerDisclosure)
						.where(
							and(
								eq(
									caBeneficialOwnerDisclosure.organizationId,
									record.organizationId,
								),
								eq(
									caBeneficialOwnerDisclosure.createIdempotencyKey,
									record.createIdempotencyKey,
								),
							),
						)
						.limit(1);
					if (rows[0]) {
						return ok(mapBeneficialOwnerDisclosure(rows[0]));
					}
				}
				return failFromUnknown(
					error,
					"Failed to create beneficial owner disclosure",
				);
			}
		},
		async getBeneficialOwnerDisclosureById(
			organizationId,
			beneficialOwnerDisclosureId,
		) {
			try {
				const rows = await db
					.select()
					.from(caBeneficialOwnerDisclosure)
					.where(
						and(
							eq(caBeneficialOwnerDisclosure.organizationId, organizationId),
							eq(caBeneficialOwnerDisclosure.id, beneficialOwnerDisclosureId),
						),
					)
					.limit(1);
				return ok(rows[0] ? mapBeneficialOwnerDisclosure(rows[0]) : null);
			} catch (error) {
				return failFromUnknown(
					error,
					"Failed to load beneficial owner disclosure",
				);
			}
		},
		async listBeneficialOwnerDisclosures(organizationId, legalCompanyId) {
			try {
				const rows = await db
					.select()
					.from(caBeneficialOwnerDisclosure)
					.where(
						and(
							eq(caBeneficialOwnerDisclosure.organizationId, organizationId),
							eq(caBeneficialOwnerDisclosure.legalCompanyId, legalCompanyId),
						),
					);
				return ok(rows.map(mapBeneficialOwnerDisclosure));
			} catch (error) {
				return failFromUnknown(
					error,
					"Failed to list beneficial owner disclosures",
				);
			}
		},
		async updateBeneficialOwnerDisclosure(record, expectedVersion) {
			try {
				const rows = await db
					.update(caBeneficialOwnerDisclosure)
					.set({
						natureOfControlCodes: record.natureOfControlCodes,
						evidenceReference: record.evidenceReference,
						verificationStatus: record.verificationStatus,
						effectiveTo: record.effectiveTo,
						version: record.version,
						updatedBy: record.updatedBy,
						updatedAt: new Date(),
					})
					.where(
						and(
							eq(
								caBeneficialOwnerDisclosure.organizationId,
								record.organizationId,
							),
							eq(caBeneficialOwnerDisclosure.id, record.id),
							eq(caBeneficialOwnerDisclosure.version, expectedVersion),
						),
					)
					.returning();
				const row = rows[0];
				if (!row) {
					return fail(
						"CONFLICT",
						"Beneficial owner disclosure version conflict",
					);
				}
				return ok(mapBeneficialOwnerDisclosure(row));
			} catch (error) {
				return failFromUnknown(
					error,
					"Failed to update beneficial owner disclosure",
				);
			}
		},
		async endBeneficialOwnerDisclosure(record, expectedVersion, _mutation) {
			try {
				const rows = await db
					.update(caBeneficialOwnerDisclosure)
					.set({
						effectiveTo: record.effectiveTo,
						version: record.version,
						updatedBy: record.updatedBy,
						updatedAt: new Date(),
					})
					.where(
						and(
							eq(
								caBeneficialOwnerDisclosure.organizationId,
								record.organizationId,
							),
							eq(caBeneficialOwnerDisclosure.id, record.id),
							eq(caBeneficialOwnerDisclosure.version, expectedVersion),
						),
					)
					.returning();
				const row = rows[0];
				if (!row) {
					return fail(
						"CONFLICT",
						"Beneficial owner disclosure version conflict",
					);
				}
				return ok(mapBeneficialOwnerDisclosure(row));
			} catch (error) {
				return failFromUnknown(
					error,
					"Failed to end beneficial owner disclosure",
				);
			}
		},
		async listBeneficialOwnerDisclosuresAsOf(
			organizationId,
			legalCompanyId,
			asOf,
		) {
			try {
				const rows = await db
					.select()
					.from(caBeneficialOwnerDisclosure)
					.where(
						and(
							eq(caBeneficialOwnerDisclosure.organizationId, organizationId),
							eq(caBeneficialOwnerDisclosure.legalCompanyId, legalCompanyId),
							lte(caBeneficialOwnerDisclosure.effectiveFrom, asOf),
							or(
								sql`${caBeneficialOwnerDisclosure.effectiveTo} IS NULL`,
								sql`${caBeneficialOwnerDisclosure.effectiveTo} >= ${asOf}`,
							),
						),
					);
				return ok(rows.map(mapBeneficialOwnerDisclosure));
			} catch (error) {
				return failFromUnknown(
					error,
					"Failed to list beneficial owner disclosures as-of",
				);
			}
		},
		async getPropertyHoldingByIdempotencyKey(organizationId, idempotencyKey) {
			try {
				const rows = await db
					.select()
					.from(caPropertyHolding)
					.where(
						and(
							eq(caPropertyHolding.organizationId, organizationId),
							eq(caPropertyHolding.createIdempotencyKey, idempotencyKey),
						),
					)
					.limit(1);
				return ok(rows[0] ? mapPropertyHolding(rows[0]) : null);
			} catch (error) {
				return failFromUnknown(
					error,
					"Failed to load property holding by idempotency key",
				);
			}
		},
		async createPropertyHolding(record, mutation) {
			try {
				const existing = await db
					.select()
					.from(caPropertyHolding)
					.where(
						and(
							eq(caPropertyHolding.organizationId, record.organizationId),
							eq(
								caPropertyHolding.createIdempotencyKey,
								record.createIdempotencyKey,
							),
						),
					)
					.limit(1);
				if (existing[0]) {
					if (
						existing[0].createRequestFingerprint !==
						record.createRequestFingerprint
					) {
						return fail(
							"CONFLICT",
							"Idempotency key was already used for a different request",
							caErrorDetails(CA_ERROR_IDEMPOTENCY_CONFLICT),
						);
					}
					return ok(mapPropertyHolding(existing[0]));
				}
				const rows = await db
					.insert(caPropertyHolding)
					.values({
						id: randomUUID(),
						organizationId: record.organizationId,
						legalCompanyId: record.legalCompanyId,
						code: record.code,
						normalizedCode: record.normalizedCode,
						propertyType: record.propertyType,
						titleReference: record.titleReference,
						normalizedTitleReference: record.normalizedTitleReference,
						propertyDescription: record.propertyDescription,
						ownershipPercentage: record.ownershipPercentage,
						acquisitionDate: record.acquisitionDate,
						disposalDate: record.disposalDate,
						tenureType: record.tenureType,
						valuationReference: record.valuationReference,
						disposalReason: record.disposalReason,
						disposalEvidenceReference: record.disposalEvidenceReference,
						status: record.status,
						version: 1,
						createIdempotencyKey: record.createIdempotencyKey,
						createRequestFingerprint: record.createRequestFingerprint,
						createdBy: record.createdBy,
						updatedBy: record.updatedBy,
					})
					.returning();
				const row = rows[0];
				if (!row) {
					return fail("INTERNAL_ERROR", "Failed to create property holding");
				}
				const mapped = mapPropertyHolding(row);
				await insertCa4Receipt(mapped, "property", mutation);
				return ok(mapped);
			} catch (error) {
				if (isUniqueViolation(error)) {
					const byIdempotency = await db
						.select()
						.from(caPropertyHolding)
						.where(
							and(
								eq(caPropertyHolding.organizationId, record.organizationId),
								eq(
									caPropertyHolding.createIdempotencyKey,
									record.createIdempotencyKey,
								),
							),
						)
						.limit(1);
					if (byIdempotency[0]) {
						if (
							byIdempotency[0].createRequestFingerprint !==
							record.createRequestFingerprint
						) {
							return fail(
								"CONFLICT",
								"Idempotency key was already used for a different request",
								caErrorDetails(CA_ERROR_IDEMPOTENCY_CONFLICT),
							);
						}
						return ok(mapPropertyHolding(byIdempotency[0]));
					}
					return fail(
						"CONFLICT",
						"Property holding code already exists",
						caErrorDetails(CA_ERROR_CODE_CONFLICT),
					);
				}
				return failFromUnknown(error, "Failed to create property holding");
			}
		},
		async updatePropertyHolding(record, expectedVersion, mutation) {
			try {
				const rows = await db
					.update(caPropertyHolding)
					.set({
						propertyDescription: record.propertyDescription,
						ownershipPercentage: record.ownershipPercentage,
						tenureType: record.tenureType,
						valuationReference: record.valuationReference,
						disposalDate: record.disposalDate,
						disposalReason: record.disposalReason,
						disposalEvidenceReference: record.disposalEvidenceReference,
						status: record.status,
						version: expectedVersion + 1,
						updatedBy: record.updatedBy,
						updatedAt: new Date(),
					})
					.where(
						and(
							eq(caPropertyHolding.organizationId, record.organizationId),
							eq(caPropertyHolding.id, record.id),
							eq(caPropertyHolding.version, expectedVersion),
						),
					)
					.returning();
				if (!rows[0]) return fail("CONFLICT", "Property version conflict");
				const mapped = mapPropertyHolding(rows[0]);
				await insertCa4Receipt(mapped, "property", mutation);
				return ok(mapped);
			} catch (error) {
				return failFromUnknown(error, "Failed to update property");
			}
		},
		async getPropertyHoldingById(organizationId, propertyHoldingId) {
			try {
				const rows = await db
					.select()
					.from(caPropertyHolding)
					.where(
						and(
							eq(caPropertyHolding.organizationId, organizationId),
							eq(caPropertyHolding.id, propertyHoldingId),
						),
					)
					.limit(1);
				return ok(rows[0] ? mapPropertyHolding(rows[0]) : null);
			} catch (error) {
				return failFromUnknown(error, "Failed to load property holding");
			}
		},
		async listPropertyHoldings(organizationId, legalCompanyId) {
			try {
				const rows = await db
					.select()
					.from(caPropertyHolding)
					.where(
						and(
							eq(caPropertyHolding.organizationId, organizationId),
							eq(caPropertyHolding.legalCompanyId, legalCompanyId),
						),
					);
				return ok(rows.map(mapPropertyHolding));
			} catch (error) {
				return failFromUnknown(error, "Failed to list property holdings");
			}
		},
		async getCorporateAssetByIdempotencyKey(organizationId, idempotencyKey) {
			try {
				const rows = await db
					.select()
					.from(caCorporateAsset)
					.where(
						and(
							eq(caCorporateAsset.organizationId, organizationId),
							eq(caCorporateAsset.createIdempotencyKey, idempotencyKey),
						),
					)
					.limit(1);
				return ok(rows[0] ? mapCorporateAsset(rows[0]) : null);
			} catch (error) {
				return failFromUnknown(
					error,
					"Failed to load corporate asset by idempotency key",
				);
			}
		},
		async createCorporateAsset(record, mutation) {
			try {
				const existing = await db
					.select()
					.from(caCorporateAsset)
					.where(
						and(
							eq(caCorporateAsset.organizationId, record.organizationId),
							eq(
								caCorporateAsset.createIdempotencyKey,
								record.createIdempotencyKey,
							),
						),
					)
					.limit(1);
				if (existing[0]) {
					if (
						existing[0].createRequestFingerprint !==
						record.createRequestFingerprint
					) {
						return fail(
							"CONFLICT",
							"Idempotency key was already used for a different request",
							caErrorDetails(CA_ERROR_IDEMPOTENCY_CONFLICT),
						);
					}
					return ok(mapCorporateAsset(existing[0]));
				}
				const rows = await db
					.insert(caCorporateAsset)
					.values({
						id: randomUUID(),
						organizationId: record.organizationId,
						legalCompanyId: record.legalCompanyId,
						code: record.code,
						normalizedCode: record.normalizedCode,
						assetCategory: record.assetCategory,
						identifier: record.identifier,
						normalizedIdentifier: record.normalizedIdentifier,
						description: record.description,
						custodianPartyId: record.custodianPartyId,
						custodianPartyCodeSnapshot: record.custodianPartyCodeSnapshot,
						custodianPartyNameSnapshot: record.custodianPartyNameSnapshot,
						acquisitionDate: record.acquisitionDate,
						disposalDate: record.disposalDate,
						writeOffDate: record.writeOffDate,
						terminalReason: record.terminalReason,
						terminalEvidenceReference: record.terminalEvidenceReference,
						status: record.status,
						version: 1,
						createIdempotencyKey: record.createIdempotencyKey,
						createRequestFingerprint: record.createRequestFingerprint,
						createdBy: record.createdBy,
						updatedBy: record.updatedBy,
					})
					.returning();
				const row = rows[0];
				if (!row) {
					return fail("INTERNAL_ERROR", "Failed to create corporate asset");
				}
				const mapped = mapCorporateAsset(row);
				await insertCa4Receipt(mapped, "asset", mutation);
				return ok(mapped);
			} catch (error) {
				if (isUniqueViolation(error)) {
					const byIdempotency = await db
						.select()
						.from(caCorporateAsset)
						.where(
							and(
								eq(caCorporateAsset.organizationId, record.organizationId),
								eq(
									caCorporateAsset.createIdempotencyKey,
									record.createIdempotencyKey,
								),
							),
						)
						.limit(1);
					if (byIdempotency[0]) {
						if (
							byIdempotency[0].createRequestFingerprint !==
							record.createRequestFingerprint
						) {
							return fail(
								"CONFLICT",
								"Idempotency key was already used for a different request",
								caErrorDetails(CA_ERROR_IDEMPOTENCY_CONFLICT),
							);
						}
						return ok(mapCorporateAsset(byIdempotency[0]));
					}
					return fail(
						"CONFLICT",
						"Corporate asset code already exists",
						caErrorDetails(CA_ERROR_CODE_CONFLICT),
					);
				}
				return failFromUnknown(error, "Failed to create corporate asset");
			}
		},
		async updateCorporateAsset(record, expectedVersion, mutation) {
			try {
				const rows = await db
					.update(caCorporateAsset)
					.set({
						description: record.description,
						custodianPartyId: record.custodianPartyId,
						custodianPartyCodeSnapshot: record.custodianPartyCodeSnapshot,
						custodianPartyNameSnapshot: record.custodianPartyNameSnapshot,
						disposalDate: record.disposalDate,
						writeOffDate: record.writeOffDate,
						terminalReason: record.terminalReason,
						terminalEvidenceReference: record.terminalEvidenceReference,
						status: record.status,
						version: expectedVersion + 1,
						updatedBy: record.updatedBy,
						updatedAt: new Date(),
					})
					.where(
						and(
							eq(caCorporateAsset.organizationId, record.organizationId),
							eq(caCorporateAsset.id, record.id),
							eq(caCorporateAsset.version, expectedVersion),
						),
					)
					.returning();
				if (!rows[0])
					return fail("CONFLICT", "Corporate asset version conflict");
				const mapped = mapCorporateAsset(rows[0]);
				await insertCa4Receipt(mapped, "asset", mutation);
				return ok(mapped);
			} catch (error) {
				return failFromUnknown(error, "Failed to update corporate asset");
			}
		},
		async getCorporateAssetById(organizationId, corporateAssetId) {
			try {
				const rows = await db
					.select()
					.from(caCorporateAsset)
					.where(
						and(
							eq(caCorporateAsset.organizationId, organizationId),
							eq(caCorporateAsset.id, corporateAssetId),
						),
					)
					.limit(1);
				return ok(rows[0] ? mapCorporateAsset(rows[0]) : null);
			} catch (error) {
				return failFromUnknown(error, "Failed to load corporate asset");
			}
		},
		async listCorporateAssets(organizationId, legalCompanyId) {
			try {
				const rows = await db
					.select()
					.from(caCorporateAsset)
					.where(
						and(
							eq(caCorporateAsset.organizationId, organizationId),
							eq(caCorporateAsset.legalCompanyId, legalCompanyId),
						),
					);
				return ok(rows.map(mapCorporateAsset));
			} catch (error) {
				return failFromUnknown(error, "Failed to list corporate assets");
			}
		},
		async getIntellectualPropertyRightByIdempotencyKey(
			organizationId,
			idempotencyKey,
		) {
			try {
				const rows = await db
					.select()
					.from(caIntellectualPropertyRight)
					.where(
						and(
							eq(caIntellectualPropertyRight.organizationId, organizationId),
							eq(
								caIntellectualPropertyRight.createIdempotencyKey,
								idempotencyKey,
							),
						),
					)
					.limit(1);
				return ok(rows[0] ? mapIntellectualPropertyRight(rows[0]) : null);
			} catch (error) {
				return failFromUnknown(
					error,
					"Failed to load intellectual property right by idempotency key",
				);
			}
		},
		async createIntellectualPropertyRight(record, mutation) {
			try {
				const existing = await db
					.select()
					.from(caIntellectualPropertyRight)
					.where(
						and(
							eq(
								caIntellectualPropertyRight.organizationId,
								record.organizationId,
							),
							eq(
								caIntellectualPropertyRight.createIdempotencyKey,
								record.createIdempotencyKey,
							),
						),
					)
					.limit(1);
				if (existing[0]) {
					if (
						existing[0].createRequestFingerprint !==
						record.createRequestFingerprint
					) {
						return fail(
							"CONFLICT",
							"Idempotency key was already used for a different request",
							caErrorDetails(CA_ERROR_IDEMPOTENCY_CONFLICT),
						);
					}
					return ok(mapIntellectualPropertyRight(existing[0]));
				}
				const rows = await db
					.insert(caIntellectualPropertyRight)
					.values({
						id: randomUUID(),
						organizationId: record.organizationId,
						legalCompanyId: record.legalCompanyId,
						code: record.code,
						normalizedCode: record.normalizedCode,
						rightType: record.rightType,
						jurisdictionCode: record.jurisdictionCode,
						applicationNumber: record.applicationNumber,
						registrationNumber: record.registrationNumber,
						normalizedRightNumber: record.normalizedRightNumber,
						ownerPartyId: record.ownerPartyId,
						ownerPartyCodeSnapshot: record.ownerPartyCodeSnapshot,
						ownerPartyNameSnapshot: record.ownerPartyNameSnapshot,
						filingDate: record.filingDate,
						grantDate: record.grantDate,
						expiryDate: record.expiryDate,
						lastRenewalDate: record.lastRenewalDate,
						disposalDate: record.disposalDate,
						terminalReason: record.terminalReason,
						terminalEvidenceReference: record.terminalEvidenceReference,
						status: record.status,
						version: 1,
						createIdempotencyKey: record.createIdempotencyKey,
						createRequestFingerprint: record.createRequestFingerprint,
						createdBy: record.createdBy,
						updatedBy: record.updatedBy,
					})
					.returning();
				const row = rows[0];
				if (!row) {
					return fail(
						"INTERNAL_ERROR",
						"Failed to create intellectual property right",
					);
				}
				const mapped = mapIntellectualPropertyRight(row);
				await insertCa4Receipt(mapped, "intellectual-property", mutation);
				return ok(mapped);
			} catch (error) {
				if (isUniqueViolation(error)) {
					const byIdempotency = await db
						.select()
						.from(caIntellectualPropertyRight)
						.where(
							and(
								eq(
									caIntellectualPropertyRight.organizationId,
									record.organizationId,
								),
								eq(
									caIntellectualPropertyRight.createIdempotencyKey,
									record.createIdempotencyKey,
								),
							),
						)
						.limit(1);
					if (byIdempotency[0]) {
						if (
							byIdempotency[0].createRequestFingerprint !==
							record.createRequestFingerprint
						) {
							return fail(
								"CONFLICT",
								"Idempotency key was already used for a different request",
								caErrorDetails(CA_ERROR_IDEMPOTENCY_CONFLICT),
							);
						}
						return ok(mapIntellectualPropertyRight(byIdempotency[0]));
					}
					return fail(
						"CONFLICT",
						"Intellectual property code already exists",
						caErrorDetails(CA_ERROR_CODE_CONFLICT),
					);
				}
				return failFromUnknown(
					error,
					"Failed to create intellectual property right",
				);
			}
		},
		async updateIntellectualPropertyRight(
			record,
			expectedVersion,
			renewal,
			mutation,
		) {
			try {
				const rows = await db
					.update(caIntellectualPropertyRight)
					.set({
						ownerPartyId: record.ownerPartyId,
						ownerPartyCodeSnapshot: record.ownerPartyCodeSnapshot,
						ownerPartyNameSnapshot: record.ownerPartyNameSnapshot,
						grantDate: record.grantDate,
						expiryDate: record.expiryDate,
						lastRenewalDate: record.lastRenewalDate,
						disposalDate: record.disposalDate,
						terminalReason: record.terminalReason,
						terminalEvidenceReference: record.terminalEvidenceReference,
						status: record.status,
						version: expectedVersion + 1,
						updatedBy: record.updatedBy,
						updatedAt: new Date(),
					})
					.where(
						and(
							eq(
								caIntellectualPropertyRight.organizationId,
								record.organizationId,
							),
							eq(caIntellectualPropertyRight.id, record.id),
							eq(caIntellectualPropertyRight.version, expectedVersion),
						),
					)
					.returning();
				if (!rows[0]) return fail("CONFLICT", "IP right version conflict");
				if (renewal) {
					await db.insert(caIntellectualPropertyRenewal).values({
						id: randomUUID(),
						...renewal,
					});
				}
				const mapped = mapIntellectualPropertyRight(rows[0]);
				await insertCa4Receipt(mapped, "intellectual-property", mutation);
				return ok(mapped);
			} catch (error) {
				return failFromUnknown(error, "Failed to update intellectual property");
			}
		},
		async listIntellectualPropertyRenewals(
			organizationId,
			intellectualPropertyRightId,
		) {
			try {
				const rows = await db
					.select()
					.from(caIntellectualPropertyRenewal)
					.where(
						and(
							eq(caIntellectualPropertyRenewal.organizationId, organizationId),
							eq(
								caIntellectualPropertyRenewal.intellectualPropertyRightId,
								intellectualPropertyRightId,
							),
						),
					)
					.orderBy(asc(caIntellectualPropertyRenewal.renewalDate));
				return ok(rows.map(mapIntellectualPropertyRenewal));
			} catch (error) {
				return failFromUnknown(error, "Failed to list IP renewals");
			}
		},
		async getIntellectualPropertyRightById(
			organizationId,
			intellectualPropertyRightId,
		) {
			try {
				const rows = await db
					.select()
					.from(caIntellectualPropertyRight)
					.where(
						and(
							eq(caIntellectualPropertyRight.organizationId, organizationId),
							eq(caIntellectualPropertyRight.id, intellectualPropertyRightId),
						),
					)
					.limit(1);
				return ok(rows[0] ? mapIntellectualPropertyRight(rows[0]) : null);
			} catch (error) {
				return failFromUnknown(
					error,
					"Failed to load intellectual property right",
				);
			}
		},
		async listIntellectualPropertyRights(organizationId, legalCompanyId) {
			try {
				const rows = await db
					.select()
					.from(caIntellectualPropertyRight)
					.where(
						and(
							eq(caIntellectualPropertyRight.organizationId, organizationId),
							eq(caIntellectualPropertyRight.legalCompanyId, legalCompanyId),
						),
					);
				return ok(rows.map(mapIntellectualPropertyRight));
			} catch (error) {
				return failFromUnknown(
					error,
					"Failed to list intellectual property rights",
				);
			}
		},
		async getInsurancePolicyByIdempotencyKey(organizationId, idempotencyKey) {
			try {
				const rows = await db
					.select()
					.from(caInsurancePolicy)
					.where(
						and(
							eq(caInsurancePolicy.organizationId, organizationId),
							eq(caInsurancePolicy.createIdempotencyKey, idempotencyKey),
						),
					)
					.limit(1);
				return ok(rows[0] ? mapInsurancePolicy(rows[0]) : null);
			} catch (error) {
				return failFromUnknown(
					error,
					"Failed to load insurance policy by idempotency key",
				);
			}
		},
		async createInsurancePolicy(record, mutation) {
			try {
				const existing = await db
					.select()
					.from(caInsurancePolicy)
					.where(
						and(
							eq(caInsurancePolicy.organizationId, record.organizationId),
							eq(
								caInsurancePolicy.createIdempotencyKey,
								record.createIdempotencyKey,
							),
						),
					)
					.limit(1);
				if (existing[0]) {
					if (
						existing[0].createRequestFingerprint !==
						record.createRequestFingerprint
					) {
						return fail(
							"CONFLICT",
							"Idempotency key was already used for a different request",
							caErrorDetails(CA_ERROR_IDEMPOTENCY_CONFLICT),
						);
					}
					return ok(mapInsurancePolicy(existing[0]));
				}
				const subject = subjectColumns(record.coveredSubject);
				const rows = await db
					.insert(caInsurancePolicy)
					.values({
						id: randomUUID(),
						organizationId: record.organizationId,
						legalCompanyId: record.legalCompanyId,
						policyNumber: record.policyNumber,
						normalizedPolicyNumber: record.normalizedPolicyNumber,
						insurerPartyId: record.insurerPartyId,
						insurerPartyCodeSnapshot: record.insurerPartyCodeSnapshot,
						insurerPartyNameSnapshot: record.insurerPartyNameSnapshot,
						coveredSubjectKind: subject.kind,
						coveredPropertyHoldingId: subject.propertyHoldingId,
						coveredCorporateAssetId: subject.corporateAssetId,
						coveredIntellectualPropertyRightId:
							subject.intellectualPropertyRightId,
						coveredSubjectDescription: subject.description,
						effectiveFrom: record.effectiveFrom,
						effectiveTo: record.effectiveTo,
						limitAmount: record.limitAmount,
						currencyCode: record.currencyCode,
						documentReference: record.documentReference,
						cancellationDate: record.cancellationDate,
						cancellationReason: record.cancellationReason,
						cancellationEvidenceReference: record.cancellationEvidenceReference,
						status: record.status,
						version: 1,
						createIdempotencyKey: record.createIdempotencyKey,
						createRequestFingerprint: record.createRequestFingerprint,
						createdBy: record.createdBy,
						updatedBy: record.updatedBy,
					})
					.returning();
				const row = rows[0];
				if (!row) {
					return fail("INTERNAL_ERROR", "Failed to create insurance policy");
				}
				const mapped = mapInsurancePolicy(row);
				await insertCa4Receipt(mapped, "insurance-policy", mutation);
				return ok(mapped);
			} catch (error) {
				if (isUniqueViolation(error)) {
					const byIdempotency = await db
						.select()
						.from(caInsurancePolicy)
						.where(
							and(
								eq(caInsurancePolicy.organizationId, record.organizationId),
								eq(
									caInsurancePolicy.createIdempotencyKey,
									record.createIdempotencyKey,
								),
							),
						)
						.limit(1);
					if (byIdempotency[0]) {
						if (
							byIdempotency[0].createRequestFingerprint !==
							record.createRequestFingerprint
						) {
							return fail(
								"CONFLICT",
								"Idempotency key was already used for a different request",
								caErrorDetails(CA_ERROR_IDEMPOTENCY_CONFLICT),
							);
						}
						return ok(mapInsurancePolicy(byIdempotency[0]));
					}
					return fail(
						"CONFLICT",
						"Insurance policy number already exists",
						caErrorDetails(CA_ERROR_CODE_CONFLICT),
					);
				}
				return failFromUnknown(error, "Failed to create insurance policy");
			}
		},
		async updateInsurancePolicy(record, expectedVersion, renewal, mutation) {
			try {
				const subject = subjectColumns(record.coveredSubject);
				const rows = await db
					.update(caInsurancePolicy)
					.set({
						insurerPartyId: record.insurerPartyId,
						insurerPartyCodeSnapshot: record.insurerPartyCodeSnapshot,
						insurerPartyNameSnapshot: record.insurerPartyNameSnapshot,
						coveredSubjectKind: subject.kind,
						coveredPropertyHoldingId: subject.propertyHoldingId,
						coveredCorporateAssetId: subject.corporateAssetId,
						coveredIntellectualPropertyRightId:
							subject.intellectualPropertyRightId,
						coveredSubjectDescription: subject.description,
						effectiveFrom: record.effectiveFrom,
						effectiveTo: record.effectiveTo,
						limitAmount: record.limitAmount,
						currencyCode: record.currencyCode,
						documentReference: record.documentReference,
						cancellationDate: record.cancellationDate,
						cancellationReason: record.cancellationReason,
						cancellationEvidenceReference: record.cancellationEvidenceReference,
						status: record.status,
						version: expectedVersion + 1,
						updatedBy: record.updatedBy,
						updatedAt: new Date(),
					})
					.where(
						and(
							eq(caInsurancePolicy.organizationId, record.organizationId),
							eq(caInsurancePolicy.id, record.id),
							eq(caInsurancePolicy.version, expectedVersion),
						),
					)
					.returning();
				if (!rows[0])
					return fail("CONFLICT", "Insurance policy version conflict");
				if (renewal) {
					await db.insert(caInsurancePolicyRenewal).values({
						id: randomUUID(),
						...renewal,
					});
				}
				const mapped = mapInsurancePolicy(rows[0]);
				await insertCa4Receipt(mapped, "insurance-policy", mutation);
				return ok(mapped);
			} catch (error) {
				return failFromUnknown(error, "Failed to update insurance policy");
			}
		},
		async listInsurancePolicyRenewals(organizationId, insurancePolicyId) {
			try {
				const rows = await db
					.select()
					.from(caInsurancePolicyRenewal)
					.where(
						and(
							eq(caInsurancePolicyRenewal.organizationId, organizationId),
							eq(caInsurancePolicyRenewal.insurancePolicyId, insurancePolicyId),
						),
					)
					.orderBy(asc(caInsurancePolicyRenewal.renewalDate));
				return ok(rows.map(mapInsurancePolicyRenewal));
			} catch (error) {
				return failFromUnknown(error, "Failed to list insurance renewals");
			}
		},
		async getInsurancePolicyById(organizationId, insurancePolicyId) {
			try {
				const rows = await db
					.select()
					.from(caInsurancePolicy)
					.where(
						and(
							eq(caInsurancePolicy.organizationId, organizationId),
							eq(caInsurancePolicy.id, insurancePolicyId),
						),
					)
					.limit(1);
				return ok(rows[0] ? mapInsurancePolicy(rows[0]) : null);
			} catch (error) {
				return failFromUnknown(error, "Failed to load insurance policy");
			}
		},
		async listInsurancePolicies(organizationId, legalCompanyId) {
			try {
				const rows = await db
					.select()
					.from(caInsurancePolicy)
					.where(
						and(
							eq(caInsurancePolicy.organizationId, organizationId),
							eq(caInsurancePolicy.legalCompanyId, legalCompanyId),
						),
					);
				return ok(rows.map(mapInsurancePolicy));
			} catch (error) {
				return failFromUnknown(error, "Failed to list insurance policies");
			}
		},
		async getChargeByIdempotencyKey(organizationId, idempotencyKey) {
			try {
				const rows = await db
					.select()
					.from(caCharge)
					.where(
						and(
							eq(caCharge.organizationId, organizationId),
							eq(caCharge.createIdempotencyKey, idempotencyKey),
						),
					)
					.limit(1);
				return ok(rows[0] ? mapCharge(rows[0]) : null);
			} catch (error) {
				return failFromUnknown(
					error,
					"Failed to load charge by idempotency key",
				);
			}
		},
		async createCharge(record, mutation) {
			try {
				const existing = await db
					.select()
					.from(caCharge)
					.where(
						and(
							eq(caCharge.organizationId, record.organizationId),
							eq(caCharge.createIdempotencyKey, record.createIdempotencyKey),
						),
					)
					.limit(1);
				if (existing[0]) {
					if (
						existing[0].createRequestFingerprint !==
						record.createRequestFingerprint
					) {
						return fail(
							"CONFLICT",
							"Idempotency key was already used for a different request",
							caErrorDetails(CA_ERROR_IDEMPOTENCY_CONFLICT),
						);
					}
					return ok(mapCharge(existing[0]));
				}
				const subject = subjectColumns(record.affectedSubject);
				const rows = await db
					.insert(caCharge)
					.values({
						id: randomUUID(),
						organizationId: record.organizationId,
						legalCompanyId: record.legalCompanyId,
						code: record.code,
						normalizedCode: record.normalizedCode,
						chargeType: record.chargeType,
						securedPartyId: record.securedPartyId,
						securedPartyCodeSnapshot: record.securedPartyCodeSnapshot,
						securedPartyNameSnapshot: record.securedPartyNameSnapshot,
						affectedSubjectKind: subject.kind,
						affectedPropertyHoldingId: subject.propertyHoldingId,
						affectedCorporateAssetId: subject.corporateAssetId,
						affectedIntellectualPropertyRightId:
							subject.intellectualPropertyRightId,
						affectedSubjectDescription: subject.description,
						amount: record.amount,
						currencyCode: record.currencyCode,
						priorityRank: record.priorityRank,
						createdDate: record.createdDate,
						releasedDate: record.releasedDate,
						creationEvidenceReference: record.creationEvidenceReference,
						releaseReason: record.releaseReason,
						releaseEvidenceReference: record.releaseEvidenceReference,
						status: record.status,
						version: 1,
						createIdempotencyKey: record.createIdempotencyKey,
						createRequestFingerprint: record.createRequestFingerprint,
						createdBy: record.createdBy,
						updatedBy: record.updatedBy,
					})
					.returning();
				const row = rows[0];
				if (!row) {
					return fail("INTERNAL_ERROR", "Failed to create charge");
				}
				const mapped = mapCharge(row);
				await insertCa4Receipt(mapped, "charge", mutation);
				return ok(mapped);
			} catch (error) {
				if (isUniqueViolation(error)) {
					const byIdempotency = await db
						.select()
						.from(caCharge)
						.where(
							and(
								eq(caCharge.organizationId, record.organizationId),
								eq(caCharge.createIdempotencyKey, record.createIdempotencyKey),
							),
						)
						.limit(1);
					if (byIdempotency[0]) {
						if (
							byIdempotency[0].createRequestFingerprint !==
							record.createRequestFingerprint
						) {
							return fail(
								"CONFLICT",
								"Idempotency key was already used for a different request",
								caErrorDetails(CA_ERROR_IDEMPOTENCY_CONFLICT),
							);
						}
						return ok(mapCharge(byIdempotency[0]));
					}
					return fail(
						"CONFLICT",
						"Charge code already exists",
						caErrorDetails(CA_ERROR_CODE_CONFLICT),
					);
				}
				return failFromUnknown(error, "Failed to create charge");
			}
		},
		async updateCharge(record, expectedVersion, variation, mutation) {
			try {
				const subject = subjectColumns(record.affectedSubject);
				const rows = await db
					.update(caCharge)
					.set({
						securedPartyId: record.securedPartyId,
						securedPartyCodeSnapshot: record.securedPartyCodeSnapshot,
						securedPartyNameSnapshot: record.securedPartyNameSnapshot,
						affectedSubjectKind: subject.kind,
						affectedPropertyHoldingId: subject.propertyHoldingId,
						affectedCorporateAssetId: subject.corporateAssetId,
						affectedIntellectualPropertyRightId:
							subject.intellectualPropertyRightId,
						affectedSubjectDescription: subject.description,
						amount: record.amount,
						currencyCode: record.currencyCode,
						priorityRank: record.priorityRank,
						releasedDate: record.releasedDate,
						releaseReason: record.releaseReason,
						releaseEvidenceReference: record.releaseEvidenceReference,
						status: record.status,
						version: expectedVersion + 1,
						updatedBy: record.updatedBy,
						updatedAt: new Date(),
					})
					.where(
						and(
							eq(caCharge.organizationId, record.organizationId),
							eq(caCharge.id, record.id),
							eq(caCharge.version, expectedVersion),
						),
					)
					.returning();
				if (!rows[0]) return fail("CONFLICT", "Charge version conflict");
				if (variation) {
					await db.insert(caChargeVariation).values({
						id: randomUUID(),
						...variation,
					});
				}
				const mapped = mapCharge(rows[0]);
				await insertCa4Receipt(mapped, "charge", mutation);
				return ok(mapped);
			} catch (error) {
				return failFromUnknown(error, "Failed to update charge");
			}
		},
		async listChargeVariations(organizationId, chargeId) {
			try {
				const rows = await db
					.select()
					.from(caChargeVariation)
					.where(
						and(
							eq(caChargeVariation.organizationId, organizationId),
							eq(caChargeVariation.chargeId, chargeId),
						),
					)
					.orderBy(asc(caChargeVariation.variationDate));
				return ok(rows.map(mapChargeVariation));
			} catch (error) {
				return failFromUnknown(error, "Failed to list charge variations");
			}
		},
		async getChargeById(organizationId, chargeId) {
			try {
				const rows = await db
					.select()
					.from(caCharge)
					.where(
						and(
							eq(caCharge.organizationId, organizationId),
							eq(caCharge.id, chargeId),
						),
					)
					.limit(1);
				return ok(rows[0] ? mapCharge(rows[0]) : null);
			} catch (error) {
				return failFromUnknown(error, "Failed to load charge");
			}
		},
		async listCharges(organizationId, legalCompanyId) {
			try {
				const rows = await db
					.select()
					.from(caCharge)
					.where(
						and(
							eq(caCharge.organizationId, organizationId),
							eq(caCharge.legalCompanyId, legalCompanyId),
						),
					);
				return ok(rows.map(mapCharge));
			} catch (error) {
				return failFromUnknown(error, "Failed to list charges");
			}
		},
		async getPropertyAssetMutationReceipt(organizationId, idempotencyKey) {
			try {
				const rows = await db
					.select()
					.from(caPropertyAssetMutationReceipt)
					.where(
						and(
							eq(caPropertyAssetMutationReceipt.organizationId, organizationId),
							eq(caPropertyAssetMutationReceipt.idempotencyKey, idempotencyKey),
						),
					)
					.limit(1);
				return ok(rows[0] ? mapPropertyAssetMutationReceipt(rows[0]) : null);
			} catch (error) {
				return failFromUnknown(error, "Failed to load CA-4 mutation receipt");
			}
		},
		async getLicencePermitByIdempotencyKey(organizationId, idempotencyKey) {
			try {
				const rows = await db
					.select()
					.from(caLicencePermit)
					.where(
						and(
							eq(caLicencePermit.organizationId, organizationId),
							eq(caLicencePermit.createIdempotencyKey, idempotencyKey),
						),
					)
					.limit(1);
				return ok(rows[0] ? mapLicencePermit(rows[0]) : null);
			} catch (error) {
				return failFromUnknown(
					error,
					"Failed to load licence permit by idempotency key",
				);
			}
		},
		async createLicencePermit(record) {
			try {
				const existing = await db
					.select()
					.from(caLicencePermit)
					.where(
						and(
							eq(caLicencePermit.organizationId, record.organizationId),
							eq(
								caLicencePermit.createIdempotencyKey,
								record.createIdempotencyKey,
							),
						),
					)
					.limit(1);
				if (existing[0]) {
					return ok(mapLicencePermit(existing[0]));
				}
				const rows = await db
					.insert(caLicencePermit)
					.values({
						id: randomUUID(),
						organizationId: record.organizationId,
						legalCompanyId: record.legalCompanyId,
						licenceNumber: record.licenceNumber,
						normalizedLicenceNumber: record.normalizedLicenceNumber,
						licenceType: record.licenceType,
						authorityPartyId: record.authorityPartyId,
						authorityNameSnapshot: record.authorityNameSnapshot,
						jurisdictionCode: record.jurisdictionCode,
						scopeDescription: record.scopeDescription,
						validFrom: record.validFrom,
						validTo: record.validTo,
						status: record.status,
						version: 1,
						createIdempotencyKey: record.createIdempotencyKey,
						createdBy: record.createdBy,
						updatedBy: record.updatedBy,
					})
					.returning();
				const row = rows[0];
				if (!row) {
					return fail("INTERNAL_ERROR", "Failed to create licence permit");
				}
				return ok(mapLicencePermit(row));
			} catch (error) {
				if (isUniqueViolation(error)) {
					const byIdempotency = await db
						.select()
						.from(caLicencePermit)
						.where(
							and(
								eq(caLicencePermit.organizationId, record.organizationId),
								eq(
									caLicencePermit.createIdempotencyKey,
									record.createIdempotencyKey,
								),
							),
						)
						.limit(1);
					if (byIdempotency[0]) {
						return ok(mapLicencePermit(byIdempotency[0]));
					}
					return fail(
						"CONFLICT",
						"Licence number already exists",
						caErrorDetails(CA_ERROR_CODE_CONFLICT),
					);
				}
				return failFromUnknown(error, "Failed to create licence permit");
			}
		},
		async getLicencePermitById(organizationId, licencePermitId) {
			try {
				const rows = await db
					.select()
					.from(caLicencePermit)
					.where(
						and(
							eq(caLicencePermit.organizationId, organizationId),
							eq(caLicencePermit.id, licencePermitId),
						),
					)
					.limit(1);
				return ok(rows[0] ? mapLicencePermit(rows[0]) : null);
			} catch (error) {
				return failFromUnknown(error, "Failed to load licence permit");
			}
		},
		async listLicencePermits(organizationId, legalCompanyId) {
			try {
				const rows = await db
					.select()
					.from(caLicencePermit)
					.where(
						and(
							eq(caLicencePermit.organizationId, organizationId),
							eq(caLicencePermit.legalCompanyId, legalCompanyId),
						),
					);
				return ok(rows.map(mapLicencePermit));
			} catch (error) {
				return failFromUnknown(error, "Failed to list licence permits");
			}
		},
		async getBankAccountRegistrationByIdempotencyKey(
			organizationId,
			idempotencyKey,
		) {
			try {
				const rows = await db
					.select()
					.from(caBankAccountRegistration)
					.where(
						and(
							eq(caBankAccountRegistration.organizationId, organizationId),
							eq(
								caBankAccountRegistration.createIdempotencyKey,
								idempotencyKey,
							),
						),
					)
					.limit(1);
				return ok(rows[0] ? mapBankAccountRegistration(rows[0]) : null);
			} catch (error) {
				return failFromUnknown(
					error,
					"Failed to load bank account registration by idempotency key",
				);
			}
		},
		async createBankAccountRegistration(record) {
			try {
				const existing = await db
					.select()
					.from(caBankAccountRegistration)
					.where(
						and(
							eq(
								caBankAccountRegistration.organizationId,
								record.organizationId,
							),
							eq(
								caBankAccountRegistration.createIdempotencyKey,
								record.createIdempotencyKey,
							),
						),
					)
					.limit(1);
				if (existing[0]) {
					return ok(mapBankAccountRegistration(existing[0]));
				}
				const rows = await db
					.insert(caBankAccountRegistration)
					.values({
						id: randomUUID(),
						organizationId: record.organizationId,
						legalCompanyId: record.legalCompanyId,
						bankPartyId: record.bankPartyId,
						bankPartyNameSnapshot: record.bankPartyNameSnapshot,
						accountIdentityToken: record.accountIdentityToken,
						displayMaskedAccount: record.displayMaskedAccount,
						countryCode: record.countryCode,
						currencyCode: record.currencyCode,
						accountPurpose: record.accountPurpose,
						openedDate: record.openedDate,
						closedDate: record.closedDate,
						status: record.status,
						version: 1,
						createIdempotencyKey: record.createIdempotencyKey,
						createdBy: record.createdBy,
						updatedBy: record.updatedBy,
					})
					.returning();
				const row = rows[0];
				if (!row) {
					return fail(
						"INTERNAL_ERROR",
						"Failed to create bank account registration",
					);
				}
				return ok(mapBankAccountRegistration(row));
			} catch (error) {
				if (isUniqueViolation(error)) {
					const rows = await db
						.select()
						.from(caBankAccountRegistration)
						.where(
							and(
								eq(
									caBankAccountRegistration.organizationId,
									record.organizationId,
								),
								eq(
									caBankAccountRegistration.createIdempotencyKey,
									record.createIdempotencyKey,
								),
							),
						)
						.limit(1);
					if (rows[0]) {
						return ok(mapBankAccountRegistration(rows[0]));
					}
				}
				return failFromUnknown(
					error,
					"Failed to create bank account registration",
				);
			}
		},
		async getBankAccountRegistrationById(
			organizationId,
			bankAccountRegistrationId,
		) {
			try {
				const rows = await db
					.select()
					.from(caBankAccountRegistration)
					.where(
						and(
							eq(caBankAccountRegistration.organizationId, organizationId),
							eq(caBankAccountRegistration.id, bankAccountRegistrationId),
						),
					)
					.limit(1);
				return ok(rows[0] ? mapBankAccountRegistration(rows[0]) : null);
			} catch (error) {
				return failFromUnknown(
					error,
					"Failed to load bank account registration",
				);
			}
		},
		async listBankAccountRegistrations(organizationId, legalCompanyId) {
			try {
				const rows = await db
					.select()
					.from(caBankAccountRegistration)
					.where(
						and(
							eq(caBankAccountRegistration.organizationId, organizationId),
							eq(caBankAccountRegistration.legalCompanyId, legalCompanyId),
						),
					);
				return ok(
					rows.map((row) =>
						toPublicBankAccount(mapBankAccountRegistration(row)),
					),
				);
			} catch (error) {
				return failFromUnknown(
					error,
					"Failed to list bank account registrations",
				);
			}
		},
		async getBankMandateByIdempotencyKey(organizationId, idempotencyKey) {
			try {
				const rows = await db
					.select()
					.from(caBankMandate)
					.where(
						and(
							eq(caBankMandate.organizationId, organizationId),
							eq(caBankMandate.createIdempotencyKey, idempotencyKey),
						),
					)
					.limit(1);
				return ok(rows[0] ? mapBankMandate(rows[0]) : null);
			} catch (error) {
				return failFromUnknown(
					error,
					"Failed to load bank mandate by idempotency key",
				);
			}
		},
		async createBankMandate(record) {
			try {
				const existing = await db
					.select()
					.from(caBankMandate)
					.where(
						and(
							eq(caBankMandate.organizationId, record.organizationId),
							eq(
								caBankMandate.createIdempotencyKey,
								record.createIdempotencyKey,
							),
						),
					)
					.limit(1);
				if (existing[0]) {
					return ok(mapBankMandate(existing[0]));
				}
				const accountRows = await db
					.select()
					.from(caBankAccountRegistration)
					.where(
						and(
							eq(
								caBankAccountRegistration.organizationId,
								record.organizationId,
							),
							eq(
								caBankAccountRegistration.id,
								record.bankAccountRegistrationId,
							),
						),
					)
					.limit(1);
				const account = accountRows[0];
				if (!account || account.legalCompanyId !== record.legalCompanyId) {
					return fail("NOT_FOUND", "Bank account registration not found");
				}
				const rows = await db
					.insert(caBankMandate)
					.values({
						id: randomUUID(),
						organizationId: record.organizationId,
						legalCompanyId: record.legalCompanyId,
						bankAccountRegistrationId: record.bankAccountRegistrationId,
						mandateDescription: record.mandateDescription,
						signingRule: record.signingRule,
						effectiveFrom: record.effectiveFrom,
						effectiveTo: record.effectiveTo,
						status: record.status,
						version: 1,
						createIdempotencyKey: record.createIdempotencyKey,
						createdBy: record.createdBy,
						updatedBy: record.updatedBy,
					})
					.returning();
				const row = rows[0];
				if (!row) {
					return fail("INTERNAL_ERROR", "Failed to create bank mandate");
				}
				return ok(mapBankMandate(row));
			} catch (error) {
				if (isUniqueViolation(error)) {
					const rows = await db
						.select()
						.from(caBankMandate)
						.where(
							and(
								eq(caBankMandate.organizationId, record.organizationId),
								eq(
									caBankMandate.createIdempotencyKey,
									record.createIdempotencyKey,
								),
							),
						)
						.limit(1);
					if (rows[0]) {
						return ok(mapBankMandate(rows[0]));
					}
				}
				return failFromUnknown(error, "Failed to create bank mandate");
			}
		},
		async getBankMandateById(organizationId, bankMandateId) {
			try {
				const rows = await db
					.select()
					.from(caBankMandate)
					.where(
						and(
							eq(caBankMandate.organizationId, organizationId),
							eq(caBankMandate.id, bankMandateId),
						),
					)
					.limit(1);
				return ok(rows[0] ? mapBankMandate(rows[0]) : null);
			} catch (error) {
				return failFromUnknown(error, "Failed to load bank mandate");
			}
		},
		async listBankMandates(organizationId, legalCompanyId) {
			try {
				const rows = await db
					.select()
					.from(caBankMandate)
					.where(
						and(
							eq(caBankMandate.organizationId, organizationId),
							eq(caBankMandate.legalCompanyId, legalCompanyId),
						),
					);
				return ok(rows.map(mapBankMandate));
			} catch (error) {
				return failFromUnknown(error, "Failed to list bank mandates");
			}
		},
		async getGroupControlRelationshipByIdempotencyKey(
			organizationId,
			idempotencyKey,
		) {
			try {
				const rows = await db
					.select()
					.from(caGroupControlRelationship)
					.where(
						and(
							eq(caGroupControlRelationship.organizationId, organizationId),
							eq(
								caGroupControlRelationship.createIdempotencyKey,
								idempotencyKey,
							),
						),
					)
					.limit(1);
				return ok(rows[0] ? mapGroupControlRelationship(rows[0]) : null);
			} catch (error) {
				return failFromUnknown(
					error,
					"Failed to load group control relationship by idempotency key",
				);
			}
		},
		async createGroupControlRelationship(record) {
			try {
				const existing = await db
					.select()
					.from(caGroupControlRelationship)
					.where(
						and(
							eq(
								caGroupControlRelationship.organizationId,
								record.organizationId,
							),
							eq(
								caGroupControlRelationship.createIdempotencyKey,
								record.createIdempotencyKey,
							),
						),
					)
					.limit(1);
				if (existing[0]) {
					return ok(mapGroupControlRelationship(existing[0]));
				}
				if (record.counterpartyLegalCompanyId === record.legalCompanyId) {
					return fail(
						"CONFLICT",
						"Group control relationship cannot self-link",
					);
				}
				const rows = await db
					.insert(caGroupControlRelationship)
					.values({
						id: randomUUID(),
						organizationId: record.organizationId,
						legalCompanyId: record.legalCompanyId,
						relationshipType: record.relationshipType,
						counterpartyLegalCompanyId: record.counterpartyLegalCompanyId,
						counterpartyPartyId: record.counterpartyPartyId,
						counterpartyNameSnapshot: record.counterpartyNameSnapshot,
						controlPercentage: record.controlPercentage,
						effectiveFrom: record.effectiveFrom,
						effectiveTo: record.effectiveTo,
						status: record.status,
						version: 1,
						createIdempotencyKey: record.createIdempotencyKey,
						createdBy: record.createdBy,
						updatedBy: record.updatedBy,
					})
					.returning();
				const row = rows[0];
				if (!row) {
					return fail(
						"INTERNAL_ERROR",
						"Failed to create group control relationship",
					);
				}
				return ok(mapGroupControlRelationship(row));
			} catch (error) {
				if (isUniqueViolation(error)) {
					const rows = await db
						.select()
						.from(caGroupControlRelationship)
						.where(
							and(
								eq(
									caGroupControlRelationship.organizationId,
									record.organizationId,
								),
								eq(
									caGroupControlRelationship.createIdempotencyKey,
									record.createIdempotencyKey,
								),
							),
						)
						.limit(1);
					if (rows[0]) {
						return ok(mapGroupControlRelationship(rows[0]));
					}
				}
				return failFromUnknown(
					error,
					"Failed to create group control relationship",
				);
			}
		},
		async getGroupControlRelationshipById(
			organizationId,
			groupControlRelationshipId,
		) {
			try {
				const rows = await db
					.select()
					.from(caGroupControlRelationship)
					.where(
						and(
							eq(caGroupControlRelationship.organizationId, organizationId),
							eq(caGroupControlRelationship.id, groupControlRelationshipId),
						),
					)
					.limit(1);
				return ok(rows[0] ? mapGroupControlRelationship(rows[0]) : null);
			} catch (error) {
				return failFromUnknown(
					error,
					"Failed to load group control relationship",
				);
			}
		},
		async listGroupControlRelationships(organizationId, legalCompanyId) {
			try {
				const rows = await db
					.select()
					.from(caGroupControlRelationship)
					.where(
						and(
							eq(caGroupControlRelationship.organizationId, organizationId),
							eq(caGroupControlRelationship.legalCompanyId, legalCompanyId),
						),
					);
				return ok(rows.map(mapGroupControlRelationship));
			} catch (error) {
				return failFromUnknown(
					error,
					"Failed to list group control relationships",
				);
			}
		},
		async getMaterialAgreementByIdempotencyKey(organizationId, idempotencyKey) {
			try {
				const rows = await db
					.select()
					.from(caMaterialAgreement)
					.where(
						and(
							eq(caMaterialAgreement.organizationId, organizationId),
							eq(caMaterialAgreement.createIdempotencyKey, idempotencyKey),
						),
					)
					.limit(1);
				return ok(rows[0] ? mapMaterialAgreement(rows[0]) : null);
			} catch (error) {
				return failFromUnknown(
					error,
					"Failed to load material agreement by idempotency key",
				);
			}
		},
		async createMaterialAgreement(record) {
			try {
				const existing = await db
					.select()
					.from(caMaterialAgreement)
					.where(
						and(
							eq(caMaterialAgreement.organizationId, record.organizationId),
							eq(
								caMaterialAgreement.createIdempotencyKey,
								record.createIdempotencyKey,
							),
						),
					)
					.limit(1);
				if (existing[0]) {
					return ok(mapMaterialAgreement(existing[0]));
				}
				const rows = await db
					.insert(caMaterialAgreement)
					.values({
						id: randomUUID(),
						organizationId: record.organizationId,
						legalCompanyId: record.legalCompanyId,
						agreementCode: record.agreementCode,
						normalizedAgreementCode: record.normalizedAgreementCode,
						agreementType: record.agreementType,
						title: record.title,
						counterpartyPartyId: record.counterpartyPartyId,
						counterpartyNameSnapshot: record.counterpartyNameSnapshot,
						effectiveFrom: record.effectiveFrom,
						effectiveTo: record.effectiveTo,
						valueAmount: record.valueAmount,
						currencyCode: record.currencyCode,
						documentReference: record.documentReference,
						status: record.status,
						version: 1,
						createIdempotencyKey: record.createIdempotencyKey,
						createdBy: record.createdBy,
						updatedBy: record.updatedBy,
					})
					.returning();
				const row = rows[0];
				if (!row) {
					return fail("INTERNAL_ERROR", "Failed to create material agreement");
				}
				return ok(mapMaterialAgreement(row));
			} catch (error) {
				if (isUniqueViolation(error)) {
					const byIdempotency = await db
						.select()
						.from(caMaterialAgreement)
						.where(
							and(
								eq(caMaterialAgreement.organizationId, record.organizationId),
								eq(
									caMaterialAgreement.createIdempotencyKey,
									record.createIdempotencyKey,
								),
							),
						)
						.limit(1);
					if (byIdempotency[0]) {
						return ok(mapMaterialAgreement(byIdempotency[0]));
					}
					return fail(
						"CONFLICT",
						"Material agreement code already exists",
						caErrorDetails(CA_ERROR_CODE_CONFLICT),
					);
				}
				return failFromUnknown(error, "Failed to create material agreement");
			}
		},
		async getMaterialAgreementById(organizationId, materialAgreementId) {
			try {
				const rows = await db
					.select()
					.from(caMaterialAgreement)
					.where(
						and(
							eq(caMaterialAgreement.organizationId, organizationId),
							eq(caMaterialAgreement.id, materialAgreementId),
						),
					)
					.limit(1);
				return ok(rows[0] ? mapMaterialAgreement(rows[0]) : null);
			} catch (error) {
				return failFromUnknown(error, "Failed to load material agreement");
			}
		},
		async listMaterialAgreements(organizationId, legalCompanyId) {
			try {
				const rows = await db
					.select()
					.from(caMaterialAgreement)
					.where(
						and(
							eq(caMaterialAgreement.organizationId, organizationId),
							eq(caMaterialAgreement.legalCompanyId, legalCompanyId),
						),
					);
				return ok(rows.map(mapMaterialAgreement));
			} catch (error) {
				return failFromUnknown(error, "Failed to list material agreements");
			}
		},
		async getCorporateDocumentByIdempotencyKey(organizationId, idempotencyKey) {
			try {
				const rows = await db
					.select()
					.from(caCorporateDocument)
					.where(
						and(
							eq(caCorporateDocument.organizationId, organizationId),
							eq(caCorporateDocument.createIdempotencyKey, idempotencyKey),
						),
					)
					.limit(1);
				return ok(rows[0] ? mapCorporateDocument(rows[0]) : null);
			} catch (error) {
				return failFromUnknown(
					error,
					"Failed to load corporate document by idempotency key",
				);
			}
		},
		async createCorporateDocument(record) {
			try {
				const existing = await db
					.select()
					.from(caCorporateDocument)
					.where(
						and(
							eq(caCorporateDocument.organizationId, record.organizationId),
							eq(
								caCorporateDocument.createIdempotencyKey,
								record.createIdempotencyKey,
							),
						),
					)
					.limit(1);
				if (existing[0]) {
					return ok(mapCorporateDocument(existing[0]));
				}
				const rows = await db
					.insert(caCorporateDocument)
					.values({
						id: randomUUID(),
						organizationId: record.organizationId,
						legalCompanyId: record.legalCompanyId,
						documentCode: record.documentCode,
						normalizedDocumentCode: record.normalizedDocumentCode,
						documentType: record.documentType,
						title: record.title,
						externalReference: record.externalReference,
						checksum: record.checksum,
						classification: record.classification,
						effectiveDate: record.effectiveDate,
						expiryDate: record.expiryDate,
						supersedesId: record.supersedesId,
						version: 1,
						createIdempotencyKey: record.createIdempotencyKey,
						createdBy: record.createdBy,
						updatedBy: record.updatedBy,
					})
					.returning();
				const row = rows[0];
				if (!row) {
					return fail("INTERNAL_ERROR", "Failed to create corporate document");
				}
				return ok(mapCorporateDocument(row));
			} catch (error) {
				if (isUniqueViolation(error)) {
					const byIdempotency = await db
						.select()
						.from(caCorporateDocument)
						.where(
							and(
								eq(caCorporateDocument.organizationId, record.organizationId),
								eq(
									caCorporateDocument.createIdempotencyKey,
									record.createIdempotencyKey,
								),
							),
						)
						.limit(1);
					if (byIdempotency[0]) {
						return ok(mapCorporateDocument(byIdempotency[0]));
					}
					return fail(
						"CONFLICT",
						"Corporate document code already exists",
						caErrorDetails(CA_ERROR_CODE_CONFLICT),
					);
				}
				return failFromUnknown(error, "Failed to create corporate document");
			}
		},
		async getCorporateDocumentById(organizationId, corporateDocumentId) {
			try {
				const rows = await db
					.select()
					.from(caCorporateDocument)
					.where(
						and(
							eq(caCorporateDocument.organizationId, organizationId),
							eq(caCorporateDocument.id, corporateDocumentId),
						),
					)
					.limit(1);
				return ok(rows[0] ? mapCorporateDocument(rows[0]) : null);
			} catch (error) {
				return failFromUnknown(error, "Failed to load corporate document");
			}
		},
		async listCorporateDocuments(organizationId, legalCompanyId) {
			try {
				const rows = await db
					.select()
					.from(caCorporateDocument)
					.where(
						and(
							eq(caCorporateDocument.organizationId, organizationId),
							eq(caCorporateDocument.legalCompanyId, legalCompanyId),
						),
					);
				return ok(rows.map(mapCorporateDocument));
			} catch (error) {
				return failFromUnknown(error, "Failed to list corporate documents");
			}
		},
		async getFilingObligationByIdempotencyKey(organizationId, idempotencyKey) {
			try {
				const rows = await db
					.select()
					.from(caFilingObligation)
					.where(
						and(
							eq(caFilingObligation.organizationId, organizationId),
							eq(caFilingObligation.createIdempotencyKey, idempotencyKey),
						),
					)
					.limit(1);
				return ok(rows[0] ? mapFilingObligation(rows[0]) : null);
			} catch (error) {
				return failFromUnknown(
					error,
					"Failed to load filing obligation by idempotency key",
				);
			}
		},
		async createFilingObligation(record) {
			try {
				const existing = await db
					.select()
					.from(caFilingObligation)
					.where(
						and(
							eq(caFilingObligation.organizationId, record.organizationId),
							eq(
								caFilingObligation.createIdempotencyKey,
								record.createIdempotencyKey,
							),
						),
					)
					.limit(1);
				if (existing[0]) {
					return ok(mapFilingObligation(existing[0]));
				}
				const rows = await db
					.insert(caFilingObligation)
					.values({
						id: randomUUID(),
						organizationId: record.organizationId,
						legalCompanyId: record.legalCompanyId,
						obligationCode: record.obligationCode,
						normalizedObligationCode: record.normalizedObligationCode,
						filingType: record.filingType,
						jurisdictionCode: record.jurisdictionCode,
						authorityName: record.authorityName,
						periodLabel: record.periodLabel,
						dueDate: record.dueDate,
						extensionDate: record.extensionDate,
						status: record.status,
						version: 1,
						createIdempotencyKey: record.createIdempotencyKey,
						createdBy: record.createdBy,
						updatedBy: record.updatedBy,
					})
					.returning();
				const row = rows[0];
				if (!row) {
					return fail("INTERNAL_ERROR", "Failed to create filing obligation");
				}
				return ok(mapFilingObligation(row));
			} catch (error) {
				if (isUniqueViolation(error)) {
					const byIdempotency = await db
						.select()
						.from(caFilingObligation)
						.where(
							and(
								eq(caFilingObligation.organizationId, record.organizationId),
								eq(
									caFilingObligation.createIdempotencyKey,
									record.createIdempotencyKey,
								),
							),
						)
						.limit(1);
					if (byIdempotency[0]) {
						return ok(mapFilingObligation(byIdempotency[0]));
					}
					return fail(
						"CONFLICT",
						"Filing obligation code already exists",
						caErrorDetails(CA_ERROR_CODE_CONFLICT),
					);
				}
				return failFromUnknown(error, "Failed to create filing obligation");
			}
		},
		async getFilingObligationById(organizationId, filingObligationId) {
			try {
				const rows = await db
					.select()
					.from(caFilingObligation)
					.where(
						and(
							eq(caFilingObligation.organizationId, organizationId),
							eq(caFilingObligation.id, filingObligationId),
						),
					)
					.limit(1);
				return ok(rows[0] ? mapFilingObligation(rows[0]) : null);
			} catch (error) {
				return failFromUnknown(error, "Failed to load filing obligation");
			}
		},
		async listFilingObligations(organizationId, legalCompanyId) {
			try {
				const rows = await db
					.select()
					.from(caFilingObligation)
					.where(
						and(
							eq(caFilingObligation.organizationId, organizationId),
							eq(caFilingObligation.legalCompanyId, legalCompanyId),
						),
					);
				return ok(rows.map(mapFilingObligation));
			} catch (error) {
				return failFromUnknown(error, "Failed to list filing obligations");
			}
		},
		async getFilingSubmissionByIdempotencyKey(organizationId, idempotencyKey) {
			try {
				const rows = await db
					.select()
					.from(caFilingSubmission)
					.where(
						and(
							eq(caFilingSubmission.organizationId, organizationId),
							eq(caFilingSubmission.createIdempotencyKey, idempotencyKey),
						),
					)
					.limit(1);
				return ok(rows[0] ? mapFilingSubmission(rows[0]) : null);
			} catch (error) {
				return failFromUnknown(
					error,
					"Failed to load filing submission by idempotency key",
				);
			}
		},
		async createFilingSubmission(record) {
			try {
				const existing = await db
					.select()
					.from(caFilingSubmission)
					.where(
						and(
							eq(caFilingSubmission.organizationId, record.organizationId),
							eq(
								caFilingSubmission.createIdempotencyKey,
								record.createIdempotencyKey,
							),
						),
					)
					.limit(1);
				if (existing[0]) {
					return ok(mapFilingSubmission(existing[0]));
				}
				const obligationRows = await db
					.select()
					.from(caFilingObligation)
					.where(
						and(
							eq(caFilingObligation.organizationId, record.organizationId),
							eq(caFilingObligation.id, record.filingObligationId),
						),
					)
					.limit(1);
				const obligation = obligationRows[0];
				if (
					!obligation ||
					obligation.legalCompanyId !== record.legalCompanyId
				) {
					return fail("NOT_FOUND", "Filing obligation not found");
				}
				const rows = await db
					.insert(caFilingSubmission)
					.values({
						id: randomUUID(),
						organizationId: record.organizationId,
						legalCompanyId: record.legalCompanyId,
						filingObligationId: record.filingObligationId,
						submissionReference: record.submissionReference,
						submittedAt: record.submittedAt,
						status: record.status,
						acknowledgementReference: record.acknowledgementReference,
						rejectionReason: record.rejectionReason,
						evidenceReference: record.evidenceReference,
						createIdempotencyKey: record.createIdempotencyKey,
						createdBy: record.createdBy,
					})
					.returning();
				const row = rows[0];
				if (!row) {
					return fail("INTERNAL_ERROR", "Failed to create filing submission");
				}
				return ok(mapFilingSubmission(row));
			} catch (error) {
				if (isUniqueViolation(error)) {
					const rows = await db
						.select()
						.from(caFilingSubmission)
						.where(
							and(
								eq(caFilingSubmission.organizationId, record.organizationId),
								eq(
									caFilingSubmission.createIdempotencyKey,
									record.createIdempotencyKey,
								),
							),
						)
						.limit(1);
					if (rows[0]) {
						return ok(mapFilingSubmission(rows[0]));
					}
				}
				return failFromUnknown(error, "Failed to create filing submission");
			}
		},
		async getFilingSubmissionById(organizationId, filingSubmissionId) {
			try {
				const rows = await db
					.select()
					.from(caFilingSubmission)
					.where(
						and(
							eq(caFilingSubmission.organizationId, organizationId),
							eq(caFilingSubmission.id, filingSubmissionId),
						),
					)
					.limit(1);
				return ok(rows[0] ? mapFilingSubmission(rows[0]) : null);
			} catch (error) {
				return failFromUnknown(error, "Failed to load filing submission");
			}
		},
		async listFilingSubmissions(organizationId, legalCompanyId) {
			try {
				const rows = await db
					.select()
					.from(caFilingSubmission)
					.where(
						and(
							eq(caFilingSubmission.organizationId, organizationId),
							eq(caFilingSubmission.legalCompanyId, legalCompanyId),
						),
					);
				return ok(rows.map(mapFilingSubmission));
			} catch (error) {
				return failFromUnknown(error, "Failed to list filing submissions");
			}
		},
		async listDueFilings(organizationId, asOf, legalCompanyId) {
			try {
				const conditions = [
					eq(caFilingObligation.organizationId, organizationId),
					or(
						eq(caFilingObligation.status, "pending"),
						eq(caFilingObligation.status, "due"),
					),
					sql`COALESCE(${caFilingObligation.extensionDate}, ${caFilingObligation.dueDate}) >= ${asOf}`,
				];
				if (legalCompanyId) {
					conditions.push(
						eq(caFilingObligation.legalCompanyId, legalCompanyId),
					);
				}
				const rows = await db
					.select()
					.from(caFilingObligation)
					.where(and(...conditions));
				return ok(rows.map(mapFilingObligation));
			} catch (error) {
				return failFromUnknown(error, "Failed to list due filings");
			}
		},
		async listOverdueFilings(organizationId, asOf, legalCompanyId) {
			try {
				const conditions = [
					eq(caFilingObligation.organizationId, organizationId),
					sql`COALESCE(${caFilingObligation.extensionDate}, ${caFilingObligation.dueDate}) < ${asOf}`,
					sql`${caFilingObligation.status} NOT IN ('acknowledged', 'waived')`,
				];
				if (legalCompanyId) {
					conditions.push(
						eq(caFilingObligation.legalCompanyId, legalCompanyId),
					);
				}
				const rows = await db
					.select()
					.from(caFilingObligation)
					.where(and(...conditions));
				return ok(rows.map(mapFilingObligation));
			} catch (error) {
				return failFromUnknown(error, "Failed to list overdue filings");
			}
		},
		async searchCorporateRecords(organizationId, query, limit, legalCompanyId) {
			try {
				const normalizedQuery = query.trim().toUpperCase();
				if (!normalizedQuery) {
					return ok([]);
				}
				const pattern = `%${normalizedQuery}%`;
				const hits: CaCorporateRecordSearchHit[] = [];
				const pushHit = (hit: CaCorporateRecordSearchHit) => {
					if (legalCompanyId && hit.legalCompanyId !== legalCompanyId) return;
					hits.push(hit);
				};
				const shareClassConditions = [
					eq(caShareClass.organizationId, organizationId),
					sql`upper(${caShareClass.code}) LIKE ${pattern}`,
				];
				if (legalCompanyId) {
					shareClassConditions.push(
						eq(caShareClass.legalCompanyId, legalCompanyId),
					);
				}
				const shareClasses = await db
					.select()
					.from(caShareClass)
					.where(and(...shareClassConditions))
					.limit(limit);
				for (const row of shareClasses) {
					pushHit({
						entityType: "share_class",
						entityId: row.id,
						legalCompanyId: row.legalCompanyId,
						title: row.code,
						subtitle: row.classType,
					});
				}
				const documentConditions = [
					eq(caCorporateDocument.organizationId, organizationId),
					or(
						sql`upper(${caCorporateDocument.title}) LIKE ${pattern}`,
						sql`upper(${caCorporateDocument.documentCode}) LIKE ${pattern}`,
					),
				];
				if (legalCompanyId) {
					documentConditions.push(
						eq(caCorporateDocument.legalCompanyId, legalCompanyId),
					);
				}
				const documents = await db
					.select()
					.from(caCorporateDocument)
					.where(and(...documentConditions))
					.limit(limit);
				for (const row of documents) {
					pushHit({
						entityType: "corporate_document",
						entityId: row.id,
						legalCompanyId: row.legalCompanyId,
						title: row.title,
						subtitle: row.documentType,
					});
				}
				const licenceConditions = [
					eq(caLicencePermit.organizationId, organizationId),
					sql`upper(${caLicencePermit.licenceNumber}) LIKE ${pattern}`,
				];
				if (legalCompanyId) {
					licenceConditions.push(
						eq(caLicencePermit.legalCompanyId, legalCompanyId),
					);
				}
				const licences = await db
					.select()
					.from(caLicencePermit)
					.where(and(...licenceConditions))
					.limit(limit);
				for (const row of licences) {
					pushHit({
						entityType: "licence_permit",
						entityId: row.id,
						legalCompanyId: row.legalCompanyId,
						title: row.licenceNumber,
						subtitle: row.licenceType,
					});
				}
				return ok(hits.slice(0, limit));
			} catch (error) {
				return failFromUnknown(error, "Failed to search corporate records");
			}
		},
	};
}
