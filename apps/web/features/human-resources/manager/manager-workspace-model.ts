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

export type ManagerTeamMember = {
	employeeId: string;
	employeeNumber: string;
	displayName: string;
	employmentId: string | null;
	employmentStatus: string | null;
	positionId: string | null;
	departmentId: string | null;
	locationKey: string | null;
	businessUnitKey: string | null;
	planningScopeKeys: string[];
};

export type ManagerLeaveRow = {
	id: string;
	employeeId: string;
	displayName: string;
	startDate: string;
	endDate: string;
	requestedQuantity: string;
	unit: string;
	status: string;
	version: number;
};

export type ManagerTimesheetRow = {
	id: string;
	employeeId: string;
	displayName: string;
	periodStart: string;
	periodEnd: string;
	totalRecordedMinutes: number;
	completedApprovalSteps: number;
	requiredApprovalSteps: number;
	status: string;
	version: number;
};

export type ManagerAttendanceRow = {
	id: string;
	employeeId: string;
	displayName: string;
	exceptionType: string;
	severity: string;
	reviewStatus: string;
	remarks: string | null;
	version: number;
};

export type ManagerProbationRow = {
	id: string;
	employeeId: string;
	employmentId: string;
	displayName: string;
	startsOn: string;
	endsOn: string;
	status: string;
	outcome: string | null;
	version: number;
};

export type ManagerPerformanceReviewRow = {
	id: string;
	employeeId: string;
	displayName: string;
	status: string;
	overallRating: string | null;
	version: number;
};

export type ManagerGoalRow = {
	id: string;
	employeeId: string;
	displayName: string;
	title: string;
	periodEnd: string;
	status: string;
	version: number;
};

export type ManagerTalentRow = {
	id: string;
	employeeId: string;
	displayName: string;
	classification: string | null;
	status: string;
	version: number;
};

export type ManagerSuccessionRow = {
	id: string;
	employeeId: string;
	displayName: string;
	planId: string;
	planTitle: string;
	readiness: string | null;
	readinessEffectiveOn: string | null;
	status: string;
	version: number;
};

export type ManagerStaffingGapRow = {
	planId: string;
	planTitle: string;
	planningScopeKey: string;
	planLineId: string;
	actualHeadcount: number;
	plannedHeadcount: number;
	varianceHeadcount: number;
	availableHeadcount: number;
	varianceFte: string;
	availableFte: string;
};

export type ManagerWorkspaceData = {
	asOf: string;
	managerEmployeeId: string;
	capabilities: ManagerCapabilities;
	team: ManagerTeamMember[];
	leave: ManagerLeaveRow[];
	timesheets: ManagerTimesheetRow[];
	attendance: ManagerAttendanceRow[];
	probation: ManagerProbationRow[];
	performanceReviews: ManagerPerformanceReviewRow[];
	goals: ManagerGoalRow[];
	talent: ManagerTalentRow[];
	succession: ManagerSuccessionRow[];
	staffingGaps: ManagerStaffingGapRow[];
	errors: string[];
};

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
