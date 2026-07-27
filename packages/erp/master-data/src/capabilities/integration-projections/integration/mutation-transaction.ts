import type { Result } from "@afenda/errors/result";

import type { MasterDataAuditFact, MutationCommit } from "./audit-facts";
import type { MasterDataEventEnvelope } from "./event-envelope";

export const MASTER_MUTATION_OPERATION_IDS = [
	"party.create",
	"party.update",
	"party.lifecycle",
	"party.merge",
	"item.create",
	"item.update",
	"item.lifecycle",
	"warehouse.create",
	"warehouse.update",
	"warehouse.lifecycle",
	"extension.mutate",
	"change_request.transition",
	"import_row.apply",
	"canonical_identity.change",
] as const;

export type MasterMutationOperationId =
	(typeof MASTER_MUTATION_OPERATION_IDS)[number];

export const MASTER_PRODUCTION_MUTATION_SEQUENCE = [
	"authorize_command",
	"parse_and_normalize_input",
	"begin_authoritative_mutation_transaction",
	"load_target_under_tenant_scope",
	"verify_expected_version",
	"verify_lifecycle_and_business_invariants",
	"mutate_entity",
	"insert_audit_fact",
	"insert_domain_event_outbox_record",
	"commit",
	"return_result",
	"asynchronously_project_search",
] as const;

export type MasterProductionMutationStep =
	(typeof MASTER_PRODUCTION_MUTATION_SEQUENCE)[number];

/**
 * Capabilities bound to the currently active master-data transaction.
 *
 * Both append methods reject on persistence failure. A rejection must abort
 * and roll back the master mutation, audit facts, and outbox events together.
 *
 * Concrete implementations should prevent this context from being used after
 * the transaction callback has completed.
 */
export type MasterMutationTransactionContext = Readonly<{
	appendAuditFact(fact: MasterDataAuditFact): Promise<void>;
	appendEvent(event: MasterDataEventEnvelope): Promise<void>;
}>;

export type ExecuteMasterMutationTransactionInput<T> = Readonly<{
	/**
	 * Governed operation family used for diagnostics and transaction tracing.
	 */
	operationId: MasterMutationOperationId;
	/**
	 * Executes the authoritative mutation inside the active transaction.
	 *
	 * Returning a failed Result must roll back the transaction. Throwing or
	 * rejecting must also roll back the transaction.
	 */
	execute(context: MasterMutationTransactionContext): Promise<Result<T>>;
}>;

/**
 * Executes a master-data mutation, audit writes, and outbox writes atomically.
 *
 * Implementations must derive `MutationCommit.auditIds` and
 * `MutationCommit.eventIds` from records successfully appended inside the
 * active transaction, in append order. Rolled-back records must never be
 * returned.
 */
export interface MasterMutationTransactionExecutor {
	execute<T>(
		input: ExecuteMasterMutationTransactionInput<T>,
	): Promise<Result<MutationCommit<T>>>;
}
