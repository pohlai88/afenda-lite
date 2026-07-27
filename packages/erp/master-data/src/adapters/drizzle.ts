/**
 * Production Drizzle adapter for `@afenda/master-data`.
 * Import from `@afenda/master-data/adapters/drizzle` — not the root barrel.
 */

export {
	type BuildPendingOutboxRecordInput,
	buildPendingOutboxRecord,
	type DrizzleAuditWrite,
	type DrizzleExecuteMasterMutationTransactionInput,
	type DrizzleIntegrationProjectionStore,
	type DrizzleMasterMutationTransactionContext,
	type DrizzleMasterMutationTransactionExecutor,
	type DrizzleTransactionalAuditFactWriter,
	type DrizzleTransactionalOutboxRecordWriter,
	prepareDrizzleAuditWrite,
} from "../capabilities/integration-projections/adapters/drizzle";
export {
	createDrizzlePlatformReferenceStore,
	DrizzlePlatformReferenceStore,
} from "../capabilities/platform-references/adapters/drizzle/drizzle-platform-reference-store";
export {
	createDrizzleMasterDataStore,
	DrizzleMasterDataStore,
} from "../drizzle-store";
