import { ok, type Result } from "@afenda/errors/result";
import type { HumanResourcesEmployeeId } from "@afenda/human-resources/brands";
import { listHumanResourcesSubjectInventoryRecords } from "@afenda/human-resources/privacy/subject-data-collector";
import { resolveHumanResourcesStore } from "@afenda/human-resources/resolve-store";

import type {
	PrivacyModuleId,
	PrivacySubjectInventoryPort,
	PrivacySubjectRecord,
} from "../types";

async function listHumanResourcesSubjectRecords(input: {
	organizationId: string;
	subjectId: string;
}): Promise<Result<readonly PrivacySubjectRecord[]>> {
	const store = resolveHumanResourcesStore();
	return listHumanResourcesSubjectInventoryRecords({
		organizationId: input.organizationId,
		subjectEmployeeId: input.subjectId as HumanResourcesEmployeeId,
		store,
	});
}

export function createHumanResourcesSubjectInventory(): PrivacySubjectInventoryPort {
	return {
		async listSubjectRecords(input) {
			if (input.moduleId !== "human-resources") {
				return ok([]);
			}
			return listHumanResourcesSubjectRecords({
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
			return ok([]);
		},
	};
}
