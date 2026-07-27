import type { MasterDataAuditFact } from "../../integration/audit-facts";
import type {
	ExecuteMasterMutationTransactionInput,
	MasterMutationTransactionContext,
	MasterMutationTransactionExecutor,
} from "../../integration/mutation-transaction";
import type { MasterDataOutboxRecord } from "../../integration/outbox-record";

export type DrizzleMasterMutationTransactionContext =
	MasterMutationTransactionContext;

export type DrizzleExecuteMasterMutationTransactionInput<T> =
	ExecuteMasterMutationTransactionInput<T>;

export interface DrizzleMasterMutationTransactionExecutor
	extends MasterMutationTransactionExecutor {}

export interface DrizzleTransactionalAuditFactWriter {
	insert(fact: MasterDataAuditFact): Promise<void>;
}

export interface DrizzleTransactionalOutboxRecordWriter {
	insert(record: MasterDataOutboxRecord): Promise<void>;
}
