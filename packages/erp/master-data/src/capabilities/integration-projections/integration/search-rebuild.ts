import type { Result } from "@afenda/errors/result";

import type {
	MasterSearchDocument,
	MasterSearchDocumentEntityType,
} from "./search-document";

export const SEARCH_REBUILD_STATUSES = [
	"pending",
	"running",
	"paused",
	"completed",
	"failed",
	"cancelled",
] as const;

export type SearchRebuildStatus = (typeof SEARCH_REBUILD_STATUSES)[number];

export type SearchRebuildIdentity = Readonly<{
	organizationId: string;
	entityType: MasterSearchDocumentEntityType;
	rebuildRunId: string;
}>;

export type SearchRebuildCheckpoint = SearchRebuildIdentity &
	Readonly<{
		status: SearchRebuildStatus;
		/**
		 * Opaque continuation cursor owned by the rebuild source.
		 */
		cursor: string | null;
		pageSize: number;
		projectionSchemaVersion: number;
		scannedCount: number;
		succeededCount: number;
		failedCount: number;
		skippedCount: number;
		checkpointVersion: number;
		lastErrorCode: string | null;
		lastFailedEntityId: string | null;
		startedAt: Date;
		updatedAt: Date;
		completedAt: Date | null;
	}>;

export type SearchRebuildPlan = SearchRebuildIdentity &
	Readonly<{
		pageSize: number;
		projectionSchemaVersion: number;
	}>;

export type SaveSearchRebuildCheckpointInput = Readonly<{
	checkpoint: SearchRebuildCheckpoint;
	expectedCheckpointVersion: number;
}>;

export type SearchRebuildPage = Readonly<{
	documents: readonly MasterSearchDocument[];
	nextCursor: string | null;
	exhausted: boolean;
}>;

export interface SearchRebuildSource {
	readPage: (
		input: Readonly<{
			plan: SearchRebuildPlan;
			cursor: string | null;
		}>,
	) => Promise<Result<SearchRebuildPage>>;
}

export interface SearchRebuildStore {
	loadCheckpoint: (
		input: SearchRebuildIdentity,
	) => Promise<Result<SearchRebuildCheckpoint | null>>;
	saveCheckpoint: (
		input: SaveSearchRebuildCheckpointInput,
	) => Promise<Result<SearchRebuildCheckpoint>>;
}

export function defineSearchRebuildCheckpoint(
	checkpoint: SearchRebuildCheckpoint,
): SearchRebuildCheckpoint {
	assertNonBlank("organizationId", checkpoint.organizationId);
	assertNonBlank("rebuildRunId", checkpoint.rebuildRunId);
	if (checkpoint.cursor !== null) {
		assertNonBlank("cursor", checkpoint.cursor);
	}
	assertPositiveInteger("pageSize", checkpoint.pageSize);
	assertPositiveInteger(
		"projectionSchemaVersion",
		checkpoint.projectionSchemaVersion,
	);
	assertNonNegativeInteger("scannedCount", checkpoint.scannedCount);
	assertNonNegativeInteger("succeededCount", checkpoint.succeededCount);
	assertNonNegativeInteger("failedCount", checkpoint.failedCount);
	assertNonNegativeInteger("skippedCount", checkpoint.skippedCount);
	assertPositiveInteger("checkpointVersion", checkpoint.checkpointVersion);
	if (
		checkpoint.scannedCount !==
		checkpoint.succeededCount + checkpoint.failedCount + checkpoint.skippedCount
	) {
		throw new Error(
			"scannedCount must equal succeededCount + failedCount + skippedCount",
		);
	}
	if (checkpoint.lastErrorCode !== null) {
		assertNonBlank("lastErrorCode", checkpoint.lastErrorCode);
	}
	if (checkpoint.lastFailedEntityId !== null) {
		assertNonBlank("lastFailedEntityId", checkpoint.lastFailedEntityId);
	}
	assertValidDate("startedAt", checkpoint.startedAt);
	assertValidDate("updatedAt", checkpoint.updatedAt);
	if (checkpoint.updatedAt.getTime() < checkpoint.startedAt.getTime()) {
		throw new Error("updatedAt must not precede startedAt");
	}
	if (checkpoint.completedAt !== null) {
		assertValidDate("completedAt", checkpoint.completedAt);
		if (checkpoint.completedAt.getTime() < checkpoint.startedAt.getTime()) {
			throw new Error("completedAt must not precede startedAt");
		}
	}
	if (checkpoint.status === "completed" && checkpoint.completedAt === null) {
		throw new Error("completed rebuild checkpoints require completedAt");
	}
	if (checkpoint.status !== "completed" && checkpoint.completedAt !== null) {
		throw new Error(
			"completedAt is only valid for completed rebuild checkpoints",
		);
	}
	if (
		checkpoint.status === "failed" &&
		(checkpoint.lastErrorCode === null ||
			checkpoint.lastFailedEntityId === null)
	) {
		throw new Error("failed rebuild checkpoints require failure context");
	}
	return checkpoint;
}

export function defineSearchRebuildPlan(
	plan: SearchRebuildPlan,
): SearchRebuildPlan {
	assertNonBlank("organizationId", plan.organizationId);
	assertNonBlank("rebuildRunId", plan.rebuildRunId);
	assertPositiveInteger("pageSize", plan.pageSize);
	assertPositiveInteger(
		"projectionSchemaVersion",
		plan.projectionSchemaVersion,
	);
	return plan;
}

function assertNonBlank(name: string, value: string): void {
	if (value.trim().length === 0) {
		throw new Error(`${name} must not be blank`);
	}
}

function assertPositiveInteger(name: string, value: number): void {
	if (!Number.isSafeInteger(value) || value < 1) {
		throw new Error(`${name} must be a positive safe integer`);
	}
}

function assertNonNegativeInteger(name: string, value: number): void {
	if (!Number.isSafeInteger(value) || value < 0) {
		throw new Error(`${name} must be a non-negative safe integer`);
	}
}

function assertValidDate(name: string, value: Date): void {
	if (!Number.isFinite(value.getTime())) {
		throw new Error(`${name} must be a valid date`);
	}
}
