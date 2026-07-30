import { fail, ok, type Result } from "@afenda/errors/result";

import { computeDiff, maskAuditChanges, maskSensitiveData } from "./differ";
import {
	AUDIT_EVENT_CONTEXT_METADATA_KEY,
	serializeAuditMetadata,
} from "./event-context";
import { validateAuditJsonValue } from "./json-policy";
import { recordAuditCommandSchema } from "./schemas";
import type { PreparedAuditWriteInput } from "./types";

function maskRecordOrNull(
	value: Record<string, unknown> | null | undefined,
): Record<string, unknown> | null {
	if (value === undefined || value === null) {
		return null;
	}
	return maskSensitiveData(value);
}

/** Validate and sanitize an untrusted audit command before any persistence path. */
export function prepareAuditWrite(
	input: unknown,
): Result<PreparedAuditWriteInput> {
	const parsed = recordAuditCommandSchema.safeParse(input);
	if (!parsed.success) {
		return fail("BAD_REQUEST", "Invalid audit record input", {
			fieldErrors: parsed.error.flatten().fieldErrors,
		});
	}

	const command = parsed.data;
	if (
		command.metadata !== undefined &&
		command.metadata !== null &&
		Object.hasOwn(command.metadata, AUDIT_EVENT_CONTEXT_METADATA_KEY)
	) {
		return fail("BAD_REQUEST", "Audit event metadata key is reserved");
	}
	const rawOldValue = command.oldValue ?? null;
	const rawNewValue = command.newValue ?? null;
	const changes =
		command.changes === undefined
			? computeDiff(rawOldValue, rawNewValue)
			: maskAuditChanges(command.changes);

	const prepared: PreparedAuditWriteInput = {
		organizationId: command.organizationId,
		actorUserId: command.actorUserId,
		correlationId: command.correlationId,
		module: command.module,
		entity: command.entity,
		entityId: command.entityId,
		action: command.action,
		eventContext: command.eventContext
			? {
					...command.eventContext,
					occurredAt: command.eventContext.occurredAt ?? null,
					causationId: command.eventContext.causationId ?? null,
					reasonCode: command.eventContext.reasonCode ?? null,
				}
			: {
					version: 1,
					outcome: "SUCCEEDED",
					source: command.module,
					occurredAt: null,
					causationId: null,
					reasonCode: null,
				},
		changes,
		oldValue: maskRecordOrNull(command.oldValue),
		newValue: maskRecordOrNull(command.newValue),
		metadata: maskRecordOrNull(command.metadata),
		ipAddress: command.ipAddress ?? null,
		userAgent: command.userAgent ?? null,
	};
	const persistedMetadata = validateAuditJsonValue(
		serializeAuditMetadata(prepared.metadata ?? null, prepared.eventContext),
	);
	if (!persistedMetadata.ok) {
		return fail("BAD_REQUEST", "Invalid persisted audit metadata", {
			fieldErrors: { metadata: [persistedMetadata.message] },
		});
	}

	return ok(prepared);
}
