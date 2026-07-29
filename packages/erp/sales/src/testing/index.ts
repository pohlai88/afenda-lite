export { createMemorySalesStore, MemorySalesStore } from "./memory-sales-store";
export function allowAllSalesAuthorization() {
	return { can: async () => true as const };
}
