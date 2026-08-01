import { createDrizzlePayrollStore } from "./adapters/drizzle/store";
import type { PayrollStore } from "./store";

export function resolvePayrollStore(store?: PayrollStore): PayrollStore {
	return store ?? createDrizzlePayrollStore();
}
