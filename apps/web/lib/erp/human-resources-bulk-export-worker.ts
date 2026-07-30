import { randomUUID } from "node:crypto";

import { type AuditRecorder, createAuditRecorder } from "@afenda/audit";
import { fail, ok, type Result } from "@afenda/errors/result";
import {
	type HumanResourcesAuthorizationPort,
	type HumanResourcesBulkExportPorts,
	type HumanResourcesBulkExportResult,
	runHumanResourcesBulkExport,
} from "@afenda/human-resources";

import { createHumanResourcesAuthorizationPort } from "@/lib/erp/human-resources-authorization-port";
import {
	createHumanResourcesBulkExportSource,
	getHumanResourcesBulkExportDefinition,
	type HumanResourcesBulkExportType,
} from "@/lib/erp/human-resources-bulk-export-registry";

export interface HumanResourcesBulkExportWorkerInput {
	actorUserId: string;
	correlationId: string;
	dateFrom?: string;
	dateTo?: string;
	effectiveOn?: string;
	exportType: HumanResourcesBulkExportType;
	organizationId: string;
	requestedFields: readonly string[];
}

export function createHumanResourcesBulkExportPorts(
	dependencies: {
		authorization?: HumanResourcesAuthorizationPort;
		audit?: AuditRecorder;
		createEvidenceId?: () => string;
	} = {},
): HumanResourcesBulkExportPorts {
	const authorization =
		dependencies.authorization ?? createHumanResourcesAuthorizationPort();
	const audit = dependencies.audit ?? createAuditRecorder();
	const createEvidenceId = dependencies.createEvidenceId ?? randomUUID;
	return {
		authorize(input) {
			return authorization.can(input);
		},
		async recordPrivacyEvidence(input) {
			const evidenceId = createEvidenceId();
			const recorded = await audit.record({
				organizationId: input.organizationId,
				actorUserId: input.actorUserId,
				correlationId: input.correlationId,
				module: "privacy",
				entity: "human_resources_bulk_export",
				entityId: evidenceId,
				action: "EXPORT",
				metadata: {
					sourceModuleId: "human-resources",
					exportType: input.exportType,
					fields: input.fields,
					rowCount: input.rowCount,
					dateFrom: input.dateFrom,
					dateTo: input.dateTo,
					effectiveOn: input.effectiveOn,
				},
			});
			if (!recorded.ok) {
				return recorded;
			}
			if (recorded.data.organizationId !== input.organizationId) {
				return fail(
					"INTERNAL_ERROR",
					"Privacy evidence crossed the tenant boundary",
				);
			}
			return ok({ evidenceId });
		},
	};
}

export function runHumanResourcesBulkExportWorker(
	input: HumanResourcesBulkExportWorkerInput,
): Promise<Result<HumanResourcesBulkExportResult>> {
	const definition = getHumanResourcesBulkExportDefinition(input.exportType);
	return runHumanResourcesBulkExport(
		{
			...input,
			requiredPermission: definition.requiredPermission,
		},
		definition,
		createHumanResourcesBulkExportSource(input.exportType),
		createHumanResourcesBulkExportPorts(),
	);
}
