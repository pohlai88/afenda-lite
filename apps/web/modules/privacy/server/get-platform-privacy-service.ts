import { createAuditRecorder } from "@afenda/audit";

import { createModuleSubjectInventory } from "../domain/human-resources-subject-inventory";
import { createPlatformPrivacyService } from "../domain/platform-privacy-service";
import type { PlatformPrivacyService } from "../types";

let cached: PlatformPrivacyService | undefined;

export function getPlatformPrivacyService(): PlatformPrivacyService {
	if (cached === undefined) {
		cached = createPlatformPrivacyService({
			audit: createAuditRecorder(),
			inventory: createModuleSubjectInventory("human-resources"),
		});
	}
	return cached;
}

export function resetPlatformPrivacyServiceForTests(): void {
	cached = undefined;
}
