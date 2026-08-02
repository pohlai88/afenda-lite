import type { HumanResourcesRecruitmentStore } from "../recruitment/store-contract";
import type { HumanResourcesHireOrchestrationStore } from "./store-contract";

export type HumanResourcesHireOrchestrationCapabilityStore =
	HumanResourcesHireOrchestrationStore &
		Pick<HumanResourcesRecruitmentStore, "getApplicationById">;
