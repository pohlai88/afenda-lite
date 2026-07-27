import type { NeonHttpSql } from "@afenda/db";
import { fail, ok, type Result } from "@afenda/errors/result";

import { corporateAdministrationErrorDetails } from "../../error-codes";
import type {
	CorporateAdministrationAuditFactInput,
	CorporateAdministrationAuditFactPort,
	CorporateAdministrationTransactionContext,
} from "../../ports";
import { corporateAdministrationAuditFactInputSchema } from "../../ports";
import type { CorporateAdministrationAuditWriter } from "./dependencies";
import { translateCorporateAdministrationInfrastructureError } from "./errors";

const CORPORATE_ADMINISTRATION_AUDIT_MODULE =
	"corporate-administration" as const;

export type CorporateAdministrationDrizzleAuditDependencies = Readonly<{
	store: CorporateAdministrationAuditWriter;
	createAuditId: () => string;
}>;

export function createDrizzleCorporateAdministrationAuditFactPort(
	dependencies: CorporateAdministrationDrizzleAuditDependencies,
): CorporateAdministrationAuditFactPort {
	return {
		async record(
			input: CorporateAdministrationAuditFactInput,
			options?: Readonly<{
				transaction?: CorporateAdministrationTransactionContext;
			}>,
		): Promise<Result<{ id: string }>> {
			const parsed = corporateAdministrationAuditFactInputSchema.parse(input);
			const auditId = dependencies.createAuditId();
			const metadata = {
				...(parsed.safeMetadata ?? {}),
				outcome: parsed.outcome,
				...(parsed.causationId === undefined
					? {}
					: { causation_id: parsed.causationId }),
			};

			if (options?.transaction !== undefined) {
				options.transaction.enqueue((database) => {
					const sql = database as NeonHttpSql;
					return sql`
						INSERT INTO platform_audit_log (
							id,
							organization_id,
							actor_user_id,
							correlation_id,
							module,
							entity,
							entity_id,
							action,
							changes,
							old_value,
							new_value,
							metadata,
							created_at
						)
						VALUES (
							${auditId},
							${parsed.organizationId},
							${parsed.actorUserId},
							${parsed.correlationId},
							${CORPORATE_ADMINISTRATION_AUDIT_MODULE},
							${parsed.targetType},
							${parsed.targetId},
							${parsed.operationType},
							${JSON.stringify([])}::jsonb,
							NULL,
							NULL,
							${JSON.stringify(metadata)}::jsonb,
							${parsed.occurredAt}
						)
					`;
				});
				return ok({ id: auditId });
			}

			try {
				const result = await dependencies.store.write({
					organizationId: parsed.organizationId,
					actorUserId: parsed.actorUserId,
					correlationId: parsed.correlationId,
					module: CORPORATE_ADMINISTRATION_AUDIT_MODULE,
					entity: parsed.targetType,
					entityId: parsed.targetId,
					action: parsed.operationType,
					changes: [],
					oldValue: null,
					newValue: null,
					metadata,
					createdAt: new Date(parsed.occurredAt),
				});
				if (!result.ok) {
					if (result.code !== "SERVICE_UNAVAILABLE") {
						return fail(
							"INTERNAL_ERROR",
							"Unexpected Corporate Administration audit persistence failure.",
						);
					}
					return fail(
						"SERVICE_UNAVAILABLE",
						"Corporate Administration audit persistence is unavailable.",
						corporateAdministrationErrorDetails(
							"CORPORATE_ADMINISTRATION_EXTERNAL_DEPENDENCY_UNAVAILABLE",
							{ field: "audit" },
						),
					);
				}
				return ok({ id: result.data.id });
			} catch (error) {
				const translated =
					translateCorporateAdministrationInfrastructureError(error);
				if (translated !== undefined) return translated;
				throw error;
			}
		},
	};
}
