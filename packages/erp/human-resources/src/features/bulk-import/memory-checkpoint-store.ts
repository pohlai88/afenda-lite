import { errorResult } from "@afenda/errors";
import { renderBulkErrorFile } from "./error-file";
import type {
	BulkAuditEvent,
	BulkCheckpoint,
	BulkCheckpointPort,
	BulkErrorArtifact,
} from "./types";

function runSynchronousMemoryOperation<T>(operation: () => T): Promise<T> {
	try {
		return Promise.resolve(operation());
	} catch (error) {
		return Promise.reject(error);
	}
}

export function createMemoryBulkCheckpointPort<
	Output = unknown,
>(): BulkCheckpointPort<Output> {
	const values = new Map<string, BulkCheckpoint<Output>>();
	const auditEvents = new Map<string, readonly BulkAuditEvent[]>();
	const errorArtifacts = new Map<string, BulkErrorArtifact>();
	return {
		load(input) {
			return runSynchronousMemoryOperation(() =>
				errorResult.ok(
					values.get(`${input.organizationId}:${input.idempotencyKey}`) ?? null,
				),
			);
		},
		save(input) {
			return runSynchronousMemoryOperation(() => {
				const key = `${input.checkpoint.organizationId}:${input.checkpoint.idempotencyKey}`;
				const currentVersion = values.get(key)?.version ?? null;
				if (currentVersion !== input.expectedVersion) {
					return errorResult.fail("CONFLICT", {
						publicMessage: "The request conflicts with current state",
					});
				}
				if (input.checkpoint.version !== (currentVersion ?? 0) + 1) {
					return errorResult.fail("CONFLICT", {
						publicMessage: "The request conflicts with current state",
					});
				}
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
				return errorResult.ok(input.checkpoint);
			});
		},
		listAuditEvents(input) {
			return runSynchronousMemoryOperation(() =>
				errorResult.ok(
					structuredClone(
						auditEvents.get(
							`${input.organizationId}:${input.idempotencyKey}`,
						) ?? [],
					),
				),
			);
		},
		loadLatestErrorArtifact(input) {
			return runSynchronousMemoryOperation(() => {
				const artifact = errorArtifacts.get(
					`${input.organizationId}:${input.idempotencyKey}`,
				);
				return errorResult.ok(artifact ? structuredClone(artifact) : null);
			});
		},
	};
}
