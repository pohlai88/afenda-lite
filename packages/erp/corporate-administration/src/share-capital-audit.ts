import { ok, type Result } from "@afenda/errors/result";

import type { ShareCapitalMutationContext } from "./ports";

type ShareCapitalEntityType =
	| "share_class"
	| "share_transaction"
	| "share_certificate"
	| "beneficial_owner_disclosure";

export async function recordShareCapitalMutation(
	ctx: ShareCapitalMutationContext | undefined,
	input: {
		organizationId: string;
		actorUserId: string;
		legalCompanyId: string;
		entityType: ShareCapitalEntityType;
		entityId: string;
		action: "CREATE" | "UPDATE";
		version?: number;
		status: string;
		reversalOfId?: string | null;
		oldValue?: Record<string, unknown> | null;
		newValue?: Record<string, unknown> | null;
	},
	options?: { emitOutbox?: boolean },
): Promise<Result<void>> {
	if (!ctx) return ok(undefined);
	const auditResult = await ctx.ports.audit.record({
		organizationId: input.organizationId,
		actorUserId: input.actorUserId,
		correlationId: ctx.meta.correlationId,
		entity: input.entityType,
		entityId: input.entityId,
		action: input.action,
		changes: [],
		oldValue: input.oldValue ?? null,
		newValue: input.newValue ?? null,
	});
	if (!auditResult.ok) return auditResult;
	if (options?.emitOutbox === false) return ok(undefined);
	const outboxResult = await ctx.ports.outbox.append({
		organizationId: input.organizationId,
		actorUserId: input.actorUserId,
		correlationId: ctx.meta.correlationId,
		type: ctx.meta.eventType,
		payload: {
			organizationId: input.organizationId,
			legalCompanyId: input.legalCompanyId,
			entityType: input.entityType,
			entityId: input.entityId,
			version: input.version,
			actorId: input.actorUserId,
			correlationId: ctx.meta.correlationId,
			status: input.status,
			reversalOfId: input.reversalOfId ?? null,
		},
	});
	if (!outboxResult.ok) return outboxResult;
	return ok(undefined);
}
