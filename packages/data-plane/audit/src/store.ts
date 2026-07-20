import type { Result } from "@afenda/errors/result";

import type {
	AuditEntry,
	AuditExportOptions,
	AuditPurgeOptions,
	AuditQueryFilter,
	AuditQueryOptions,
	AuditWriteInput,
} from "./types";

/**
 * Persistence port for general domain audit. Production adapter: DrizzleAuditStore.
 */
export type AuditStore = {
	write(entry: AuditWriteInput): Promise<Result<AuditEntry>>;
	query(options: AuditQueryOptions): Promise<Result<AuditEntry[]>>;
	count(options: AuditQueryFilter): Promise<Result<number>>;
	export(options: AuditExportOptions): Promise<Result<string>>;
	purge(options: AuditPurgeOptions): Promise<Result<number>>;
};
