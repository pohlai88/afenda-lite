import { composeStoreSlices } from "../composition/store/compose-slices";
import type { AccountingStore } from "../composition/store/contract";
import { createMemoryJournalsMethods } from "../features/journals/journals.memory";
import { createMemoryLedgerMasterMethods } from "../features/ledger-master/ledger-master.memory";
import { createMemoryPeriodsMethods } from "../features/periods/periods.memory";
import { createMemorySourcePostingMethods } from "../features/source-posting/source-posting.memory";
import { createMemoryAccountingState } from "../kernel/memory/state";

/** Deterministic contract-test adapter mirroring domain behavior. */
export function createMemoryStore(): AccountingStore {
	const state = createMemoryAccountingState();
	return composeStoreSlices(
		createMemoryJournalsMethods(state),
		createMemoryPeriodsMethods(state),
		createMemoryLedgerMasterMethods(state),
		createMemorySourcePostingMethods(state),
	) satisfies AccountingStore;
}
