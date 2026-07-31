import { createHash, randomUUID } from "node:crypto";

import { errorResult, type Result } from "@afenda/errors";

import {
	DEFAULT_HUMAN_RESOURCES_BULK_ROWS_PER_RUN,
	MAX_HUMAN_RESOURCES_BULK_ROWS,
} from "../bulk/kernel";
import type {
	BulkImportRow,
	HumanResourcesBulkEntityType,
} from "../bulk/types";
import type { HumanResourcesPermission } from "../permissions";
import type { ReliabilityWorkItem } from "../reliability/types";
import type {
	HumanResourcesBulkExportJob,
	HumanResourcesBulkImportJob,
	HumanResourcesBulkImportJobRow,
	HumanResourcesBulkJobStore,
} from "./types";

const IMPORT_PAYLOAD_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;
export const EXPORT_ARTIFACT_RETENTION_MS = 24 * 60 * 60 * 1000;

function canonicalize(value: unknown): unknown {
	if (Array.isArray(value)) {
		return value.map(canonicalize);
	}
	if (value !== null && typeof value === "object") {
		return Object.fromEntries(
			Object.entries(value)
				.sort(([left], [right]) => left.localeCompare(right))
				.map(([key, entry]) => [key, canonicalize(entry)]),
		);
	}
	return value;
}

export function fingerprintHumanResourcesBulkJob(value: unknown): string {
	return createHash("sha256")
		.update(JSON.stringify(canonicalize(value)))
		.digest("hex");
}

export function createBulkReliabilityWorkItem(input: {
	id?: string;
	organizationId: string;
	operation: "resume-import" | "run-export" | "purge-import" | "purge-export";
	targetType: "bulk_import_job" | "bulk_export_job";
	targetId: string;
	correlationId: string;
	idempotencyKey: string;
	requestFingerprint: string;
	now: Date;
	nextAttemptAt?: Date;
}): ReliabilityWorkItem {
	return {
		id: input.id ?? randomUUID(),
		organizationId: input.organizationId,
		connector: "bulk",
		operation: input.operation,
		targetType: input.targetType,
		targetId: input.targetId,
		correlationId: input.correlationId,
		idempotencyKey: input.idempotencyKey,
		requestFingerprint: input.requestFingerprint,
		status: "pending",
		version: 1,
		attemptCount: 0,
		nextAttemptAt: input.nextAttemptAt ?? input.now,
		lastAttemptAt: null,
		lastErrorCode: null,
		lastErrorMessage: null,
		receiptId: null,
		acknowledgementDeadlineAt: null,
		leaseOwner: null,
		leaseExpiresAt: null,
		createdAt: input.now,
		updatedAt: input.now,
	};
}

export async function enqueueHumanResourcesBulkImport<Row>(
	input: {
		organizationId: string;
		actorUserId: string;
		correlationId: string;
		batchId: string;
		entityType: HumanResourcesBulkEntityType;
		requiredPermission: HumanResourcesPermission;
		idempotencyKey: string;
		rows: readonly BulkImportRow<Row>[];
		maxRowsPerRun?: number;
	},
	store: HumanResourcesBulkJobStore,
	now = new Date(),
): Promise<Result<HumanResourcesBulkImportJob>> {
	const maxRowsPerRun =
		input.maxRowsPerRun ?? DEFAULT_HUMAN_RESOURCES_BULK_ROWS_PER_RUN;
	if (
		input.rows.length < 1 ||
		input.rows.length > MAX_HUMAN_RESOURCES_BULK_ROWS ||
		maxRowsPerRun < 1 ||
		maxRowsPerRun > MAX_HUMAN_RESOURCES_BULK_ROWS
	) {
		return errorResult.fail("VALIDATION_ERROR", {
			publicMessage: "The submitted data is invalid",
		});
	}
	const requestFingerprint = fingerprintHumanResourcesBulkJob(input);
	const existing = await store.findImportJob(input);
	if (!existing.ok) {
		return existing;
	}
	if (existing.data) {
		return existing.data.requestFingerprint === requestFingerprint
			? errorResult.ok(existing.data)
			: errorResult.fail("CONFLICT", {
					publicMessage: "The request conflicts with current state",
				});
	}
	const id = randomUUID();
	const job: HumanResourcesBulkImportJob = {
		id,
		organizationId: input.organizationId,
		batchId: input.batchId,
		entityType: input.entityType,
		actorUserId: input.actorUserId,
		correlationId: input.correlationId,
		requiredPermission: input.requiredPermission,
		idempotencyKey: input.idempotencyKey,
		requestFingerprint,
		status: "queued",
		version: 1,
		rowCount: input.rows.length,
		maxRowsPerRun,
		checkpointVersion: null,
		lastErrorCode: null,
		lastErrorMessage: null,
		payloadPurgeAt: null,
		payloadPurgedAt: null,
		completedAt: null,
		createdAt: now,
		updatedAt: now,
	};
	const rows: HumanResourcesBulkImportJobRow[] = input.rows.map(
		(row, rowIndex) => ({
			organizationId: input.organizationId,
			jobId: id,
			rowIndex,
			sourceReference: row.sourceReference,
			payload: row.payload,
			payloadHash: fingerprintHumanResourcesBulkJob(row.payload),
			createdAt: now,
		}),
	);
	return store.createImportJob({
		job,
		rows,
		workItem: createBulkReliabilityWorkItem({
			organizationId: input.organizationId,
			operation: "resume-import",
			targetType: "bulk_import_job",
			targetId: id,
			correlationId: input.correlationId,
			idempotencyKey: `bulk-import:${id}:0`,
			requestFingerprint,
			now,
		}),
	});
}

export async function enqueueHumanResourcesBulkExport(
	input: {
		organizationId: string;
		actorUserId: string;
		correlationId: string;
		requiredPermission: HumanResourcesPermission;
		exportType: HumanResourcesBulkEntityType;
		requestedFields: readonly string[];
		dateFrom?: string;
		dateTo?: string;
		effectiveOn?: string;
		idempotencyKey: string;
	},
	store: HumanResourcesBulkJobStore,
	now = new Date(),
): Promise<Result<HumanResourcesBulkExportJob>> {
	const requestFingerprint = fingerprintHumanResourcesBulkJob(input);
	const existing = await store.findExportJob(input);
	if (!existing.ok) {
		return existing;
	}
	if (existing.data) {
		return existing.data.requestFingerprint === requestFingerprint
			? errorResult.ok(existing.data)
			: errorResult.fail("CONFLICT", {
					publicMessage: "The request conflicts with current state",
				});
	}
	const id = randomUUID();
	const job: HumanResourcesBulkExportJob = {
		id,
		organizationId: input.organizationId,
		actorUserId: input.actorUserId,
		correlationId: input.correlationId,
		requiredPermission: input.requiredPermission,
		exportType: input.exportType,
		requestedFields: input.requestedFields,
		dateFrom: input.dateFrom ?? null,
		dateTo: input.dateTo ?? null,
		effectiveOn: input.effectiveOn ?? null,
		idempotencyKey: input.idempotencyKey,
		requestFingerprint,
		status: "queued",
		version: 1,
		nextPage: 1,
		rowCount: 0,
		privacyEvidenceId: null,
		artifactSha256: null,
		artifactByteCount: null,
		artifactExpiresAt: null,
		artifactPurgedAt: null,
		lastErrorCode: null,
		lastErrorMessage: null,
		completedAt: null,
		createdAt: now,
		updatedAt: now,
	};
	return store.createExportJob({
		job,
		workItem: createBulkReliabilityWorkItem({
			organizationId: input.organizationId,
			operation: "run-export",
			targetType: "bulk_export_job",
			targetId: id,
			correlationId: input.correlationId,
			idempotencyKey: `bulk-export:${id}:0`,
			requestFingerprint,
			now,
		}),
	});
}

export function importPayloadPurgeAt(completedAt: Date): Date {
	return new Date(completedAt.getTime() + IMPORT_PAYLOAD_RETENTION_MS);
}
