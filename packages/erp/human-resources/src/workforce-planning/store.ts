import type { HumanResourcesRecruitmentStore } from "../store/recruitment";
import type { HumanResourcesWorkforcePlanningStore } from "../store/workforce-planning";

export type HumanResourcesWorkforcePlanningCapabilityStore =
	HumanResourcesWorkforcePlanningStore &
		Pick<HumanResourcesRecruitmentStore, "getRequisitionById">;
