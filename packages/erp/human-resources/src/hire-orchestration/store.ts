import type { HumanResourcesHireOrchestrationStore } from "../store/hire-orchestration";
import type { HumanResourcesRecruitmentStore } from "../store/recruitment";

export type HumanResourcesHireOrchestrationCapabilityStore =
	HumanResourcesHireOrchestrationStore &
		Pick<HumanResourcesRecruitmentStore, "getApplicationById">;
