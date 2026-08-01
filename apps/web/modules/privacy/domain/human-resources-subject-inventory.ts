import { errorResult, type Result } from "@afenda/errors";
import type { HumanResourcesEmployeeId } from "@afenda/human-resources";
import { listHumanResourcesSubjectInventoryRecords } from "@afenda/human-resources";

import type {
	PrivacyModuleId,
	PrivacySubjectInventoryPort,
	PrivacySubjectRecord,
} from "../types";

async function listHumanResourcesSubjectRecords(input: {
	organizationId: string;
	subjectId: string;
}): Promise<Result<readonly PrivacySubjectRecord[]>> {
	return await listHumanResourcesSubjectInventoryRecords({
		organizationId: input.organizationId,
		subjectEmployeeId: input.subjectId as HumanResourcesEmployeeId,
	});
}

export function createHumanResourcesSubjectInventory(): PrivacySubjectInventoryPort {
	return {
		async listSubjectRecords(input) {
			if (input.moduleId !== "human-resources") {
				return await errorResult.ok([]);
			}
			return await listHumanResourcesSubjectRecords({
				organizationId: input.organizationId,
				subjectId: input.subjectId,
			});
		},
	};
}

export function createModuleSubjectInventory(
	moduleId: PrivacyModuleId,
): PrivacySubjectInventoryPort {
	if (moduleId === "human-resources") {
		return createHumanResourcesSubjectInventory();
	}
	return {
		async listSubjectRecords() {
			return await errorResult.ok([]);
		},
	};
}
