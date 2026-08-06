export interface PrivacyExportPackage {
	createdAt: string;
	exportId: string;
	exportReference: string;
	moduleId: string;
	organizationId: string;
	recordCount: number;
	recordIds: readonly string[];
	subjectId: string;
}

export interface PrivacyLegalHoldRecord {
	classifications: readonly string[];
	holdReference: string;
	legalHoldId: string;
	moduleId: string;
	organizationId: string;
	placedAt: string;
	releasedAt: string | null;
	releaseReason: string | null;
	subjectId: string;
}

export interface PrivacyRetentionEvidenceRecord {
	classifications: readonly string[];
	clockStartedAt: string;
	eligibleForErasure: boolean;
	evidenceId: string;
	expiredAt: string | null;
	legalBasis: string;
	minimumRetentionMonths: number;
	moduleId: string;
	organizationId: string;
	subjectId: string;
}

export interface PrivacyRestrictionRecord {
	classifications: readonly string[];
	liftedAt: string | null;
	liftReason: string | null;
	moduleId: string;
	organizationId: string;
	placedAt: string;
	restrictionId: string;
	restrictionReference: string;
	subjectId: string;
}

export interface PrivacyOperationRecord {
	affectedCount: number;
	createdAt: string;
	kind: "rectify" | "anonymize" | "redact_downstream";
	moduleId: string;
	operationId: string;
	organizationId: string;
	subjectId: string;
}

export interface PrivacyOperationStore {
	expireRetention: (input: {
		organizationId: string;
		evidenceId: string;
		expiredAt: string;
	}) => PrivacyRetentionEvidenceRecord | null;
	getExport: (input: {
		organizationId: string;
		exportId: string;
	}) => PrivacyExportPackage | null;
	getLegalHold: (input: {
		legalHoldId: string;
	}) => PrivacyLegalHoldRecord | null;
	getRestriction: (input: {
		restrictionId: string;
	}) => PrivacyRestrictionRecord | null;
	getRetentionEvidence: (input: {
		evidenceId: string;
	}) => PrivacyRetentionEvidenceRecord | null;
	liftRestriction: (input: {
		organizationId: string;
		restrictionId: string;
		liftedAt: string;
		reason: string;
	}) => PrivacyRestrictionRecord | null;
	listActiveLegalHolds: (input: {
		organizationId: string;
		moduleId: string;
		subjectId: string;
	}) => readonly PrivacyLegalHoldRecord[];
	listActiveRestrictions: (input: {
		organizationId: string;
		moduleId: string;
		subjectId: string;
	}) => readonly PrivacyRestrictionRecord[];
	listExportsForSubject: (input: {
		organizationId: string;
		moduleId: string;
		subjectId: string;
	}) => readonly PrivacyExportPackage[];
	listOperationsForSubject: (input: {
		organizationId: string;
		moduleId: string;
		subjectId: string;
		limit?: number;
	}) => readonly PrivacyOperationRecord[];
	placeLegalHold: (
		input: Omit<PrivacyLegalHoldRecord, "releasedAt" | "releaseReason">,
	) => PrivacyLegalHoldRecord;
	recordOperation: (
		input: Omit<PrivacyOperationRecord, "operationId">,
	) => PrivacyOperationRecord;
	recordRetentionEvidence: (
		input: Omit<
			PrivacyRetentionEvidenceRecord,
			"eligibleForErasure" | "expiredAt"
		>,
	) => PrivacyRetentionEvidenceRecord;
	releaseLegalHold: (input: {
		organizationId: string;
		legalHoldId: string;
		releasedAt: string;
		reason: string;
	}) => PrivacyLegalHoldRecord | null;
	restrictSubject: (
		input: Omit<PrivacyRestrictionRecord, "liftedAt" | "liftReason">,
	) => PrivacyRestrictionRecord;
	saveExport: (
		input: Omit<PrivacyExportPackage, "exportReference"> & {
			exportReference?: string;
		},
	) => PrivacyExportPackage;
}

function exportReferenceFor(input: {
	organizationId: string;
	exportId: string;
}): string {
	return `privacy://organizations/${input.organizationId}/exports/${input.exportId}`;
}

export function createPrivacyOperationStore(): PrivacyOperationStore {
	const exports = new Map<string, PrivacyExportPackage>();
	const legalHolds = new Map<string, PrivacyLegalHoldRecord>();
	const restrictions = new Map<string, PrivacyRestrictionRecord>();
	const retentionEvidence = new Map<string, PrivacyRetentionEvidenceRecord>();
	const operations: PrivacyOperationRecord[] = [];
	let operationSequence = 0;

	return {
		saveExport(input) {
			const exportReference =
				input.exportReference ??
				exportReferenceFor({
					organizationId: input.organizationId,
					exportId: input.exportId,
				});
			const saved: PrivacyExportPackage = {
				...input,
				exportReference,
			};
			exports.set(`${input.organizationId}:${input.exportId}`, saved);
			return saved;
		},
		getExport(input) {
			return exports.get(`${input.organizationId}:${input.exportId}`) ?? null;
		},
		listExportsForSubject(input) {
			return [...exports.values()].filter(
				(entry) =>
					entry.organizationId === input.organizationId &&
					entry.moduleId === input.moduleId &&
					entry.subjectId === input.subjectId,
			);
		},
		placeLegalHold(input) {
			const saved: PrivacyLegalHoldRecord = {
				...input,
				releasedAt: null,
				releaseReason: null,
			};
			legalHolds.set(input.legalHoldId, saved);
			return saved;
		},
		getLegalHold(input) {
			return legalHolds.get(input.legalHoldId) ?? null;
		},
		listActiveLegalHolds(input) {
			return [...legalHolds.values()].filter(
				(hold) =>
					hold.organizationId === input.organizationId &&
					hold.moduleId === input.moduleId &&
					hold.subjectId === input.subjectId &&
					hold.releasedAt === null,
			);
		},
		releaseLegalHold(input) {
			const existing = legalHolds.get(input.legalHoldId);
			if (existing === undefined) {
				return null;
			}
			if (existing.organizationId !== input.organizationId) {
				return null;
			}
			const released: PrivacyLegalHoldRecord = {
				...existing,
				releasedAt: input.releasedAt,
				releaseReason: input.reason,
			};
			legalHolds.set(input.legalHoldId, released);
			return released;
		},
		restrictSubject(input) {
			const saved: PrivacyRestrictionRecord = {
				...input,
				liftedAt: null,
				liftReason: null,
			};
			restrictions.set(input.restrictionId, saved);
			return saved;
		},
		getRestriction(input) {
			return restrictions.get(input.restrictionId) ?? null;
		},
		listActiveRestrictions(input) {
			return [...restrictions.values()].filter(
				(restriction) =>
					restriction.organizationId === input.organizationId &&
					restriction.moduleId === input.moduleId &&
					restriction.subjectId === input.subjectId &&
					restriction.liftedAt === null,
			);
		},
		liftRestriction(input) {
			const existing = restrictions.get(input.restrictionId);
			if (existing === undefined) {
				return null;
			}
			if (existing.organizationId !== input.organizationId) {
				return null;
			}
			const lifted: PrivacyRestrictionRecord = {
				...existing,
				liftedAt: input.liftedAt,
				liftReason: input.reason,
			};
			restrictions.set(input.restrictionId, lifted);
			return lifted;
		},
		recordOperation(input) {
			operationSequence += 1;
			const saved: PrivacyOperationRecord = {
				...input,
				operationId: `privacy-op-${operationSequence}`,
			};
			operations.push(saved);
			return saved;
		},
		listOperationsForSubject(input) {
			const limit = input.limit ?? 20;
			return operations
				.filter(
					(entry) =>
						entry.organizationId === input.organizationId &&
						entry.moduleId === input.moduleId &&
						entry.subjectId === input.subjectId,
				)
				.slice(-limit);
		},
		recordRetentionEvidence(input) {
			const saved: PrivacyRetentionEvidenceRecord = {
				...input,
				eligibleForErasure: false,
				expiredAt: null,
			};
			retentionEvidence.set(input.evidenceId, saved);
			return saved;
		},
		getRetentionEvidence(input) {
			return retentionEvidence.get(input.evidenceId) ?? null;
		},
		expireRetention(input) {
			const existing = retentionEvidence.get(input.evidenceId);
			if (existing === undefined) {
				return null;
			}
			if (existing.organizationId !== input.organizationId) {
				return null;
			}
			const expired: PrivacyRetentionEvidenceRecord = {
				...existing,
				eligibleForErasure: true,
				expiredAt: input.expiredAt,
			};
			retentionEvidence.set(input.evidenceId, expired);
			return expired;
		},
	};
}
