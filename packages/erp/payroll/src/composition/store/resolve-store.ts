import { createDrizzlePayrollStore } from "../adapters/drizzle";
import type { PayrollStore } from "./contract";

export function resolvePayrollStore(store?: PayrollStore): PayrollStore {
	return store ?? createDrizzlePayrollStore();
}
