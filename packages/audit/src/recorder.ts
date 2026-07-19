import { fail, type Result } from "@afenda/errors/result";

import { computeDiff, maskSensitiveData } from "./differ";
import { createDrizzleAuditStore } from "./drizzle-store";
import { recordAuditCommandSchema } from "./schemas";
import type { AuditStore } from "./store";
import type { AuditEntry } from "./types";

export type CreateAuditRecorderOptions = {
	store?: AuditStore;
};

export type AuditRecorder = {
	record(input: unknown): Promise<Result<AuditEntry>>;
};

function asRecordOrNull(
	value: Record<string, unknown> | null | undefined,
): Record<string, unknown> | null {
	if (value === undefined || value === null) {
		return null;
	}
	return maskSensitiveData(value);
}

export function createAuditRecorder(
	options: CreateAuditRecorderOptions = {},
): AuditRecorder {
	const store = options.store ?? createDrizzleAuditStore();

	return {
		async record(input: unknown): Promise<Result<AuditEntry>> {
			const parsed = recordAuditCommandSchema.safeParse(input);
			if (!parsed.success) {
				return fail("BAD_REQUEST", "Invalid audit record input", {
					fieldErrors: parsed.error.flatten().fieldErrors,
				});
			}

			const command = parsed.data;
			// Diff first (computeDiff masks Change values); then mask stored snapshots.
			const rawOld =
				command.oldValue === undefined || command.oldValue === null
					? null
					: command.oldValue;
			const rawNew =
				command.newValue === undefined || command.newValue === null
					? null
					: command.newValue;
			const changes = computeDiff(rawOld, rawNew);
			const oldValue = asRecordOrNull(command.oldValue);
			const newValue = asRecordOrNull(command.newValue);
			const metadata =
				command.metadata === undefined
					? null
					: maskSensitiveData(command.metadata);

			return store.write({
				organizationId: command.organizationId,
				actorUserId: command.actorUserId,
				correlationId: command.correlationId,
				module: command.module,
				entity: command.entity,
				entityId: command.entityId,
				action: command.action,
				changes,
				oldValue,
				newValue,
				metadata,
				ipAddress: command.ipAddress ?? null,
				userAgent: command.userAgent ?? null,
			});
		},
	};
}
