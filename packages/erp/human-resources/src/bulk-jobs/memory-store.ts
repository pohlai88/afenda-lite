import { errorResult } from "@afenda/errors";
import type { ReliabilityWorkItem } from "../reliability/types";
import type {
	HumanResourcesBulkExportArtifactChunk,
	HumanResourcesBulkExportJob,
	HumanResourcesBulkImportJob,
	HumanResourcesBulkImportJobRow,
	HumanResourcesBulkJobStore,
} from "./types";

const clone = <T>(value: T): T => structuredClone(value);

function runSynchronousMemoryOperation<T>(operation: () => T): Promise<T> {
	try {
		return Promise.resolve(operation());
	} catch (error) {
		return Promise.reject(error);
	}
}

export function createMemoryHumanResourcesBulkJobStore(): HumanResourcesBulkJobStore & {
	listScheduledWork: () => readonly ReliabilityWorkItem[];
} {
	const imports = new Map<string, HumanResourcesBulkImportJob>();
	const importKeys = new Map<string, string>();
	const rows = new Map<string, HumanResourcesBulkImportJobRow[]>();
	const exports = new Map<string, HumanResourcesBulkExportJob>();
	const exportKeys = new Map<string, string>();
	const chunks = new Map<string, HumanResourcesBulkExportArtifactChunk[]>();
	const work = new Map<string, ReliabilityWorkItem>();
	const scoped = (organizationId: string, value: string) =>
		`${organizationId}:${value}`;
	const insertWork = (item: ReliabilityWorkItem) => {
		if (work.has(item.id)) {
			return false;
		}
		work.set(item.id, clone(item));
		return true;
	};
	return {
		listScheduledWork: () => Array.from(work.values(), clone),
		findImportJob(input) {
			return runSynchronousMemoryOperation(() => {
				const id = importKeys.get(
					scoped(input.organizationId, input.idempotencyKey),
				);
				const job = id === undefined ? undefined : imports.get(id);
				return errorResult.ok(job === undefined ? null : clone(job));
			});
		},
		getImportJob(input) {
			return runSynchronousMemoryOperation(() => {
				const job = imports.get(input.jobId);
				return errorResult.ok(
					job?.organizationId === input.organizationId ? clone(job) : null,
				);
			});
		},
		createImportJob(input) {
			return runSynchronousMemoryOperation(() => {
				const key = scoped(input.job.organizationId, input.job.idempotencyKey);
				if (
					imports.has(input.job.id) ||
					importKeys.has(key) ||
					!insertWork(input.workItem)
				) {
					return errorResult.fail("CONFLICT", {
						publicMessage: "The request conflicts with current state",
					});
				}
				imports.set(input.job.id, clone(input.job));
				importKeys.set(key, input.job.id);
				rows.set(input.job.id, clone([...input.rows]));
				return errorResult.ok(clone(input.job));
			});
		},
		listImportRows(input) {
			return runSynchronousMemoryOperation(() => {
				const job = imports.get(input.jobId);
				return job?.organizationId === input.organizationId
					? errorResult.ok(clone(rows.get(input.jobId) ?? []))
					: errorResult.ok([]);
			});
		},
		commitImportJob(input) {
			return runSynchronousMemoryOperation(() => {
				const current = imports.get(input.job.id);
				if (
					!current ||
					current.organizationId !== input.job.organizationId ||
					current.version !== input.expectedVersion ||
					input.job.version !== input.expectedVersion + 1
				) {
					return errorResult.fail("CONFLICT", {
						publicMessage: "The request conflicts with current state",
					});
				}
				for (const item of [input.successorWorkItem, input.cleanupWorkItem]) {
					if (item && work.has(item.id)) {
						return errorResult.fail("CONFLICT", {
							publicMessage: "The request conflicts with current state",
						});
					}
				}
				imports.set(input.job.id, clone(input.job));
				if (input.successorWorkItem) {
					insertWork(input.successorWorkItem);
				}
				if (input.cleanupWorkItem) {
					insertWork(input.cleanupWorkItem);
				}
				return errorResult.ok(clone(input.job));
			});
		},
		purgeImportPayload(input) {
			return runSynchronousMemoryOperation(() => {
				const job = imports.get(input.jobId);
				if (!job || job.organizationId !== input.organizationId) {
					return errorResult.fail("NOT_FOUND", {
						publicMessage: "The requested resource was not found",
					});
				}
				rows.set(
					input.jobId,
					(rows.get(input.jobId) ?? []).map((row) => ({
						...row,
						payload: null,
					})),
				);
				const updated = {
					...job,
					version: job.version + 1,
					payloadPurgedAt: input.now,
					updatedAt: input.now,
				};
				imports.set(job.id, clone(updated));
				return errorResult.ok(clone(updated));
			});
		},
		findExportJob(input) {
			return runSynchronousMemoryOperation(() => {
				const id = exportKeys.get(
					scoped(input.organizationId, input.idempotencyKey),
				);
				const job = id === undefined ? undefined : exports.get(id);
				return errorResult.ok(job === undefined ? null : clone(job));
			});
		},
		getExportJob(input) {
			return runSynchronousMemoryOperation(() => {
				const job = exports.get(input.jobId);
				return errorResult.ok(
					job?.organizationId === input.organizationId ? clone(job) : null,
				);
			});
		},
		createExportJob(input) {
			return runSynchronousMemoryOperation(() => {
				const key = scoped(input.job.organizationId, input.job.idempotencyKey);
				if (
					exports.has(input.job.id) ||
					exportKeys.has(key) ||
					!insertWork(input.workItem)
				) {
					return errorResult.fail("CONFLICT", {
						publicMessage: "The request conflicts with current state",
					});
				}
				exports.set(input.job.id, clone(input.job));
				exportKeys.set(key, input.job.id);
				return errorResult.ok(clone(input.job));
			});
		},
		completeExportJob(input) {
			return runSynchronousMemoryOperation(() => {
				const current = exports.get(input.job.id);
				if (
					!current ||
					current.organizationId !== input.job.organizationId ||
					current.version !== input.expectedVersion ||
					input.job.version !== input.expectedVersion + 1 ||
					work.has(input.cleanupWorkItem.id)
				) {
					return errorResult.fail("CONFLICT", {
						publicMessage: "The request conflicts with current state",
					});
				}
				exports.set(input.job.id, clone(input.job));
				chunks.set(input.job.id, clone([...input.chunks]));
				insertWork(input.cleanupWorkItem);
				return errorResult.ok(clone(input.job));
			});
		},
		loadExportArtifact(input) {
			return runSynchronousMemoryOperation(() => {
				const job = exports.get(input.jobId);
				if (!job || job.organizationId !== input.organizationId) {
					return errorResult.ok(null);
				}
				return errorResult.ok({
					job: clone(job),
					content: (chunks.get(job.id) ?? [])
						.sort((a, b) => a.chunkIndex - b.chunkIndex)
						.map((chunk) => chunk.content)
						.join(""),
				});
			});
		},
		purgeExportArtifact(input) {
			return runSynchronousMemoryOperation(() => {
				const job = exports.get(input.jobId);
				if (!job || job.organizationId !== input.organizationId) {
					return errorResult.fail("NOT_FOUND", {
						publicMessage: "The requested resource was not found",
					});
				}
				chunks.delete(job.id);
				const updated = {
					...job,
					version: job.version + 1,
					artifactPurgedAt: input.now,
					updatedAt: input.now,
				};
				exports.set(job.id, clone(updated));
				return errorResult.ok(clone(updated));
			});
		},
	};
}
