import { fail, ok } from "@afenda/errors/result";
import { renderBulkErrorFile } from "./error-file";
import type {
	BulkAuditEvent,
	BulkCheckpoint,
	BulkCheckpointPort,
	BulkErrorArtifact,
} from "./types";

export function createMemoryBulkCheckpointPort<
	Output = unknown,
>(): BulkCheckpointPort<Output> {
	const values = new Map<string, BulkCheckpoint<Output>>();
	const auditEvents = new Map<string, readonly BulkAuditEvent[]>();
	const errorArtifacts = new Map<string, BulkErrorArtifact>();
	return {
		async load(input) {
			return ok(
				values.get(`${input.organizationId}:${input.idempotencyKey}`) ?? null,
			);
		},
		async save(input) {
			const key = `${input.checkpoint.organizationId}:${input.checkpoint.idempotencyKey}`;
			const currentVersion = values.get(key)?.version ?? null;
			if (currentVersion !== input.expectedVersion)
				return fail("CONFLICT", "Bulk checkpoint version changed");
			if (input.checkpoint.version !== (currentVersion ?? 0) + 1)
				return fail("CONFLICT", "Bulk checkpoint version is not sequential");
			values.set(key, input.checkpoint);
			auditEvents.set(key, structuredClone(input.checkpoint.auditTrail));
			const errorFile = renderBulkErrorFile(input.checkpoint.rows);
			if (errorFile !== null) {
				errorArtifacts.set(key, {
					organizationId: input.checkpoint.organizationId,
					batchId: input.checkpoint.batchId,
					checkpointVersion: input.checkpoint.version,
					contentType: "text/csv",
					content: errorFile,
				});
			}
			return ok(input.checkpoint);
		},
		async listAuditEvents(input) {
			return ok(
				structuredClone(
					auditEvents.get(`${input.organizationId}:${input.idempotencyKey}`) ??
						[],
				),
			);
		},
		async loadLatestErrorArtifact(input) {
			const artifact = errorArtifacts.get(
				`${input.organizationId}:${input.idempotencyKey}`,
			);
			return ok(artifact ? structuredClone(artifact) : null);
		},
	};
}
