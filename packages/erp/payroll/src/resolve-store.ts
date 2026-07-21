import { MemoryPayrollStore } from "./memory-store";
import type { PayrollStore } from "./store";

export function resolvePayrollStore(store?: PayrollStore): PayrollStore {
	return store ?? new MemoryPayrollStore();
}
