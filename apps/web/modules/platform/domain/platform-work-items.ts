import { randomUUID } from "node:crypto";

import {
	and,
	db,
	eq,
	platformWorkItem,
	platformWorkItemActivity,
} from "@afenda/db";
import {
	errorIngress,
	errorProject,
	errorResult,
	type Result,
} from "@afenda/errors";

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

export interface PlatformWorkItem {
	completedAt: Date | null;
	correlationId: string;
	createdAt: Date;
	createdBy: string;
	deduplicationKey: string;
	dueOn: string | null;
	entityId: string;
	entityType: string;
	factVersion: number;
	id: string;
	kind: PlatformWorkItemKind;
	organizationId: string;
	priority: "MEDIUM" | "HIGH";
	sourceEventId: string;
	status: PlatformWorkItemStatus;
	targetUserId: string;
	title: string;
	updatedAt: Date;
	updatedBy: string;
	version: number;
}

export interface PlatformWorkItemActivity {
	action: "recorded" | "transitioned";
	actorUserId: string;
	correlationId: string;
	createdAt: Date;
	fromStatus: PlatformWorkItemStatus | null;
	id: string;
	organizationId: string;
	reason: string | null;
	resultingVersion: number;
	toStatus: PlatformWorkItemStatus;
	workItemId: string;
}

export interface RecordPlatformWorkItemInput {
	actorUserId: string;
	correlationId: string;
	deduplicationKey: string;
	dueOn: string | null;
	entityId: string;
	entityType: string;
	factVersion: number;
	kind: PlatformWorkItemKind;
	organizationId: string;
	priority: "MEDIUM" | "HIGH";
	sourceEventId: string;
	targetUserId: string;
	title: string;
}

export interface TransitionPlatformWorkItemInput {
	actorUserId: string;
	correlationId: string;
	expectedVersion: number;
	organizationId: string;
	reason?: string;
	toStatus: PlatformWorkItemStatus;
	workItemId: string;
}

export interface PlatformWorkItemStore {
	find: (input: {
		organizationId: string;
		workItemId: string;
	}) => Promise<Result<PlatformWorkItem | null>>;
	listActivity: (input: {
		organizationId: string;
		workItemId: string;
	}) => Promise<Result<readonly PlatformWorkItemActivity[]>>;
	record: (
		input: RecordPlatformWorkItemInput,
	) => Promise<Result<PlatformWorkItem>>;
	transition: (
		input: TransitionPlatformWorkItemInput,
	) => Promise<Result<PlatformWorkItem>>;
}

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
	) {
		return errorResult.fail("VALIDATION_ERROR", {
			publicMessage: "Invalid platform work-item input",
		});
	}
	return errorResult.ok(undefined);
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
	if (!(isKind(row.kind) && isStatus(row.status))) {
		return errorResult.fail("INTERNAL_ERROR");
	}
	if (row.priority !== "MEDIUM" && row.priority !== "HIGH") {
		return errorResult.fail("INTERNAL_ERROR");
	}
	return errorResult.ok({
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
	) {
		return errorResult.fail("INTERNAL_ERROR");
	}
	return errorResult.ok({
		...row,
		toStatus: row.toStatus,
		fromStatus: row.fromStatus,
		action: row.action,
	});
}

function mapPlatformWorkItemPersistenceFailure(
	error: unknown,
	_fallbackMessage: string,
): Result<never> {
	return errorProject.result(
		errorIngress.postgres(error, { operation: "persistence.postgres" }),
	);
}

export function createMemoryPlatformWorkItemStore(): PlatformWorkItemStore {
	const items = new Map<string, PlatformWorkItem>();
	const idsByDedupe = new Map<string, string>();
	const activities: PlatformWorkItemActivity[] = [];
	return {
		async record(input) {
			const validated = validateRecord(input);
			if (!validated.ok) {
				return await validated;
			}
			const dedupeKey = `${input.organizationId}:${input.deduplicationKey}`;
			const existingId = idsByDedupe.get(dedupeKey);
			if (existingId !== undefined) {
				const existing = items.get(existingId);
				if (existing === undefined) {
					return await errorResult.fail("INTERNAL_ERROR");
				}
				return (await recordMatches(existing, input))
					? errorResult.ok(existing)
					: errorResult.fail("CONFLICT", {
							publicMessage: "Platform work-item deduplication key was reused",
						});
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
			return await errorResult.ok(item);
		},
		async find(input) {
			const item = items.get(input.workItemId);
			return await errorResult.ok(
				item?.organizationId === input.organizationId ? item : null,
			);
		},
		async transition(input) {
			const current = items.get(input.workItemId);
			if (
				current === undefined ||
				current.organizationId !== input.organizationId
			) {
				return await errorResult.fail("NOT_FOUND", {
					publicMessage: "Platform work item not found",
				});
			}
			if (current.version !== input.expectedVersion) {
				return await errorResult.fail("CONFLICT", {
					publicMessage: "Platform work-item version changed",
				});
			}
			if (!canTransition(current, input.toStatus)) {
				return await errorResult.fail("CONFLICT", {
					publicMessage: "Platform work-item transition is not allowed",
				});
			}
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
			return await errorResult.ok(updated);
		},
		async listActivity(input) {
			return await errorResult.ok(
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
			if (!validated.ok) {
				return validated;
			}
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
				if (mapped === null) {
					return errorResult.fail("INTERNAL_ERROR");
				}
				if (!mapped.ok) {
					return mapped;
				}
				if (!recordMatches(mapped.data, input)) {
					return errorResult.fail("CONFLICT", {
						publicMessage: "Platform work-item deduplication key was reused",
					});
				}
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
			} catch (error) {
				return mapPlatformWorkItemPersistenceFailure(
					error,
					"Platform work-item persistence failed",
				);
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
				return rows[0] === undefined ? errorResult.ok(null) : mapRow(rows[0]);
			} catch (error) {
				return mapPlatformWorkItemPersistenceFailure(
					error,
					"Platform work-item query failed",
				);
			}
		},
		async transition(input) {
			const found = await this.find({
				organizationId: input.organizationId,
				workItemId: input.workItemId,
			});
			if (!found.ok) {
				return found;
			}
			if (found.data === null) {
				return errorResult.fail("NOT_FOUND", {
					publicMessage: "Platform work item not found",
				});
			}
			if (found.data.version !== input.expectedVersion) {
				return errorResult.fail("CONFLICT", {
					publicMessage: "Platform work-item version changed",
				});
			}
			if (!canTransition(found.data, input.toStatus)) {
				return errorResult.fail("CONFLICT", {
					publicMessage: "Platform work-item transition is not allowed",
				});
			}
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
				if (rows[0] === undefined) {
					return errorResult.fail("CONFLICT", {
						publicMessage: "Platform work-item version changed",
					});
				}
				const mapped = mapRow(rows[0]);
				if (!mapped.ok) {
					return mapped;
				}
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
			} catch (error) {
				return mapPlatformWorkItemPersistenceFailure(
					error,
					"Platform work-item transition failed",
				);
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
					if (!item.ok) {
						return item;
					}
					mapped.push(item.data);
				}
				return errorResult.ok(mapped);
			} catch (error) {
				return mapPlatformWorkItemPersistenceFailure(
					error,
					"Platform work-item activity query failed",
				);
			}
		},
	};
}
