export type PrivacyExportPackage = {
	exportId: string;
	exportReference: string;
	organizationId: string;
	moduleId: string;
	subjectId: string;
	recordCount: number;
	recordIds: readonly string[];
	createdAt: string;
};

export type PrivacyLegalHoldRecord = {
	legalHoldId: string;
	organizationId: string;
	moduleId: string;
	subjectId: string;
	holdReference: string;
	classifications: readonly string[];
	placedAt: string;
	releasedAt: string | null;
	releaseReason: string | null;
};

export type PrivacyOperationRecord = {
	operationId: string;
	kind: "rectify" | "anonymize" | "redact_downstream";
	organizationId: string;
	moduleId: string;
	subjectId: string;
	affectedCount: number;
	createdAt: string;
};

export type PrivacyOperationStore = {
	saveExport(
		input: Omit<PrivacyExportPackage, "exportReference"> & {
			exportReference?: string;
		},
	): PrivacyExportPackage;
	getExport(input: {
		organizationId: string;
		exportId: string;
	}): PrivacyExportPackage | null;
	listExportsForSubject(input: {
		organizationId: string;
		moduleId: string;
		subjectId: string;
	}): readonly PrivacyExportPackage[];
	placeLegalHold(
		input: Omit<PrivacyLegalHoldRecord, "releasedAt" | "releaseReason">,
	): PrivacyLegalHoldRecord;
	getLegalHold(input: { legalHoldId: string }): PrivacyLegalHoldRecord | null;
	listActiveLegalHolds(input: {
		organizationId: string;
		moduleId: string;
		subjectId: string;
	}): readonly PrivacyLegalHoldRecord[];
	releaseLegalHold(input: {
		organizationId: string;
		legalHoldId: string;
		releasedAt: string;
		reason: string;
	}): PrivacyLegalHoldRecord | null;
	recordOperation(
		input: Omit<PrivacyOperationRecord, "operationId">,
	): PrivacyOperationRecord;
	listOperationsForSubject(input: {
		organizationId: string;
		moduleId: string;
		subjectId: string;
		limit?: number;
	}): readonly PrivacyOperationRecord[];
};

function exportReferenceFor(input: {
	organizationId: string;
	exportId: string;
}): string {
	return `privacy://organizations/${input.organizationId}/exports/${input.exportId}`;
}

export function createPrivacyOperationStore(): PrivacyOperationStore {
	const exports = new Map<string, PrivacyExportPackage>();
	const legalHolds = new Map<string, PrivacyLegalHoldRecord>();
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
	};
}
