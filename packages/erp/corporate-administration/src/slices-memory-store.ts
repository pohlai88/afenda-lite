import { randomUUID } from "node:crypto";

import { fail, ok, type Result } from "@afenda/errors/result";

import { CA_ERROR_CODE_CONFLICT, caErrorDetails } from "./error-codes";
import { MemoryGovernanceStore } from "./governance-memory-store";
import type { SlicesStore } from "./ports";
import {
	addDecimal,
	isNegativeDecimal,
	isZeroDecimal,
	sumDecimals,
} from "./shared/decimal";
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

function clone<T>(value: T): T {
	return structuredClone(value);
}

function filterByCompany<
	T extends { organizationId: string; legalCompanyId: string },
>(rows: Iterable<T>, organizationId: string, legalCompanyId: string): T[] {
	return [...rows].filter(
		(row) =>
			row.organizationId === organizationId &&
			row.legalCompanyId === legalCompanyId,
	);
}

function findByIdempotency<
	T extends { organizationId: string; createIdempotencyKey: string },
>(rows: Iterable<T>, organizationId: string, idempotencyKey: string): T | null {
	for (const row of rows) {
		if (
			row.organizationId === organizationId &&
			row.createIdempotencyKey === idempotencyKey
		) {
			return row;
		}
	}
	return null;
}

function toPublicBankAccount(
	row: CaBankAccountRegistration,
): CaBankAccountRegistrationPublic {
	const { accountIdentityToken: _token, ...rest } = row;
	return rest;
}

export class MemorySlicesStore
	extends MemoryGovernanceStore
	implements SlicesStore
{
	protected readonly shareClasses = new Map<string, CaShareClass>();
	protected readonly shareTransactions = new Map<string, CaShareTransaction>();
	protected readonly shareTransactionLegs = new Map<
		string,
		CaShareTransactionLeg
	>();
	protected readonly shareCertificates = new Map<string, CaShareCertificate>();
	protected readonly beneficialOwnerDisclosures = new Map<
		string,
		CaBeneficialOwnerDisclosure
	>();
	protected readonly propertyHoldings = new Map<string, CaPropertyHolding>();
	protected readonly corporateAssets = new Map<string, CaCorporateAsset>();
	protected readonly intellectualPropertyRights = new Map<
		string,
		CaIntellectualPropertyRight
	>();
	protected readonly insurancePolicies = new Map<string, CaInsurancePolicy>();
	protected readonly charges = new Map<string, CaCharge>();
	protected readonly licencePermits = new Map<string, CaLicencePermit>();
	protected readonly bankAccountRegistrations = new Map<
		string,
		CaBankAccountRegistration
	>();
	protected readonly bankMandates = new Map<string, CaBankMandate>();
	protected readonly groupControlRelationships = new Map<
		string,
		CaGroupControlRelationship
	>();
	protected readonly materialAgreements = new Map<
		string,
		CaMaterialAgreement
	>();
	protected readonly corporateDocuments = new Map<
		string,
		CaCorporateDocument
	>();
	protected readonly filingObligations = new Map<string, CaFilingObligation>();
	protected readonly filingSubmissions = new Map<string, CaFilingSubmission>();

	async getShareClassByIdempotencyKey(
		organizationId: string,
		idempotencyKey: string,
	): Promise<Result<CaShareClass | null>> {
		const row = findByIdempotency(
			this.shareClasses.values(),
			organizationId,
			idempotencyKey,
		);
		return ok(row ? clone(row) : null);
	}

	async createShareClass(
		record: Omit<CaShareClass, "id" | "version" | "createdAt" | "updatedAt">,
	): Promise<Result<CaShareClass>> {
		const existing = findByIdempotency(
			this.shareClasses.values(),
			record.organizationId,
			record.createIdempotencyKey,
		);
		if (existing) return ok(clone(existing));
		for (const row of this.shareClasses.values()) {
			if (
				row.organizationId === record.organizationId &&
				row.legalCompanyId === record.legalCompanyId &&
				row.normalizedCode === record.normalizedCode
			) {
				return fail(
					"CONFLICT",
					"Share class code already exists",
					caErrorDetails(CA_ERROR_CODE_CONFLICT),
				);
			}
		}
		const now = new Date();
		const row: CaShareClass = {
			id: randomUUID(),
			...record,
			version: 1,
			createdAt: now,
			updatedAt: now,
		};
		this.shareClasses.set(row.id, row);
		return ok(clone(row));
	}

	async getShareClassById(
		organizationId: string,
		shareClassId: string,
	): Promise<Result<CaShareClass | null>> {
		const row = this.shareClasses.get(shareClassId);
		if (!row || row.organizationId !== organizationId) return ok(null);
		return ok(clone(row));
	}

	async listShareClasses(
		organizationId: string,
		legalCompanyId: string,
	): Promise<Result<CaShareClass[]>> {
		return ok(
			filterByCompany(
				this.shareClasses.values(),
				organizationId,
				legalCompanyId,
			).map(clone),
		);
	}

	async getShareTransactionByIdempotencyKey(
		organizationId: string,
		idempotencyKey: string,
	): Promise<Result<CaShareTransaction | null>> {
		const row = findByIdempotency(
			this.shareTransactions.values(),
			organizationId,
			idempotencyKey,
		);
		return ok(row ? clone(row) : null);
	}

	async createShareTransaction(
		record: Omit<CaShareTransaction, "id" | "createdAt">,
		legs: Omit<CaShareTransactionLeg, "id" | "createdAt">[],
	): Promise<Result<CaShareTransactionDetail>> {
		const existing = findByIdempotency(
			this.shareTransactions.values(),
			record.organizationId,
			record.createIdempotencyKey,
		);
		if (existing) {
			const existingLegs = [...this.shareTransactionLegs.values()].filter(
				(leg) => leg.shareTransactionId === existing.id,
			);
			return ok({ ...clone(existing), legs: existingLegs.map(clone) });
		}
		const shareClass = this.shareClasses.get(record.shareClassId);
		if (
			!shareClass ||
			shareClass.organizationId !== record.organizationId ||
			shareClass.legalCompanyId !== record.legalCompanyId
		) {
			return fail("NOT_FOUND", "Share class not found");
		}
		if (shareClass.status === "closed") {
			return fail("CONFLICT", "Share class is closed");
		}
		const legDeltas = legs.map((leg) => leg.quantityDelta);
		const totalDelta = sumDecimals(legDeltas);
		if (record.transactionType === "transfer" && !isZeroDecimal(totalDelta)) {
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
			const current = await this.computeHoldingQuantity(
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
		const transaction: CaShareTransaction = {
			id: randomUUID(),
			...record,
			createdAt: new Date(),
		};
		const savedLegs: CaShareTransactionLeg[] = legs.map((leg, index) => ({
			id: randomUUID(),
			...leg,
			shareTransactionId: transaction.id,
			legSequence: index + 1,
			createdAt: new Date(),
		}));
		this.shareTransactions.set(transaction.id, transaction);
		for (const leg of savedLegs) {
			this.shareTransactionLegs.set(leg.id, leg);
		}
		return ok({ ...clone(transaction), legs: savedLegs.map(clone) });
	}

	async getShareTransactionById(
		organizationId: string,
		shareTransactionId: string,
	): Promise<Result<CaShareTransactionDetail | null>> {
		const row = this.shareTransactions.get(shareTransactionId);
		if (!row || row.organizationId !== organizationId) return ok(null);
		const legs = [...this.shareTransactionLegs.values()]
			.filter((leg) => leg.shareTransactionId === row.id)
			.sort((a, b) => a.legSequence - b.legSequence);
		return ok({ ...clone(row), legs: legs.map(clone) });
	}

	async listShareTransactions(
		organizationId: string,
		legalCompanyId: string,
	): Promise<Result<CaShareTransaction[]>> {
		return ok(
			filterByCompany(
				this.shareTransactions.values(),
				organizationId,
				legalCompanyId,
			).map(clone),
		);
	}

	async listShareHoldingsAsOf(
		organizationId: string,
		legalCompanyId: string,
		asOf: string,
		shareClassId?: string,
	): Promise<Result<CaShareHolding[]>> {
		const holdings = new Map<string, CaShareHolding>();
		for (const transaction of this.shareTransactions.values()) {
			if (
				transaction.organizationId !== organizationId ||
				transaction.legalCompanyId !== legalCompanyId ||
				transaction.status !== "posted" ||
				transaction.transactionDate > asOf
			) {
				continue;
			}
			if (shareClassId && transaction.shareClassId !== shareClassId) continue;
			for (const leg of this.shareTransactionLegs.values()) {
				if (leg.shareTransactionId !== transaction.id) continue;
				if (shareClassId && leg.shareClassId !== shareClassId) continue;
				const key = `${leg.shareClassId}:${leg.holderPartyId}`;
				const existing = holdings.get(key);
				const quantity = addDecimal(
					existing?.quantity ?? "0",
					leg.quantityDelta,
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
		}
		return ok([...holdings.values()]);
	}

	private async computeHoldingQuantity(
		organizationId: string,
		legalCompanyId: string,
		shareClassId: string,
		holderPartyId: string,
		asOf: string,
	): Promise<string> {
		const holdings = await this.listShareHoldingsAsOf(
			organizationId,
			legalCompanyId,
			asOf,
			shareClassId,
		);
		if (!holdings.ok) return "0";
		const match = holdings.data.find(
			(row) => row.holderPartyId === holderPartyId,
		);
		return match?.quantity ?? "0";
	}

	async getShareCertificateByIdempotencyKey(
		organizationId: string,
		idempotencyKey: string,
	): Promise<Result<CaShareCertificate | null>> {
		const row = findByIdempotency(
			this.shareCertificates.values(),
			organizationId,
			idempotencyKey,
		);
		return ok(row ? clone(row) : null);
	}

	async createShareCertificate(
		record: Omit<
			CaShareCertificate,
			"id" | "version" | "createdAt" | "updatedAt"
		>,
	): Promise<Result<CaShareCertificate>> {
		const existing = findByIdempotency(
			this.shareCertificates.values(),
			record.organizationId,
			record.createIdempotencyKey,
		);
		if (existing) return ok(clone(existing));
		const now = new Date();
		const row: CaShareCertificate = {
			id: randomUUID(),
			...record,
			version: 1,
			createdAt: now,
			updatedAt: now,
		};
		this.shareCertificates.set(row.id, row);
		return ok(clone(row));
	}

	async getShareCertificateById(
		organizationId: string,
		shareCertificateId: string,
	): Promise<Result<CaShareCertificate | null>> {
		const row = this.shareCertificates.get(shareCertificateId);
		if (!row || row.organizationId !== organizationId) return ok(null);
		return ok(clone(row));
	}

	async listShareCertificates(
		organizationId: string,
		legalCompanyId: string,
	): Promise<Result<CaShareCertificate[]>> {
		return ok(
			filterByCompany(
				this.shareCertificates.values(),
				organizationId,
				legalCompanyId,
			).map(clone),
		);
	}

	async getBeneficialOwnerDisclosureByIdempotencyKey(
		organizationId: string,
		idempotencyKey: string,
	): Promise<Result<CaBeneficialOwnerDisclosure | null>> {
		const row = findByIdempotency(
			this.beneficialOwnerDisclosures.values(),
			organizationId,
			idempotencyKey,
		);
		return ok(row ? clone(row) : null);
	}

	async createBeneficialOwnerDisclosure(
		record: Omit<
			CaBeneficialOwnerDisclosure,
			"id" | "version" | "createdAt" | "updatedAt"
		>,
	): Promise<Result<CaBeneficialOwnerDisclosure>> {
		const existing = findByIdempotency(
			this.beneficialOwnerDisclosures.values(),
			record.organizationId,
			record.createIdempotencyKey,
		);
		if (existing) return ok(clone(existing));
		const now = new Date();
		const row: CaBeneficialOwnerDisclosure = {
			id: randomUUID(),
			...record,
			version: 1,
			createdAt: now,
			updatedAt: now,
		};
		this.beneficialOwnerDisclosures.set(row.id, row);
		return ok(clone(row));
	}

	async getBeneficialOwnerDisclosureById(
		organizationId: string,
		beneficialOwnerDisclosureId: string,
	): Promise<Result<CaBeneficialOwnerDisclosure | null>> {
		const row = this.beneficialOwnerDisclosures.get(
			beneficialOwnerDisclosureId,
		);
		if (!row || row.organizationId !== organizationId) return ok(null);
		return ok(clone(row));
	}

	async listBeneficialOwnerDisclosures(
		organizationId: string,
		legalCompanyId: string,
	): Promise<Result<CaBeneficialOwnerDisclosure[]>> {
		return ok(
			filterByCompany(
				this.beneficialOwnerDisclosures.values(),
				organizationId,
				legalCompanyId,
			).map(clone),
		);
	}

	private createCodedEntity<
		T extends {
			id: string;
			organizationId: string;
			legalCompanyId: string;
			normalizedCode: string;
			createIdempotencyKey: string;
			version: number;
			createdAt: Date;
			updatedAt: Date;
		},
	>(
		map: Map<string, T>,
		codeMaps: Iterable<T>,
		record: Omit<T, "id" | "version" | "createdAt" | "updatedAt">,
		codeFieldLabel: string,
	): Result<T> {
		const existing = findByIdempotency(
			codeMaps,
			record.organizationId,
			record.createIdempotencyKey,
		);
		if (existing) return ok(clone(existing));
		for (const row of codeMaps) {
			if (
				row.organizationId === record.organizationId &&
				row.legalCompanyId === record.legalCompanyId &&
				row.normalizedCode === record.normalizedCode
			) {
				return fail(
					"CONFLICT",
					`${codeFieldLabel} already exists`,
					caErrorDetails(CA_ERROR_CODE_CONFLICT),
				);
			}
		}
		const now = new Date();
		const row = {
			id: randomUUID(),
			...record,
			version: 1,
			createdAt: now,
			updatedAt: now,
		} as T;
		map.set(row.id, row);
		return ok(clone(row));
	}

	async getPropertyHoldingByIdempotencyKey(
		organizationId: string,
		idempotencyKey: string,
	): Promise<Result<CaPropertyHolding | null>> {
		const row = findByIdempotency(
			this.propertyHoldings.values(),
			organizationId,
			idempotencyKey,
		);
		return ok(row ? clone(row) : null);
	}

	async createPropertyHolding(
		record: Omit<
			CaPropertyHolding,
			"id" | "version" | "createdAt" | "updatedAt"
		>,
	): Promise<Result<CaPropertyHolding>> {
		return this.createCodedEntity(
			this.propertyHoldings,
			this.propertyHoldings.values(),
			record,
			"Property holding code",
		);
	}

	async getPropertyHoldingById(
		organizationId: string,
		propertyHoldingId: string,
	): Promise<Result<CaPropertyHolding | null>> {
		const row = this.propertyHoldings.get(propertyHoldingId);
		if (!row || row.organizationId !== organizationId) return ok(null);
		return ok(clone(row));
	}

	async listPropertyHoldings(
		organizationId: string,
		legalCompanyId: string,
	): Promise<Result<CaPropertyHolding[]>> {
		return ok(
			filterByCompany(
				this.propertyHoldings.values(),
				organizationId,
				legalCompanyId,
			).map(clone),
		);
	}

	async getCorporateAssetByIdempotencyKey(
		organizationId: string,
		idempotencyKey: string,
	): Promise<Result<CaCorporateAsset | null>> {
		const row = findByIdempotency(
			this.corporateAssets.values(),
			organizationId,
			idempotencyKey,
		);
		return ok(row ? clone(row) : null);
	}

	async createCorporateAsset(
		record: Omit<
			CaCorporateAsset,
			"id" | "version" | "createdAt" | "updatedAt"
		>,
	): Promise<Result<CaCorporateAsset>> {
		return this.createCodedEntity(
			this.corporateAssets,
			this.corporateAssets.values(),
			record,
			"Corporate asset code",
		);
	}

	async getCorporateAssetById(
		organizationId: string,
		corporateAssetId: string,
	): Promise<Result<CaCorporateAsset | null>> {
		const row = this.corporateAssets.get(corporateAssetId);
		if (!row || row.organizationId !== organizationId) return ok(null);
		return ok(clone(row));
	}

	async listCorporateAssets(
		organizationId: string,
		legalCompanyId: string,
	): Promise<Result<CaCorporateAsset[]>> {
		return ok(
			filterByCompany(
				this.corporateAssets.values(),
				organizationId,
				legalCompanyId,
			).map(clone),
		);
	}

	async getIntellectualPropertyRightByIdempotencyKey(
		organizationId: string,
		idempotencyKey: string,
	): Promise<Result<CaIntellectualPropertyRight | null>> {
		const row = findByIdempotency(
			this.intellectualPropertyRights.values(),
			organizationId,
			idempotencyKey,
		);
		return ok(row ? clone(row) : null);
	}

	async createIntellectualPropertyRight(
		record: Omit<
			CaIntellectualPropertyRight,
			"id" | "version" | "createdAt" | "updatedAt"
		>,
	): Promise<Result<CaIntellectualPropertyRight>> {
		return this.createCodedEntity(
			this.intellectualPropertyRights,
			this.intellectualPropertyRights.values(),
			record,
			"Intellectual property code",
		);
	}

	async getIntellectualPropertyRightById(
		organizationId: string,
		intellectualPropertyRightId: string,
	): Promise<Result<CaIntellectualPropertyRight | null>> {
		const row = this.intellectualPropertyRights.get(
			intellectualPropertyRightId,
		);
		if (!row || row.organizationId !== organizationId) return ok(null);
		return ok(clone(row));
	}

	async listIntellectualPropertyRights(
		organizationId: string,
		legalCompanyId: string,
	): Promise<Result<CaIntellectualPropertyRight[]>> {
		return ok(
			filterByCompany(
				this.intellectualPropertyRights.values(),
				organizationId,
				legalCompanyId,
			).map(clone),
		);
	}

	async getInsurancePolicyByIdempotencyKey(
		organizationId: string,
		idempotencyKey: string,
	): Promise<Result<CaInsurancePolicy | null>> {
		const row = findByIdempotency(
			this.insurancePolicies.values(),
			organizationId,
			idempotencyKey,
		);
		return ok(row ? clone(row) : null);
	}

	async createInsurancePolicy(
		record: Omit<
			CaInsurancePolicy,
			"id" | "version" | "createdAt" | "updatedAt"
		>,
	): Promise<Result<CaInsurancePolicy>> {
		const existing = findByIdempotency(
			this.insurancePolicies.values(),
			record.organizationId,
			record.createIdempotencyKey,
		);
		if (existing) return ok(clone(existing));
		const now = new Date();
		const row: CaInsurancePolicy = {
			id: randomUUID(),
			...record,
			version: 1,
			createdAt: now,
			updatedAt: now,
		};
		this.insurancePolicies.set(row.id, row);
		return ok(clone(row));
	}

	async getInsurancePolicyById(
		organizationId: string,
		insurancePolicyId: string,
	): Promise<Result<CaInsurancePolicy | null>> {
		const row = this.insurancePolicies.get(insurancePolicyId);
		if (!row || row.organizationId !== organizationId) return ok(null);
		return ok(clone(row));
	}

	async listInsurancePolicies(
		organizationId: string,
		legalCompanyId: string,
	): Promise<Result<CaInsurancePolicy[]>> {
		return ok(
			filterByCompany(
				this.insurancePolicies.values(),
				organizationId,
				legalCompanyId,
			).map(clone),
		);
	}

	async getChargeByIdempotencyKey(
		organizationId: string,
		idempotencyKey: string,
	): Promise<Result<CaCharge | null>> {
		const row = findByIdempotency(
			this.charges.values(),
			organizationId,
			idempotencyKey,
		);
		return ok(row ? clone(row) : null);
	}

	async createCharge(
		record: Omit<CaCharge, "id" | "version" | "createdAt" | "updatedAt">,
	): Promise<Result<CaCharge>> {
		return this.createCodedEntity(
			this.charges,
			this.charges.values(),
			record,
			"Charge code",
		);
	}

	async getChargeById(
		organizationId: string,
		chargeId: string,
	): Promise<Result<CaCharge | null>> {
		const row = this.charges.get(chargeId);
		if (!row || row.organizationId !== organizationId) return ok(null);
		return ok(clone(row));
	}

	async listCharges(
		organizationId: string,
		legalCompanyId: string,
	): Promise<Result<CaCharge[]>> {
		return ok(
			filterByCompany(
				this.charges.values(),
				organizationId,
				legalCompanyId,
			).map(clone),
		);
	}

	async getLicencePermitByIdempotencyKey(
		organizationId: string,
		idempotencyKey: string,
	): Promise<Result<CaLicencePermit | null>> {
		const row = findByIdempotency(
			this.licencePermits.values(),
			organizationId,
			idempotencyKey,
		);
		return ok(row ? clone(row) : null);
	}

	async createLicencePermit(
		record: Omit<CaLicencePermit, "id" | "version" | "createdAt" | "updatedAt">,
	): Promise<Result<CaLicencePermit>> {
		const existing = findByIdempotency(
			this.licencePermits.values(),
			record.organizationId,
			record.createIdempotencyKey,
		);
		if (existing) return ok(clone(existing));
		const now = new Date();
		const row: CaLicencePermit = {
			id: randomUUID(),
			...record,
			version: 1,
			createdAt: now,
			updatedAt: now,
		};
		this.licencePermits.set(row.id, row);
		return ok(clone(row));
	}

	async getLicencePermitById(
		organizationId: string,
		licencePermitId: string,
	): Promise<Result<CaLicencePermit | null>> {
		const row = this.licencePermits.get(licencePermitId);
		if (!row || row.organizationId !== organizationId) return ok(null);
		return ok(clone(row));
	}

	async listLicencePermits(
		organizationId: string,
		legalCompanyId: string,
	): Promise<Result<CaLicencePermit[]>> {
		return ok(
			filterByCompany(
				this.licencePermits.values(),
				organizationId,
				legalCompanyId,
			).map(clone),
		);
	}

	async getBankAccountRegistrationByIdempotencyKey(
		organizationId: string,
		idempotencyKey: string,
	): Promise<Result<CaBankAccountRegistration | null>> {
		const row = findByIdempotency(
			this.bankAccountRegistrations.values(),
			organizationId,
			idempotencyKey,
		);
		return ok(row ? clone(row) : null);
	}

	async createBankAccountRegistration(
		record: Omit<
			CaBankAccountRegistration,
			"id" | "version" | "createdAt" | "updatedAt"
		>,
	): Promise<Result<CaBankAccountRegistration>> {
		const existing = findByIdempotency(
			this.bankAccountRegistrations.values(),
			record.organizationId,
			record.createIdempotencyKey,
		);
		if (existing) return ok(clone(existing));
		const now = new Date();
		const row: CaBankAccountRegistration = {
			id: randomUUID(),
			...record,
			version: 1,
			createdAt: now,
			updatedAt: now,
		};
		this.bankAccountRegistrations.set(row.id, row);
		return ok(clone(row));
	}

	async getBankAccountRegistrationById(
		organizationId: string,
		bankAccountRegistrationId: string,
	): Promise<Result<CaBankAccountRegistration | null>> {
		const row = this.bankAccountRegistrations.get(bankAccountRegistrationId);
		if (!row || row.organizationId !== organizationId) return ok(null);
		return ok(clone(row));
	}

	async listBankAccountRegistrations(
		organizationId: string,
		legalCompanyId: string,
	): Promise<Result<CaBankAccountRegistrationPublic[]>> {
		return ok(
			filterByCompany(
				this.bankAccountRegistrations.values(),
				organizationId,
				legalCompanyId,
			).map(toPublicBankAccount),
		);
	}

	async getBankMandateByIdempotencyKey(
		organizationId: string,
		idempotencyKey: string,
	): Promise<Result<CaBankMandate | null>> {
		const row = findByIdempotency(
			this.bankMandates.values(),
			organizationId,
			idempotencyKey,
		);
		return ok(row ? clone(row) : null);
	}

	async createBankMandate(
		record: Omit<CaBankMandate, "id" | "version" | "createdAt" | "updatedAt">,
	): Promise<Result<CaBankMandate>> {
		const existing = findByIdempotency(
			this.bankMandates.values(),
			record.organizationId,
			record.createIdempotencyKey,
		);
		if (existing) return ok(clone(existing));
		const account = this.bankAccountRegistrations.get(
			record.bankAccountRegistrationId,
		);
		if (
			!account ||
			account.organizationId !== record.organizationId ||
			account.legalCompanyId !== record.legalCompanyId
		) {
			return fail("NOT_FOUND", "Bank account registration not found");
		}
		const now = new Date();
		const row: CaBankMandate = {
			id: randomUUID(),
			...record,
			version: 1,
			createdAt: now,
			updatedAt: now,
		};
		this.bankMandates.set(row.id, row);
		return ok(clone(row));
	}

	async getBankMandateById(
		organizationId: string,
		bankMandateId: string,
	): Promise<Result<CaBankMandate | null>> {
		const row = this.bankMandates.get(bankMandateId);
		if (!row || row.organizationId !== organizationId) return ok(null);
		return ok(clone(row));
	}

	async listBankMandates(
		organizationId: string,
		legalCompanyId: string,
	): Promise<Result<CaBankMandate[]>> {
		return ok(
			filterByCompany(
				this.bankMandates.values(),
				organizationId,
				legalCompanyId,
			).map(clone),
		);
	}

	async getGroupControlRelationshipByIdempotencyKey(
		organizationId: string,
		idempotencyKey: string,
	): Promise<Result<CaGroupControlRelationship | null>> {
		const row = findByIdempotency(
			this.groupControlRelationships.values(),
			organizationId,
			idempotencyKey,
		);
		return ok(row ? clone(row) : null);
	}

	async createGroupControlRelationship(
		record: Omit<
			CaGroupControlRelationship,
			"id" | "version" | "createdAt" | "updatedAt"
		>,
	): Promise<Result<CaGroupControlRelationship>> {
		const existing = findByIdempotency(
			this.groupControlRelationships.values(),
			record.organizationId,
			record.createIdempotencyKey,
		);
		if (existing) return ok(clone(existing));
		if (record.counterpartyLegalCompanyId === record.legalCompanyId) {
			return fail("CONFLICT", "Group control relationship cannot self-link");
		}
		const now = new Date();
		const row: CaGroupControlRelationship = {
			id: randomUUID(),
			...record,
			version: 1,
			createdAt: now,
			updatedAt: now,
		};
		this.groupControlRelationships.set(row.id, row);
		return ok(clone(row));
	}

	async getGroupControlRelationshipById(
		organizationId: string,
		groupControlRelationshipId: string,
	): Promise<Result<CaGroupControlRelationship | null>> {
		const row = this.groupControlRelationships.get(groupControlRelationshipId);
		if (!row || row.organizationId !== organizationId) return ok(null);
		return ok(clone(row));
	}

	async listGroupControlRelationships(
		organizationId: string,
		legalCompanyId: string,
	): Promise<Result<CaGroupControlRelationship[]>> {
		return ok(
			filterByCompany(
				this.groupControlRelationships.values(),
				organizationId,
				legalCompanyId,
			).map(clone),
		);
	}

	async getMaterialAgreementByIdempotencyKey(
		organizationId: string,
		idempotencyKey: string,
	): Promise<Result<CaMaterialAgreement | null>> {
		const row = findByIdempotency(
			this.materialAgreements.values(),
			organizationId,
			idempotencyKey,
		);
		return ok(row ? clone(row) : null);
	}

	async createMaterialAgreement(
		record: Omit<
			CaMaterialAgreement,
			"id" | "version" | "createdAt" | "updatedAt"
		>,
	): Promise<Result<CaMaterialAgreement>> {
		const existing = findByIdempotency(
			this.materialAgreements.values(),
			record.organizationId,
			record.createIdempotencyKey,
		);
		if (existing) return ok(clone(existing));
		for (const row of this.materialAgreements.values()) {
			if (
				row.organizationId === record.organizationId &&
				row.legalCompanyId === record.legalCompanyId &&
				row.normalizedAgreementCode === record.normalizedAgreementCode
			) {
				return fail(
					"CONFLICT",
					"Material agreement code already exists",
					caErrorDetails(CA_ERROR_CODE_CONFLICT),
				);
			}
		}
		const now = new Date();
		const row: CaMaterialAgreement = {
			id: randomUUID(),
			...record,
			version: 1,
			createdAt: now,
			updatedAt: now,
		};
		this.materialAgreements.set(row.id, row);
		return ok(clone(row));
	}

	async getMaterialAgreementById(
		organizationId: string,
		materialAgreementId: string,
	): Promise<Result<CaMaterialAgreement | null>> {
		const row = this.materialAgreements.get(materialAgreementId);
		if (!row || row.organizationId !== organizationId) return ok(null);
		return ok(clone(row));
	}

	async listMaterialAgreements(
		organizationId: string,
		legalCompanyId: string,
	): Promise<Result<CaMaterialAgreement[]>> {
		return ok(
			filterByCompany(
				this.materialAgreements.values(),
				organizationId,
				legalCompanyId,
			).map(clone),
		);
	}

	async getCorporateDocumentByIdempotencyKey(
		organizationId: string,
		idempotencyKey: string,
	): Promise<Result<CaCorporateDocument | null>> {
		const row = findByIdempotency(
			this.corporateDocuments.values(),
			organizationId,
			idempotencyKey,
		);
		return ok(row ? clone(row) : null);
	}

	async createCorporateDocument(
		record: Omit<
			CaCorporateDocument,
			"id" | "version" | "createdAt" | "updatedAt"
		>,
	): Promise<Result<CaCorporateDocument>> {
		const existing = findByIdempotency(
			this.corporateDocuments.values(),
			record.organizationId,
			record.createIdempotencyKey,
		);
		if (existing) return ok(clone(existing));
		for (const row of this.corporateDocuments.values()) {
			if (
				row.organizationId === record.organizationId &&
				row.legalCompanyId === record.legalCompanyId &&
				row.normalizedDocumentCode === record.normalizedDocumentCode
			) {
				return fail(
					"CONFLICT",
					"Corporate document code already exists",
					caErrorDetails(CA_ERROR_CODE_CONFLICT),
				);
			}
		}
		const now = new Date();
		const row: CaCorporateDocument = {
			id: randomUUID(),
			...record,
			version: 1,
			createdAt: now,
			updatedAt: now,
		};
		this.corporateDocuments.set(row.id, row);
		return ok(clone(row));
	}

	async getCorporateDocumentById(
		organizationId: string,
		corporateDocumentId: string,
	): Promise<Result<CaCorporateDocument | null>> {
		const row = this.corporateDocuments.get(corporateDocumentId);
		if (!row || row.organizationId !== organizationId) return ok(null);
		return ok(clone(row));
	}

	async listCorporateDocuments(
		organizationId: string,
		legalCompanyId: string,
	): Promise<Result<CaCorporateDocument[]>> {
		return ok(
			filterByCompany(
				this.corporateDocuments.values(),
				organizationId,
				legalCompanyId,
			).map(clone),
		);
	}

	async getFilingObligationByIdempotencyKey(
		organizationId: string,
		idempotencyKey: string,
	): Promise<Result<CaFilingObligation | null>> {
		const row = findByIdempotency(
			this.filingObligations.values(),
			organizationId,
			idempotencyKey,
		);
		return ok(row ? clone(row) : null);
	}

	async createFilingObligation(
		record: Omit<
			CaFilingObligation,
			"id" | "version" | "createdAt" | "updatedAt"
		>,
	): Promise<Result<CaFilingObligation>> {
		const existing = findByIdempotency(
			this.filingObligations.values(),
			record.organizationId,
			record.createIdempotencyKey,
		);
		if (existing) return ok(clone(existing));
		for (const row of this.filingObligations.values()) {
			if (
				row.organizationId === record.organizationId &&
				row.legalCompanyId === record.legalCompanyId &&
				row.normalizedObligationCode === record.normalizedObligationCode
			) {
				return fail(
					"CONFLICT",
					"Filing obligation code already exists",
					caErrorDetails(CA_ERROR_CODE_CONFLICT),
				);
			}
		}
		const now = new Date();
		const row: CaFilingObligation = {
			id: randomUUID(),
			...record,
			version: 1,
			createdAt: now,
			updatedAt: now,
		};
		this.filingObligations.set(row.id, row);
		return ok(clone(row));
	}

	async getFilingObligationById(
		organizationId: string,
		filingObligationId: string,
	): Promise<Result<CaFilingObligation | null>> {
		const row = this.filingObligations.get(filingObligationId);
		if (!row || row.organizationId !== organizationId) return ok(null);
		return ok(clone(row));
	}

	async listFilingObligations(
		organizationId: string,
		legalCompanyId: string,
	): Promise<Result<CaFilingObligation[]>> {
		return ok(
			filterByCompany(
				this.filingObligations.values(),
				organizationId,
				legalCompanyId,
			).map(clone),
		);
	}

	async getFilingSubmissionByIdempotencyKey(
		organizationId: string,
		idempotencyKey: string,
	): Promise<Result<CaFilingSubmission | null>> {
		const row = findByIdempotency(
			this.filingSubmissions.values(),
			organizationId,
			idempotencyKey,
		);
		return ok(row ? clone(row) : null);
	}

	async createFilingSubmission(
		record: Omit<CaFilingSubmission, "id" | "createdAt">,
	): Promise<Result<CaFilingSubmission>> {
		const existing = findByIdempotency(
			this.filingSubmissions.values(),
			record.organizationId,
			record.createIdempotencyKey,
		);
		if (existing) return ok(clone(existing));
		const obligation = this.filingObligations.get(record.filingObligationId);
		if (
			!obligation ||
			obligation.organizationId !== record.organizationId ||
			obligation.legalCompanyId !== record.legalCompanyId
		) {
			return fail("NOT_FOUND", "Filing obligation not found");
		}
		const row: CaFilingSubmission = {
			id: randomUUID(),
			...record,
			createdAt: new Date(),
		};
		this.filingSubmissions.set(row.id, row);
		return ok(clone(row));
	}

	async getFilingSubmissionById(
		organizationId: string,
		filingSubmissionId: string,
	): Promise<Result<CaFilingSubmission | null>> {
		const row = this.filingSubmissions.get(filingSubmissionId);
		if (!row || row.organizationId !== organizationId) return ok(null);
		return ok(clone(row));
	}

	async listFilingSubmissions(
		organizationId: string,
		legalCompanyId: string,
	): Promise<Result<CaFilingSubmission[]>> {
		return ok(
			filterByCompany(
				this.filingSubmissions.values(),
				organizationId,
				legalCompanyId,
			).map(clone),
		);
	}

	async listDueFilings(
		organizationId: string,
		asOf: string,
		legalCompanyId?: string,
	): Promise<Result<CaFilingObligation[]>> {
		return ok(
			[...this.filingObligations.values()]
				.filter((row) => {
					if (row.organizationId !== organizationId) return false;
					if (legalCompanyId && row.legalCompanyId !== legalCompanyId)
						return false;
					const effectiveDue = row.extensionDate ?? row.dueDate;
					return (
						effectiveDue >= asOf &&
						(row.status === "pending" || row.status === "due")
					);
				})
				.map(clone),
		);
	}

	async listOverdueFilings(
		organizationId: string,
		asOf: string,
		legalCompanyId?: string,
	): Promise<Result<CaFilingObligation[]>> {
		return ok(
			[...this.filingObligations.values()]
				.filter((row) => {
					if (row.organizationId !== organizationId) return false;
					if (legalCompanyId && row.legalCompanyId !== legalCompanyId)
						return false;
					const effectiveDue = row.extensionDate ?? row.dueDate;
					return (
						effectiveDue < asOf &&
						row.status !== "acknowledged" &&
						row.status !== "waived"
					);
				})
				.map(clone),
		);
	}

	async searchCorporateRecords(
		organizationId: string,
		query: string,
		limit: number,
		legalCompanyId?: string,
	): Promise<Result<CaCorporateRecordSearchHit[]>> {
		const normalizedQuery = query.trim().toUpperCase();
		const hits: CaCorporateRecordSearchHit[] = [];
		const pushHit = (hit: CaCorporateRecordSearchHit) => {
			if (legalCompanyId && hit.legalCompanyId !== legalCompanyId) return;
			hits.push(hit);
		};
		for (const row of this.shareClasses.values()) {
			if (row.organizationId !== organizationId) continue;
			if (row.code.toUpperCase().includes(normalizedQuery)) {
				pushHit({
					entityType: "share_class",
					entityId: row.id,
					legalCompanyId: row.legalCompanyId,
					title: row.code,
					subtitle: row.classType,
				});
			}
		}
		for (const row of this.corporateDocuments.values()) {
			if (row.organizationId !== organizationId) continue;
			if (
				row.title.toUpperCase().includes(normalizedQuery) ||
				row.documentCode.toUpperCase().includes(normalizedQuery)
			) {
				pushHit({
					entityType: "corporate_document",
					entityId: row.id,
					legalCompanyId: row.legalCompanyId,
					title: row.title,
					subtitle: row.documentType,
				});
			}
		}
		for (const row of this.licencePermits.values()) {
			if (row.organizationId !== organizationId) continue;
			if (row.licenceNumber.toUpperCase().includes(normalizedQuery)) {
				pushHit({
					entityType: "licence_permit",
					entityId: row.id,
					legalCompanyId: row.legalCompanyId,
					title: row.licenceNumber,
					subtitle: row.licenceType,
				});
			}
		}
		return ok(hits.slice(0, limit));
	}
}
