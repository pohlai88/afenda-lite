import type { WorkforcePlanActualAssignment } from "../../composition/store/index";
import type {
	HeadcountLineAvailability,
	HeadcountPlanLine,
	WorkforcePlanVariance,
} from "../../kernel/contracts";

function matchesPlanLine(
	line: HeadcountPlanLine,
	actual: WorkforcePlanActualAssignment,
): boolean {
	if (line.positionId !== null && actual.positionId !== line.positionId) {
		return false;
	}
	if (line.departmentId !== null && actual.departmentId !== line.departmentId) {
		return false;
	}
	if (line.jobId !== null && actual.jobId !== line.jobId) {
		return false;
	}
	if (line.locationCode !== null && actual.locationCode !== line.locationCode) {
		return false;
	}
	return true;
}

export function computeWorkforcePlanVarianceLine(input: {
	line: HeadcountPlanLine;
	availability: HeadcountLineAvailability;
	actuals: readonly WorkforcePlanActualAssignment[];
}): WorkforcePlanVariance["lines"][number] {
	const matchingActuals = input.actuals.filter((actual) =>
		matchesPlanLine(input.line, actual),
	);
	const actualEmployeeIds = new Set(
		matchingActuals.map((actual) => actual.employeeId),
	);
	const actualHeadcount = actualEmployeeIds.size;
	const actualFte = matchingActuals.length.toFixed(4);
	const varianceFte = (
		Number(input.line.plannedFte) - Number(actualFte)
	).toFixed(4);
	const varianceHeadcount = input.line.plannedHeadcount - actualHeadcount;

	return {
		...input.availability,
		actualFte,
		actualHeadcount,
		varianceFte,
		varianceHeadcount,
	};
}
