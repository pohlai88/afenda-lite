import {
	database as afendaDatabase,
	and,
	count,
	desc,
	eq,
	isNull,
	lt,
	or,
	platformNotification,
	sql,
} from "@afenda/db";
import {
	errorIngress,
	errorProject,
	errorResult,
	type Result,
} from "@afenda/errors";

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

function activeNotificationWhere(now = new Date()) {
	const where = or(
		isNull(platformNotification.expiresAt),
		sql`${platformNotification.expiresAt} > ${now}`,
	);
	if (where === undefined) {
		throw new Error("@afenda/notifications: active predicate is required");
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
			return errorResult.fail("INTERNAL_ERROR");
		}
		entries.push(mapped.data);
	}
	return errorResult.ok(entries);
}

function failFromPersistence(error: unknown, _fallbackMessage: string) {
	return errorProject.result(
		errorIngress.postgres(error, { operation: "persistence.postgres" }),
	);
}

export class DrizzleNotificationStore implements NotificationStore {
	async write(entry: NotificationWriteInput): Promise<Result<Notification>> {
		try {
			const [row] = await afendaDatabase.client
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
					return errorResult.fail("INTERNAL_ERROR");
				}
				const [existing] = await afendaDatabase.client
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
					return errorResult.fail("INTERNAL_ERROR");
				}
				const mappedExisting = mapNotificationRow(existing);
				if (!mappedExisting.ok) {
					return errorResult.fail("INTERNAL_ERROR");
				}
				return errorResult.ok(mappedExisting.data);
			}

			const mapped = mapNotificationRow(row);
			if (!mapped.ok) {
				return errorResult.fail("INTERNAL_ERROR");
			}

			return errorResult.ok(mapped.data);
		} catch (error) {
			return failFromPersistence(error, "Failed to write notification");
		}
	}

	async listByUser(
		options: NotificationListOptions,
	): Promise<Result<Notification[]>> {
		try {
			const predicates = [
				eq(platformNotification.organizationId, options.organizationId),
				eq(platformNotification.userId, options.userId),
				activeNotificationWhere(),
			];
			if (options.unreadOnly === true) {
				predicates.push(eq(platformNotification.read, false));
			}
			const where = and(...predicates);
			if (where === undefined) {
				return errorResult.fail("INTERNAL_ERROR");
			}

			const offset = (options.page - 1) * options.pageSize;
			const rows = await afendaDatabase.client
				.select()
				.from(platformNotification)
				.where(where)
				.orderBy(desc(platformNotification.createdAt))
				.limit(options.pageSize)
				.offset(offset);

			return mapRows(rows);
		} catch (error) {
			return failFromPersistence(error, "Failed to list notifications");
		}
	}

	async countUnread(
		options: NotificationUnreadCountOptions,
	): Promise<Result<number>> {
		try {
			const where = and(
				ownershipWhere(options.organizationId, options.userId),
				eq(platformNotification.read, false),
				activeNotificationWhere(),
			);
			if (where === undefined) {
				return errorResult.fail("INTERNAL_ERROR");
			}

			const [row] = await afendaDatabase.client
				.select({ value: count() })
				.from(platformNotification)
				.where(where);

			return errorResult.ok(Number(row?.value ?? 0));
		} catch (error) {
			return failFromPersistence(error, "Failed to count unread notifications");
		}
	}

	async markRead(
		options: NotificationMarkReadOptions,
	): Promise<Result<Notification | null>> {
		try {
			const [row] = await afendaDatabase.client
				.update(platformNotification)
				.set({ read: true })
				.where(
					ownershipWhere(options.organizationId, options.userId, options.id),
				)
				.returning();

			if (row === undefined) {
				return errorResult.ok(null);
			}

			const mapped = mapNotificationRow(row);
			if (!mapped.ok) {
				return errorResult.fail("INTERNAL_ERROR");
			}
			return errorResult.ok(mapped.data);
		} catch (error) {
			return failFromPersistence(error, "Failed to mark notification read");
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
				return errorResult.fail("INTERNAL_ERROR");
			}

			const rows = await afendaDatabase.client
				.update(platformNotification)
				.set({ read: true })
				.where(where)
				.returning({ id: platformNotification.id });

			return errorResult.ok(rows.length);
		} catch (error) {
			return failFromPersistence(
				error,
				"Failed to mark all notifications read",
			);
		}
	}

	async delete(
		options: NotificationDeleteOptions,
	): Promise<Result<{ deleted: boolean }>> {
		try {
			const rows = await afendaDatabase.client
				.delete(platformNotification)
				.where(
					ownershipWhere(options.organizationId, options.userId, options.id),
				)
				.returning({ id: platformNotification.id });

			return errorResult.ok({ deleted: rows.length > 0 });
		} catch (error) {
			return failFromPersistence(error, "Failed to delete notification");
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
				return errorResult.fail("INTERNAL_ERROR");
			}

			const rows = await afendaDatabase.client
				.delete(platformNotification)
				.where(where)
				.returning({ id: platformNotification.id });

			return errorResult.ok(rows.length);
		} catch (error) {
			return failFromPersistence(
				error,
				"Failed to purge expired notifications",
			);
		}
	}
}

export function createDrizzleNotificationStore(): NotificationStore {
	return new DrizzleNotificationStore();
}
