import { randomUUID } from "node:crypto";

import { ok, type Result } from "@afenda/errors/result";

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

export { assertOk };

/** In-memory NotificationStore for Vitest only — not a production export. */
export class MemoryNotificationStore implements NotificationStore {
	private readonly entries: Notification[] = [];

	all(): Notification[] {
		return [...this.entries];
	}

	async write(entry: NotificationWriteInput): Promise<Result<Notification>> {
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
			actionUrl: entry.actionUrl ?? null,
			metadata: entry.metadata ?? null,
			read: false,
			expiresAt: entry.expiresAt ?? null,
			createdAt: entry.createdAt ?? new Date(),
		};
		this.entries.push(created);
		return ok(created);
	}

	async listByUser(
		options: NotificationListOptions,
	): Promise<Result<Notification[]>> {
		const filtered = this.entries
			.filter(
				(entry) =>
					entry.organizationId === options.organizationId &&
					entry.userId === options.userId &&
					(options.unreadOnly !== true || !entry.read),
			)
			.toSorted((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

		const offset = (options.page - 1) * options.pageSize;
		return ok(filtered.slice(offset, offset + options.pageSize));
	}

	async countUnread(
		options: NotificationUnreadCountOptions,
	): Promise<Result<number>> {
		const count = this.entries.filter(
			(entry) =>
				entry.organizationId === options.organizationId &&
				entry.userId === options.userId &&
				!entry.read,
		).length;
		return ok(count);
	}

	async markRead(
		options: NotificationMarkReadOptions,
	): Promise<Result<Notification | null>> {
		const entry = this.entries.find(
			(row) =>
				row.id === options.id &&
				row.organizationId === options.organizationId &&
				row.userId === options.userId,
		);
		if (!entry) {
			return ok(null);
		}
		entry.read = true;
		return ok({ ...entry });
	}

	async markAllRead(
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
		return ok(marked);
	}

	async delete(
		options: NotificationDeleteOptions,
	): Promise<Result<{ deleted: boolean }>> {
		const index = this.entries.findIndex(
			(row) =>
				row.id === options.id &&
				row.organizationId === options.organizationId &&
				row.userId === options.userId,
		);
		if (index < 0) {
			return ok({ deleted: false });
		}
		this.entries.splice(index, 1);
		return ok({ deleted: true });
	}

	async purgeExpired(
		options: NotificationPurgeOptions,
	): Promise<Result<number>> {
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
		return ok(before - kept.length);
	}
}
