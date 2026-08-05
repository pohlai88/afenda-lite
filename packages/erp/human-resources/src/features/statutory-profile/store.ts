import type { HumanResourcesCoreStore } from "../workforce-records/employment/store-contract";
import type { HumanResourcesStatutoryProfileStore } from "./store-contract";

export type HumanResourcesStatutoryProfileCapabilityStore =
	HumanResourcesStatutoryProfileStore &
		Pick<HumanResourcesCoreStore, "getEmployeeById">;
