// biome-ignore-all lint/style/noNestedTernary: Exhaustive status and tri-state view mappings remain explicit at their use sites.
import { http } from "@afenda/http";
import {
	getEmployeeComplianceSummary,
	getEmployeeProfile,
	getLeaveBalance,
	getTimesheetTotals,
	type HumanResourcesEmployeeId,
	listAttendanceEvents,
	listAttendanceSessions,
	listCertifications,
	listCourses,
	listEmployeeDocuments,
	listEmployeeGoals,
	listEmployeePerformanceReviews,
	listLearningAssignments,
	listLeaveEntitlements,
	listLeavePolicies,
	listLeaveRequests,
	listOutstandingPolicyAcknowledgements,
	listTimesheetEntries,
	listTimesheets,
} from "@afenda/human-resources";

import { createHumanResourcesCommandOptions } from "@/lib/erp/human-resources-command-options";

import type { SelfServiceSnapshot } from "./types";

const PAGE_SIZE = 50;
const LOAD_ERROR =
	"This information is temporarily unavailable. Retry shortly.";

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: The loader preserves partial-failure handling across self-service domains.
export async function loadSelfServiceSnapshot(input: {
	organizationId: string;
	actorUserId: string;
	employeeId: HumanResourcesEmployeeId;
	page: number;
}): Promise<SelfServiceSnapshot> {
	const correlationId = http.correlation.create();
	const today = new Date().toISOString().slice(0, 10);
	const fromDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
		.toISOString()
		.slice(0, 10);
	const context = {
		organizationId: input.organizationId,
		actorUserId: input.actorUserId,
		correlationId,
	};
	const options = createHumanResourcesCommandOptions();

	const [
		profileResult,
		entitlementsResult,
		policiesResult,
		leaveResult,
		eventsResult,
		sessionsResult,
		timesheetsResult,
		assignmentsResult,
		coursesResult,
		certificationsResult,
		goalsResult,
		reviewsResult,
		documentsResult,
		complianceResult,
		acknowledgementsResult,
	] = await Promise.all([
		getEmployeeProfile(
			{
				...context,
				employeeId: input.employeeId,
				actorEmployeeId: input.employeeId,
				asOf: today,
			},
			options,
		),
		listLeaveEntitlements(
			{
				...context,
				employeeId: input.employeeId,
				page: 1,
				pageSize: PAGE_SIZE,
			},
			options,
		),
		listLeavePolicies({ ...context, page: 1, pageSize: PAGE_SIZE }, options),
		listLeaveRequests(
			{
				...context,
				employeeId: input.employeeId,
				page: input.page,
				pageSize: PAGE_SIZE,
			},
			options,
		),
		listAttendanceEvents(
			{
				...context,
				employeeId: input.employeeId,
				fromDate,
				toDate: today,
				page: 1,
				pageSize: PAGE_SIZE,
			},
			options,
		),
		listAttendanceSessions(
			{
				...context,
				employeeId: input.employeeId,
				fromDate,
				toDate: today,
				page: 1,
				pageSize: 31,
			},
			options,
		),
		listTimesheets(
			{ ...context, employeeId: input.employeeId, page: 1, pageSize: 12 },
			options,
		),
		listLearningAssignments(
			{
				...context,
				employeeId: input.employeeId,
				page: 1,
				pageSize: PAGE_SIZE,
			},
			options,
		),
		listCourses({ ...context, page: 1, pageSize: PAGE_SIZE }, options),
		listCertifications(
			{
				...context,
				employeeId: input.employeeId,
				page: 1,
				pageSize: PAGE_SIZE,
			},
			options,
		),
		listEmployeeGoals(
			{
				...context,
				employeeId: input.employeeId,
				page: 1,
				pageSize: PAGE_SIZE,
			},
			options,
		),
		listEmployeePerformanceReviews(
			{
				...context,
				employeeId: input.employeeId,
				page: 1,
				pageSize: PAGE_SIZE,
				includeConfidential: false,
			},
			options,
		),
		listEmployeeDocuments(
			{
				...context,
				employeeId: input.employeeId,
				page: 1,
				pageSize: PAGE_SIZE,
			},
			options,
		),
		getEmployeeComplianceSummary(
			{ ...context, employeeId: input.employeeId, asOf: today },
			options,
		),
		listOutstandingPolicyAcknowledgements(
			{
				...context,
				employeeId: input.employeeId,
				page: 1,
				pageSize: PAGE_SIZE,
			},
			options,
		),
	]);

	const policies = new Map(
		policiesResult.ok
			? policiesResult.data.policies.map((policy) => [policy.id, policy.name])
			: [],
	);
	const courses = new Map(
		coursesResult.ok
			? coursesResult.data.courses.map((course) => [course.id, course.title])
			: [],
	);
	const entitlements = entitlementsResult.ok
		? entitlementsResult.data.entitlements
		: [];
	const balanceResults = await Promise.all(
		entitlements.map((entitlement) =>
			getLeaveBalance({ ...context, entitlementId: entitlement.id }, options),
		),
	);
	const timesheets = timesheetsResult.ok ? timesheetsResult.data : [];
	const currentTimesheet =
		timesheets.find(
			(timesheet) =>
				timesheet.periodStart <= today && timesheet.periodEnd >= today,
		) ??
		timesheets[0] ??
		null;
	const [entriesResult, totalsResult] = currentTimesheet
		? await Promise.all([
				listTimesheetEntries(
					{ ...context, timesheetId: currentTimesheet.id },
					options,
				),
				getTimesheetTotals(
					{ ...context, timesheetId: currentTimesheet.id },
					options,
				),
			])
		: [null, null];

	const activeEvents = eventsResult.ok
		? eventsResult.data.filter((event) => event.voidedAt === null)
		: [];
	const [latestEvent] = [...activeEvents].sort(
		(a, b) => b.occurredAt.getTime() - a.occurredAt.getTime(),
	);
	const currentStatus =
		latestEvent?.eventType === "clock_in" ||
		latestEvent?.eventType === "break_end"
			? "Clocked in"
			: latestEvent?.eventType === "break_start"
				? "On break"
				: "Clocked out";

	const errors: SelfServiceSnapshot["errors"] = {};
	if (!profileResult.ok) {
		errors.profile = LOAD_ERROR;
	}
	if (!(entitlementsResult.ok && policiesResult.ok && leaveResult.ok)) {
		errors.leave = LOAD_ERROR;
	}
	if (!(eventsResult.ok && sessionsResult.ok)) {
		errors.attendance = LOAD_ERROR;
	}
	if (
		!timesheetsResult.ok ||
		(currentTimesheet && !(entriesResult?.ok && totalsResult?.ok))
	) {
		errors.timesheet = LOAD_ERROR;
	}
	if (!(assignmentsResult.ok && coursesResult.ok && certificationsResult.ok)) {
		errors.learning = LOAD_ERROR;
	}
	if (!(goalsResult.ok && reviewsResult.ok)) {
		errors.performance = LOAD_ERROR;
	}
	if (
		!(documentsResult.ok && complianceResult.ok && acknowledgementsResult.ok)
	) {
		errors.compliance = LOAD_ERROR;
	}

	return {
		profile: profileResult.ok
			? {
					name: profileResult.data.legalName,
					preferredName: profileResult.data.preferredName,
					employeeNumber: profileResult.data.employeeNumber,
					employmentStatus: profileResult.data.employmentStatus,
					workerStatus: profileResult.data.workerStatus,
					phone: profileResult.data.personalPhoneNumber,
				}
			: null,
		leaveBalances: entitlements.flatMap((entitlement, index) => {
			const result = balanceResults[index];
			return result?.ok && result.data
				? [
						{
							entitlementId: entitlement.id,
							policyName: policies.get(entitlement.policyId) ?? "Leave",
							balance: result.data.balance,
							unit: result.data.unit,
							periodStart: entitlement.periodStart,
							periodEnd: entitlement.periodEnd,
						},
					]
				: [];
		}),
		leaveRequests: leaveResult.ok
			? leaveResult.data.requests.map((request) => ({
					id: request.id,
					policyName: policies.get(request.policyId) ?? "Leave",
					startDate: request.startDate,
					endDate: request.endDate,
					quantity: request.requestedQuantity,
					unit: request.unit,
					status: request.status,
					version: request.version,
					updatedAt: request.updatedAt.toISOString(),
				}))
			: [],
		attendance: {
			currentStatus,
			events: eventsResult.ok
				? eventsResult.data.map((event) => ({
						id: event.id,
						type: event.eventType,
						occurredAt: event.occurredAt.toISOString(),
						localWorkDate: event.localWorkDate,
						source: event.source,
						voided: event.voidedAt !== null,
					}))
				: [],
			sessions: sessionsResult.ok
				? sessionsResult.data.map((session) => ({
						id: session.id,
						localWorkDate: session.localWorkDate,
						firstClockInAt: session.firstClockInAt?.toISOString() ?? null,
						finalClockOutAt: session.finalClockOutAt?.toISOString() ?? null,
						workedMinutes: session.workedMinutes,
						breakMinutes: session.breakMinutes,
						status: session.resolutionStatus,
					}))
				: [],
		},
		timesheet: currentTimesheet
			? {
					id: currentTimesheet.id,
					periodStart: currentTimesheet.periodStart,
					periodEnd: currentTimesheet.periodEnd,
					status: currentTimesheet.status,
					version: currentTimesheet.version,
					recordedMinutes:
						totalsResult?.ok && totalsResult.data
							? totalsResult.data.totalRecordedMinutes
							: currentTimesheet.totalRecordedMinutes,
					approvedMinutes:
						totalsResult?.ok && totalsResult.data
							? totalsResult.data.totalApprovedMinutes
							: currentTimesheet.totalApprovedMinutes,
					entries: entriesResult?.ok
						? entriesResult.data.map((entry) => ({
								id: entry.id,
								workDate: entry.workDate,
								timeType: entry.timeType,
								recordedMinutes: entry.recordedMinutes,
								approvedMinutes: entry.approvedMinutes,
							}))
						: [],
				}
			: null,
		learning: {
			assignments: assignmentsResult.ok
				? assignmentsResult.data.assignments.map((assignment) => ({
						id: assignment.id,
						course: courses.get(assignment.courseId) ?? "Course",
						dueOn: assignment.dueOn,
						status: assignment.status,
					}))
				: [],
			certifications: certificationsResult.ok
				? certificationsResult.data.certifications.map((certification) => ({
						id: certification.id,
						course: courses.get(certification.courseId) ?? "Course",
						code: certification.certificationCode,
						issuedOn: certification.issuedOn,
						expiresOn: certification.expiresOn,
						status: certification.status,
					}))
				: [],
		},
		performance: {
			goals: goalsResult.ok
				? goalsResult.data.goals.map((goal) => ({
						id: goal.id,
						title: goal.title,
						periodStart: goal.periodStart,
						periodEnd: goal.periodEnd,
						status: goal.status,
					}))
				: [],
			reviews: reviewsResult.ok
				? reviewsResult.data.reviews.map((review) => ({
						id: review.id,
						status: review.status,
						rating: review.overallRating,
						updatedAt: review.updatedAt.toISOString(),
					}))
				: [],
		},
		compliance: {
			summary: complianceResult.ok
				? {
						missingDocuments:
							complianceResult.data.missingRequiredDocumentCount,
						expiringDocuments: complianceResult.data.expiringDocumentCount,
						workEligibilityAtRisk: complianceResult.data.workEligibilityAtRisk,
						outstandingAcknowledgements:
							complianceResult.data.outstandingPolicyAcknowledgementCount,
					}
				: null,
			documents: documentsResult.ok
				? documentsResult.data.documents.map((document) => ({
						id: document.id,
						type: document.documentType,
						issuedOn: document.issuedOn,
						expiresOn: document.expiresOn,
						status: document.verificationStatus,
					}))
				: [],
			acknowledgements: acknowledgementsResult.ok
				? acknowledgementsResult.data.acknowledgements.map(
						(acknowledgement) => ({
							id: acknowledgement.id,
							policyCode: acknowledgement.policyCode,
							policyVersion: acknowledgement.policyVersion,
							dueOn: acknowledgement.dueOn,
							version: acknowledgement.version,
						}),
					)
				: [],
		},
		errors,
	};
}
