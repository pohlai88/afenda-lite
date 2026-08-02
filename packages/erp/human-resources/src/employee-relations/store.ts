import type { HumanResourcesEmployeeRelationsStore } from "../store/employee-relations";
import type { HumanResourcesIdentityStore } from "../store/identity";
import type { HumanResourcesLeaveStore } from "../store/leave";

export type HumanResourcesEmployeeRelationsCapabilityStore =
	HumanResourcesEmployeeRelationsStore &
		Pick<HumanResourcesIdentityStore, "getUserEmployeeMapping"> &
		Pick<HumanResourcesLeaveStore, "getPrimaryManagerForEmployee">;

export type HumanResourcesEmployeeRelationsCaseAccessStore = Pick<
	HumanResourcesEmployeeRelationsCapabilityStore,
	"getUserEmployeeMapping" | "getPrimaryManagerForEmployee"
>;

export type HumanResourcesEmployeeRelationsStoreMethod =
	keyof HumanResourcesEmployeeRelationsCapabilityStore;

export type HumanResourcesEmployeeRelationsStoreProjection<
	TMethods extends readonly HumanResourcesEmployeeRelationsStoreMethod[],
> = Pick<HumanResourcesEmployeeRelationsCapabilityStore, TMethods[number]>;

export function projectEmployeeRelationsStore<
	const TMethods extends readonly HumanResourcesEmployeeRelationsStoreMethod[],
>(
	store: HumanResourcesEmployeeRelationsCapabilityStore,
	_methods: TMethods,
): HumanResourcesEmployeeRelationsStoreProjection<TMethods> {
	return store;
}
