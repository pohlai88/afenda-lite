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

export function createPayrollSubjectInventory(): PrivacySubjectInventoryPort {
	return {
		async listSubjectRecords(input) {
			if (input.moduleId !== "payroll") {
				return await errorResult.ok([]);
			}
			return await errorResult.ok([
				{
					entity: "payroll_privacy_subject",
					organizationId: input.organizationId,
					recordId: input.subjectId,
				},
			]);
		},
	};
}

export function createModuleSubjectInventory(
	moduleId?: PrivacyModuleId,
): PrivacySubjectInventoryPort {
	const hr = createHumanResourcesSubjectInventory();
	const payroll = createPayrollSubjectInventory();
	return {
		async listSubjectRecords(input) {
			if (moduleId !== undefined && input.moduleId !== moduleId) {
				return await errorResult.ok([]);
			}
			if (input.moduleId === "human-resources") {
				return await hr.listSubjectRecords(input);
			}
			if (input.moduleId === "payroll") {
				return await payroll.listSubjectRecords(input);
			}
			return await errorResult.ok([]);
		},
	};
}
