import type {
	MasterMutationOperationId,
	MasterMutationTransactionContext,
	MasterMutationTransactionExecutor,
} from "./integration/mutation-transaction";
import type { SearchProjectionPort } from "./integration/search-projectors";

export type {
	MasterMutationOperationId,
	MasterMutationTransactionContext,
	MasterMutationTransactionExecutor,
} from "./integration/mutation-transaction";
export type {
	MasterSearchProjector,
	SearchProjectionDecision,
	SearchProjectionIgnoreReason,
	SearchProjectionPort,
	SearchProjectionRemoveOutcome,
	SearchProjectionUpsertOutcome,
} from "./integration/search-projectors";

export type MasterDataIntegrationProjectionPorts = Readonly<{
	mutationTransactions: MasterMutationTransactionExecutor;
	searchProjection: SearchProjectionPort;
}>;

export type MasterDataIntegrationTransactionBoundary = Readonly<{
	operationId: MasterMutationOperationId;
	context: MasterMutationTransactionContext;
}>;
