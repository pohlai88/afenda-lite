import type { HumanResourcesStore } from "../../store";

import { attachDrizzleCompensation } from "./compensation";
import { attachDrizzleCompliance } from "./compliance";
import { attachDrizzleCore } from "./core";
import { attachDrizzleEmployeeRelations } from "./employee-relations";
import { attachDrizzleLearning } from "./learning";
import { attachDrizzleLeave } from "./leave";
import { attachDrizzleLifecycle } from "./lifecycle";
import { attachDrizzleOrganization } from "./organization";
import { attachDrizzlePerformance } from "./performance";
import { attachDrizzleRecruitment } from "./recruitment";
import { attachDrizzleWorkforcePlanning } from "./workforce-planning";

/** Composition root only. Domain persistence lives in one adapter per HR subdomain. */
export class DrizzleHumanResourcesStore {
	constructor() {
		attachDrizzleCore(this as unknown as Parameters<typeof attachDrizzleCore>[0]);
		attachDrizzleOrganization(this as unknown as Parameters<typeof attachDrizzleOrganization>[0]);
		attachDrizzleRecruitment(this as unknown as Parameters<typeof attachDrizzleRecruitment>[0]);
		attachDrizzleLifecycle(this as unknown as Parameters<typeof attachDrizzleLifecycle>[0]);
		attachDrizzleLeave(this as unknown as Parameters<typeof attachDrizzleLeave>[0]);
		attachDrizzleCompensation(this as unknown as Parameters<typeof attachDrizzleCompensation>[0]);
		attachDrizzlePerformance(this as unknown as Parameters<typeof attachDrizzlePerformance>[0]);
		attachDrizzleLearning(this as unknown as Parameters<typeof attachDrizzleLearning>[0]);
		attachDrizzleWorkforcePlanning(this as unknown as Parameters<typeof attachDrizzleWorkforcePlanning>[0]);
		attachDrizzleCompliance(this as unknown as Parameters<typeof attachDrizzleCompliance>[0]);
		attachDrizzleEmployeeRelations(this as unknown as Parameters<typeof attachDrizzleEmployeeRelations>[0]);
	}
}

export function createDrizzleHumanResourcesStore(): HumanResourcesStore {
	return new DrizzleHumanResourcesStore() as unknown as HumanResourcesStore;
}
