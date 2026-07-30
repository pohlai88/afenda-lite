export type ManagerCapability =
	| "leave"
	| "timesheets"
	| "attendance"
	| "probation"
	| "performance"
	| "talent"
	| "succession"
	| "staffing";

export type ManagerCapabilities = Record<ManagerCapability, boolean>;

export interface ManagerTeamMember {
	businessUnitKey: string | null;
	departmentId: string | null;
	displayName: string;
	employeeId: string;
	employeeNumber: string;
	employmentId: string | null;
	employmentStatus: string | null;
	locationKey: string | null;
	planningScopeKeys: string[];
	positionId: string | null;
}

export interface ManagerLeaveRow {
	displayName: string;
	employeeId: string;
	endDate: string;
	id: string;
	requestedQuantity: string;
	startDate: string;
	status: string;
	unit: string;
	version: number;
}

export interface ManagerTimesheetRow {
	completedApprovalSteps: number;
	displayName: string;
	employeeId: string;
	id: string;
	periodEnd: string;
	periodStart: string;
	requiredApprovalSteps: number;
	status: string;
	totalRecordedMinutes: number;
	version: number;
}

export interface ManagerAttendanceRow {
	displayName: string;
	employeeId: string;
	exceptionType: string;
	id: string;
	remarks: string | null;
	reviewStatus: string;
	severity: string;
	version: number;
}

export interface ManagerProbationRow {
	displayName: string;
	employeeId: string;
	employmentId: string;
	endsOn: string;
	id: string;
	outcome: string | null;
	startsOn: string;
	status: string;
	version: number;
}

export interface ManagerPerformanceReviewRow {
	displayName: string;
	employeeId: string;
	id: string;
	overallRating: string | null;
	status: string;
	version: number;
}

export interface ManagerGoalRow {
	displayName: string;
	employeeId: string;
	id: string;
	periodEnd: string;
	status: string;
	title: string;
	version: number;
}

export interface ManagerTalentRow {
	classification: string | null;
	displayName: string;
	employeeId: string;
	id: string;
	status: string;
	version: number;
}

export interface ManagerSuccessionRow {
	displayName: string;
	employeeId: string;
	id: string;
	planId: string;
	planTitle: string;
	readiness: string | null;
	readinessEffectiveOn: string | null;
	status: string;
	version: number;
}

export interface ManagerStaffingGapRow {
	actualHeadcount: number;
	availableFte: string;
	availableHeadcount: number;
	planId: string;
	planLineId: string;
	plannedHeadcount: number;
	planningScopeKey: string;
	planTitle: string;
	varianceFte: string;
	varianceHeadcount: number;
}

export interface ManagerWorkspaceData {
	asOf: string;
	attendance: ManagerAttendanceRow[];
	capabilities: ManagerCapabilities;
	errors: string[];
	goals: ManagerGoalRow[];
	leave: ManagerLeaveRow[];
	managerEmployeeId: string;
	performanceReviews: ManagerPerformanceReviewRow[];
	probation: ManagerProbationRow[];
	staffingGaps: ManagerStaffingGapRow[];
	succession: ManagerSuccessionRow[];
	talent: ManagerTalentRow[];
	team: ManagerTeamMember[];
	timesheets: ManagerTimesheetRow[];
}

export function managerStatusTone(
	status: string,
): "success" | "pending" | "error" | "warning" | "inactive" | "active" {
	if (
		["approved", "resolved", "confirmed", "passed", "ready_now"].includes(
			status,
		)
	) {
		return "success";
	}
	if (["rejected", "failed", "critical", "not_ready"].includes(status)) {
		return "error";
	}
	if (
		["submitted", "open", "in_review", "nominated", "ready_soon"].includes(
			status,
		)
	) {
		return "pending";
	}
	if (["active", "manager_submitted", "emerging"].includes(status)) {
		return "active";
	}
	if (["returned", "warning"].includes(status)) {
		return "warning";
	}
	return "inactive";
}

export function isManagerScopedPlanningKey(
	planningScopeKey: string,
	team: readonly ManagerTeamMember[],
): boolean {
	return team.some((member) =>
		member.planningScopeKeys.includes(planningScopeKey),
	);
}
