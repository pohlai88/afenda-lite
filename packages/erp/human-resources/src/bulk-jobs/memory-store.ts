import { fail, ok } from "@afenda/errors/result";
import type { ReliabilityWorkItem } from "../reliability/types";
import type {
	HumanResourcesBulkExportArtifactChunk,
	HumanResourcesBulkExportJob,
	HumanResourcesBulkImportJob,
	HumanResourcesBulkImportJobRow,
	HumanResourcesBulkJobStore,
} from "./types";

const clone = <T>(value: T): T => structuredClone(value);

export function createMemoryHumanResourcesBulkJobStore(): HumanResourcesBulkJobStore & {
	listScheduledWork(): readonly ReliabilityWorkItem[];
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
		if (work.has(item.id)) return false;
		work.set(item.id, clone(item));
		return true;
	};
	return {
		listScheduledWork: () => Array.from(work.values(), clone),
		async findImportJob(input) {
			const id = importKeys.get(
				scoped(input.organizationId, input.idempotencyKey),
			);
			return ok(
				id ? clone(imports.get(id) as HumanResourcesBulkImportJob) : null,
			);
		},
		async getImportJob(input) {
			const job = imports.get(input.jobId);
			return ok(
				job?.organizationId === input.organizationId ? clone(job) : null,
			);
		},
		async createImportJob(input) {
			const key = scoped(input.job.organizationId, input.job.idempotencyKey);
			if (
				imports.has(input.job.id) ||
				importKeys.has(key) ||
				!insertWork(input.workItem)
			) {
				return fail("CONFLICT", "Bulk import job already exists");
			}
			imports.set(input.job.id, clone(input.job));
			importKeys.set(key, input.job.id);
			rows.set(input.job.id, clone([...input.rows]));
			return ok(clone(input.job));
		},
		async listImportRows(input) {
			const job = imports.get(input.jobId);
			return job?.organizationId === input.organizationId
				? ok(clone(rows.get(input.jobId) ?? []))
				: ok([]);
		},
		async commitImportJob(input) {
			const current = imports.get(input.job.id);
			if (
				!current ||
				current.organizationId !== input.job.organizationId ||
				current.version !== input.expectedVersion ||
				input.job.version !== input.expectedVersion + 1
			) {
				return fail("CONFLICT", "Bulk import job version changed");
			}
			for (const item of [input.successorWorkItem, input.cleanupWorkItem]) {
				if (item && work.has(item.id))
					return fail("CONFLICT", "Bulk work already exists");
			}
			imports.set(input.job.id, clone(input.job));
			if (input.successorWorkItem) insertWork(input.successorWorkItem);
			if (input.cleanupWorkItem) insertWork(input.cleanupWorkItem);
			return ok(clone(input.job));
		},
		async purgeImportPayload(input) {
			const job = imports.get(input.jobId);
			if (!job || job.organizationId !== input.organizationId)
				return fail("NOT_FOUND", "Bulk import job not found");
			rows.set(
				input.jobId,
				(rows.get(input.jobId) ?? []).map((row) => ({ ...row, payload: null })),
			);
			const updated = {
				...job,
				version: job.version + 1,
				payloadPurgedAt: input.now,
				updatedAt: input.now,
			};
			imports.set(job.id, clone(updated));
			return ok(clone(updated));
		},
		async findExportJob(input) {
			const id = exportKeys.get(
				scoped(input.organizationId, input.idempotencyKey),
			);
			return ok(
				id ? clone(exports.get(id) as HumanResourcesBulkExportJob) : null,
			);
		},
		async getExportJob(input) {
			const job = exports.get(input.jobId);
			return ok(
				job?.organizationId === input.organizationId ? clone(job) : null,
			);
		},
		async createExportJob(input) {
			const key = scoped(input.job.organizationId, input.job.idempotencyKey);
			if (
				exports.has(input.job.id) ||
				exportKeys.has(key) ||
				!insertWork(input.workItem)
			)
				return fail("CONFLICT", "Bulk export job already exists");
			exports.set(input.job.id, clone(input.job));
			exportKeys.set(key, input.job.id);
			return ok(clone(input.job));
		},
		async completeExportJob(input) {
			const current = exports.get(input.job.id);
			if (
				!current ||
				current.organizationId !== input.job.organizationId ||
				current.version !== input.expectedVersion ||
				input.job.version !== input.expectedVersion + 1 ||
				work.has(input.cleanupWorkItem.id)
			)
				return fail("CONFLICT", "Bulk export job version changed");
			exports.set(input.job.id, clone(input.job));
			chunks.set(input.job.id, clone([...input.chunks]));
			insertWork(input.cleanupWorkItem);
			return ok(clone(input.job));
		},
		async loadExportArtifact(input) {
			const job = exports.get(input.jobId);
			if (!job || job.organizationId !== input.organizationId) return ok(null);
			return ok({
				job: clone(job),
				content: (chunks.get(job.id) ?? [])
					.sort((a, b) => a.chunkIndex - b.chunkIndex)
					.map((chunk) => chunk.content)
					.join(""),
			});
		},
		async purgeExportArtifact(input) {
			const job = exports.get(input.jobId);
			if (!job || job.organizationId !== input.organizationId)
				return fail("NOT_FOUND", "Bulk export job not found");
			chunks.delete(job.id);
			const updated = {
				...job,
				version: job.version + 1,
				artifactPurgedAt: input.now,
				updatedAt: input.now,
			};
			exports.set(job.id, clone(updated));
			return ok(clone(updated));
		},
	};
}
