import type { SalesStore } from "../../kernel/contracts/ports";
import { createDrizzleSalesStore } from "../adapters/drizzle";
export function resolveSalesStore(store?: SalesStore): SalesStore {
	return store ?? createDrizzleSalesStore();
}
