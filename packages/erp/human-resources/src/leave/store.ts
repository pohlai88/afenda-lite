import type { HumanResourcesCoreStore } from "../store/core";
import type { HumanResourcesLeaveStore } from "../store/leave";

export type HumanResourcesLeaveCapabilityStore = HumanResourcesLeaveStore &
	Pick<HumanResourcesCoreStore, "getEmploymentById">;
