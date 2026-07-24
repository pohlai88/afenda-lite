import {
	and,
	count,
	db,
	desc,
	eq,
	isNull,
	lt,
	or,
	platformNotification,
	sql,
} from "@afenda/db";
import { fail, failFromUnknown, ok, type Result } from "@afenda/errors/result";

import { mapNotificationRow } from "./map-row";
import type { NotificationStore } from "./store";
import type {
	Notification,
	NotificationDeleteOptions,
	NotificationListOptions,
	NotificationMarkAllReadOptions,
	NotificationMarkReadOptions,
	NotificationPurgeOptions,
	NotificationUnreadCountOptions,
	NotificationWriteInput,
} from "./types";

function ownershipWhere(organizationId: string, userId: string, id?: string) {
	const predicates = [
		eq(platformNotification.organizationId, organizationId),
		eq(platformNotification.userId, userId),
	];
	if (id !== undefined) {
		predicates.push(eq(platformNotification.id, id));
	}
	const where = and(...predicates);
	if (where === undefined) {
		throw new Error(
			"@afenda/notifications: ownership where clause is required",
		);
	}
	return where;
}

function mapRows(
	rows: Parameters<typeof mapNotificationRow>[0][],
): Result<Notification[]> {
	const entries: Notification[] = [];
	for (const row of rows) {
		const mapped = mapNotificationRow(row);
		if (!mapped.ok) {
			return fail(
				"INTERNAL_ERROR",
				`notification row mapping failed: ${mapped.reason}`,
			);
		}
		entries.push(mapped.data);
	}
	return ok(entries);
}

export class DrizzleNotificationStore implements NotificationStore {
	async write(entry: NotificationWriteInput): Promise<Result<Notification>> {
		try {
			const [row] = await db
				.insert(platformNotification)
				.values({
					organizationId: entry.organizationId,
					userId: entry.userId,
					type: entry.type,
					priority: entry.priority,
					channel: entry.channel,
					title: entry.title,
					body: entry.body,
					module: entry.module,
					deduplicationKey: entry.deduplicationKey ?? null,
					actionUrl: entry.actionUrl ?? null,
					metadata: entry.metadata ?? null,
					expiresAt: entry.expiresAt ?? null,
					createdAt: entry.createdAt,
				})
				.onConflictDoNothing({
					target: [
						platformNotification.organizationId,
						platformNotification.userId,
						platformNotification.module,
						platformNotification.deduplicationKey,
					],
					where: sql`${platformNotification.deduplicationKey} IS NOT NULL`,
				})
				.returning();

			if (row === undefined) {
				if (
					entry.deduplicationKey === undefined ||
					entry.deduplicationKey === null
				) {
					return fail("INTERNAL_ERROR", "notification write returned no row");
				}
				const [existing] = await db
					.select()
					.from(platformNotification)
					.where(
						and(
							eq(platformNotification.organizationId, entry.organizationId),
							eq(platformNotification.userId, entry.userId),
							eq(platformNotification.module, entry.module),
							eq(platformNotification.deduplicationKey, entry.deduplicationKey),
						),
					)
					.limit(1);
				if (existing === undefined) {
					return fail(
						"INTERNAL_ERROR",
						"notification deduplication lookup returned no row",
					);
				}
				const mappedExisting = mapNotificationRow(existing);
				if (!mappedExisting.ok) {
					return fail(
						"INTERNAL_ERROR",
						`notification deduplication lookup returned unreadable row: ${mappedExisting.reason}`,
					);
				}
				return ok(mappedExisting.data);
			}

			const mapped = mapNotificationRow(row);
			if (!mapped.ok) {
				return fail(
					"INTERNAL_ERROR",
					`notification write returned unreadable row: ${mapped.reason}`,
				);
			}

			return ok(mapped.data);
		} catch (error) {
			return failFromUnknown(error, "Failed to write notification");
		}
	}

	async listByUser(
		options: NotificationListOptions,
	): Promise<Result<Notification[]>> {
		try {
			const predicates = [
				eq(platformNotification.organizationId, options.organizationId),
				eq(platformNotification.userId, options.userId),
			];
			if (options.unreadOnly === true) {
				predicates.push(eq(platformNotification.read, false));
			}
			const where = and(...predicates);
			if (where === undefined) {
				return fail("INTERNAL_ERROR", "notification list where clause missing");
			}

			const offset = (options.page - 1) * options.pageSize;
			const rows = await db
				.select()
				.from(platformNotification)
				.where(where)
				.orderBy(desc(platformNotification.createdAt))
				.limit(options.pageSize)
				.offset(offset);

			return mapRows(rows);
		} catch (error) {
			return failFromUnknown(error, "Failed to list notifications");
		}
	}

	async countUnread(
		options: NotificationUnreadCountOptions,
	): Promise<Result<number>> {
		try {
			const where = and(
				ownershipWhere(options.organizationId, options.userId),
				eq(platformNotification.read, false),
			);
			if (where === undefined) {
				return fail(
					"INTERNAL_ERROR",
					"notification unread-count where clause missing",
				);
			}

			const [row] = await db
				.select({ value: count() })
				.from(platformNotification)
				.where(where);

			return ok(Number(row?.value ?? 0));
		} catch (error) {
			return failFromUnknown(error, "Failed to count unread notifications");
		}
	}

	async markRead(
		options: NotificationMarkReadOptions,
	): Promise<Result<Notification | null>> {
		try {
			const [row] = await db
				.update(platformNotification)
				.set({ read: true })
				.where(
					ownershipWhere(options.organizationId, options.userId, options.id),
				)
				.returning();

			if (row === undefined) {
				return ok(null);
			}

			const mapped = mapNotificationRow(row);
			if (!mapped.ok) {
				return fail(
					"INTERNAL_ERROR",
					`notification markRead returned unreadable row: ${mapped.reason}`,
				);
			}
			return ok(mapped.data);
		} catch (error) {
			return failFromUnknown(error, "Failed to mark notification read");
		}
	}

	async markAllRead(
		options: NotificationMarkAllReadOptions,
	): Promise<Result<number>> {
		try {
			const where = and(
				ownershipWhere(options.organizationId, options.userId),
				eq(platformNotification.read, false),
			);
			if (where === undefined) {
				return fail(
					"INTERNAL_ERROR",
					"notification mark-all-read where clause missing",
				);
			}

			const rows = await db
				.update(platformNotification)
				.set({ read: true })
				.where(where)
				.returning({ id: platformNotification.id });

			return ok(rows.length);
		} catch (error) {
			return failFromUnknown(error, "Failed to mark all notifications read");
		}
	}

	async delete(
		options: NotificationDeleteOptions,
	): Promise<Result<{ deleted: boolean }>> {
		try {
			const rows = await db
				.delete(platformNotification)
				.where(
					ownershipWhere(options.organizationId, options.userId, options.id),
				)
				.returning({ id: platformNotification.id });

			return ok({ deleted: rows.length > 0 });
		} catch (error) {
			return failFromUnknown(error, "Failed to delete notification");
		}
	}

	async purgeExpired(
		options: NotificationPurgeOptions,
	): Promise<Result<number>> {
		try {
			const now = new Date();
			const expiredByTtl = and(
				eq(platformNotification.organizationId, options.organizationId),
				lt(platformNotification.expiresAt, now),
			);

			const expiredByAge =
				options.olderThan === undefined
					? undefined
					: and(
							eq(platformNotification.organizationId, options.organizationId),
							isNull(platformNotification.expiresAt),
							lt(platformNotification.createdAt, options.olderThan),
						);

			const where =
				expiredByAge === undefined
					? expiredByTtl
					: or(expiredByTtl, expiredByAge);

			if (where === undefined) {
				return fail(
					"INTERNAL_ERROR",
					"notification purge where clause missing",
				);
			}

			const rows = await db
				.delete(platformNotification)
				.where(where)
				.returning({ id: platformNotification.id });

			return ok(rows.length);
		} catch (error) {
			return failFromUnknown(error, "Failed to purge expired notifications");
		}
	}
}

export function createDrizzleNotificationStore(): NotificationStore {
	return new DrizzleNotificationStore();
}
