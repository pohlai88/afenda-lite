import { listCompensationGradesAction } from "@/app/actions/hr-compensation";
import { listCompensationReviewCyclesAction } from "@/app/actions/hr-compensation-review";
import type {
	CompensationCapabilities,
	CompensationWorkspaceData,
} from "./types";

const LOAD_ERROR = "Compensation information is temporarily unavailable.";

export async function loadCompensationWorkspace(
	capabilities: CompensationCapabilities,
): Promise<CompensationWorkspaceData> {
	const canLoad = capabilities.canRead || capabilities.canManage;
	const [grades, reviews] = await Promise.all([
		canLoad ? listCompensationGradesAction({ page: 1, pageSize: 100 }) : null,
		canLoad
			? listCompensationReviewCyclesAction({ page: 1, pageSize: 100 })
			: null,
	]);
	const errors: CompensationWorkspaceData["errors"] = {};
	if (grades && !grades.ok) {
		errors.grades = LOAD_ERROR;
	}
	if (reviews && !reviews.ok) {
		errors.reviews = LOAD_ERROR;
	}
	return {
		grades: grades?.ok ? grades.data.page.grades : [],
		reviewCycles: reviews?.ok ? reviews.data.page.cycles : [],
		errors,
	};
}
