import { drizzleJournalsMethods } from "../../features/journals/journals.drizzle";
import { drizzleLedgerMasterMethods } from "../../features/ledger-master/ledger-master.drizzle";
import { drizzlePeriodsMethods } from "../../features/periods/periods.drizzle";
import { createDrizzleSourcePostingMethods } from "../../features/source-posting/source-posting.drizzle";
import { composeStoreSlices } from "../store/compose-slices";
import type { AccountingStore } from "../store/contract";

export type DrizzleAccountingStore = AccountingStore;

export function createDrizzleAccountingStore(): DrizzleAccountingStore {
	return composeStoreSlices(
		drizzleJournalsMethods,
		drizzlePeriodsMethods,
		drizzleLedgerMasterMethods,
		createDrizzleSourcePostingMethods({
			getJournalById: drizzleJournalsMethods.getById,
		}),
	) satisfies AccountingStore;
}
