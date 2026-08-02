import type { PayablesAllocationsStore } from "../../features/allocations/allocations.store";
import type { PayablesCreditNotesStore } from "../../features/credit-notes/credit-notes.store";
import type { PayablesInvoiceLifecycleStore } from "../../features/invoice-lifecycle/invoice-lifecycle.store";
import type { PayablesSupplierBalanceStore } from "../../features/supplier-balance/supplier-balance.store";

export type { PayablesAllocationsStore } from "../../features/allocations/allocations.store";
export type { PayablesCreditNotesStore } from "../../features/credit-notes/credit-notes.store";
export type { PayablesInvoiceLifecycleStore } from "../../features/invoice-lifecycle/invoice-lifecycle.store";
export type { PayablesSupplierBalanceStore } from "../../features/supplier-balance/supplier-balance.store";

/** Composite package store: the intersection of every feature store slice. */
export type PayablesStore = PayablesInvoiceLifecycleStore &
	PayablesCreditNotesStore &
	PayablesAllocationsStore &
	PayablesSupplierBalanceStore;
