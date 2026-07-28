import { randomUUID } from "node:crypto";

import {
	and,
	db,
	eq,
	platformWorkItem,
	platformWorkItemActivity,
} from "@afenda/db";
import { fail, ok, type Result } from "@afenda/errors/result";

export type PlatformWorkItemKind =
	| "approval"
	| "task"
	| "reminder"
	| "escalation";
export type PlatformWorkItemStatus =
	| "pending"
	| "in_progress"
	| "completed"
	| "approved"
	| "rejected"
	| "dismissed"
	| "cancelled";

export type PlatformWorkItem = {
	id: string;
	organizationId: string;
	kind: PlatformWorkItemKind;
	status: PlatformWorkItemStatus;
	targetUserId: string;
	entityType: string;
	entityId: string;
	title: string;
	priority: "MEDIUM" | "HIGH";
	dueOn: string | null;
	sourceEventId: string;
	deduplicationKey: string;
	factVersion: number;
	version: number;
	correlationId: string;
	createdBy: string;
	updatedBy: string;
	completedAt: Date | null;
	createdAt: Date;
	updatedAt: Date;
};

export type PlatformWorkItemActivity = {
	id: string;
	organizationId: string;
	workItemId: string;
	fromStatus: PlatformWorkItemStatus | null;
	toStatus: PlatformWorkItemStatus;
	resultingVersion: number;
	action: "recorded" | "transitioned";
	actorUserId: string;
	correlationId: string;
	reason: string | null;
	createdAt: Date;
};

export type RecordPlatformWorkItemInput = {
	organizationId: string;
	kind: PlatformWorkItemKind;
	targetUserId: string;
	entityType: string;
	entityId: string;
	title: string;
	priority: "MEDIUM" | "HIGH";
	dueOn: string | null;
	sourceEventId: string;
	deduplicationKey: string;
	factVersion: number;
	correlationId: string;
	actorUserId: string;
};

export type TransitionPlatformWorkItemInput = {
	organizationId: string;
	workItemId: string;
	expectedVersion: number;
	toStatus: PlatformWorkItemStatus;
	actorUserId: string;
	correlationId: string;
	reason?: string;
};

export type PlatformWorkItemStore = {
	record(input: RecordPlatformWorkItemInput): Promise<Result<PlatformWorkItem>>;
	find(input: {
		organizationId: string;
		workItemId: string;
	}): Promise<Result<PlatformWorkItem | null>>;
	transition(
		input: TransitionPlatformWorkItemInput,
	): Promise<Result<PlatformWorkItem>>;
	listActivity(input: {
		organizationId: string;
		workItemId: string;
	}): Promise<Result<readonly PlatformWorkItemActivity[]>>;
};

const WORK_ITEM_KINDS = new Set<string>([
	"approval",
	"task",
	"reminder",
	"escalation",
]);
const WORK_ITEM_STATUSES = new Set<string>([
	"pending",
	"in_progress",
	"completed",
	"approved",
	"rejected",
	"dismissed",
	"cancelled",
]);

function isKind(value: string): value is PlatformWorkItemKind {
	return WORK_ITEM_KINDS.has(value);
}

function isStatus(value: string): value is PlatformWorkItemStatus {
	return WORK_ITEM_STATUSES.has(value);
}

const ALLOWED_TRANSITIONS: Readonly<
	Record<
		PlatformWorkItemKind,
		Readonly<Record<PlatformWorkItemStatus, readonly PlatformWorkItemStatus[]>>
	>
> = {
	approval: {
		pending: ["approved", "rejected", "cancelled"],
		in_progress: [],
		completed: [],
		approved: [],
		rejected: [],
		dismissed: [],
		cancelled: [],
	},
	task: {
		pending: ["in_progress", "completed", "cancelled"],
		in_progress: ["completed", "cancelled"],
		completed: [],
		approved: [],
		rejected: [],
		dismissed: [],
		cancelled: [],
	},
	reminder: {
		pending: ["completed", "dismissed", "cancelled"],
		in_progress: [],
		completed: [],
		approved: [],
		rejected: [],
		dismissed: [],
		cancelled: [],
	},
	escalation: {
		pending: ["in_progress", "completed", "cancelled"],
		in_progress: ["completed", "cancelled"],
		completed: [],
		approved: [],
		rejected: [],
		dismissed: [],
		cancelled: [],
	},
};

function validateRecord(input: RecordPlatformWorkItemInput): Result<void> {
	if (
		input.organizationId.trim().length === 0 ||
		input.targetUserId.trim().length === 0 ||
		input.entityType.trim().length === 0 ||
		input.entityId.trim().length === 0 ||
		input.title.trim().length === 0 ||
		input.sourceEventId.trim().length === 0 ||
		input.deduplicationKey.trim().length === 0 ||
		input.correlationId.trim().length === 0 ||
		input.actorUserId.trim().length === 0 ||
		!Number.isSafeInteger(input.factVersion) ||
		input.factVersion < 1
	)
		return fail("VALIDATION_ERROR", "Invalid platform work-item input");
	return ok(undefined);
}

function recordMatches(
	item: PlatformWorkItem,
	input: RecordPlatformWorkItemInput,
): boolean {
	return (
		item.organizationId === input.organizationId &&
		item.kind === input.kind &&
		item.targetUserId === input.targetUserId &&
		item.entityType === input.entityType &&
		item.entityId === input.entityId &&
		item.title === input.title &&
		item.priority === input.priority &&
		item.dueOn === input.dueOn &&
		item.sourceEventId === input.sourceEventId &&
		item.deduplicationKey === input.deduplicationKey &&
		item.factVersion === input.factVersion &&
		item.correlationId === input.correlationId
	);
}

function canTransition(
	item: PlatformWorkItem,
	toStatus: PlatformWorkItemStatus,
): boolean {
	return ALLOWED_TRANSITIONS[item.kind][item.status].includes(toStatus);
}

function mapRow(
	row: typeof platformWorkItem.$inferSelect,
): Result<PlatformWorkItem> {
	if (!isKind(row.kind) || !isStatus(row.status))
		return fail("INTERNAL_ERROR", "Platform work-item row is invalid");
	if (row.priority !== "MEDIUM" && row.priority !== "HIGH")
		return fail("INTERNAL_ERROR", "Platform work-item priority is invalid");
	return ok({
		...row,
		kind: row.kind,
		status: row.status,
		priority: row.priority,
	});
}

function mapActivityRow(
	row: typeof platformWorkItemActivity.$inferSelect,
): Result<PlatformWorkItemActivity> {
	if (
		!isStatus(row.toStatus) ||
		(row.fromStatus !== null && !isStatus(row.fromStatus)) ||
		(row.action !== "recorded" && row.action !== "transitioned")
	)
		return fail("INTERNAL_ERROR", "Platform work-item activity row is invalid");
	return ok({
		...row,
		toStatus: row.toStatus,
		fromStatus: row.fromStatus,
		action: row.action,
	});
}

export function createMemoryPlatformWorkItemStore(): PlatformWorkItemStore {
	const items = new Map<string, PlatformWorkItem>();
	const idsByDedupe = new Map<string, string>();
	const activities: PlatformWorkItemActivity[] = [];
	return {
		async record(input) {
			const validated = validateRecord(input);
			if (!validated.ok) return validated;
			const dedupeKey = `${input.organizationId}:${input.deduplicationKey}`;
			const existingId = idsByDedupe.get(dedupeKey);
			if (existingId !== undefined) {
				const existing = items.get(existingId);
				if (existing === undefined)
					return fail(
						"INTERNAL_ERROR",
						"Platform work-item index is inconsistent",
					);
				return recordMatches(existing, input)
					? ok(existing)
					: fail("CONFLICT", "Platform work-item deduplication key was reused");
			}
			const now = new Date();
			const item: PlatformWorkItem = {
				id: randomUUID(),
				...input,
				status: "pending",
				version: 1,
				createdBy: input.actorUserId,
				updatedBy: input.actorUserId,
				completedAt: null,
				createdAt: now,
				updatedAt: now,
			};
			items.set(item.id, item);
			idsByDedupe.set(dedupeKey, item.id);
			activities.push({
				id: randomUUID(),
				organizationId: item.organizationId,
				workItemId: item.id,
				fromStatus: null,
				toStatus: "pending",
				resultingVersion: 1,
				action: "recorded",
				actorUserId: input.actorUserId,
				correlationId: input.correlationId,
				reason: null,
				createdAt: now,
			});
			return ok(item);
		},
		async find(input) {
			const item = items.get(input.workItemId);
			return ok(item?.organizationId === input.organizationId ? item : null);
		},
		async transition(input) {
			const current = items.get(input.workItemId);
			if (
				current === undefined ||
				current.organizationId !== input.organizationId
			)
				return fail("NOT_FOUND", "Platform work item not found");
			if (current.version !== input.expectedVersion)
				return fail("CONFLICT", "Platform work-item version changed");
			if (!canTransition(current, input.toStatus))
				return fail("CONFLICT", "Platform work-item transition is not allowed");
			const now = new Date();
			const updated: PlatformWorkItem = {
				...current,
				status: input.toStatus,
				version: current.version + 1,
				updatedBy: input.actorUserId,
				updatedAt: now,
				completedAt:
					input.toStatus === "completed" ||
					input.toStatus === "approved" ||
					input.toStatus === "rejected" ||
					input.toStatus === "dismissed" ||
					input.toStatus === "cancelled"
						? now
						: null,
			};
			items.set(updated.id, updated);
			activities.push({
				id: randomUUID(),
				organizationId: updated.organizationId,
				workItemId: updated.id,
				fromStatus: current.status,
				toStatus: updated.status,
				resultingVersion: updated.version,
				action: "transitioned",
				actorUserId: input.actorUserId,
				correlationId: input.correlationId,
				reason: input.reason ?? null,
				createdAt: now,
			});
			return ok(updated);
		},
		async listActivity(input) {
			return ok(
				activities.filter(
					(row) =>
						row.organizationId === input.organizationId &&
						row.workItemId === input.workItemId,
				),
			);
		},
	};
}

export function createDrizzlePlatformWorkItemStore(): PlatformWorkItemStore {
	return {
		async record(input) {
			const validated = validateRecord(input);
			if (!validated.ok) return validated;
			try {
				const inserted = await db
					.insert(platformWorkItem)
					.values({
						organizationId: input.organizationId,
						kind: input.kind,
						status: "pending",
						targetUserId: input.targetUserId,
						entityType: input.entityType,
						entityId: input.entityId,
						title: input.title,
						priority: input.priority,
						dueOn: input.dueOn,
						sourceEventId: input.sourceEventId,
						deduplicationKey: input.deduplicationKey,
						factVersion: input.factVersion,
						correlationId: input.correlationId,
						createdBy: input.actorUserId,
						updatedBy: input.actorUserId,
					})
					.onConflictDoNothing({
						target: [
							platformWorkItem.organizationId,
							platformWorkItem.deduplicationKey,
						],
					})
					.returning();
				const rows =
					inserted.length > 0
						? inserted
						: await db
								.select()
								.from(platformWorkItem)
								.where(
									and(
										eq(platformWorkItem.organizationId, input.organizationId),
										eq(
											platformWorkItem.deduplicationKey,
											input.deduplicationKey,
										),
									),
								)
								.limit(1);
				const mapped = rows[0] === undefined ? null : mapRow(rows[0]);
				if (mapped === null)
					return fail("INTERNAL_ERROR", "Platform work item was not persisted");
				if (!mapped.ok) return mapped;
				if (!recordMatches(mapped.data, input))
					return fail(
						"CONFLICT",
						"Platform work-item deduplication key was reused",
					);
				await db
					.insert(platformWorkItemActivity)
					.values({
						organizationId: input.organizationId,
						workItemId: mapped.data.id,
						fromStatus: null,
						toStatus: "pending",
						resultingVersion: 1,
						action: "recorded",
						actorUserId: input.actorUserId,
						correlationId: input.correlationId,
					})
					.onConflictDoNothing({
						target: [
							platformWorkItemActivity.organizationId,
							platformWorkItemActivity.workItemId,
							platformWorkItemActivity.resultingVersion,
						],
					});
				return mapped;
			} catch {
				return fail("INTERNAL_ERROR", "Platform work-item persistence failed");
			}
		},
		async find(input) {
			try {
				const rows = await db
					.select()
					.from(platformWorkItem)
					.where(
						and(
							eq(platformWorkItem.organizationId, input.organizationId),
							eq(platformWorkItem.id, input.workItemId),
						),
					)
					.limit(1);
				return rows[0] === undefined ? ok(null) : mapRow(rows[0]);
			} catch {
				return fail("INTERNAL_ERROR", "Platform work-item query failed");
			}
		},
		async transition(input) {
			const found = await this.find({
				organizationId: input.organizationId,
				workItemId: input.workItemId,
			});
			if (!found.ok) return found;
			if (found.data === null)
				return fail("NOT_FOUND", "Platform work item not found");
			if (found.data.version !== input.expectedVersion)
				return fail("CONFLICT", "Platform work-item version changed");
			if (!canTransition(found.data, input.toStatus))
				return fail("CONFLICT", "Platform work-item transition is not allowed");
			try {
				const now = new Date();
				const terminal = !["pending", "in_progress"].includes(input.toStatus);
				const rows = await db
					.update(platformWorkItem)
					.set({
						status: input.toStatus,
						version: input.expectedVersion + 1,
						updatedBy: input.actorUserId,
						updatedAt: now,
						completedAt: terminal ? now : null,
					})
					.where(
						and(
							eq(platformWorkItem.organizationId, input.organizationId),
							eq(platformWorkItem.id, input.workItemId),
							eq(platformWorkItem.version, input.expectedVersion),
							eq(platformWorkItem.status, found.data.status),
						),
					)
					.returning();
				if (rows[0] === undefined)
					return fail("CONFLICT", "Platform work-item version changed");
				const mapped = mapRow(rows[0]);
				if (!mapped.ok) return mapped;
				await db.insert(platformWorkItemActivity).values({
					organizationId: input.organizationId,
					workItemId: input.workItemId,
					fromStatus: found.data.status,
					toStatus: input.toStatus,
					resultingVersion: mapped.data.version,
					action: "transitioned",
					actorUserId: input.actorUserId,
					correlationId: input.correlationId,
					reason: input.reason,
				});
				return mapped;
			} catch {
				return fail("INTERNAL_ERROR", "Platform work-item transition failed");
			}
		},
		async listActivity(input) {
			try {
				const rows = await db
					.select()
					.from(platformWorkItemActivity)
					.where(
						and(
							eq(platformWorkItemActivity.organizationId, input.organizationId),
							eq(platformWorkItemActivity.workItemId, input.workItemId),
						),
					)
					.orderBy(platformWorkItemActivity.resultingVersion);
				const mapped: PlatformWorkItemActivity[] = [];
				for (const row of rows) {
					const item = mapActivityRow(row);
					if (!item.ok) return item;
					mapped.push(item.data);
				}
				return ok(mapped);
			} catch {
				return fail(
					"INTERNAL_ERROR",
					"Platform work-item activity query failed",
				);
			}
		},
	};
}
