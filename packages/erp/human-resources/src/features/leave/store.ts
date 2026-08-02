import type { HumanResourcesCoreStore } from "../workforce-records/employment/store-contract";
import type { HumanResourcesLeaveStore } from "./store-contract";

export type HumanResourcesLeaveCapabilityStore = HumanResourcesLeaveStore &
	Pick<HumanResourcesCoreStore, "getEmploymentById">;
