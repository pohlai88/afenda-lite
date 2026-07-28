import type { Result } from "@afenda/errors/result";

export const HUMAN_RESOURCES_REPORTING_FACT_KINDS = [
	"employment",
	"recruitment",
	"leave",
	"attendance",
	"overtime",
	"compensation",
	"compliance",
	"learning",
	"performance",
	"succession",
	"workforce_plan",
] as const;

export type HumanResourcesReportingFactKind =
	(typeof HUMAN_RESOURCES_REPORTING_FACT_KINDS)[number];

type ReportingFactBase<Kind extends HumanResourcesReportingFactKind> = {
	id: string;
	kind: Kind;
	organizationId: string;
};

export type EmploymentReportingFact = ReportingFactBase<"employment"> & {
	employeeId: string;
	startedOn: string;
	endedOn: string | null;
	fullTimeEquivalent: string;
};

export type RecruitmentReportingFact = ReportingFactBase<"recruitment"> & {
	requisitionId: string;
	applicationId: string | null;
	stage:
		| "requisition_opened"
		| "application_received"
		| "offer_accepted"
		| "hired";
	occurredOn: string;
};

export type LeaveReportingFact = ReportingFactBase<"leave"> & {
	requestId: string;
	status: "requested" | "approved" | "rejected" | "cancelled";
	quantityMinutes: number;
	occurredOn: string;
};

export type AttendanceReportingFact = ReportingFactBase<"attendance"> & {
	employeeId: string;
	workDate: string;
	scheduledMinutes: number;
	workedMinutes: number;
	exceptionCount: number;
};

export type OvertimeReportingFact = ReportingFactBase<"overtime"> & {
	employeeId: string;
	workDate: string;
	status:
		| "requested"
		| "approved"
		| "worked"
		| "verified"
		| "rejected"
		| "cancelled";
	requestedMinutes: number;
	approvedMinutes: number;
	workedMinutes: number;
	payrollApprovedMinutes: number;
};

export type CompensationReportingFact = ReportingFactBase<"compensation"> & {
	employeeId: string;
	effectiveFrom: string;
	effectiveTo: string | null;
	currencyCode: string;
	annualizedAmount: string;
};

export type ComplianceReportingFact = ReportingFactBase<"compliance"> & {
	employeeId: string;
	assessedOn: string;
	status: "compliant" | "at_risk" | "non_compliant";
	outstandingRequirementCount: number;
};

export type LearningReportingFact = ReportingFactBase<"learning"> & {
	employeeId: string;
	assignedOn: string;
	dueOn: string | null;
	completedOn: string | null;
	certificationExpiresOn: string | null;
};

export type PerformanceReportingFact = ReportingFactBase<"performance"> & {
	employeeId: string;
	reviewPeriodEnd: string;
	status: "not_started" | "in_progress" | "completed" | "cancelled";
	rating: string | null;
	activeGoalCount: number;
};

export type SuccessionReportingFact = ReportingFactBase<"succession"> & {
	positionId: string;
	assessedOn: string;
	isCriticalRole: boolean;
	hasActivePlan: boolean;
	readiness: "ready_now" | "ready_soon" | "developing" | "not_ready" | null;
};

export type WorkforcePlanReportingFact = ReportingFactBase<"workforce_plan"> & {
	planLineId: string;
	asOf: string;
	plannedHeadcount: number;
	actualHeadcount: number;
	plannedFullTimeEquivalent: string;
	actualFullTimeEquivalent: string;
};

export type HumanResourcesReadModelFact =
	| EmploymentReportingFact
	| RecruitmentReportingFact
	| LeaveReportingFact
	| AttendanceReportingFact
	| OvertimeReportingFact
	| CompensationReportingFact
	| ComplianceReportingFact
	| LearningReportingFact
	| PerformanceReportingFact
	| SuccessionReportingFact
	| WorkforcePlanReportingFact;

export type HumanResourcesReportingFactPage = {
	entries: readonly HumanResourcesReadModelFact[];
	total: number;
	page: number;
	pageSize: number;
};

export type HumanResourcesReportingSourcePort = {
	listFacts(input: {
		organizationId: string;
		kind: HumanResourcesReportingFactKind;
		page: number;
		pageSize: number;
	}): Promise<Result<HumanResourcesReportingFactPage>>;
};

export type ReportingProjectionMeta = {
	organizationId: string;
	asOf: string;
	periodStart: string;
	periodEnd: string;
	sourceFactCount: number;
};

export type HumanResourcesReportingSnapshot = {
	meta: ReportingProjectionMeta & { projectionVersion: 1 };
	workforceHeadcount: {
		headcount: number;
		fullTimeEquivalent: string;
	};
	turnover: {
		openingHeadcount: number;
		closingHeadcount: number;
		terminations: number;
		averageHeadcount: string;
		turnoverRatePercent: string;
	};
	hiring: {
		requisitionsOpened: number;
		applicationsReceived: number;
		offersAccepted: number;
		hires: number;
	};
	leave: {
		requested: number;
		approved: number;
		rejected: number;
		cancelled: number;
		approvedMinutes: number;
	};
	attendance: {
		scheduledMinutes: number;
		workedMinutes: number;
		exceptionCount: number;
		attendanceRatePercent: string;
	};
	overtime: {
		requestedMinutes: number;
		approvedMinutes: number;
		workedMinutes: number;
		payrollApprovedMinutes: number;
	};
	compensation: {
		activeEmployees: number;
		annualizedByCurrency: Readonly<Record<string, string>>;
	};
	compliance: {
		compliant: number;
		atRisk: number;
		nonCompliant: number;
		outstandingRequirements: number;
	};
	learning: {
		assigned: number;
		completed: number;
		overdue: number;
		certificationsExpiring: number;
	};
	performance: {
		participants: number;
		completedReviews: number;
		activeGoals: number;
		averageRating: string | null;
	};
	succession: {
		criticalRoles: number;
		rolesWithActivePlan: number;
		readyNowCandidates: number;
		coverageRatePercent: string;
	};
	workforcePlanVariance: {
		plannedHeadcount: number;
		actualHeadcount: number;
		varianceHeadcount: number;
		plannedFullTimeEquivalent: string;
		actualFullTimeEquivalent: string;
		varianceFullTimeEquivalent: string;
	};
};
