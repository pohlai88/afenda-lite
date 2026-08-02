import type { Result } from "@afenda/errors";
import type { HumanResourcesPermission } from "../../kernel/authorization/permissions";
import type { ReliabilityWorkItem } from "../../kernel/reliability/types";
import type { HumanResourcesBulkEntityType } from "../bulk-import/types";

export type HumanResourcesBulkJobStatus =
	| "queued"
	| "running"
	| "completed"
	| "completed_with_rejections"
	| "failed";

export interface HumanResourcesBulkImportJob {
	actorUserId: string;
	batchId: string;
	checkpointVersion: number | null;
	completedAt: Date | null;
	correlationId: string;
	createdAt: Date;
	entityType: HumanResourcesBulkEntityType;
	id: string;
	idempotencyKey: string;
	lastErrorCode: string | null;
	lastErrorMessage: string | null;
	maxRowsPerRun: number;
	organizationId: string;
	payloadPurgeAt: Date | null;
	payloadPurgedAt: Date | null;
	requestFingerprint: string;
	requiredPermission: HumanResourcesPermission;
	rowCount: number;
	status: HumanResourcesBulkJobStatus;
	updatedAt: Date;
	version: number;
}

export interface HumanResourcesBulkImportJobRow {
	createdAt: Date;
	jobId: string;
	organizationId: string;
	payload: unknown | null;
	payloadHash: string;
	rowIndex: number;
	sourceReference: string;
}

export interface HumanResourcesBulkExportJob {
	actorUserId: string;
	artifactByteCount: number | null;
	artifactExpiresAt: Date | null;
	artifactPurgedAt: Date | null;
	artifactSha256: string | null;
	completedAt: Date | null;
	correlationId: string;
	createdAt: Date;
	dateFrom: string | null;
	dateTo: string | null;
	effectiveOn: string | null;
	exportType: HumanResourcesBulkEntityType;
	id: string;
	idempotencyKey: string;
	lastErrorCode: string | null;
	lastErrorMessage: string | null;
	nextPage: number;
	organizationId: string;
	privacyEvidenceId: string | null;
	requestedFields: readonly string[];
	requestFingerprint: string;
	requiredPermission: HumanResourcesPermission;
	rowCount: number;
	status: HumanResourcesBulkJobStatus;
	updatedAt: Date;
	version: number;
}

export interface HumanResourcesBulkExportArtifactChunk {
	byteCount: number;
	chunkIndex: number;
	content: string;
	contentSha256: string;
	createdAt: Date;
	jobId: string;
	organizationId: string;
	rowCount: number;
}

export interface HumanResourcesBulkJobStore {
	commitImportJob: (input: {
		job: HumanResourcesBulkImportJob;
		expectedVersion: number;
		successorWorkItem: ReliabilityWorkItem | null;
		cleanupWorkItem: ReliabilityWorkItem | null;
	}) => Promise<Result<HumanResourcesBulkImportJob>>;
	completeExportJob: (input: {
		job: HumanResourcesBulkExportJob;
		expectedVersion: number;
		chunks: readonly HumanResourcesBulkExportArtifactChunk[];
		cleanupWorkItem: ReliabilityWorkItem;
	}) => Promise<Result<HumanResourcesBulkExportJob>>;
	createExportJob: (input: {
		job: HumanResourcesBulkExportJob;
		workItem: ReliabilityWorkItem;
	}) => Promise<Result<HumanResourcesBulkExportJob>>;
	createImportJob: (input: {
		job: HumanResourcesBulkImportJob;
		rows: readonly HumanResourcesBulkImportJobRow[];
		workItem: ReliabilityWorkItem;
	}) => Promise<Result<HumanResourcesBulkImportJob>>;
	findExportJob: (input: {
		organizationId: string;
		idempotencyKey: string;
	}) => Promise<Result<HumanResourcesBulkExportJob | null>>;
	findImportJob: (input: {
		organizationId: string;
		idempotencyKey: string;
	}) => Promise<Result<HumanResourcesBulkImportJob | null>>;
	getExportJob: (input: {
		organizationId: string;
		jobId: string;
	}) => Promise<Result<HumanResourcesBulkExportJob | null>>;
	getImportJob: (input: {
		organizationId: string;
		jobId: string;
	}) => Promise<Result<HumanResourcesBulkImportJob | null>>;
	listImportRows: (input: {
		organizationId: string;
		jobId: string;
	}) => Promise<Result<readonly HumanResourcesBulkImportJobRow[]>>;
	loadExportArtifact: (input: {
		organizationId: string;
		jobId: string;
	}) => Promise<
		Result<{ job: HumanResourcesBulkExportJob; content: string } | null>
	>;
	purgeExportArtifact: (input: {
		organizationId: string;
		jobId: string;
		now: Date;
	}) => Promise<Result<HumanResourcesBulkExportJob>>;
	purgeImportPayload: (input: {
		organizationId: string;
		jobId: string;
		now: Date;
	}) => Promise<Result<HumanResourcesBulkImportJob>>;
}
