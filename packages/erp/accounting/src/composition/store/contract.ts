import type { AccountingJournalsStore } from "../../features/journals/journals.store";
import type { AccountingLedgerMasterStore } from "../../features/ledger-master/ledger-master.store";
import type { AccountingPeriodsStore } from "../../features/periods/periods.store";
import type { AccountingSourcePostingStore } from "../../features/source-posting/source-posting.store";

export type { AccountingJournalsStore } from "../../features/journals/journals.store";
export type { AccountingLedgerMasterStore } from "../../features/ledger-master/ledger-master.store";
export type { AccountingPeriodsStore } from "../../features/periods/periods.store";
export type { AccountingSourcePostingStore } from "../../features/source-posting/source-posting.store";

/** Composite package store: the intersection of every feature store slice. */
export type AccountingStore = AccountingJournalsStore &
	AccountingPeriodsStore &
	AccountingLedgerMasterStore &
	AccountingSourcePostingStore;
