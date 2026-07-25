import { randomUUID } from "node:crypto";

import type { NeonHttpSql } from "@afenda/db";

import type {
	CorporateAdministrationAuditFact,
	CorporateAdministrationOutboxEvent,
} from "../../unit-of-work";

export function companyRegistryFactsCtes(
	sql: NeonHttpSql,
	sourceCte: "inserted" | "updated",
	audit: CorporateAdministrationAuditFact,
	outbox: CorporateAdministrationOutboxEvent,
) {
	const auditId = randomUUID();
	const source = sql.unsafe(sourceCte);
	const changesJson =
		audit.changedFields.length === 0
			? "[]"
			: JSON.stringify(
					audit.changedFields.map((field) => ({
						field,
						beforeVersion: audit.beforeVersion,
						afterVersion: audit.afterVersion,
					})),
				);
	const emittedPayload =
		audit.aggregateType === "legal_company"
			? sql`jsonb_build_object(
					'organizationId', organization_id,
					'entityType', 'legal_company',
					'entityId', id,
					'code', code,
					'version', version,
					'actorId', ${outbox.actorUserId}::text,
					'correlationId', ${outbox.correlationId}::text,
					'status', status
				)`
			: sql`${JSON.stringify(outbox.payload)}::jsonb`;
	return sql`
		audited AS (
			INSERT INTO platform_audit_log (
				id, organization_id, actor_user_id, correlation_id, module,
				entity, entity_id, action, changes
			)
			SELECT
				${auditId}::uuid,
				organization_id,
				${audit.actorUserId}::text,
				${audit.correlationId}::text,
				'corporate-administration',
				${audit.aggregateType}::text,
				${audit.aggregateId}::text,
				${audit.action}::text,
				${changesJson}::jsonb
			FROM ${source}
			RETURNING id
		),
		emitted AS (
			INSERT INTO platform_domain_event (
				id, organization_id, type, source_module, correlation_id,
				actor_user_id, payload, status, attempts
			)
			SELECT
				${outbox.id}::uuid,
				organization_id,
				${outbox.eventName}::text,
				'corporate-administration',
				${outbox.correlationId}::text,
				${outbox.actorUserId}::text,
				${emittedPayload},
				'pending',
				0
			FROM ${source}
			RETURNING id
		)
	`;
}
