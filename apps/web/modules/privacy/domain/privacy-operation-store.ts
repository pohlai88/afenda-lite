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
	getExport: (input: {
		organizationId: string;
		exportId: string;
	}) => PrivacyExportPackage | null;
	getLegalHold: (input: {
		legalHoldId: string;
	}) => PrivacyLegalHoldRecord | null;
	listActiveLegalHolds: (input: {
		organizationId: string;
		moduleId: string;
		subjectId: string;
	}) => readonly PrivacyLegalHoldRecord[];
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
	releaseLegalHold: (input: {
		organizationId: string;
		legalHoldId: string;
		releasedAt: string;
		reason: string;
	}) => PrivacyLegalHoldRecord | null;
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
