import type { Result } from "@afenda/errors/result";

import type { HumanResourcesBulkEntityType } from "../bulk/types";
import type { HumanResourcesPermission } from "../permissions";
import type { ReliabilityWorkItem } from "../reliability/types";

export type HumanResourcesBulkJobStatus =
	| "queued"
	| "running"
	| "completed"
	| "completed_with_rejections"
	| "failed";

export type HumanResourcesBulkImportJob = {
	id: string;
	organizationId: string;
	batchId: string;
	entityType: HumanResourcesBulkEntityType;
	actorUserId: string;
	correlationId: string;
	requiredPermission: HumanResourcesPermission;
	idempotencyKey: string;
	requestFingerprint: string;
	status: HumanResourcesBulkJobStatus;
	version: number;
	rowCount: number;
	maxRowsPerRun: number;
	checkpointVersion: number | null;
	lastErrorCode: string | null;
	lastErrorMessage: string | null;
	payloadPurgeAt: Date | null;
	payloadPurgedAt: Date | null;
	completedAt: Date | null;
	createdAt: Date;
	updatedAt: Date;
};

export type HumanResourcesBulkImportJobRow = {
	organizationId: string;
	jobId: string;
	rowIndex: number;
	sourceReference: string;
	payload: unknown | null;
	payloadHash: string;
	createdAt: Date;
};

export type HumanResourcesBulkExportJob = {
	id: string;
	organizationId: string;
	actorUserId: string;
	correlationId: string;
	requiredPermission: HumanResourcesPermission;
	exportType: HumanResourcesBulkEntityType;
	requestedFields: readonly string[];
	dateFrom: string | null;
	dateTo: string | null;
	effectiveOn: string | null;
	idempotencyKey: string;
	requestFingerprint: string;
	status: HumanResourcesBulkJobStatus;
	version: number;
	nextPage: number;
	rowCount: number;
	privacyEvidenceId: string | null;
	artifactSha256: string | null;
	artifactByteCount: number | null;
	artifactExpiresAt: Date | null;
	artifactPurgedAt: Date | null;
	lastErrorCode: string | null;
	lastErrorMessage: string | null;
	completedAt: Date | null;
	createdAt: Date;
	updatedAt: Date;
};

export type HumanResourcesBulkExportArtifactChunk = {
	organizationId: string;
	jobId: string;
	chunkIndex: number;
	content: string;
	contentSha256: string;
	byteCount: number;
	rowCount: number;
	createdAt: Date;
};

export type HumanResourcesBulkJobStore = {
	findImportJob(input: {
		organizationId: string;
		idempotencyKey: string;
	}): Promise<Result<HumanResourcesBulkImportJob | null>>;
	getImportJob(input: {
		organizationId: string;
		jobId: string;
	}): Promise<Result<HumanResourcesBulkImportJob | null>>;
	createImportJob(input: {
		job: HumanResourcesBulkImportJob;
		rows: readonly HumanResourcesBulkImportJobRow[];
		workItem: ReliabilityWorkItem;
	}): Promise<Result<HumanResourcesBulkImportJob>>;
	listImportRows(input: {
		organizationId: string;
		jobId: string;
	}): Promise<Result<readonly HumanResourcesBulkImportJobRow[]>>;
	commitImportJob(input: {
		job: HumanResourcesBulkImportJob;
		expectedVersion: number;
		successorWorkItem: ReliabilityWorkItem | null;
		cleanupWorkItem: ReliabilityWorkItem | null;
	}): Promise<Result<HumanResourcesBulkImportJob>>;
	purgeImportPayload(input: {
		organizationId: string;
		jobId: string;
		now: Date;
	}): Promise<Result<HumanResourcesBulkImportJob>>;
	findExportJob(input: {
		organizationId: string;
		idempotencyKey: string;
	}): Promise<Result<HumanResourcesBulkExportJob | null>>;
	getExportJob(input: {
		organizationId: string;
		jobId: string;
	}): Promise<Result<HumanResourcesBulkExportJob | null>>;
	createExportJob(input: {
		job: HumanResourcesBulkExportJob;
		workItem: ReliabilityWorkItem;
	}): Promise<Result<HumanResourcesBulkExportJob>>;
	completeExportJob(input: {
		job: HumanResourcesBulkExportJob;
		expectedVersion: number;
		chunks: readonly HumanResourcesBulkExportArtifactChunk[];
		cleanupWorkItem: ReliabilityWorkItem;
	}): Promise<Result<HumanResourcesBulkExportJob>>;
	loadExportArtifact(input: {
		organizationId: string;
		jobId: string;
	}): Promise<
		Result<{ job: HumanResourcesBulkExportJob; content: string } | null>
	>;
	purgeExportArtifact(input: {
		organizationId: string;
		jobId: string;
		now: Date;
	}): Promise<Result<HumanResourcesBulkExportJob>>;
};
