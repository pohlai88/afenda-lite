import { auditEventContextSchema } from "./schemas";
import type { AuditEventContext } from "./types";

export const AUDIT_EVENT_CONTEXT_METADATA_KEY =
	"_afenda_event_context" as const;

type ExtractedAuditMetadata =
	| {
			ok: true;
			eventContext: AuditEventContext | null;
			metadata: Record<string, unknown> | null;
	  }
	| { ok: false };

/** Keep event semantics in the existing JSON column until schema drift is reconciled. */
export function serializeAuditMetadata(
	metadata: Record<string, unknown> | null,
	eventContext: AuditEventContext,
): Record<string, unknown> {
	return {
		...(metadata ?? {}),
		[AUDIT_EVENT_CONTEXT_METADATA_KEY]: {
			...eventContext,
			occurredAt: eventContext.occurredAt?.toISOString() ?? null,
		},
	};
}

/** Read V1 rows and retain compatibility with rows written before the envelope. */
export function extractAuditMetadata(
	metadata: Record<string, unknown> | null,
): ExtractedAuditMetadata {
	if (
		metadata === null ||
		!Object.hasOwn(metadata, AUDIT_EVENT_CONTEXT_METADATA_KEY)
	) {
		return { ok: true, eventContext: null, metadata };
	}

	const parsed = auditEventContextSchema.safeParse(
		metadata[AUDIT_EVENT_CONTEXT_METADATA_KEY],
	);
	if (!parsed.success) {
		return { ok: false };
	}

	const remaining = Object.fromEntries(
		Object.entries(metadata).filter(
			([key]) => key !== AUDIT_EVENT_CONTEXT_METADATA_KEY,
		),
	);
	return {
		ok: true,
		eventContext: parsed.data,
		metadata: Object.keys(remaining).length === 0 ? null : remaining,
	};
}
