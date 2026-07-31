import { errorResult, type Result } from "@afenda/errors";

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
		return errorResult.fail("VALIDATION_ERROR", {
			publicMessage: "Invalid audit record input",
		});
	}

	const command = parsed.data;
	if (
		command.metadata !== undefined &&
		command.metadata !== null &&
		Object.hasOwn(command.metadata, AUDIT_EVENT_CONTEXT_METADATA_KEY)
	) {
		return errorResult.fail("BAD_REQUEST", {
			publicMessage: "Audit event metadata key is reserved",
		});
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
		return errorResult.fail("VALIDATION_ERROR", {
			publicMessage: "Invalid persisted audit metadata",
		});
	}

	return errorResult.ok(prepared);
}
