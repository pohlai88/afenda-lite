import {
	buildTransactionalAuditInsert,
	prepareAuditWrite,
	type RecordAuditCommand,
} from "@afenda/audit";
import type { NeonHttpSql } from "@afenda/db";
import { errorResult, type Result } from "@afenda/errors";
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
const AUTHORITATIVE_AUDIT_METADATA_KEYS: ReadonlySet<string> = new Set([
	"causation_id",
	"occurred_at",
	"outcome",
]);

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
			const safeMetadata = Object.fromEntries(
				Object.entries(parsed.safeMetadata ?? {}).filter(
					([key]) => !AUTHORITATIVE_AUDIT_METADATA_KEYS.has(key),
				),
			);
			const auditInput = {
				organizationId: parsed.organizationId,
				actorUserId: parsed.actorUserId,
				correlationId: parsed.correlationId,
				module: CORPORATE_ADMINISTRATION_AUDIT_MODULE,
				entity: parsed.targetType,
				entityId: parsed.targetId,
				action: parsed.operationType,
				eventContext: {
					version: 1,
					outcome: parsed.outcome === "SUCCESS" ? "SUCCEEDED" : "FAILED",
					source: CORPORATE_ADMINISTRATION_AUDIT_MODULE,
					occurredAt: new Date(parsed.occurredAt),
					causationId: parsed.causationId ?? null,
					reasonCode: null,
				},
				changes: [],
				oldValue: null,
				newValue: null,
				metadata: Object.keys(safeMetadata).length === 0 ? null : safeMetadata,
			} satisfies RecordAuditCommand;

			if (options?.transaction !== undefined) {
				options.transaction.enqueue((database) => {
					const sql = database as NeonHttpSql;
					const insert = buildTransactionalAuditInsert({
						id: auditId,
						input: auditInput,
						sql,
					});
					if (!insert.ok) {
						throw new TypeError(
							"Corporate Administration produced an invalid transactional audit fact",
						);
					}
					return insert.data;
				});
				return errorResult.ok({ id: auditId });
			}

			try {
				const prepared = prepareAuditWrite(auditInput);
				if (!prepared.ok) {
					return errorResult.fail("INTERNAL_ERROR");
				}
				const result = await dependencies.store.write(prepared.data);
				if (!result.ok) {
					if (result.code !== "SERVICE_UNAVAILABLE") {
						return errorResult.fail("INTERNAL_ERROR");
					}
					return errorResult.fail("SERVICE_UNAVAILABLE");
				}
				return errorResult.ok({ id: result.data.id });
			} catch (error) {
				const translated =
					translateCorporateAdministrationInfrastructureError(error);
				if (translated !== undefined) {
					return translated;
				}
				throw error;
			}
		},
	};
}
