import type { HumanResourcesRecruitmentStore } from "../recruitment/store-contract";
import type { HumanResourcesWorkforcePlanningStore } from "./store-contract";

export type HumanResourcesWorkforcePlanningCapabilityStore =
	HumanResourcesWorkforcePlanningStore &
		Pick<HumanResourcesRecruitmentStore, "getRequisitionById">;
