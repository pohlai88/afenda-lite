import { randomUUID } from "node:crypto";

import { errorResult, type Result } from "@afenda/errors";
import type {
	PlatformPrivacyService,
	PrivacyAuditPort,
	PrivacySubjectInventoryPort,
	PrivacySubjectRecord,
	PrivacySubjectRequestContext,
} from "../types";
import { createHumanResourcesSubjectInventory } from "./human-resources-subject-inventory";
import {
	createPrivacyOperationStore,
	type PrivacyOperationRecord,
	type PrivacyOperationStore,
} from "./privacy-operation-store";

export interface CreatePlatformPrivacyServiceDeps {
	audit: PrivacyAuditPort;
	createId?: () => string;
	inventory?: PrivacySubjectInventoryPort;
	store?: PrivacyOperationStore;
}

function assertTenantRecords(
	organizationId: string,
	records: readonly PrivacySubjectRecord[],
): Result<readonly PrivacySubjectRecord[]> {
	for (const record of records) {
		if (record.organizationId !== organizationId) {
			return errorResult.fail("FORBIDDEN");
		}
	}
	return errorResult.ok(records);
}

async function resolveSubjectRecords(
	inventory: PrivacySubjectInventoryPort,
	input: {
		moduleId: PrivacySubjectRequestContext["moduleId"];
		organizationId: string;
		subjectId: string;
	},
): Promise<Result<readonly PrivacySubjectRecord[]>> {
	const listed = await inventory.listSubjectRecords(input);
	if (!listed.ok) {
		return listed;
	}
	const tenantChecked = assertTenantRecords(input.organizationId, listed.data);
	if (!tenantChecked.ok) {
		return tenantChecked;
	}
	if (tenantChecked.data.length === 0) {
		return errorResult.fail("NOT_FOUND", {
			publicMessage: "Privacy subject was not found for this organization.",
		});
	}
	return tenantChecked;
}

async function recordPrivacyAudit(
	audit: PrivacyAuditPort,
	input: {
		organizationId: string;
		actorUserId: string;
		correlationId: string;
		moduleId: string;
		entity: string;
		entityId: string;
		action: "EXPORT" | "CREATE" | "UPDATE";
		metadata?: Record<string, unknown>;
	},
): Promise<Result<void>> {
	const recorded = await audit.record({
		organizationId: input.organizationId,
		actorUserId: input.actorUserId,
		correlationId: input.correlationId,
		module: "privacy",
		entity: input.entity,
		entityId: input.entityId,
		action: input.action,
		metadata: {
			sourceModuleId: input.moduleId,
			...input.metadata,
		},
	});
	if (!recorded.ok) {
		return recorded;
	}
	if (recorded.data.organizationId !== input.organizationId) {
		return errorResult.fail("INTERNAL_ERROR");
	}
	return errorResult.ok(undefined);
}

function activeLegalHoldReason(
	store: PrivacyOperationStore,
	input: Pick<
		PrivacySubjectRequestContext,
		"organizationId" | "moduleId" | "subjectId"
	>,
): string | undefined {
	const activeHolds = store.listActiveLegalHolds(input);
	if (activeHolds.length === 0) {
		return;
	}
	const [firstHold] = activeHolds;
	return firstHold?.holdReference ?? "legal_hold_active";
}

function activeRestrictionReason(
	store: PrivacyOperationStore,
	input: Pick<
		PrivacySubjectRequestContext,
		"organizationId" | "moduleId" | "subjectId"
	>,
): string | undefined {
	const activeRestrictions = store.listActiveRestrictions(input);
	if (activeRestrictions.length === 0) {
		return;
	}
	const [firstRestriction] = activeRestrictions;
	return firstRestriction?.restrictionReference ?? "restriction_active";
}

async function performAuditedSubjectOperation<T>(
	deps: {
		inventory: PrivacySubjectInventoryPort;
		audit: PrivacyAuditPort;
		store: PrivacyOperationStore;
	},
	input: PrivacySubjectRequestContext,
	config: {
		kind: PrivacyOperationRecord["kind"];
		entity: string;
		affectedCount: (records: readonly PrivacySubjectRecord[]) => number;
		metadata: (
			records: readonly PrivacySubjectRecord[],
			affectedCount: number,
		) => Record<string, unknown>;
		buildResult: (affectedCount: number) => T;
	},
): Promise<Result<T>> {
	const records = await resolveSubjectRecords(deps.inventory, input);
	if (!records.ok) {
		return records;
	}

	const affectedCount = config.affectedCount(records.data);
	const operation = deps.store.recordOperation({
		kind: config.kind,
		organizationId: input.organizationId,
		moduleId: input.moduleId,
		subjectId: input.subjectId,
		affectedCount,
		createdAt: input.requestedAt,
	});

	const audited = await recordPrivacyAudit(deps.audit, {
		organizationId: input.organizationId,
		actorUserId: input.actorUserId,
		correlationId: input.correlationId,
		moduleId: input.moduleId,
		entity: config.entity,
		entityId: operation.operationId,
		action: "UPDATE",
		metadata: {
			subjectId: input.subjectId,
			...config.metadata(records.data, affectedCount),
		},
	});
	if (!audited.ok) {
		return audited;
	}

	return errorResult.ok(config.buildResult(affectedCount));
}

export function createPlatformPrivacyService(
	deps: CreatePlatformPrivacyServiceDeps,
): PlatformPrivacyService {
	const store = deps.store ?? createPrivacyOperationStore();
	const inventory = deps.inventory ?? createHumanResourcesSubjectInventory();
	const createId = deps.createId ?? randomUUID;
	const operationDeps = { inventory, audit: deps.audit, store };

	return {
		async exportSubject(input) {
			const records = await resolveSubjectRecords(inventory, input);
			if (!records.ok) {
				return records;
			}

			// Restriction ≠ erasure: rows survive but are excluded from exports
			// and read models until lifted through the audited restriction path.
			if (activeRestrictionReason(store, input) !== undefined) {
				return errorResult.fail("CONFLICT", {
					publicMessage: "Subject data is restricted and excluded from export.",
				});
			}

			const exportId = createId();
			const recordIds = records.data.map((record) => record.recordId);
			const saved = store.saveExport({
				exportId,
				organizationId: input.organizationId,
				moduleId: input.moduleId,
				subjectId: input.subjectId,
				recordCount: recordIds.length,
				recordIds,
				createdAt: input.requestedAt,
			});

			const audited = await recordPrivacyAudit(deps.audit, {
				organizationId: input.organizationId,
				actorUserId: input.actorUserId,
				correlationId: input.correlationId,
				moduleId: input.moduleId,
				entity: "privacy_export",
				entityId: exportId,
				action: "EXPORT",
				metadata: {
					subjectId: input.subjectId,
					exportReference: saved.exportReference,
					recordCount: saved.recordCount,
					legalBasis: input.legalBasis,
				},
			});
			if (!audited.ok) {
				return audited;
			}

			return errorResult.ok({
				exportReference: saved.exportReference,
				recordCount: saved.recordCount,
				records: records.data,
			});
		},

		async getSubjectPrivacyCase(input) {
			const records = await resolveSubjectRecords(inventory, input);
			if (!records.ok) {
				return records;
			}

			return errorResult.ok({
				organizationId: input.organizationId,
				subjectId: input.subjectId,
				exports: store.listExportsForSubject(input).map((entry) => ({
					exportId: entry.exportId,
					exportReference: entry.exportReference,
					recordCount: entry.recordCount,
					createdAt: entry.createdAt,
				})),
				activeLegalHolds: store.listActiveLegalHolds(input).map((hold) => ({
					legalHoldId: hold.legalHoldId,
					holdReference: hold.holdReference,
					classifications: hold.classifications,
					placedAt: hold.placedAt,
				})),
				activeRestrictions: store
					.listActiveRestrictions(input)
					.map((restriction) => ({
						restrictionId: restriction.restrictionId,
						restrictionReference: restriction.restrictionReference,
						classifications: restriction.classifications,
						placedAt: restriction.placedAt,
					})),
				recentOperations: store
					.listOperationsForSubject({ ...input, limit: 20 })
					.map((operation) => ({
						operationId: operation.operationId,
						kind: operation.kind,
						affectedCount: operation.affectedCount,
						createdAt: operation.createdAt,
					})),
			});
		},

		async evaluateAnonymization(input) {
			const records = await resolveSubjectRecords(inventory, input);
			if (!records.ok) {
				return records;
			}

			const holdReason = activeLegalHoldReason(store, input);
			if (holdReason !== undefined) {
				return errorResult.ok({ allowed: false, reasonCode: holdReason });
			}

			const restrictionReason = activeRestrictionReason(store, input);
			if (restrictionReason !== undefined) {
				return errorResult.ok({
					allowed: false,
					reasonCode: restrictionReason,
				});
			}

			return errorResult.ok({ allowed: true });
		},

		async evaluateRestriction(input) {
			const records = await resolveSubjectRecords(inventory, input);
			if (!records.ok) {
				return records;
			}

			const restrictionReason = activeRestrictionReason(store, input);
			return errorResult.ok(
				restrictionReason === undefined
					? { restricted: false }
					: { restricted: true, reasonCode: restrictionReason },
			);
		},

		rectifySubject(input) {
			return performAuditedSubjectOperation(operationDeps, input, {
				kind: "rectify",
				entity: "privacy_rectification",
				affectedCount: (records) => records.length,
				metadata: (_records, affectedCount) => ({
					changeFieldCount: Object.keys(input.changes).length,
					rectifiedRecordCount: affectedCount,
				}),
				buildResult: (affectedCount) => ({
					rectifiedRecordCount: affectedCount,
				}),
			});
		},

		async anonymizeSubject(input) {
			const records = await resolveSubjectRecords(inventory, input);
			if (!records.ok) {
				return records;
			}

			const holdReason = activeLegalHoldReason(store, input);
			if (holdReason !== undefined) {
				return errorResult.fail("CONFLICT", {
					publicMessage: "Anonymization blocked while legal hold is active.",
				});
			}

			if (activeRestrictionReason(store, input) !== undefined) {
				return errorResult.fail("CONFLICT", {
					publicMessage: "Anonymization blocked while restriction is active.",
				});
			}

			return performAuditedSubjectOperation(operationDeps, input, {
				kind: "anonymize",
				entity: "privacy_anonymization",
				affectedCount: (resolvedRecords) => resolvedRecords.length,
				metadata: (_records, affectedCount) => ({
					classifications: input.classifications,
					anonymizedRecordCount: affectedCount,
				}),
				buildResult: (affectedCount) => ({
					anonymizedRecordCount: affectedCount,
				}),
			});
		},

		async placeLegalHold(input) {
			const records = await resolveSubjectRecords(inventory, input);
			if (!records.ok) {
				return records;
			}

			const legalHoldId = createId();
			store.placeLegalHold({
				legalHoldId,
				organizationId: input.organizationId,
				moduleId: input.moduleId,
				subjectId: input.subjectId,
				holdReference: input.holdReference,
				classifications: input.classifications,
				placedAt: input.requestedAt,
			});

			const audited = await recordPrivacyAudit(deps.audit, {
				organizationId: input.organizationId,
				actorUserId: input.actorUserId,
				correlationId: input.correlationId,
				moduleId: input.moduleId,
				entity: "privacy_legal_hold",
				entityId: legalHoldId,
				action: "CREATE",
				metadata: {
					subjectId: input.subjectId,
					holdReference: input.holdReference,
					classifications: input.classifications,
				},
			});
			if (!audited.ok) {
				return audited;
			}

			return errorResult.ok({ legalHoldId });
		},

		async releaseLegalHold(input) {
			const released = store.releaseLegalHold({
				organizationId: input.organizationId,
				legalHoldId: input.legalHoldId,
				releasedAt: input.releasedAt,
				reason: input.reason,
			});
			if (released === null) {
				return errorResult.fail("NOT_FOUND", {
					publicMessage: "Legal hold was not found for this organization.",
				});
			}

			const audited = await recordPrivacyAudit(deps.audit, {
				organizationId: input.organizationId,
				actorUserId: input.actorUserId,
				correlationId: input.correlationId,
				moduleId: input.moduleId,
				entity: "privacy_legal_hold",
				entityId: input.legalHoldId,
				action: "UPDATE",
				metadata: {
					subjectId: released.subjectId,
					reason: input.reason,
					releasedAt: input.releasedAt,
				},
			});
			if (!audited.ok) {
				return audited;
			}

			return errorResult.ok(undefined);
		},

		async restrictSubject(input) {
			const records = await resolveSubjectRecords(inventory, input);
			if (!records.ok) {
				return records;
			}

			const restrictionId = createId();
			store.restrictSubject({
				restrictionId,
				organizationId: input.organizationId,
				moduleId: input.moduleId,
				subjectId: input.subjectId,
				restrictionReference: input.restrictionReference,
				classifications: input.classifications,
				placedAt: input.requestedAt,
			});

			const audited = await recordPrivacyAudit(deps.audit, {
				organizationId: input.organizationId,
				actorUserId: input.actorUserId,
				correlationId: input.correlationId,
				moduleId: input.moduleId,
				entity: "privacy_restriction",
				entityId: restrictionId,
				action: "CREATE",
				metadata: {
					subjectId: input.subjectId,
					restrictionReference: input.restrictionReference,
					classifications: input.classifications,
				},
			});
			if (!audited.ok) {
				return audited;
			}

			return errorResult.ok({ restrictionId });
		},

		async liftRestriction(input) {
			const lifted = store.liftRestriction({
				organizationId: input.organizationId,
				restrictionId: input.restrictionId,
				liftedAt: input.liftedAt,
				reason: input.reason,
			});
			if (lifted === null) {
				return errorResult.fail("NOT_FOUND", {
					publicMessage: "Restriction was not found for this organization.",
				});
			}

			const audited = await recordPrivacyAudit(deps.audit, {
				organizationId: input.organizationId,
				actorUserId: input.actorUserId,
				correlationId: input.correlationId,
				moduleId: input.moduleId,
				entity: "privacy_restriction",
				entityId: input.restrictionId,
				action: "UPDATE",
				metadata: {
					subjectId: lifted.subjectId,
					reason: input.reason,
					liftedAt: input.liftedAt,
				},
			});
			if (!audited.ok) {
				return audited;
			}

			return errorResult.ok(undefined);
		},

		redactDownstream(input) {
			return performAuditedSubjectOperation(
				operationDeps,
				{
					moduleId: input.moduleId,
					organizationId: input.organizationId,
					actorUserId: input.actorUserId,
					correlationId: input.correlationId,
					subjectId: input.subjectId,
					requestedAt: input.requestedAt,
					legalBasis: "downstream_redaction",
				},
				{
					kind: "redact_downstream",
					entity: "privacy_redaction",
					affectedCount: () => input.resourceTypes.length,
					metadata: (_records, affectedCount) => ({
						resourceTypes: input.resourceTypes,
						redactedSystemCount: affectedCount,
					}),
					buildResult: (affectedCount) => ({
						redactedSystemCount: affectedCount,
					}),
				},
			);
		},
	};
}
