import { randomUUID } from "node:crypto";

import { errorResult, type Result } from "@afenda/errors";

import type { NotificationStore } from "../../src/store";
import type {
	Notification,
	NotificationDeleteOptions,
	NotificationListOptions,
	NotificationMarkAllReadOptions,
	NotificationMarkReadOptions,
	NotificationPurgeOptions,
	NotificationUnreadCountOptions,
	NotificationWriteInput,
} from "../../src/types";

function assertOk<T>(result: Result<T>): T {
	if (!result.ok) {
		throw new Error(`expected ok, got ${result.code}: ${result.message}`);
	}
	return result.data;
}

function okAsync<T>(data: T): Promise<Result<T>> {
	return Promise.resolve(errorResult.ok(data));
}

export { assertOk };

/** In-memory NotificationStore for Vitest only — not a production export. */
export class MemoryNotificationStore implements NotificationStore {
	private readonly entries: Notification[] = [];

	all(): Notification[] {
		return [...this.entries];
	}

	write(entry: NotificationWriteInput): Promise<Result<Notification>> {
		if (
			entry.deduplicationKey !== undefined &&
			entry.deduplicationKey !== null
		) {
			const existing = this.entries.find(
				(row) =>
					row.organizationId === entry.organizationId &&
					row.userId === entry.userId &&
					row.module === entry.module &&
					row.deduplicationKey === entry.deduplicationKey,
			);
			if (existing !== undefined) {
				return okAsync({ ...existing });
			}
		}
		const created: Notification = {
			id: randomUUID(),
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
			read: false,
			expiresAt: entry.expiresAt ?? null,
			createdAt: entry.createdAt ?? new Date(),
		};
		this.entries.push(created);
		return okAsync(created);
	}

	listByUser(
		options: NotificationListOptions,
	): Promise<Result<Notification[]>> {
		const filtered = this.entries
			.filter(
				(entry) =>
					entry.organizationId === options.organizationId &&
					entry.userId === options.userId &&
					(entry.expiresAt === null || entry.expiresAt > new Date()) &&
					(options.unreadOnly !== true || !entry.read),
			)
			.toSorted((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

		const offset = (options.page - 1) * options.pageSize;
		return okAsync(filtered.slice(offset, offset + options.pageSize));
	}

	countUnread(
		options: NotificationUnreadCountOptions,
	): Promise<Result<number>> {
		const count = this.entries.filter(
			(entry) =>
				entry.organizationId === options.organizationId &&
				entry.userId === options.userId &&
				(entry.expiresAt === null || entry.expiresAt > new Date()) &&
				!entry.read,
		).length;
		return okAsync(count);
	}

	markRead(
		options: NotificationMarkReadOptions,
	): Promise<Result<Notification | null>> {
		const entry = this.entries.find(
			(row) =>
				row.id === options.id &&
				row.organizationId === options.organizationId &&
				row.userId === options.userId,
		);
		if (!entry) {
			return okAsync<Notification | null>(null);
		}
		entry.read = true;
		return okAsync({ ...entry });
	}

	markAllRead(
		options: NotificationMarkAllReadOptions,
	): Promise<Result<number>> {
		let marked = 0;
		for (const entry of this.entries) {
			if (
				entry.organizationId === options.organizationId &&
				entry.userId === options.userId &&
				!entry.read
			) {
				entry.read = true;
				marked += 1;
			}
		}
		return okAsync(marked);
	}

	delete(
		options: NotificationDeleteOptions,
	): Promise<Result<{ deleted: boolean }>> {
		const index = this.entries.findIndex(
			(row) =>
				row.id === options.id &&
				row.organizationId === options.organizationId &&
				row.userId === options.userId,
		);
		if (index < 0) {
			return okAsync({ deleted: false });
		}
		this.entries.splice(index, 1);
		return okAsync({ deleted: true });
	}

	purgeExpired(options: NotificationPurgeOptions): Promise<Result<number>> {
		const now = new Date();
		const before = this.entries.length;
		const kept = this.entries.filter((entry) => {
			if (entry.organizationId !== options.organizationId) {
				return true;
			}
			if (entry.expiresAt !== null && entry.expiresAt < now) {
				return false;
			}
			if (
				options.olderThan !== undefined &&
				entry.expiresAt === null &&
				entry.createdAt < options.olderThan
			) {
				return false;
			}
			return true;
		});
		this.entries.length = 0;
		this.entries.push(...kept);
		return okAsync(before - kept.length);
	}
}
