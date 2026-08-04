import {
	listExpiringEmployeeDocumentsAction,
	listMissingRequiredDocumentsAction,
} from "@/app/actions/hr-compliance";
import { listOpenEmployeeRelationsCasesAction } from "@/app/actions/hr-employee-relations";
import { listHeadcountPlansAction } from "@/app/actions/hr-workforce-planning";
import type { HrOperationsCapabilities, HrOperationsData } from "./types";

const LOAD_ERROR = "HR operations information is temporarily unavailable.";

export async function loadHrOperations(
	capabilities: HrOperationsCapabilities,
): Promise<HrOperationsData> {
	const today = new Date().toISOString().slice(0, 10);
	const [missing, expiring, cases, plans] = await Promise.all([
		capabilities.canAdministerCompliance
			? listMissingRequiredDocumentsAction({ page: 1, pageSize: 100 })
			: null,
		capabilities.canAdministerCompliance
			? listExpiringEmployeeDocumentsAction({
					asOf: today,
					withinDays: 90,
					page: 1,
					pageSize: 100,
				})
			: null,
		capabilities.canReadCases
			? listOpenEmployeeRelationsCasesAction({ page: 1, pageSize: 100 })
			: null,
		capabilities.canReadWorkforcePlans
			? listHeadcountPlansAction({ page: 1, pageSize: 100 })
			: null,
	]);
	const errors: HrOperationsData["errors"] = {};
	if ((missing && !missing.ok) || (expiring && !expiring.ok)) {
		errors.compliance = LOAD_ERROR;
	}
	if (cases && !cases.ok) {
		errors.cases = LOAD_ERROR;
	}
	if (plans && !plans.ok) {
		errors.plans = LOAD_ERROR;
	}
	return {
		missingRequirements: missing?.ok ? missing.data.page.requirements : [],
		expiringDocuments: expiring?.ok ? expiring.data.page.documents : [],
		cases: cases?.ok ? cases.data.page.cases : [],
		plans: plans?.ok ? plans.data.page.plans : [],
		errors,
	};
}
