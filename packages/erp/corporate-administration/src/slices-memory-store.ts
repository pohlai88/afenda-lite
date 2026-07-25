import { randomUUID } from "node:crypto";

import { fail, ok, type Result } from "@afenda/errors/result";

import {
	CA_ERROR_CODE_CONFLICT,
	CA_ERROR_IDEMPOTENCY_CONFLICT,
	CA_ERROR_SHARE_CERTIFICATE_CONFLICT,
	CA_ERROR_SHARE_CLASS_CLOSED,
	CA_ERROR_SHARE_INSUFFICIENT_HOLDING,
	CA_ERROR_SHARE_TRANSACTION_UNBALANCED,
	CA_ERROR_VERSION_CONFLICT,
	caErrorDetails,
} from "./error-codes";
import { MemoryGovernanceStore } from "./governance-memory-store";
import type {
	Ca4MutationContext,
	ShareCapitalMutationContext,
	SlicesStore,
} from "./ports";
import { recordShareCapitalMutation } from "./share-capital-audit";
import {
	addDecimal,
	compareDecimal,
	isNegativeDecimal,
	isZeroDecimal,
	negateDecimal,
	sumDecimals,
} from "./shared/decimal";
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
	protected readonly intellectualPropertyRenewals = new Map<
		string,
		CaIntellectualPropertyRenewal
	>();
	protected readonly insurancePolicyRenewals = new Map<
		string,
		CaInsurancePolicyRenewal
	>();
	protected readonly chargeVariations = new Map<string, CaChargeVariation>();
	protected readonly propertyAssetMutationReceipts = new Map<
		string,
		CaPropertyAssetMutationReceipt
	>();
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
	private readonly ca4LockTails = new Map<string, Promise<void>>();

	private async withCa4Lock<T>(
		key: string,
		task: () => Promise<Result<T>>,
	): Promise<Result<T>> {
		const previous = this.ca4LockTails.get(key) ?? Promise.resolve();
		let release: () => void = () => void 0;
		const current = new Promise<void>((resolve) => {
			release = resolve;
		});
		const tail = previous.then(() => current);
		this.ca4LockTails.set(key, tail);
		await previous;
		try {
			return await task();
		} finally {
			release();
			if (this.ca4LockTails.get(key) === tail) {
				this.ca4LockTails.delete(key);
			}
		}
	}

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
		mutation?: ShareCapitalMutationContext,
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
		const facts = await recordShareCapitalMutation(
			mutation,
			{
				organizationId: row.organizationId,
				actorUserId: row.createdBy,
				legalCompanyId: row.legalCompanyId,
				entityType: "share_class",
				entityId: row.id,
				action: "CREATE",
				version: row.version,
				status: row.status,
				newValue: row as unknown as Record<string, unknown>,
			},
			{ emitOutbox: false },
		);
		if (!facts.ok) return facts;
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

	async updateShareClass(
		record: CaShareClass,
		expectedVersion: number,
		mutation?: ShareCapitalMutationContext,
	): Promise<Result<CaShareClass>> {
		const existing = this.shareClasses.get(record.id);
		if (!existing || existing.organizationId !== record.organizationId) {
			return fail("NOT_FOUND", "Share class not found");
		}
		if (existing.version !== expectedVersion) {
			return fail(
				"CONFLICT",
				"Share class version conflict",
				caErrorDetails(CA_ERROR_VERSION_CONFLICT),
			);
		}
		const updated: CaShareClass = {
			...record,
			version: existing.version + 1,
			updatedAt: new Date(),
		};
		const facts = await recordShareCapitalMutation(
			mutation,
			{
				organizationId: updated.organizationId,
				actorUserId: updated.updatedBy,
				legalCompanyId: updated.legalCompanyId,
				entityType: "share_class",
				entityId: updated.id,
				action: "UPDATE",
				version: updated.version,
				status: updated.status,
				oldValue: existing as unknown as Record<string, unknown>,
				newValue: updated as unknown as Record<string, unknown>,
			},
			{ emitOutbox: false },
		);
		if (!facts.ok) return facts;
		this.shareClasses.set(updated.id, updated);
		return ok(clone(updated));
	}

	async closeShareClass(
		record: CaShareClass,
		expectedVersion: number,
		mutation?: ShareCapitalMutationContext,
	): Promise<Result<CaShareClass>> {
		return this.updateShareClass(record, expectedVersion, mutation);
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
		legs: Omit<
			CaShareTransactionLeg,
			"id" | "createdAt" | "shareTransactionId" | "legSequence"
		>[],
		mutation?: ShareCapitalMutationContext,
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
			return fail(
				"CONFLICT",
				"Share class is closed",
				caErrorDetails(CA_ERROR_SHARE_CLASS_CLOSED),
			);
		}
		const legDeltas = legs.map((leg) => leg.quantityDelta);
		const totalDelta = sumDecimals(legDeltas);
		if (record.transactionType === "transfer" && !isZeroDecimal(totalDelta)) {
			return fail(
				"CONFLICT",
				"Transfer transaction legs must sum to zero",
				caErrorDetails(CA_ERROR_SHARE_TRANSACTION_UNBALANCED),
			);
		}
		if (record.transactionType === "issuance") {
			for (const delta of legDeltas) {
				if (isNegativeDecimal(delta) || isZeroDecimal(delta)) {
					return fail("CONFLICT", "Issuance legs must be positive");
				}
			}
			if (!isZeroDecimal(shareClass.authorizedQuantity)) {
				const holdings = await this.listShareHoldingsAsOf(
					record.organizationId,
					record.legalCompanyId,
					record.transactionDate,
					record.shareClassId,
				);
				if (!holdings.ok) return holdings;
				const issued = sumDecimals(holdings.data.map((row) => row.quantity));
				const afterIssuance = addDecimal(issued, totalDelta);
				if (compareDecimal(afterIssuance, shareClass.authorizedQuantity) > 0) {
					return fail(
						"CONFLICT",
						"Issuance exceeds authorized share class quantity",
					);
				}
			}
		}
		if (
			record.transactionType === "cancellation" &&
			!isNegativeDecimal(totalDelta)
		) {
			return fail("CONFLICT", "Cancellation transaction must reduce shares");
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
					caErrorDetails(CA_ERROR_SHARE_INSUFFICIENT_HOLDING),
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
		const facts = await recordShareCapitalMutation(mutation, {
			organizationId: transaction.organizationId,
			actorUserId: transaction.createdBy,
			legalCompanyId: transaction.legalCompanyId,
			entityType: "share_transaction",
			entityId: transaction.id,
			action: "CREATE",
			status: transaction.status,
			reversalOfId: transaction.reversalOfId,
			newValue: transaction as unknown as Record<string, unknown>,
		});
		if (!facts.ok) return facts;
		this.shareTransactions.set(transaction.id, transaction);
		for (const leg of savedLegs) {
			this.shareTransactionLegs.set(leg.id, leg);
		}
		return ok({ ...clone(transaction), legs: savedLegs.map(clone) });
	}

	async reverseShareTransaction(input: {
		organizationId: string;
		legalCompanyId: string;
		originalTransactionId: string;
		reversalReference: string;
		reversalDate: string;
		createIdempotencyKey: string;
		createdBy: string;
		correlationId: string;
		mutation?: ShareCapitalMutationContext;
	}): Promise<Result<CaShareTransactionDetail>> {
		const existing = findByIdempotency(
			this.shareTransactions.values(),
			input.organizationId,
			input.createIdempotencyKey,
		);
		if (existing) {
			const existingLegs = [...this.shareTransactionLegs.values()].filter(
				(leg) => leg.shareTransactionId === existing.id,
			);
			return ok({ ...clone(existing), legs: existingLegs.map(clone) });
		}
		const original = this.shareTransactions.get(input.originalTransactionId);
		if (
			!original ||
			original.organizationId !== input.organizationId ||
			original.legalCompanyId !== input.legalCompanyId
		) {
			return fail("NOT_FOUND", "Share transaction not found");
		}
		if (original.status !== "posted" || original.reversalOfId) {
			return fail("CONFLICT", "Share transaction cannot be reversed");
		}
		const originalLegs = [...this.shareTransactionLegs.values()]
			.filter((leg) => leg.shareTransactionId === original.id)
			.sort((a, b) => a.legSequence - b.legSequence);
		const reversalLegs = originalLegs.map((leg) => ({
			organizationId: leg.organizationId,
			legalCompanyId: leg.legalCompanyId,
			shareClassId: leg.shareClassId,
			holderPartyId: leg.holderPartyId,
			holderPartyCodeSnapshot: leg.holderPartyCodeSnapshot,
			holderPartyNameSnapshot: leg.holderPartyNameSnapshot,
			quantityDelta: negateDecimal(leg.quantityDelta),
		}));
		for (const leg of reversalLegs) {
			const current = await this.computeHoldingQuantity(
				input.organizationId,
				input.legalCompanyId,
				leg.shareClassId,
				leg.holderPartyId,
				input.reversalDate,
			);
			const next = addDecimal(current, leg.quantityDelta);
			if (isNegativeDecimal(next)) {
				return fail(
					"CONFLICT",
					"Insufficient share holding for reversal leg",
					caErrorDetails(CA_ERROR_SHARE_INSUFFICIENT_HOLDING),
				);
			}
		}
		const reversal: CaShareTransaction = {
			id: randomUUID(),
			organizationId: input.organizationId,
			legalCompanyId: input.legalCompanyId,
			shareClassId: original.shareClassId,
			transactionReference: input.reversalReference,
			transactionType: "correction",
			transactionDate: input.reversalDate,
			status: "posted",
			reversalOfId: original.id,
			createIdempotencyKey: input.createIdempotencyKey,
			createdBy: input.createdBy,
			createdAt: new Date(),
		};
		const savedLegs: CaShareTransactionLeg[] = reversalLegs.map(
			(leg, index) => ({
				id: randomUUID(),
				...leg,
				shareTransactionId: reversal.id,
				legSequence: index + 1,
				createdAt: new Date(),
			}),
		);
		const reversedOriginal: CaShareTransaction = {
			...original,
			status: "reversed",
		};
		const facts = await recordShareCapitalMutation(input.mutation, {
			organizationId: reversal.organizationId,
			actorUserId: reversal.createdBy,
			legalCompanyId: reversal.legalCompanyId,
			entityType: "share_transaction",
			entityId: reversal.id,
			action: "CREATE",
			status: reversal.status,
			reversalOfId: reversal.reversalOfId,
			newValue: reversal as unknown as Record<string, unknown>,
		});
		if (!facts.ok) return facts;
		this.shareTransactions.set(reversal.id, reversal);
		for (const leg of savedLegs) {
			this.shareTransactionLegs.set(leg.id, leg);
		}
		this.shareTransactions.set(original.id, reversedOriginal);
		return ok({ ...clone(reversal), legs: savedLegs.map(clone) });
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
				transaction.reversalOfId ||
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
		mutation?: ShareCapitalMutationContext,
	): Promise<Result<CaShareCertificate>> {
		const existing = findByIdempotency(
			this.shareCertificates.values(),
			record.organizationId,
			record.createIdempotencyKey,
		);
		if (existing) return ok(clone(existing));
		for (const row of this.shareCertificates.values()) {
			if (
				row.organizationId === record.organizationId &&
				row.legalCompanyId === record.legalCompanyId &&
				row.normalizedCertificateNumber ===
					record.normalizedCertificateNumber &&
				row.status === "active"
			) {
				return fail(
					"CONFLICT",
					"Active share certificate number already exists",
					caErrorDetails(CA_ERROR_SHARE_CERTIFICATE_CONFLICT),
				);
			}
		}
		const now = new Date();
		const row: CaShareCertificate = {
			id: randomUUID(),
			...record,
			version: 1,
			createdAt: now,
			updatedAt: now,
		};
		const facts = await recordShareCapitalMutation(
			mutation,
			{
				organizationId: row.organizationId,
				actorUserId: row.createdBy,
				legalCompanyId: row.legalCompanyId,
				entityType: "share_certificate",
				entityId: row.id,
				action: "CREATE",
				version: row.version,
				status: row.status,
				newValue: row as unknown as Record<string, unknown>,
			},
			{ emitOutbox: false },
		);
		if (!facts.ok) return facts;
		this.shareCertificates.set(row.id, row);
		return ok(clone(row));
	}

	async replaceShareCertificate(input: {
		prior: CaShareCertificate;
		replacement: Omit<
			CaShareCertificate,
			"id" | "version" | "createdAt" | "updatedAt"
		>;
		mutation?: ShareCapitalMutationContext;
	}): Promise<Result<CaShareCertificate>> {
		const existing = findByIdempotency(
			this.shareCertificates.values(),
			input.replacement.organizationId,
			input.replacement.createIdempotencyKey,
		);
		if (existing) return ok(clone(existing));
		for (const row of this.shareCertificates.values()) {
			if (
				row.organizationId === input.replacement.organizationId &&
				row.legalCompanyId === input.replacement.legalCompanyId &&
				row.normalizedCertificateNumber ===
					input.replacement.normalizedCertificateNumber &&
				row.status === "active"
			) {
				return fail(
					"CONFLICT",
					"Active share certificate number already exists",
					caErrorDetails(CA_ERROR_SHARE_CERTIFICATE_CONFLICT),
				);
			}
		}
		const replacedPrior: CaShareCertificate = {
			...input.prior,
			status: "replaced",
			version: input.prior.version + 1,
			updatedBy: input.replacement.updatedBy,
			updatedAt: new Date(),
		};
		const now = new Date();
		const row: CaShareCertificate = {
			id: randomUUID(),
			...input.replacement,
			version: 1,
			createdAt: now,
			updatedAt: now,
		};
		const facts = await recordShareCapitalMutation(
			input.mutation,
			{
				organizationId: row.organizationId,
				actorUserId: row.createdBy,
				legalCompanyId: row.legalCompanyId,
				entityType: "share_certificate",
				entityId: row.id,
				action: "CREATE",
				version: row.version,
				status: row.status,
				newValue: row as unknown as Record<string, unknown>,
			},
			{ emitOutbox: false },
		);
		if (!facts.ok) return facts;
		this.shareCertificates.set(replacedPrior.id, replacedPrior);
		this.shareCertificates.set(row.id, row);
		return ok(clone(row));
	}

	async cancelShareCertificate(
		record: CaShareCertificate,
		expectedVersion: number,
		mutation?: ShareCapitalMutationContext,
	): Promise<Result<CaShareCertificate>> {
		const existing = this.shareCertificates.get(record.id);
		if (!existing || existing.organizationId !== record.organizationId) {
			return fail("NOT_FOUND", "Share certificate not found");
		}
		if (existing.version !== expectedVersion) {
			return fail(
				"CONFLICT",
				"Share certificate version conflict",
				caErrorDetails(CA_ERROR_VERSION_CONFLICT),
			);
		}
		const updated: CaShareCertificate = {
			...record,
			version: existing.version + 1,
			updatedAt: new Date(),
		};
		const facts = await recordShareCapitalMutation(
			mutation,
			{
				organizationId: updated.organizationId,
				actorUserId: updated.updatedBy,
				legalCompanyId: updated.legalCompanyId,
				entityType: "share_certificate",
				entityId: updated.id,
				action: "UPDATE",
				version: updated.version,
				status: updated.status,
				oldValue: existing as unknown as Record<string, unknown>,
				newValue: updated as unknown as Record<string, unknown>,
			},
			{ emitOutbox: false },
		);
		if (!facts.ok) return facts;
		this.shareCertificates.set(updated.id, updated);
		return ok(clone(updated));
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
		mutation?: ShareCapitalMutationContext,
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
		const facts = await recordShareCapitalMutation(mutation, {
			organizationId: row.organizationId,
			actorUserId: row.createdBy,
			legalCompanyId: row.legalCompanyId,
			entityType: "beneficial_owner_disclosure",
			entityId: row.id,
			action: "CREATE",
			version: row.version,
			status: row.verificationStatus,
			newValue: row as unknown as Record<string, unknown>,
		});
		if (!facts.ok) return facts;
		this.beneficialOwnerDisclosures.set(row.id, row);
		return ok(clone(row));
	}

	async updateBeneficialOwnerDisclosure(
		record: CaBeneficialOwnerDisclosure,
		expectedVersion: number,
		mutation?: ShareCapitalMutationContext,
	): Promise<Result<CaBeneficialOwnerDisclosure>> {
		const existing = this.beneficialOwnerDisclosures.get(record.id);
		if (!existing || existing.organizationId !== record.organizationId) {
			return fail("NOT_FOUND", "Beneficial owner disclosure not found");
		}
		if (existing.version !== expectedVersion) {
			return fail(
				"CONFLICT",
				"Beneficial owner disclosure version conflict",
				caErrorDetails(CA_ERROR_VERSION_CONFLICT),
			);
		}
		const updated: CaBeneficialOwnerDisclosure = {
			...record,
			version: existing.version + 1,
			updatedAt: new Date(),
		};
		const facts = await recordShareCapitalMutation(mutation, {
			organizationId: updated.organizationId,
			actorUserId: updated.updatedBy,
			legalCompanyId: updated.legalCompanyId,
			entityType: "beneficial_owner_disclosure",
			entityId: updated.id,
			action: "UPDATE",
			version: updated.version,
			status: updated.verificationStatus,
			oldValue: existing as unknown as Record<string, unknown>,
			newValue: updated as unknown as Record<string, unknown>,
		});
		if (!facts.ok) return facts;
		this.beneficialOwnerDisclosures.set(updated.id, updated);
		return ok(clone(updated));
	}

	async endBeneficialOwnerDisclosure(
		record: CaBeneficialOwnerDisclosure,
		expectedVersion: number,
		mutation?: ShareCapitalMutationContext,
	): Promise<Result<CaBeneficialOwnerDisclosure>> {
		return this.updateBeneficialOwnerDisclosure(
			record,
			expectedVersion,
			mutation,
		);
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

	async listBeneficialOwnerDisclosuresAsOf(
		organizationId: string,
		legalCompanyId: string,
		asOf: string,
	): Promise<Result<CaBeneficialOwnerDisclosure[]>> {
		const rows = filterByCompany(
			this.beneficialOwnerDisclosures.values(),
			organizationId,
			legalCompanyId,
		).filter(
			(row) =>
				row.effectiveFrom <= asOf &&
				(row.effectiveTo === null || row.effectiveTo >= asOf),
		);
		return ok(rows.map(clone));
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

	private async recordCa4Mutation(
		entity: {
			id: string;
			organizationId: string;
			legalCompanyId: string;
			version: number;
			updatedBy: string;
		},
		entityType: CaPropertyAssetMutationReceipt["entityType"],
		action: "CREATE" | "UPDATE",
		mutation?: Ca4MutationContext,
	): Promise<Result<void>> {
		if (!mutation) return ok(undefined);
		const receipt = [...this.propertyAssetMutationReceipts.values()].find(
			(row) =>
				row.organizationId === entity.organizationId &&
				row.idempotencyKey === mutation.meta.idempotencyKey,
		);
		if (receipt) {
			if (receipt.requestFingerprint !== mutation.meta.requestFingerprint) {
				return fail(
					"CONFLICT",
					"Idempotency key was already used for a different request",
					caErrorDetails(CA_ERROR_IDEMPOTENCY_CONFLICT),
				);
			}
			return ok(undefined);
		}
		const recorded = await mutation.ports.record({
			audit: {
				organizationId: entity.organizationId,
				actorUserId: entity.updatedBy,
				correlationId: mutation.meta.correlationId,
				entity: entityType,
				entityId: entity.id,
				action,
				changes: [],
			},
			outbox: {
				organizationId: entity.organizationId,
				actorUserId: entity.updatedBy,
				correlationId: mutation.meta.correlationId,
				type: mutation.meta.eventType,
				payload: {
					organizationId: entity.organizationId,
					legalCompanyId: entity.legalCompanyId,
					entityType,
					entityId: entity.id,
					version: entity.version,
					actorId: entity.updatedBy,
					correlationId: mutation.meta.correlationId,
				},
			},
		});
		if (!recorded.ok) return recorded;
		const row: CaPropertyAssetMutationReceipt = {
			id: randomUUID(),
			organizationId: entity.organizationId,
			commandId: mutation.meta.commandId,
			entityType,
			entityId: entity.id,
			resultVersion: entity.version,
			idempotencyKey: mutation.meta.idempotencyKey,
			requestFingerprint: mutation.meta.requestFingerprint,
			createdAt: new Date(),
		};
		this.propertyAssetMutationReceipts.set(row.id, row);
		return ok(undefined);
	}

	async getPropertyAssetMutationReceipt(
		organizationId: string,
		idempotencyKey: string,
	): Promise<Result<CaPropertyAssetMutationReceipt | null>> {
		const row = [...this.propertyAssetMutationReceipts.values()].find(
			(receipt) =>
				receipt.organizationId === organizationId &&
				receipt.idempotencyKey === idempotencyKey,
		);
		return ok(row ? clone(row) : null);
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
		mutation?: Ca4MutationContext,
	): Promise<Result<CaPropertyHolding>> {
		const lockKey = `${record.organizationId}:${record.legalCompanyId}:property:${record.normalizedTitleReference}`;
		return this.withCa4Lock(lockKey, async () => {
			const replay = await this.getPropertyAssetMutationReceipt(
				record.organizationId,
				record.createIdempotencyKey,
			);
			if (!replay.ok) return replay;
			if (replay.data) {
				if (
					replay.data.requestFingerprint !== record.createRequestFingerprint
				) {
					return fail(
						"CONFLICT",
						"Idempotency key was already used for a different request",
						caErrorDetails(CA_ERROR_IDEMPOTENCY_CONFLICT),
					);
				}
				const existing = this.propertyHoldings.get(replay.data.entityId);
				return existing
					? ok(clone(existing))
					: fail("NOT_FOUND", "Property not found");
			}
			for (const existing of this.propertyHoldings.values()) {
				if (
					existing.organizationId === record.organizationId &&
					existing.legalCompanyId === record.legalCompanyId &&
					existing.normalizedTitleReference ===
						record.normalizedTitleReference &&
					existing.status === "active"
				) {
					return fail(
						"CONFLICT",
						"Property title already has an active holding",
					);
				}
			}
			const now = new Date();
			const row: CaPropertyHolding = {
				id: randomUUID(),
				...record,
				version: 1,
				createdAt: now,
				updatedAt: now,
			};
			const facts = await this.recordCa4Mutation(
				row,
				"property",
				"CREATE",
				mutation,
			);
			if (!facts.ok) return facts;
			this.propertyHoldings.set(row.id, row);
			return ok(clone(row));
		});
	}

	async updatePropertyHolding(
		record: CaPropertyHolding,
		expectedVersion: number,
		mutation?: Ca4MutationContext,
	): Promise<Result<CaPropertyHolding>> {
		const existing = this.propertyHoldings.get(record.id);
		if (!existing || existing.organizationId !== record.organizationId) {
			return fail("NOT_FOUND", "Property not found");
		}
		if (existing.version !== expectedVersion) {
			return fail(
				"CONFLICT",
				"Property version conflict",
				caErrorDetails(CA_ERROR_VERSION_CONFLICT),
			);
		}
		const updated = {
			...record,
			version: expectedVersion + 1,
			updatedAt: new Date(),
		};
		const facts = await this.recordCa4Mutation(
			updated,
			"property",
			"UPDATE",
			mutation,
		);
		if (!facts.ok) return facts;
		this.propertyHoldings.set(updated.id, updated);
		return ok(clone(updated));
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
			)
				.sort((a, b) =>
					a.normalizedTitleReference.localeCompare(b.normalizedTitleReference),
				)
				.map(clone),
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
		mutation?: Ca4MutationContext,
	): Promise<Result<CaCorporateAsset>> {
		const replay = findByIdempotency(
			this.corporateAssets.values(),
			record.organizationId,
			record.createIdempotencyKey,
		);
		if (replay) {
			const facts = await this.recordCa4Mutation(
				replay,
				"asset",
				"CREATE",
				mutation,
			);
			if (!facts.ok) return facts;
			return ok(clone(replay));
		}
		const created = await this.createCodedEntity(
			this.corporateAssets,
			this.corporateAssets.values(),
			record,
			"Corporate asset code",
		);
		if (!created.ok) return created;
		const facts = await this.recordCa4Mutation(
			created.data,
			"asset",
			"CREATE",
			mutation,
		);
		if (!facts.ok) {
			this.corporateAssets.delete(created.data.id);
			return facts;
		}
		return created;
	}

	async updateCorporateAsset(
		record: CaCorporateAsset,
		expectedVersion: number,
		mutation?: Ca4MutationContext,
	): Promise<Result<CaCorporateAsset>> {
		const existing = this.corporateAssets.get(record.id);
		if (!existing || existing.organizationId !== record.organizationId) {
			return fail("NOT_FOUND", "Corporate asset not found");
		}
		if (existing.version !== expectedVersion) {
			return fail(
				"CONFLICT",
				"Corporate asset version conflict",
				caErrorDetails(CA_ERROR_VERSION_CONFLICT),
			);
		}
		const updated = {
			...record,
			version: expectedVersion + 1,
			updatedAt: new Date(),
		};
		const facts = await this.recordCa4Mutation(
			updated,
			"asset",
			"UPDATE",
			mutation,
		);
		if (!facts.ok) return facts;
		this.corporateAssets.set(updated.id, updated);
		return ok(clone(updated));
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
			)
				.sort((a, b) => a.normalizedCode.localeCompare(b.normalizedCode))
				.map(clone),
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
		mutation?: Ca4MutationContext,
	): Promise<Result<CaIntellectualPropertyRight>> {
		const replay = findByIdempotency(
			this.intellectualPropertyRights.values(),
			record.organizationId,
			record.createIdempotencyKey,
		);
		if (replay) {
			const facts = await this.recordCa4Mutation(
				replay,
				"intellectual-property",
				"CREATE",
				mutation,
			);
			if (!facts.ok) return facts;
			return ok(clone(replay));
		}
		const created = await this.createCodedEntity(
			this.intellectualPropertyRights,
			this.intellectualPropertyRights.values(),
			record,
			"Intellectual property code",
		);
		if (!created.ok) return created;
		const facts = await this.recordCa4Mutation(
			created.data,
			"intellectual-property",
			"CREATE",
			mutation,
		);
		if (!facts.ok) {
			this.intellectualPropertyRights.delete(created.data.id);
			return facts;
		}
		return created;
	}

	async updateIntellectualPropertyRight(
		record: CaIntellectualPropertyRight,
		expectedVersion: number,
		renewal: Omit<CaIntellectualPropertyRenewal, "id" | "createdAt"> | null,
		mutation?: Ca4MutationContext,
	): Promise<Result<CaIntellectualPropertyRight>> {
		const existing = this.intellectualPropertyRights.get(record.id);
		if (!existing || existing.organizationId !== record.organizationId) {
			return fail("NOT_FOUND", "Intellectual property right not found");
		}
		if (existing.version !== expectedVersion) {
			return fail(
				"CONFLICT",
				"Intellectual property version conflict",
				caErrorDetails(CA_ERROR_VERSION_CONFLICT),
			);
		}
		const updated = {
			...record,
			version: expectedVersion + 1,
			updatedAt: new Date(),
		};
		const facts = await this.recordCa4Mutation(
			updated,
			"intellectual-property",
			"UPDATE",
			mutation,
		);
		if (!facts.ok) return facts;
		this.intellectualPropertyRights.set(updated.id, updated);
		if (renewal) {
			const fact: CaIntellectualPropertyRenewal = {
				id: randomUUID(),
				...renewal,
				createdAt: new Date(),
			};
			this.intellectualPropertyRenewals.set(fact.id, fact);
		}
		return ok(clone(updated));
	}

	async listIntellectualPropertyRenewals(
		organizationId: string,
		intellectualPropertyRightId: string,
	): Promise<Result<CaIntellectualPropertyRenewal[]>> {
		return ok(
			[...this.intellectualPropertyRenewals.values()]
				.filter(
					(row) =>
						row.organizationId === organizationId &&
						row.intellectualPropertyRightId === intellectualPropertyRightId,
				)
				.sort((a, b) => a.renewalDate.localeCompare(b.renewalDate))
				.map(clone),
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
			)
				.sort((a, b) =>
					a.normalizedRightNumber.localeCompare(b.normalizedRightNumber),
				)
				.map(clone),
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
		mutation?: Ca4MutationContext,
	): Promise<Result<CaInsurancePolicy>> {
		const existing = findByIdempotency(
			this.insurancePolicies.values(),
			record.organizationId,
			record.createIdempotencyKey,
		);
		if (existing) {
			const facts = await this.recordCa4Mutation(
				existing,
				"insurance-policy",
				"CREATE",
				mutation,
			);
			if (!facts.ok) return facts;
			return ok(clone(existing));
		}
		const now = new Date();
		const row: CaInsurancePolicy = {
			id: randomUUID(),
			...record,
			version: 1,
			createdAt: now,
			updatedAt: now,
		};
		const facts = await this.recordCa4Mutation(
			row,
			"insurance-policy",
			"CREATE",
			mutation,
		);
		if (!facts.ok) return facts;
		this.insurancePolicies.set(row.id, row);
		return ok(clone(row));
	}

	async updateInsurancePolicy(
		record: CaInsurancePolicy,
		expectedVersion: number,
		renewal: Omit<CaInsurancePolicyRenewal, "id" | "createdAt"> | null,
		mutation?: Ca4MutationContext,
	): Promise<Result<CaInsurancePolicy>> {
		const existing = this.insurancePolicies.get(record.id);
		if (!existing || existing.organizationId !== record.organizationId) {
			return fail("NOT_FOUND", "Insurance policy not found");
		}
		if (existing.version !== expectedVersion) {
			return fail(
				"CONFLICT",
				"Insurance policy version conflict",
				caErrorDetails(CA_ERROR_VERSION_CONFLICT),
			);
		}
		const updated = {
			...record,
			version: expectedVersion + 1,
			updatedAt: new Date(),
		};
		const facts = await this.recordCa4Mutation(
			updated,
			"insurance-policy",
			"UPDATE",
			mutation,
		);
		if (!facts.ok) return facts;
		this.insurancePolicies.set(updated.id, updated);
		if (renewal) {
			const fact: CaInsurancePolicyRenewal = {
				id: randomUUID(),
				...renewal,
				createdAt: new Date(),
			};
			this.insurancePolicyRenewals.set(fact.id, fact);
		}
		return ok(clone(updated));
	}

	async listInsurancePolicyRenewals(
		organizationId: string,
		insurancePolicyId: string,
	): Promise<Result<CaInsurancePolicyRenewal[]>> {
		return ok(
			[...this.insurancePolicyRenewals.values()]
				.filter(
					(row) =>
						row.organizationId === organizationId &&
						row.insurancePolicyId === insurancePolicyId,
				)
				.sort((a, b) => a.renewalDate.localeCompare(b.renewalDate))
				.map(clone),
		);
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
			)
				.sort((a, b) =>
					a.normalizedPolicyNumber.localeCompare(b.normalizedPolicyNumber),
				)
				.map(clone),
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
		mutation?: Ca4MutationContext,
	): Promise<Result<CaCharge>> {
		const replay = findByIdempotency(
			this.charges.values(),
			record.organizationId,
			record.createIdempotencyKey,
		);
		if (replay) {
			const facts = await this.recordCa4Mutation(
				replay,
				"charge",
				"CREATE",
				mutation,
			);
			if (!facts.ok) return facts;
			return ok(clone(replay));
		}
		const created = await this.createCodedEntity(
			this.charges,
			this.charges.values(),
			record,
			"Charge code",
		);
		if (!created.ok) return created;
		const facts = await this.recordCa4Mutation(
			created.data,
			"charge",
			"CREATE",
			mutation,
		);
		if (!facts.ok) {
			this.charges.delete(created.data.id);
			return facts;
		}
		return created;
	}

	async updateCharge(
		record: CaCharge,
		expectedVersion: number,
		variation: Omit<CaChargeVariation, "id" | "createdAt"> | null,
		mutation?: Ca4MutationContext,
	): Promise<Result<CaCharge>> {
		const existing = this.charges.get(record.id);
		if (!existing || existing.organizationId !== record.organizationId) {
			return fail("NOT_FOUND", "Charge not found");
		}
		if (existing.version !== expectedVersion) {
			return fail(
				"CONFLICT",
				"Charge version conflict",
				caErrorDetails(CA_ERROR_VERSION_CONFLICT),
			);
		}
		const updated = {
			...record,
			version: expectedVersion + 1,
			updatedAt: new Date(),
		};
		const facts = await this.recordCa4Mutation(
			updated,
			"charge",
			"UPDATE",
			mutation,
		);
		if (!facts.ok) return facts;
		this.charges.set(updated.id, updated);
		if (variation) {
			const fact: CaChargeVariation = {
				id: randomUUID(),
				...variation,
				createdAt: new Date(),
			};
			this.chargeVariations.set(fact.id, fact);
		}
		return ok(clone(updated));
	}

	async listChargeVariations(
		organizationId: string,
		chargeId: string,
	): Promise<Result<CaChargeVariation[]>> {
		return ok(
			[...this.chargeVariations.values()]
				.filter(
					(row) =>
						row.organizationId === organizationId && row.chargeId === chargeId,
				)
				.sort((a, b) => a.variationDate.localeCompare(b.variationDate))
				.map(clone),
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
			filterByCompany(this.charges.values(), organizationId, legalCompanyId)
				.sort((a, b) => a.normalizedCode.localeCompare(b.normalizedCode))
				.map(clone),
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
