import type { Result } from "@afenda/errors";

import type {
	AuditCursorQueryOptions,
	AuditEntry,
	AuditPurgeOptions,
	AuditQueryFilter,
	AuditQueryOptions,
	AuditWriteInput,
} from "./types";

/**
 * Persistence port for general domain audit. Production adapter: DrizzleAuditStore.
 */
export interface AuditStore {
	count: (options: AuditQueryFilter) => Promise<Result<number>>;
	purge: (options: AuditPurgeOptions) => Promise<Result<number>>;
	query: (options: AuditQueryOptions) => Promise<Result<AuditEntry[]>>;
	queryCursor: (
		options: AuditCursorQueryOptions,
	) => Promise<Result<AuditEntry[]>>;
	write: (entry: AuditWriteInput) => Promise<Result<AuditEntry>>;
}
