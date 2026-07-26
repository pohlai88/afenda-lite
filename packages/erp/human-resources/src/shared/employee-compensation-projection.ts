import type { EmployeeCompensation } from "../types";
import type { HumanResourcesFieldProjection } from "./authorization-types";

export function projectEmployeeCompensationByFieldAccess(
	data: EmployeeCompensation,
	projection: HumanResourcesFieldProjection | undefined,
): Partial<EmployeeCompensation> {
	if (projection === undefined) {
		return { ...data };
	}
	const result: Partial<EmployeeCompensation> = { ...data };
	for (const field of projection.deniedFields) {
		delete (result as Record<string, unknown>)[field];
	}
	return result;
}

export function projectEmployeeCompensationListPage(
	page: {
		compensations: EmployeeCompensation[];
		totalCount: number;
		page: number;
		pageSize: number;
	},
	projection: HumanResourcesFieldProjection | undefined,
): {
	compensations: Partial<EmployeeCompensation>[];
	totalCount: number;
	page: number;
	pageSize: number;
} {
	return {
		compensations: page.compensations.map((compensation) =>
			projectEmployeeCompensationByFieldAccess(compensation, projection),
		),
		totalCount: page.totalCount,
		page: page.page,
		pageSize: page.pageSize,
	};
}
