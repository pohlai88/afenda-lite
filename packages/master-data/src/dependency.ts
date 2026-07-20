import type { DependencyInspector, MasterDependency } from "./types";

/** Default inspector — no blockers until product modules register adapters. */
export function createEmptyDependencyInspector(): DependencyInspector {
	return {
		async listBlockers(_input: {
			organizationId: string;
			entityType:
				| "party"
				| "item"
				| "item_group"
				| "warehouse"
				| "payment_term";
			entityId: string;
		}): Promise<MasterDependency[]> {
			return [];
		},
	};
}
