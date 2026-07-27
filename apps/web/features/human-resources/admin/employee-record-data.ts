import type { Session } from "@afenda/auth";
import {
	HUMAN_RESOURCES_ASSIGNMENT_CREATED_EVENT,
	HUMAN_RESOURCES_EMPLOYEE_TERMINATED_EVENT,
	HUMAN_RESOURCES_EMPLOYEE_TRANSFERRED_EVENT,
	HUMAN_RESOURCES_EMPLOYMENT_STARTED_EVENT,
	HUMAN_RESOURCES_OFFBOARDING_COMPLETED_EVENT,
	HUMAN_RESOURCES_OFFBOARDING_STARTED_EVENT,
	HUMAN_RESOURCES_ONBOARDING_COMPLETED_EVENT,
	HUMAN_RESOURCES_ONBOARDING_STARTED_EVENT,
	queryDomainEvents,
} from "@afenda/events";
import {
	getAssignment,
	getAssignmentAsOf,
	getEmployeeById,
	getEmployeeComplianceSummary,
	getEmployeeProfile,
	getEmployeeWorkEligibility,
	getEmployment,
	getEmploymentAsOf,
	getOffboardingCase,
	getOnboardingCase,
	getPosition,
	listDirectReports,
	listEmployeeDocuments,
	listEmploymentContracts,
	listEmploymentStatusHistory,
	listOutstandingPolicyAcknowledgements,
	listPositions,
	listProbationReviewsByEmployment,
	resolveEmployeeOrgContextAsOf,
	resolvePrimaryManager,
	type Employee,
	type EmployeeComplianceSummary,
	type EmployeeDocumentListItem,
	type EmployeeOrgContextAsOf,
	type EmployeeProfile,
	type Employment,
	type EmploymentContract,
	type EmploymentStatusHistory,
	type HumanResourcesEmployeeId,
	type PolicyAcknowledgement,
	type Position,
	type ProbationReview,
	type WorkAssignment,
	type WorkEligibility,
} from "@afenda/human-resources";

import { createHumanResourcesCommandOptions } from "@/lib/erp/human-resources-command-options";

type TimelineKind =
	| "employment"
	| "contract"
	| "assignment"
	| "onboarding"
	| "probation"
	| "transfer"
	| "termination"
	| "offboarding";

export type EmployeeLifecycleTimelineEntry = {
	id: string;
	kind: TimelineKind;
	title: string;
	detail: string;
	date: string;
	status: string;
};

export type EmployeeAdminRecordData = {
	employee: Employee;
	profile: EmployeeProfile | null;
	employments: Employment[];
	currentEmployment: Employment | null;
	contracts: EmploymentContract[];
	statusHistory: EmploymentStatusHistory[];
	assignments: WorkAssignment[];
	currentAssignment: WorkAssignment | null;
	probationReviews: ProbationReview[];
	orgContext: EmployeeOrgContextAsOf | null;
	position: Position | null;
	manager: Employee | null;
	directReports: Employee[];
	availablePositions: Position[];
	complianceSummary: EmployeeComplianceSummary | null;
	documents: EmployeeDocumentListItem[];
	workEligibility: WorkEligibility | null;
	outstandingAcknowledgements: PolicyAcknowledgement[];
	timeline: EmployeeLifecycleTimelineEntry[];
	warnings: string[];
};

export type EmployeeAdminRecordLoadResult =
	| { ok: true; data: EmployeeAdminRecordData }
	| { ok: false; code: string; message: string };

function packageContext(session: Session, correlationId: string) {
	return {
		organizationId: session.orgId,
		actorUserId: session.userId,
		correlationId,
	};
}

function eventEntityId(payload: unknown): string | null {
	if (typeof payload !== "object" || payload === null) return null;
	const value = Reflect.get(payload, "entityId");
	return typeof value === "string" ? value : null;
}

function eventEffectiveOn(payload: unknown, fallback: Date): string {
	if (typeof payload === "object" && payload !== null) {
		const value = Reflect.get(payload, "effectiveOn");
		if (typeof value === "string") return value;
	}
	return fallback.toISOString().slice(0, 10);
}

async function lifecycleEvents(organizationId: string) {
	const types = [
		HUMAN_RESOURCES_EMPLOYMENT_STARTED_EVENT,
		HUMAN_RESOURCES_ASSIGNMENT_CREATED_EVENT,
		HUMAN_RESOURCES_EMPLOYEE_TRANSFERRED_EVENT,
		HUMAN_RESOURCES_EMPLOYEE_TERMINATED_EVENT,
		HUMAN_RESOURCES_ONBOARDING_STARTED_EVENT,
		HUMAN_RESOURCES_ONBOARDING_COMPLETED_EVENT,
		HUMAN_RESOURCES_OFFBOARDING_STARTED_EVENT,
		HUMAN_RESOURCES_OFFBOARDING_COMPLETED_EVENT,
	] as const;
	const pages = await Promise.all(
		types.map((type) =>
			queryDomainEvents({
				organizationId,
				sourceModule: "human-resources",
				type,
				page: 1,
				pageSize: 100,
			}),
		),
	);
	return new Map(
		types.map((type, index) => [
			type,
			pages[index]?.ok ? pages[index].data.entries : [],
		]),
	);
}

function unique(values: readonly (string | null)[]): string[] {
	return [...new Set(values.filter((value): value is string => value !== null))];
}

function timelineFromStatus(history: readonly EmploymentStatusHistory[]) {
	return history.map(
		(entry): EmployeeLifecycleTimelineEntry => ({
			id: `employment-status-${entry.id}`,
			kind: "employment",
			title: `Employment ${entry.changeKind.replaceAll("_", " ")}`,
			detail: `${entry.fromStatus ?? "not employed"} to ${entry.toStatus}`,
			date: entry.effectiveOn,
			status: entry.toStatus,
		}),
	);
}

function timelineFromContracts(contracts: readonly EmploymentContract[]) {
	return contracts.map(
		(contract): EmployeeLifecycleTimelineEntry => ({
			id: `contract-${contract.id}`,
			kind: "contract",
			title: `Contract ${contract.referenceCode}`,
			detail: contract.endsOn
				? `${contract.startsOn} to ${contract.endsOn}`
				: `Effective from ${contract.startsOn}`,
			date: contract.startsOn,
			status: contract.lineageStatus,
		}),
	);
}

function timelineFromAssignments(assignments: readonly WorkAssignment[]) {
	return assignments.map(
		(assignment): EmployeeLifecycleTimelineEntry => ({
			id: `assignment-${assignment.id}`,
			kind: "assignment",
			title: assignment.predecessorAssignmentId ? "Assignment transfer" : "Assignment started",
			detail: assignment.endsOn
				? `${assignment.startsOn} to ${assignment.endsOn}`
				: `Effective from ${assignment.startsOn}`,
			date: assignment.startsOn,
			status: assignment.endsOn ? "ended" : "active",
		}),
	);
}

function timelineFromProbation(reviews: readonly ProbationReview[]) {
	return reviews.map(
		(review): EmployeeLifecycleTimelineEntry => ({
			id: `probation-${review.id}`,
			kind: "probation",
			title: "Probation review",
			detail: `${review.startsOn} to ${review.endsOn}${review.outcome ? ` · ${review.outcome}` : ""}`,
			date: review.outcomeRecordedOn ?? review.startsOn,
			status: review.status,
		}),
	);
}

export async function loadEmployeeAdminRecord(input: {
	session: Session;
	employeeId: HumanResourcesEmployeeId;
	asOf: string;
}): Promise<EmployeeAdminRecordLoadResult> {
	const correlationId = `hr-admin-read:${input.employeeId}:${input.asOf}`;
	const context = packageContext(input.session, correlationId);
	const options = createHumanResourcesCommandOptions();
	const employeeResult = await getEmployeeById(
		{ ...context, employeeId: input.employeeId },
		options,
	);
	if (!employeeResult.ok) {
		return {
			ok: false,
			code: employeeResult.code,
			message: employeeResult.message,
		};
	}

	const [profileResult, currentEmploymentResult, events, summaryResult, documentsResult, eligibilityResult, acknowledgementsResult, positionsResult] =
		await Promise.all([
			getEmployeeProfile({ ...context, employeeId: input.employeeId, asOf: input.asOf }, options),
			getEmploymentAsOf({ ...context, employeeId: input.employeeId, asOf: input.asOf }, options),
			lifecycleEvents(input.session.orgId),
			getEmployeeComplianceSummary({ ...context, employeeId: input.employeeId, asOf: input.asOf }, options),
			listEmployeeDocuments({ ...context, employeeId: input.employeeId, page: 1, pageSize: 100 }, options),
			getEmployeeWorkEligibility({ ...context, employeeId: input.employeeId }, options),
			listOutstandingPolicyAcknowledgements({ ...context, employeeId: input.employeeId, page: 1, pageSize: 100 }, options),
			listPositions({ ...context, page: 1, pageSize: 100, status: "active" }, options),
		]);

	const warnings: string[] = [];
	if (!profileResult.ok) warnings.push("Employee profile details are partially unavailable.");
	if (!summaryResult.ok || !documentsResult.ok || !eligibilityResult.ok || !acknowledgementsResult.ok) {
		warnings.push("Some compliance facts are unavailable.");
	}
	if (!positionsResult.ok) warnings.push("Active positions are unavailable for assignment changes.");

	const employmentStarted = events.get(HUMAN_RESOURCES_EMPLOYMENT_STARTED_EVENT) ?? [];
	const employmentIds = unique([
		currentEmploymentResult.ok ? currentEmploymentResult.data?.id ?? null : null,
		...employmentStarted.map((event) => eventEntityId(event.payload)),
	]);
	const employmentResults = await Promise.all(
		employmentIds.map((employmentId) =>
			getEmployment({ ...context, employmentId }, options),
		),
	);
	const employments = employmentResults
		.flatMap((result) =>
			result.ok && result.data.employeeId === input.employeeId ? [result.data] : [],
		)
		.sort((left, right) => right.startsOn.localeCompare(left.startsOn));
	const currentEmployment = currentEmploymentResult.ok
		? currentEmploymentResult.data
		: employments[0] ?? null;
	if (!currentEmploymentResult.ok) warnings.push("Current employment could not be resolved.");

	const employmentFacts = await Promise.all(
		employments.map(async (employment) => {
			const [history, contracts, probation] = await Promise.all([
				listEmploymentStatusHistory({ ...context, employmentId: employment.id, asOf: input.asOf }, options),
				listEmploymentContracts({ ...context, employmentId: employment.id }, options),
				listProbationReviewsByEmployment({ ...context, employmentId: employment.id }, options),
			]);
			return { history, contracts, probation };
		}),
	);
	const statusHistory = employmentFacts.flatMap((fact) => (fact.history.ok ? fact.history.data.history : []));
	const contracts = employmentFacts.flatMap((fact) => (fact.contracts.ok ? fact.contracts.data : []));
	const probationReviews = employmentFacts.flatMap((fact) => (fact.probation.ok ? fact.probation.data : []));
	if (employmentFacts.some((fact) => !fact.history.ok || !fact.contracts.ok || !fact.probation.ok)) {
		warnings.push("Some employment history facts are unavailable.");
	}

	const assignmentCreated = events.get(HUMAN_RESOURCES_ASSIGNMENT_CREATED_EVENT) ?? [];
	const currentAssignmentResult = currentEmployment
		? await getAssignmentAsOf({ ...context, employmentId: currentEmployment.id, asOf: input.asOf }, options)
		: null;
	const assignmentIds = unique([
		currentAssignmentResult?.ok ? currentAssignmentResult.data?.id ?? null : null,
		...assignmentCreated.map((event) => eventEntityId(event.payload)),
	]);
	const assignmentResults = await Promise.all(
		assignmentIds.map((assignmentId) => getAssignment({ ...context, assignmentId }, options)),
	);
	const assignments = assignmentResults
		.flatMap((result) =>
			result.ok && result.data.employeeId === input.employeeId ? [result.data] : [],
		)
		.sort((left, right) => right.startsOn.localeCompare(left.startsOn));
	const currentAssignment = currentAssignmentResult?.ok
		? currentAssignmentResult.data
		: assignments.find((assignment) => assignment.endsOn === null) ?? null;

	const orgContextResult = currentEmployment
		? await resolveEmployeeOrgContextAsOf(
				{ ...context, employeeId: input.employeeId, asOf: input.asOf },
				options,
			)
		: null;
	const orgContext = orgContextResult?.ok ? orgContextResult.data : null;
	const [positionResult, managerLineResult, directReportLinesResult] = await Promise.all([
		orgContext?.positionId
			? getPosition({ ...context, positionId: orgContext.positionId }, options)
			: Promise.resolve(null),
		resolvePrimaryManager({ ...context, employeeId: input.employeeId, asOf: input.asOf }, options),
		listDirectReports({ ...context, managerEmployeeId: input.employeeId, asOf: input.asOf, page: 1, pageSize: 100 }, options),
	]);
	const managerLine = managerLineResult.ok ? managerLineResult.data : null;
	const managerResult = managerLine
		? await getEmployeeById({ ...context, employeeId: managerLine.managerEmployeeId }, options)
		: null;
	const directReportIds = directReportLinesResult.ok
		? directReportLinesResult.data.reportingLines.map((line) => line.employeeId)
		: [];
	const directReportResults = await Promise.all(
		directReportIds.map((employeeId) => getEmployeeById({ ...context, employeeId }, options)),
	);

	const directTimelineEvents = [
		...(events.get(HUMAN_RESOURCES_EMPLOYEE_TRANSFERRED_EVENT) ?? []).filter(
			(event) => eventEntityId(event.payload) === input.employeeId,
		).map(
			(event): EmployeeLifecycleTimelineEntry => ({
				id: `transfer-${event.id}`,
				kind: "transfer",
				title: "Employee transferred",
				detail: "Assignment and organization context changed.",
				date: eventEffectiveOn(event.payload, event.occurredAt),
				status: "completed",
			}),
		),
		...(events.get(HUMAN_RESOURCES_EMPLOYEE_TERMINATED_EVENT) ?? []).filter(
			(event) => eventEntityId(event.payload) === input.employeeId,
		).map(
			(event): EmployeeLifecycleTimelineEntry => ({
				id: `termination-${event.id}`,
				kind: "termination",
				title: "Employment terminated",
				detail: "Termination finalized and employment status changed.",
				date: eventEffectiveOn(event.payload, event.occurredAt),
				status: "completed",
			}),
		),
	];

	const caseEventEntries = [
		...(events.get(HUMAN_RESOURCES_ONBOARDING_STARTED_EVENT) ?? []),
		...(events.get(HUMAN_RESOURCES_ONBOARDING_COMPLETED_EVENT) ?? []),
		...(events.get(HUMAN_RESOURCES_OFFBOARDING_STARTED_EVENT) ?? []),
		...(events.get(HUMAN_RESOURCES_OFFBOARDING_COMPLETED_EVENT) ?? []),
	];
	const caseTimeline = await Promise.all(
		caseEventEntries.map(async (event): Promise<EmployeeLifecycleTimelineEntry | null> => {
			const caseId = eventEntityId(event.payload);
			if (!caseId) return null;
			const onboarding = event.type.startsWith("human-resources.onboarding");
			const result = onboarding
				? await getOnboardingCase({ ...context, onboardingCaseId: caseId }, options)
				: await getOffboardingCase({ ...context, offboardingCaseId: caseId }, options);
			if (!result.ok || result.data?.employeeId !== input.employeeId) return null;
			const completed = event.type.includes("completed");
			return {
				id: `${onboarding ? "onboarding" : "offboarding"}-${event.id}`,
				kind: onboarding ? "onboarding" : "offboarding",
				title: `${onboarding ? "Onboarding" : "Offboarding"} ${completed ? "completed" : "started"}`,
				detail: completed ? "All required case work completed." : "Lifecycle case opened.",
				date: event.occurredAt.toISOString().slice(0, 10),
				status: completed ? "completed" : "active",
			};
		}),
	);

	const timeline = [
		...timelineFromStatus(statusHistory),
		...timelineFromContracts(contracts),
		...timelineFromAssignments(assignments),
		...timelineFromProbation(probationReviews),
		...directTimelineEvents,
		...caseTimeline.filter((entry): entry is EmployeeLifecycleTimelineEntry => entry !== null),
	].sort((left, right) => right.date.localeCompare(left.date));

	return {
		ok: true,
		data: {
			employee: employeeResult.data,
			profile: profileResult.ok ? profileResult.data : null,
			employments,
			currentEmployment,
			contracts,
			statusHistory,
			assignments,
			currentAssignment,
			probationReviews,
			orgContext,
			position: positionResult?.ok ? positionResult.data : null,
			manager: managerResult?.ok ? managerResult.data : null,
			directReports: directReportResults.flatMap((result) => (result.ok ? [result.data] : [])),
			availablePositions: positionsResult.ok ? positionsResult.data.positions : [],
			complianceSummary: summaryResult.ok ? summaryResult.data : null,
			documents: documentsResult.ok ? documentsResult.data.documents : [],
			workEligibility: eligibilityResult.ok ? eligibilityResult.data : null,
			outstandingAcknowledgements: acknowledgementsResult.ok
				? acknowledgementsResult.data.acknowledgements
				: [],
			timeline,
			warnings,
		},
	};
}
