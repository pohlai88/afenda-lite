/**
 * Behavioral proof: caller-supplied correlationId reaches audit and outbox unchanged.
 */

import {
	HUMAN_RESOURCES_EMPLOYEE_REHIRED_EVENT,
	HUMAN_RESOURCES_EMPLOYEE_TERMINATED_EVENT,
	HUMAN_RESOURCES_EMPLOYEE_TRANSFERRED_EVENT,
	HUMAN_RESOURCES_EMPLOYMENT_STARTED_EVENT,
} from "@afenda/events/schemas";
import { describe, expect, it } from "vitest";
import {
	cancelBenefitEnrollment,
	endBenefitEnrollment,
	enrolBenefit,
} from "../src/compensation-benefits/benefit-enrollment";
import { applyApprovedCompensationResult } from "../src/compensation-benefits/compensation-review";
import {
	createEmployeeCompensation,
	endEmployeeCompensation,
} from "../src/compensation-benefits/employee-compensation";
import {
	createDocumentRequirement,
	publishDocumentRequirement,
	retireDocumentRequirement,
	updateDocumentRequirement,
} from "../src/compliance/document-requirement";
import {
	markEmployeeDocumentExpired,
	registerEmployeeDocument,
	rejectEmployeeDocument,
	revokeEmployeeDocumentVerification,
	updateEmployeeDocumentMetadata,
	verifyEmployeeDocument,
} from "../src/compliance/employee-document";
import {
	acknowledgePolicy,
	issuePolicyAcknowledgementRequirement,
	revokePolicyAcknowledgement,
	supersedePolicyAcknowledgementRequirement,
} from "../src/compliance/policy-acknowledgement";
import {
	closeWorkEligibility,
	recordWorkEligibility,
	renewWorkEligibility,
	suspendWorkEligibility,
	verifyWorkEligibility,
} from "../src/compliance/work-eligibility";
import { createAssignment } from "../src/core/assignment";
import { createEmployee } from "../src/core/employee";
import { createEmployment } from "../src/core/employment";
import { createEmploymentContract } from "../src/core/employment-contract";
import {
	approveEmployeeCaseAction,
	recommendEmployeeCaseAction,
} from "../src/employee-relations/case-action";
import { recordEmployeeCaseAppeal } from "../src/employee-relations/case-appeal";
import { recordEmployeeCaseEvent } from "../src/employee-relations/case-event";
import {
	assignEmployeeCaseOwner,
	closeEmployeeCase,
	openEmployeeCase,
	recordEmployeeCaseFinding,
	reopenEmployeeCase,
} from "../src/employee-relations/employee-case";
import {
	expireCertification,
	issueCertification,
	revokeCertification,
} from "../src/learning/certification";
import { recordCompletion } from "../src/learning/completion";
import { createCourse } from "../src/learning/course";
import { assignLearning } from "../src/learning/learning-assignment";
import {
	approveLeaveRequest,
	createDraftLeaveRequest,
	rejectLeaveRequest,
	submitLeaveRequest,
} from "../src/leave/leave-request";
import { confirmEmployment } from "../src/lifecycle/confirmation";
import {
	completeOffboarding,
	completeOffboardingTask,
	getClearanceByOffboardingCase,
	getOffboardingAccessRevocationByCase,
	getOffboardingPayrollHandoffByCase,
	listOffboardingTasks,
	recordClearance,
	recordExitInterview,
	recordOffboardingAccessRevocation,
	recordOffboardingPayrollHandoff,
	startOffboarding,
} from "../src/lifecycle/offboarding";
import {
	completeOnboarding,
	completeOnboardingTask,
	getOnboardingAccessHandoffByCase,
	getOnboardingEquipmentHandoffByCase,
	getOnboardingOrientationByCase,
	listOnboardingTasks,
	recordOnboardingAccessHandoff,
	recordOnboardingEquipmentHandoff,
	recordOnboardingOrientation,
	startOnboarding,
} from "../src/lifecycle/onboarding";
import {
	ONBOARDING_TASK_CODE_IDENTITY_DOCUMENTS,
	ONBOARDING_TASK_CODE_ORIENTATION,
	ONBOARDING_TASK_CODE_WORK_ELIGIBILITY,
} from "../src/lifecycle/onboarding-checklist";
import {
	extendProbation,
	openProbation,
	recordProbationOutcome,
} from "../src/lifecycle/probation";
import {
	approveTermination,
	finalizeTermination,
	proposeTermination,
} from "../src/lifecycle/termination";
import { transferAssignment } from "../src/lifecycle/transfer";
import {
	HUMAN_RESOURCES_COMMAND_APPLICATION_CREATE,
	HUMAN_RESOURCES_COMMAND_APPLICATION_MOVE_TO_IN_REVIEW,
	HUMAN_RESOURCES_COMMAND_APPLICATION_MOVE_TO_INTERVIEWING,
	HUMAN_RESOURCES_COMMAND_APPLICATION_REJECT,
	HUMAN_RESOURCES_COMMAND_APPLICATION_WITHDRAW,
	HUMAN_RESOURCES_COMMAND_ASSIGNMENT_CREATE,
	HUMAN_RESOURCES_COMMAND_ASSIGNMENT_TRANSFER,
	HUMAN_RESOURCES_COMMAND_ATTENDANCE_EVENT_CORRECT,
	HUMAN_RESOURCES_COMMAND_ATTENDANCE_EVENT_RECORD,
	HUMAN_RESOURCES_COMMAND_ATTENDANCE_EVENT_VOID,
	HUMAN_RESOURCES_COMMAND_ATTENDANCE_EVENTS_IMPORT,
	HUMAN_RESOURCES_COMMAND_ATTENDANCE_EXCEPTION_CREATE,
	HUMAN_RESOURCES_COMMAND_ATTENDANCE_EXCEPTION_EXCUSE,
	HUMAN_RESOURCES_COMMAND_ATTENDANCE_EXCEPTION_REJECT,
	HUMAN_RESOURCES_COMMAND_ATTENDANCE_EXCEPTION_RESOLVE,
	HUMAN_RESOURCES_COMMAND_ATTENDANCE_EXCEPTION_REVIEW,
	HUMAN_RESOURCES_COMMAND_ATTENDANCE_SESSION_RESOLVE,
	HUMAN_RESOURCES_COMMAND_BENEFIT_ENROLLMENT_CANCEL,
	HUMAN_RESOURCES_COMMAND_BENEFIT_ENROLLMENT_END,
	HUMAN_RESOURCES_COMMAND_BENEFIT_ENROLLMENT_ENROL,
	HUMAN_RESOURCES_COMMAND_CANDIDATE_ANONYMIZE,
	HUMAN_RESOURCES_COMMAND_CANDIDATE_CHANGE_RETENTION,
	HUMAN_RESOURCES_COMMAND_CANDIDATE_CREATE,
	HUMAN_RESOURCES_COMMAND_CANDIDATE_WITHDRAW_CONSENT,
	HUMAN_RESOURCES_COMMAND_CERTIFICATION_EXPIRE,
	HUMAN_RESOURCES_COMMAND_CERTIFICATION_ISSUE,
	HUMAN_RESOURCES_COMMAND_CERTIFICATION_RENEW,
	HUMAN_RESOURCES_COMMAND_CERTIFICATION_REVOKE,
	HUMAN_RESOURCES_COMMAND_COMPENSATION_REVIEW_APPLY_APPROVED_RESULT,
	HUMAN_RESOURCES_COMMAND_COMPLETION_RECORD,
	HUMAN_RESOURCES_COMMAND_DEPARTMENT_ACTIVATE,
	HUMAN_RESOURCES_COMMAND_DOCUMENT_REQUIREMENT_CREATE,
	HUMAN_RESOURCES_COMMAND_DOCUMENT_REQUIREMENT_PUBLISH,
	HUMAN_RESOURCES_COMMAND_DOCUMENT_REQUIREMENT_RETIRE,
	HUMAN_RESOURCES_COMMAND_DOCUMENT_REQUIREMENT_UPDATE,
	HUMAN_RESOURCES_COMMAND_EMPLOYEE_CASE_ASSIGN_OWNER,
	HUMAN_RESOURCES_COMMAND_EMPLOYEE_CASE_RECORD_APPEAL,
	HUMAN_RESOURCES_COMMAND_EMPLOYEE_CASE_REOPEN,
	HUMAN_RESOURCES_COMMAND_EMPLOYEE_COMPENSATION_CREATE,
	HUMAN_RESOURCES_COMMAND_EMPLOYEE_COMPENSATION_END,
	HUMAN_RESOURCES_COMMAND_EMPLOYEE_CREATE,
	HUMAN_RESOURCES_COMMAND_EMPLOYEE_DOCUMENT_MARK_EXPIRED,
	HUMAN_RESOURCES_COMMAND_EMPLOYEE_DOCUMENT_REGISTER,
	HUMAN_RESOURCES_COMMAND_EMPLOYEE_DOCUMENT_REJECT,
	HUMAN_RESOURCES_COMMAND_EMPLOYEE_DOCUMENT_REVOKE_VERIFICATION,
	HUMAN_RESOURCES_COMMAND_EMPLOYEE_DOCUMENT_UPDATE_METADATA,
	HUMAN_RESOURCES_COMMAND_EMPLOYEE_DOCUMENT_VERIFY,
	HUMAN_RESOURCES_COMMAND_EMPLOYMENT_CALENDAR_ASSIGN,
	HUMAN_RESOURCES_COMMAND_EMPLOYMENT_CALENDAR_END,
	HUMAN_RESOURCES_COMMAND_EMPLOYMENT_CONFIRM,
	HUMAN_RESOURCES_COMMAND_EMPLOYMENT_CONTRACT_CREATE,
	HUMAN_RESOURCES_COMMAND_EMPLOYMENT_CREATE,
	HUMAN_RESOURCES_COMMAND_HEADCOUNT_PLAN_APPROVE,
	HUMAN_RESOURCES_COMMAND_HEADCOUNT_RESERVATION_CONSUME,
	HUMAN_RESOURCES_COMMAND_HEADCOUNT_RESERVATION_RELEASE,
	HUMAN_RESOURCES_COMMAND_HEADCOUNT_RESERVE,
	HUMAN_RESOURCES_COMMAND_IMPROVEMENT_PLAN_COMPLETE,
	HUMAN_RESOURCES_COMMAND_IMPROVEMENT_PLAN_OPEN,
	HUMAN_RESOURCES_COMMAND_INTERVIEW_RECORD_EVALUATION,
	HUMAN_RESOURCES_COMMAND_INTERVIEW_SCHEDULE,
	HUMAN_RESOURCES_COMMAND_LEARNING_ASSIGNMENT_CREATE,
	HUMAN_RESOURCES_COMMAND_LEAVE_REQUEST_APPROVE,
	HUMAN_RESOURCES_COMMAND_LEAVE_REQUEST_REJECT,
	HUMAN_RESOURCES_COMMAND_LEAVE_REQUEST_SUBMIT,
	HUMAN_RESOURCES_COMMAND_OFFBOARDING_COMPLETE,
	HUMAN_RESOURCES_COMMAND_OFFBOARDING_COMPLETE_TASK,
	HUMAN_RESOURCES_COMMAND_OFFBOARDING_RECORD_ACCESS_REVOCATION,
	HUMAN_RESOURCES_COMMAND_OFFBOARDING_RECORD_CLEARANCE,
	HUMAN_RESOURCES_COMMAND_OFFBOARDING_RECORD_EXIT_INTERVIEW,
	HUMAN_RESOURCES_COMMAND_OFFBOARDING_RECORD_PAYROLL_HANDOFF,
	HUMAN_RESOURCES_COMMAND_OFFBOARDING_START,
	HUMAN_RESOURCES_COMMAND_OFFER_ACCEPT,
	HUMAN_RESOURCES_COMMAND_OFFER_DECLINE,
	HUMAN_RESOURCES_COMMAND_OFFER_EXPIRE,
	HUMAN_RESOURCES_COMMAND_OFFER_ISSUE,
	HUMAN_RESOURCES_COMMAND_OFFER_WITHDRAW,
	HUMAN_RESOURCES_COMMAND_ONBOARDING_COMPLETE,
	HUMAN_RESOURCES_COMMAND_ONBOARDING_COMPLETE_TASK,
	HUMAN_RESOURCES_COMMAND_ONBOARDING_START,
	HUMAN_RESOURCES_COMMAND_OVERTIME_REQUEST_APPROVE,
	HUMAN_RESOURCES_COMMAND_OVERTIME_REQUEST_CANCEL,
	HUMAN_RESOURCES_COMMAND_OVERTIME_REQUEST_CREATE,
	HUMAN_RESOURCES_COMMAND_OVERTIME_REQUEST_RECORD_ACTUAL,
	HUMAN_RESOURCES_COMMAND_OVERTIME_REQUEST_REJECT,
	HUMAN_RESOURCES_COMMAND_OVERTIME_REQUEST_VERIFY,
	HUMAN_RESOURCES_COMMAND_PERFORMANCE_CYCLE_OPEN,
	HUMAN_RESOURCES_COMMAND_PERFORMANCE_GOAL_APPROVE,
	HUMAN_RESOURCES_COMMAND_PERFORMANCE_REVIEW_FINALIZE,
	HUMAN_RESOURCES_COMMAND_PERFORMANCE_REVIEW_REOPEN,
	HUMAN_RESOURCES_COMMAND_PERSON_CREATE,
	HUMAN_RESOURCES_COMMAND_PERSON_UPDATE,
	HUMAN_RESOURCES_COMMAND_POLICY_ACKNOWLEDGEMENT_ACKNOWLEDGE,
	HUMAN_RESOURCES_COMMAND_POLICY_ACKNOWLEDGEMENT_ISSUE,
	HUMAN_RESOURCES_COMMAND_POLICY_ACKNOWLEDGEMENT_REVOKE,
	HUMAN_RESOURCES_COMMAND_POLICY_ACKNOWLEDGEMENT_SUPERSEDE,
	HUMAN_RESOURCES_COMMAND_PRIVACY_LEGAL_HOLD_PLACE,
	HUMAN_RESOURCES_COMMAND_PRIVACY_LEGAL_HOLD_RELEASE,
	HUMAN_RESOURCES_COMMAND_PRIVACY_SUBJECT_ANONYMIZE,
	HUMAN_RESOURCES_COMMAND_PROBATION_EXTEND,
	HUMAN_RESOURCES_COMMAND_PROBATION_OPEN,
	HUMAN_RESOURCES_COMMAND_PROBATION_RECORD_OUTCOME,
	HUMAN_RESOURCES_COMMAND_REQUISITION_APPROVE,
	HUMAN_RESOURCES_COMMAND_REQUISITION_CLOSE,
	HUMAN_RESOURCES_COMMAND_REQUISITION_OPEN,
	HUMAN_RESOURCES_COMMAND_SHIFT_ACTIVATE,
	HUMAN_RESOURCES_COMMAND_SHIFT_ASSIGN,
	HUMAN_RESOURCES_COMMAND_SHIFT_ASSIGNMENT_CANCEL,
	HUMAN_RESOURCES_COMMAND_SHIFT_ASSIGNMENT_CHANGE,
	HUMAN_RESOURCES_COMMAND_SHIFT_ASSIGNMENT_COMPLETE,
	HUMAN_RESOURCES_COMMAND_SHIFT_ASSIGNMENT_PUBLISH,
	HUMAN_RESOURCES_COMMAND_SHIFT_BREAK_ADD,
	HUMAN_RESOURCES_COMMAND_SHIFT_BREAK_REMOVE,
	HUMAN_RESOURCES_COMMAND_SHIFT_CREATE,
	HUMAN_RESOURCES_COMMAND_SHIFT_DEACTIVATE,
	HUMAN_RESOURCES_COMMAND_SHIFT_UPDATE,
	HUMAN_RESOURCES_COMMAND_TALENT_POOL_MEMBER_REMOVE,
	HUMAN_RESOURCES_COMMAND_TALENT_PROFILE_CREATE,
	HUMAN_RESOURCES_COMMAND_TALENT_PROFILE_UPDATE,
	HUMAN_RESOURCES_COMMAND_TERMINATION_FINALIZE,
	HUMAN_RESOURCES_COMMAND_TIMESHEET_APPROVE,
	HUMAN_RESOURCES_COMMAND_TIMESHEET_CREATE,
	HUMAN_RESOURCES_COMMAND_TIMESHEET_ENTRY_ADD,
	HUMAN_RESOURCES_COMMAND_TIMESHEET_ENTRY_REMOVE,
	HUMAN_RESOURCES_COMMAND_TIMESHEET_ENTRY_UPDATE,
	HUMAN_RESOURCES_COMMAND_TIMESHEET_GENERATE_ENTRIES,
	HUMAN_RESOURCES_COMMAND_TIMESHEET_LOCK,
	HUMAN_RESOURCES_COMMAND_TIMESHEET_REJECT,
	HUMAN_RESOURCES_COMMAND_TIMESHEET_REOPEN,
	HUMAN_RESOURCES_COMMAND_TIMESHEET_RETURN,
	HUMAN_RESOURCES_COMMAND_TIMESHEET_SUBMIT,
	HUMAN_RESOURCES_COMMAND_TIMESHEET_SUPERSEDE,
	HUMAN_RESOURCES_COMMAND_WORK_CALENDAR_ARCHIVE,
	HUMAN_RESOURCES_COMMAND_WORK_CALENDAR_CREATE,
	HUMAN_RESOURCES_COMMAND_WORK_CALENDAR_DATE_OVERRIDE_ADD,
	HUMAN_RESOURCES_COMMAND_WORK_CALENDAR_DATE_OVERRIDE_REMOVE,
	HUMAN_RESOURCES_COMMAND_WORK_CALENDAR_HOLIDAY_ADD,
	HUMAN_RESOURCES_COMMAND_WORK_CALENDAR_HOLIDAY_REMOVE,
	HUMAN_RESOURCES_COMMAND_WORK_CALENDAR_UPDATE,
	HUMAN_RESOURCES_COMMAND_WORK_ELIGIBILITY_CLOSE,
	HUMAN_RESOURCES_COMMAND_WORK_ELIGIBILITY_RECORD,
	HUMAN_RESOURCES_COMMAND_WORK_ELIGIBILITY_RENEW,
	HUMAN_RESOURCES_COMMAND_WORK_ELIGIBILITY_SUSPEND,
	HUMAN_RESOURCES_COMMAND_WORK_ELIGIBILITY_VERIFY,
	HUMAN_RESOURCES_COMMAND_WORKER_CHANGE_STATUS,
	HUMAN_RESOURCES_COMMAND_WORKER_CHANGE_TYPE,
	HUMAN_RESOURCES_COMMAND_WORKER_CREATE,
	HUMAN_RESOURCES_COMPENSATION_BENEFITS_COMMAND_IDS,
	HUMAN_RESOURCES_COMPLIANCE_COMMAND_IDS,
	HUMAN_RESOURCES_EMPLOYEE_RELATIONS_COMMAND_IDS,
	HUMAN_RESOURCES_EMPLOYMENT_LIFECYCLE_COMMAND_IDS,
	HUMAN_RESOURCES_HIRE_ORCHESTRATION_COMMAND_IDS,
	HUMAN_RESOURCES_LEARNING_COMMAND_IDS,
	HUMAN_RESOURCES_LEAVE_COMMAND_IDS,
	HUMAN_RESOURCES_ORGANIZATION_COMMAND_IDS,
	HUMAN_RESOURCES_PERFORMANCE_COMMAND_IDS,
	HUMAN_RESOURCES_RECRUITMENT_COMMAND_IDS,
	HUMAN_RESOURCES_TALENT_COMMAND_IDS,
	HUMAN_RESOURCES_TIME_COMMAND_IDS,
	HUMAN_RESOURCES_WORKFORCE_FOUNDATION_COMMAND_IDS,
	HUMAN_RESOURCES_WORKFORCE_PLANNING_COMMAND_IDS,
} from "../src/module-ids";
import { HUMAN_RESOURCES_MUTATION_EMISSION_REGISTRY } from "../src/mutation-emission-registry";
import {
	activateDepartment,
	archiveDepartment,
	createDepartment,
} from "../src/organization/department";
import { createPosition } from "../src/organization/position";
import { assignPrimaryReportingLine } from "../src/organization/reporting-line";
import { approvePerformanceGoal } from "../src/performance/goal";
import {
	completeImprovementPlan,
	createImprovementPlan,
	openImprovementPlan,
	recordImprovementCheckpoint,
} from "../src/performance/improvement-plan";
import {
	addCycleParticipant,
	openPerformanceCycle,
} from "../src/performance/performance-cycle";
import {
	acknowledgePerformanceReview,
	finalizePerformanceReview,
	reopenPerformanceReview,
} from "../src/performance/review";
import {
	HUMAN_RESOURCES_PERMISSION_CODES,
	HUMAN_RESOURCES_PERMISSION_LEAVE_REQUEST_APPROVE_TEAM,
	HUMAN_RESOURCES_PERMISSION_ORGANIZATION_MANAGE,
} from "../src/permissions";
import { createProductionWorkCalendar } from "../src/production-work-calendar";
import {
	createApplication,
	moveApplicationToInReview,
	moveApplicationToInterviewing,
	rejectApplication,
	withdrawApplication,
} from "../src/recruitment/application";
import {
	anonymizeCandidate,
	changeCandidateRetention,
	createCandidate,
	withdrawCandidateConsent,
} from "../src/recruitment/candidate";
import {
	recordInterviewEvaluation,
	scheduleInterview,
} from "../src/recruitment/interview";
import {
	acceptOffer,
	amendOfferDraft,
	approveOffer,
	createOffer,
	declineOffer,
	expireOffer,
	issueOffer,
	withdrawOffer,
} from "../src/recruitment/offer";
import {
	approveRequisition,
	closeRequisition,
	createDraftRequisition,
	openRequisition,
	submitRequisition,
} from "../src/recruitment/requisition";
import { runSequential, sequentialReturn } from "../src/shared/run-sequential";
import {
	approveTalentPoolMember,
	createTalentPool,
	nominateTalentPoolMember,
	removeTalentPoolMember,
} from "../src/talent/talent-pool";
import {
	createTalentProfile,
	updateTalentProfile,
} from "../src/talent/talent-profile";
import {
	createMemoryHumanResourcesStore,
	createMemoryWorkCalendar,
} from "../src/testing";
import {
	correctAttendanceEvent,
	recordClockIn,
	recordClockOut,
	voidAttendanceEvent,
} from "../src/time/attendance/events";
import {
	createAttendanceException,
	excuseAttendanceException,
	rejectAttendanceException,
	resolveAttendanceException,
	reviewAttendanceException,
} from "../src/time/attendance/exceptions";
import { importAttendanceEvents } from "../src/time/attendance/import";
import { resolveAttendanceSession } from "../src/time/attendance/sessions";
import {
	addCalendarDateOverride,
	addWorkCalendarHoliday,
	archiveWorkCalendar,
	assignEmploymentCalendar,
	createWorkCalendar,
	endWorkCalendarAssignment,
	removeCalendarDateOverride,
	removeWorkCalendarHoliday,
	updateWorkCalendar,
} from "../src/time/calendar";
import {
	approveOvertimeRequest,
	cancelOvertimeRequest,
	createOvertimeRequest,
	recordOvertimeActual,
	rejectOvertimeRequest,
	verifyOvertimeRequest,
} from "../src/time/overtime";
import { assignTimeApprovalAuthority } from "../src/time/policy";
import {
	assignShift,
	cancelShiftAssignment,
	changeShiftAssignment,
	completeShiftAssignment,
	publishShiftAssignment,
} from "../src/time/scheduling";
import {
	activateShift,
	addShiftBreak,
	createShift,
	deactivateShift,
	removeShiftBreak,
	updateShift,
} from "../src/time/shift";
import {
	addTimesheetEntry,
	approveTimesheet,
	createTimesheet,
	generateTimesheetEntries,
	getTimesheet,
	lockTimesheet,
	rejectTimesheet,
	removeTimesheetEntry,
	reopenTimesheet,
	returnTimesheet,
	submitTimesheet,
	supersedeTimesheet,
	updateTimesheetEntry,
} from "../src/time/timesheet";
import {
	createPerson,
	updatePersonName,
} from "../src/workforce-foundation/person";
import {
	changeWorkerStatus,
	changeWorkerType,
	createWorker,
} from "../src/workforce-foundation/worker";
import {
	approveHeadcountPlan,
	createHeadcountPlan,
	submitHeadcountPlan,
} from "../src/workforce-planning/headcount-plan";
import { addHeadcountPlanLine } from "../src/workforce-planning/headcount-plan-line";
import {
	consumeHeadcountReservation,
	releaseHeadcountReservation,
	reserveHeadcount,
} from "../src/workforce-planning/headcount-reservation";
import { candidateConsentFixture } from "./helpers/candidate-consent-fixture";
import {
	createTestHumanResourcesCommandOptions,
	TEST_ORGANIZATION_DIMENSION_KEYS,
} from "./helpers/command-options";
import {
	seedCompensationCorrelationFixture,
	seedFinalizedCompensationReview,
} from "./helpers/compensation-correlation-seed";
import { helperAssert as assert } from "./helpers/helper-assert";
import {
	createStoreBackedIdentityResolver,
	mapActorToEmployee,
} from "./helpers/identity-resolver";
import { seedLeaveCorrelationFixture } from "./helpers/leave-correlation-seed";
import { seedLifecycleEmploymentWithAssignment } from "./helpers/lifecycle-correlation-seed";
import { createGrantingHumanResourcesAuthorization } from "./helpers/memory-authorization";
import { createMemoryMutationPorts } from "./helpers/memory-ports";
import {
	attachApprovedProposalAndIssueExistingOffer,
	seedApprovedCompensationProposal,
	withOfferLifecycleDeps,
} from "./helpers/offer-lifecycle-fixture";
import {
	seedDraftPerformanceCycle,
	seedManagerSubmittedPerformanceReview,
	seedOpenPerformanceCycleWithParticipant,
	seedPerformanceCorrelationWorker,
	seedSubmittedPerformanceGoal,
} from "./helpers/performance-correlation-seed";
import { publishPerformanceCycleReady } from "./helpers/performance-cycle-harness";
import {
	approveAndOpenRequisitionForCorrelation,
	seedCandidateForCorrelation,
	seedOpenRequisitionForCorrelation,
} from "./helpers/recruitment-correlation-seed";
import { SAMPLE_INTERVIEW_SCORECARD } from "./helpers/recruitment-interview-fixture";
import { seedDefaultHiringManager } from "./helpers/recruitment-requisition-fixture";
import { seedDepartmentAndJob } from "./helpers/seed-department-and-job";
import { createStoreWorkCalendarLookup } from "./helpers/store-work-calendar-lookup";
import {
	seedTimeCorrelationEmployeeEmployment,
	TIME_CORR_STANDARD_WEEK,
} from "./helpers/time-correlation-seed";

const ORG = "org-corr-integrity";
const ACTOR = "user-corr-integrity";
const MANAGER = "user-corr-manager";
const MILLISECONDS_PER_DAY = 86_400_000;
const TOMORROW = new Date(Date.now() + MILLISECONDS_PER_DAY)
	.toISOString()
	.slice(0, 10);

function harness() {
	const store = createMemoryHumanResourcesStore();
	const ports = createMemoryMutationPorts();
	const authorization = createGrantingHumanResourcesAuthorization([
		...HUMAN_RESOURCES_PERMISSION_CODES,
	]);
	const identityResolver = createStoreBackedIdentityResolver(store);
	return {
		...createTestHumanResourcesCommandOptions({
			store,
			ports,
			authorization,
			identityResolver,
			workCalendar: createProductionWorkCalendar({
				lookup: createStoreWorkCalendarLookup({ store }),
			}),
		}),
		store,
	};
}

function memoryPorts(ready: ReturnType<typeof harness>) {
	return ready.ports as ReturnType<typeof createMemoryMutationPorts>;
}

function clearPorts(ready: ReturnType<typeof harness>) {
	memoryPorts(ready).audit.calls.length = 0;
	memoryPorts(ready).outbox.calls.length = 0;
}

async function grantManagerTimeApprovalAuthority(
	ready: ReturnType<typeof harness>,
	suffix: string,
) {
	const assigned = await assignTimeApprovalAuthority(
		{
			organizationId: ORG,
			actorUserId: ACTOR,
			correlationId: `seed-authority-${suffix}`,
			targetActorUserId: MANAGER,
			authority: "line_manager",
			effectiveFrom: "2020-01-01",
		},
		ready,
	);
	assert.strictEqual(assigned.ok, true);
}

function assertCorrelationPropagated(
	ready: ReturnType<typeof harness>,
	correlationId: string,
	options: { expectOutbox: boolean; operation: string },
) {
	const ports = ready.ports as ReturnType<typeof createMemoryMutationPorts>;
	assert.isAbove(ports.audit.calls.length, 0);
	for (const call of ports.audit.calls) {
		assert.strictEqual(call.correlationId, correlationId);
		assert.notStrictEqual(call.correlationId, options.operation);
	}
	if (options.expectOutbox) {
		assert.isAbove(ports.outbox.calls.length, 0);
		for (const call of ports.outbox.calls) {
			assert.strictEqual(call.correlationId, correlationId);
			assert.strictEqual(call.payload.correlationId, correlationId);
			if (typeof call.payload.operation === "string") {
				assert.strictEqual(call.payload.operation, options.operation);
			}
		}
	}
}

describe("correlation integrity", () => {
	it("covers every emission-registry command with a fixture", () => {
		const covered = new Set([
			HUMAN_RESOURCES_COMMAND_EMPLOYEE_CREATE,
			HUMAN_RESOURCES_COMMAND_PERSON_CREATE,
			HUMAN_RESOURCES_COMMAND_PERSON_UPDATE,
			HUMAN_RESOURCES_COMMAND_WORKER_CREATE,
			HUMAN_RESOURCES_COMMAND_WORKER_CHANGE_TYPE,
			HUMAN_RESOURCES_COMMAND_WORKER_CHANGE_STATUS,
			HUMAN_RESOURCES_COMMAND_DOCUMENT_REQUIREMENT_CREATE,
			HUMAN_RESOURCES_COMMAND_DOCUMENT_REQUIREMENT_UPDATE,
			HUMAN_RESOURCES_COMMAND_DOCUMENT_REQUIREMENT_PUBLISH,
			HUMAN_RESOURCES_COMMAND_DOCUMENT_REQUIREMENT_RETIRE,
			HUMAN_RESOURCES_COMMAND_EMPLOYEE_DOCUMENT_REGISTER,
			HUMAN_RESOURCES_COMMAND_EMPLOYEE_DOCUMENT_UPDATE_METADATA,
			HUMAN_RESOURCES_COMMAND_EMPLOYEE_DOCUMENT_VERIFY,
			HUMAN_RESOURCES_COMMAND_EMPLOYEE_DOCUMENT_REJECT,
			HUMAN_RESOURCES_COMMAND_EMPLOYEE_DOCUMENT_REVOKE_VERIFICATION,
			HUMAN_RESOURCES_COMMAND_EMPLOYEE_DOCUMENT_MARK_EXPIRED,
			HUMAN_RESOURCES_COMMAND_WORK_ELIGIBILITY_RECORD,
			HUMAN_RESOURCES_COMMAND_WORK_ELIGIBILITY_VERIFY,
			HUMAN_RESOURCES_COMMAND_WORK_ELIGIBILITY_SUSPEND,
			HUMAN_RESOURCES_COMMAND_WORK_ELIGIBILITY_RENEW,
			HUMAN_RESOURCES_COMMAND_WORK_ELIGIBILITY_CLOSE,
			HUMAN_RESOURCES_COMMAND_POLICY_ACKNOWLEDGEMENT_ISSUE,
			HUMAN_RESOURCES_COMMAND_POLICY_ACKNOWLEDGEMENT_ACKNOWLEDGE,
			HUMAN_RESOURCES_COMMAND_POLICY_ACKNOWLEDGEMENT_REVOKE,
			HUMAN_RESOURCES_COMMAND_POLICY_ACKNOWLEDGEMENT_SUPERSEDE,
			HUMAN_RESOURCES_COMMAND_CERTIFICATION_ISSUE,
			HUMAN_RESOURCES_COMMAND_CERTIFICATION_EXPIRE,
			HUMAN_RESOURCES_COMMAND_CERTIFICATION_REVOKE,
			HUMAN_RESOURCES_COMMAND_CERTIFICATION_RENEW,
			HUMAN_RESOURCES_COMMAND_COMPLETION_RECORD,
			HUMAN_RESOURCES_COMMAND_TIMESHEET_APPROVE,
			...HUMAN_RESOURCES_TIME_COMMAND_IDS,
			...HUMAN_RESOURCES_LEAVE_COMMAND_IDS,
			...HUMAN_RESOURCES_WORKFORCE_FOUNDATION_COMMAND_IDS,
			...HUMAN_RESOURCES_EMPLOYMENT_LIFECYCLE_COMMAND_IDS,
			...HUMAN_RESOURCES_ORGANIZATION_COMMAND_IDS,
			...HUMAN_RESOURCES_RECRUITMENT_COMMAND_IDS,
			...HUMAN_RESOURCES_HIRE_ORCHESTRATION_COMMAND_IDS,
			...HUMAN_RESOURCES_EMPLOYEE_RELATIONS_COMMAND_IDS,
			...HUMAN_RESOURCES_COMPLIANCE_COMMAND_IDS,
			...HUMAN_RESOURCES_TALENT_COMMAND_IDS,
			...HUMAN_RESOURCES_WORKFORCE_PLANNING_COMMAND_IDS,
			...HUMAN_RESOURCES_COMPENSATION_BENEFITS_COMMAND_IDS,
			...HUMAN_RESOURCES_PERFORMANCE_COMMAND_IDS,
			...HUMAN_RESOURCES_LEARNING_COMMAND_IDS,
			HUMAN_RESOURCES_COMMAND_PRIVACY_LEGAL_HOLD_PLACE,
			HUMAN_RESOURCES_COMMAND_PRIVACY_LEGAL_HOLD_RELEASE,
			HUMAN_RESOURCES_COMMAND_PRIVACY_SUBJECT_ANONYMIZE,
		]);
		for (const entry of HUMAN_RESOURCES_MUTATION_EMISSION_REGISTRY) {
			expect(covered.has(entry.command)).toBe(true);
		}
	});

	it("propagates correlationId for employee create (domain_event)", async () => {
		const ready = harness();
		const correlationId = "trace-employee-create";
		const created = await createEmployee(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId,
				idempotencyKey: "idem-emp-corr",
				employeeNumber: "E-CORR-1",
				legalName: "Corr Worker",
			},
			ready,
		);
		expect(created.ok).toBe(true);
		assertCorrelationPropagated(ready, correlationId, {
			expectOutbox: true,
			operation: HUMAN_RESOURCES_COMMAND_EMPLOYEE_CREATE,
		});
	});

	it("propagates correlationId across workforce foundation mutations", async () => {
		const ready = harness();

		const personCorr = "trace-person-create";
		const person = await createPerson(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: personCorr,
				idempotencyKey: "idem-person-corr",
				legalName: "Workforce Corr",
			},
			ready,
		);
		expect(person.ok).toBe(true);
		if (!person.ok) {
			return;
		}
		assertCorrelationPropagated(ready, personCorr, {
			expectOutbox: true,
			operation: HUMAN_RESOURCES_COMMAND_PERSON_CREATE,
		});

		clearPorts(ready);
		const nameCorr = "trace-person-update";
		const renamed = await updatePersonName(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: nameCorr,
				personId: person.data.id,
				legalName: "Workforce Corr Updated",
				effectiveOn: TOMORROW,
				reasonCode: "legal_name_correction",
				expectedVersion: person.data.version,
			},
			ready,
		);
		expect(renamed.ok).toBe(true);
		if (!renamed.ok) {
			return;
		}
		assertCorrelationPropagated(ready, nameCorr, {
			expectOutbox: true,
			operation: HUMAN_RESOURCES_COMMAND_PERSON_UPDATE,
		});

		clearPorts(ready);
		const workerCorr = "trace-worker-create";
		const worker = await createWorker(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: workerCorr,
				idempotencyKey: "idem-worker-corr",
				personId: person.data.id,
				workerType: "contractor",
				effectiveFrom: "2026-01-01",
			},
			ready,
		);
		expect(worker.ok).toBe(true);
		if (!worker.ok) {
			return;
		}
		assertCorrelationPropagated(ready, workerCorr, {
			expectOutbox: true,
			operation: HUMAN_RESOURCES_COMMAND_WORKER_CREATE,
		});

		clearPorts(ready);
		const typeCorr = "trace-worker-change-type";
		const retyped = await changeWorkerType(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: typeCorr,
				workerId: worker.data.id,
				workerType: "intern",
				employeeId: null,
				effectiveOn: "2026-02-01",
				reasonCode: "reclassification",
				expectedVersion: worker.data.version,
			},
			ready,
		);
		expect(retyped.ok).toBe(true);
		if (!retyped.ok) {
			return;
		}
		assertCorrelationPropagated(ready, typeCorr, {
			expectOutbox: true,
			operation: HUMAN_RESOURCES_COMMAND_WORKER_CHANGE_TYPE,
		});

		clearPorts(ready);
		const statusCorr = "trace-worker-change-status";
		const statusChanged = await changeWorkerStatus(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: statusCorr,
				workerId: retyped.data.id,
				status: "inactive",
				effectiveOn: "2026-03-01",
				reasonCode: "status_change",
				expectedVersion: retyped.data.version,
			},
			ready,
		);
		expect(statusChanged.ok).toBe(true);
		if (!statusChanged.ok) {
			return;
		}
		assertCorrelationPropagated(ready, statusCorr, {
			expectOutbox: true,
			operation: HUMAN_RESOURCES_COMMAND_WORKER_CHANGE_STATUS,
		});
	});

	it("propagates correlationId across candidate consent lifecycle mutations", async () => {
		const ready = harness();
		const suffix = `${Date.now()}`;

		const created = await createCandidate(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-candidate-create-${suffix}`,
				idempotencyKey: `idem-candidate-create-${suffix}`,
				displayName: "Consent Corr",
				email: `consent-corr-${suffix}@example.com`,
				...candidateConsentFixture(),
			},
			ready,
		);
		expect(created.ok).toBe(true);
		if (!created.ok) {
			return;
		}

		clearPorts(ready);
		const withdrawCorr = `trace-candidate-withdraw-${suffix}`;
		const withdrawn = await withdrawCandidateConsent(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: withdrawCorr,
				candidateId: created.data.id,
				expectedVersion: created.data.version,
			},
			ready,
		);
		expect(withdrawn.ok).toBe(true);
		if (!withdrawn.ok) {
			return;
		}
		assertCorrelationPropagated(ready, withdrawCorr, {
			expectOutbox: true,
			operation: HUMAN_RESOURCES_COMMAND_CANDIDATE_WITHDRAW_CONSENT,
		});

		clearPorts(ready);
		const retentionCreate = await createCandidate(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-candidate-retention-create-${suffix}`,
				idempotencyKey: `idem-candidate-retention-create-${suffix}`,
				displayName: "Retention Corr",
				email: `retention-corr-${suffix}@example.com`,
				...candidateConsentFixture({ retentionUntil: "2028-01-15" }),
			},
			ready,
		);
		expect(retentionCreate.ok).toBe(true);
		if (!retentionCreate.ok) {
			return;
		}

		clearPorts(ready);
		const retentionCorr = `trace-candidate-retention-${suffix}`;
		const changed = await changeCandidateRetention(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: retentionCorr,
				candidateId: retentionCreate.data.id,
				retentionUntil: "2029-06-01",
				expectedVersion: retentionCreate.data.version,
			},
			ready,
		);
		expect(changed.ok).toBe(true);
		if (!changed.ok) {
			return;
		}
		assertCorrelationPropagated(ready, retentionCorr, {
			expectOutbox: true,
			operation: HUMAN_RESOURCES_COMMAND_CANDIDATE_CHANGE_RETENTION,
		});

		clearPorts(ready);
		const anonCreate = await createCandidate(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-candidate-anon-create-${suffix}`,
				idempotencyKey: `idem-candidate-anon-create-${suffix}`,
				displayName: "Anon Corr",
				email: `anon-corr-${suffix}@example.com`,
				...candidateConsentFixture({ retentionUntil: "2026-03-01" }),
			},
			ready,
		);
		expect(anonCreate.ok).toBe(true);
		if (!anonCreate.ok) {
			return;
		}

		clearPorts(ready);
		const anonCorr = `trace-candidate-anonymize-${suffix}`;
		const anonymized = await anonymizeCandidate(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: anonCorr,
				candidateId: anonCreate.data.id,
				expectedVersion: anonCreate.data.version,
				asOf: "2026-06-01",
			},
			ready,
		);
		expect(anonymized.ok).toBe(true);
		if (!anonymized.ok) {
			return;
		}
		assertCorrelationPropagated(ready, anonCorr, {
			expectOutbox: true,
			operation: HUMAN_RESOURCES_COMMAND_CANDIDATE_ANONYMIZE,
		});
	});

	it("propagates correlationId across recruitment domain_event mutations", async () => {
		const ready = harness();
		const suffix = `${Date.now()}`;
		const prefix = `rec-corr-${suffix}`;

		const seeded = await seedOpenRequisitionForCorrelation(ready, {
			organizationId: ORG,
			actorUserId: ACTOR,
			code: `REQ-${suffix.slice(-6)}`,
			correlationPrefix: prefix,
		});
		expect(seeded.ok).toBe(true);
		if (!seeded.ok) {
			return;
		}

		clearPorts(ready);
		const approveCorr = `trace-req-approve-${suffix}`;
		const approved = await approveRequisition(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: approveCorr,
				requisitionId: seeded.submitted.data.id,
				expectedVersion: seeded.submitted.data.version,
			},
			ready,
		);
		expect(approved.ok).toBe(true);
		if (!approved.ok) {
			return;
		}
		assertCorrelationPropagated(ready, approveCorr, {
			expectOutbox: true,
			operation: HUMAN_RESOURCES_COMMAND_REQUISITION_APPROVE,
		});

		clearPorts(ready);
		const openCorr = `trace-req-open-${suffix}`;
		const opened = await openRequisition(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: openCorr,
				requisitionId: approved.data.id,
				expectedVersion: approved.data.version,
			},
			ready,
		);
		expect(opened.ok).toBe(true);
		if (!opened.ok) {
			return;
		}
		assertCorrelationPropagated(ready, openCorr, {
			expectOutbox: true,
			operation: HUMAN_RESOURCES_COMMAND_REQUISITION_OPEN,
		});

		clearPorts(ready);
		const candidateCorr = `trace-cand-create-${suffix}`;
		const candidate = await seedCandidateForCorrelation(ready, {
			organizationId: ORG,
			actorUserId: ACTOR,
			email: `rec-corr-${suffix}@example.com`,
			correlationId: candidateCorr,
			idempotencyKey: `idem-cand-${suffix}`,
		});
		expect(candidate.ok).toBe(true);
		if (!candidate.ok) {
			return;
		}
		assertCorrelationPropagated(ready, candidateCorr, {
			expectOutbox: true,
			operation: HUMAN_RESOURCES_COMMAND_CANDIDATE_CREATE,
		});

		clearPorts(ready);
		const appCreateCorr = `trace-app-create-${suffix}`;
		const application = await createApplication(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: appCreateCorr,
				candidateId: candidate.data.id,
				requisitionId: opened.data.id,
			},
			ready,
		);
		expect(application.ok).toBe(true);
		if (!application.ok) {
			return;
		}
		assertCorrelationPropagated(ready, appCreateCorr, {
			expectOutbox: true,
			operation: HUMAN_RESOURCES_COMMAND_APPLICATION_CREATE,
		});

		clearPorts(ready);
		const inReviewCorr = `trace-app-review-${suffix}`;
		const inReview = await moveApplicationToInReview(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: inReviewCorr,
				applicationId: application.data.id,
				expectedVersion: application.data.version,
			},
			ready,
		);
		expect(inReview.ok).toBe(true);
		if (!inReview.ok) {
			return;
		}
		assertCorrelationPropagated(ready, inReviewCorr, {
			expectOutbox: true,
			operation: HUMAN_RESOURCES_COMMAND_APPLICATION_MOVE_TO_IN_REVIEW,
		});

		clearPorts(ready);
		const interviewingCorr = `trace-app-interviewing-${suffix}`;
		const interviewing = await moveApplicationToInterviewing(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: interviewingCorr,
				applicationId: inReview.data.id,
				expectedVersion: inReview.data.version,
			},
			ready,
		);
		expect(interviewing.ok).toBe(true);
		if (!interviewing.ok) {
			return;
		}
		assertCorrelationPropagated(ready, interviewingCorr, {
			expectOutbox: true,
			operation: HUMAN_RESOURCES_COMMAND_APPLICATION_MOVE_TO_INTERVIEWING,
		});

		clearPorts(ready);
		const scheduleCorr = `trace-int-schedule-${suffix}`;
		const interview = await scheduleInterview(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: scheduleCorr,
				applicationId: interviewing.data.id,
				scheduledAt: "2030-01-15T10:00:00.000Z",
				interviewerActorId: ACTOR,
			},
			ready,
		);
		expect(interview.ok).toBe(true);
		if (!interview.ok) {
			return;
		}
		assertCorrelationPropagated(ready, scheduleCorr, {
			expectOutbox: true,
			operation: HUMAN_RESOURCES_COMMAND_INTERVIEW_SCHEDULE,
		});

		clearPorts(ready);
		const evalCorr = `trace-int-eval-${suffix}`;
		const evaluation = await recordInterviewEvaluation(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: evalCorr,
				interviewId: interview.data.id,
				result: "advance",
				scorecard: SAMPLE_INTERVIEW_SCORECARD,
				privateNotes: "confidential notes must not enter outbox",
				expectedVersion: interview.data.version,
			},
			ready,
		);
		expect(evaluation.ok).toBe(true);
		if (!evaluation.ok) {
			return;
		}
		assertCorrelationPropagated(ready, evalCorr, {
			expectOutbox: true,
			operation: HUMAN_RESOURCES_COMMAND_INTERVIEW_RECORD_EVALUATION,
		});
		for (const call of (
			ready.ports as ReturnType<typeof createMemoryMutationPorts>
		).outbox.calls) {
			expect(JSON.stringify(call.payload)).not.toContain("confidential notes");
		}

		const offer = await createOffer(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-offer-${suffix}`,
				applicationId: interviewing.data.id,
				termsSummary: "Full-time offer",
				expiresOn: "2030-12-31",
			},
			ready,
		);
		expect(offer.ok).toBe(true);
		if (!offer.ok) {
			return;
		}

		const proposal = await seedApprovedCompensationProposal(
			withOfferLifecycleDeps(ready),
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				applicationId: interviewing.data.id,
				tag: suffix,
			},
		);
		expect(proposal.ok).toBe(true);
		if (!proposal.ok) {
			return;
		}

		const amended = await amendOfferDraft(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-offer-amend-${suffix}`,
				offerId: offer.data.id,
				compensationProposalId: proposal.data.id,
				expectedVersion: offer.data.version,
			},
			withOfferLifecycleDeps(ready),
		);
		expect(amended.ok).toBe(true);
		if (!amended.ok) {
			return;
		}

		const approvedOffer = await approveOffer(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-offer-approve-${suffix}`,
				offerId: amended.data.id,
				expectedVersion: amended.data.version,
			},
			ready,
		);
		expect(approvedOffer.ok).toBe(true);
		if (!approvedOffer.ok) {
			return;
		}

		clearPorts(ready);
		const issueCorr = `trace-offer-issue-${suffix}`;
		const issued = await issueOffer(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: issueCorr,
				offerId: approvedOffer.data.id,
				expectedVersion: approvedOffer.data.version,
			},
			ready,
		);
		expect(issued.ok).toBe(true);
		if (!issued.ok) {
			return;
		}
		assertCorrelationPropagated(ready, issueCorr, {
			expectOutbox: true,
			operation: HUMAN_RESOURCES_COMMAND_OFFER_ISSUE,
		});

		clearPorts(ready);
		const acceptCorr = `trace-offer-accept-${suffix}`;
		const accepted = await acceptOffer(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: acceptCorr,
				offerId: issued.data.id,
				idempotencyKey: `idem-accept-${suffix}`,
				expectedVersion: issued.data.version,
				asOfDate: "2030-06-01",
			},
			ready,
		);
		expect(accepted.ok).toBe(true);
		if (!accepted.ok) {
			return;
		}
		assertCorrelationPropagated(ready, acceptCorr, {
			expectOutbox: true,
			operation: HUMAN_RESOURCES_COMMAND_OFFER_ACCEPT,
		});

		// Terminal branches on fresh aggregates
		const rejectSeed = await seedOpenRequisitionForCorrelation(ready, {
			organizationId: ORG,
			actorUserId: ACTOR,
			code: `REJ-${suffix.slice(-6)}`,
			correlationPrefix: `${prefix}-rej`,
		});
		expect(rejectSeed.ok).toBe(true);
		if (!rejectSeed.ok) {
			return;
		}
		const rejectOpened = await approveAndOpenRequisitionForCorrelation(ready, {
			organizationId: ORG,
			actorUserId: ACTOR,
			requisitionId: rejectSeed.submitted.data.id,
			expectedVersion: rejectSeed.submitted.data.version,
			approveCorrelationId: `corr-rej-approve-${suffix}`,
			openCorrelationId: `corr-rej-open-${suffix}`,
		});
		expect(rejectOpened.ok).toBe(true);
		if (!rejectOpened.ok) {
			return;
		}
		const rejectCandidate = await seedCandidateForCorrelation(ready, {
			organizationId: ORG,
			actorUserId: ACTOR,
			email: `rec-reject-${suffix}@example.com`,
			correlationId: `corr-rej-cand-${suffix}`,
			idempotencyKey: `idem-rej-cand-${suffix}`,
		});
		expect(rejectCandidate.ok).toBe(true);
		if (!rejectCandidate.ok) {
			return;
		}
		const rejectApp = await createApplication(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-rej-app-${suffix}`,
				candidateId: rejectCandidate.data.id,
				requisitionId: rejectOpened.data.id,
			},
			ready,
		);
		expect(rejectApp.ok).toBe(true);
		if (!rejectApp.ok) {
			return;
		}
		clearPorts(ready);
		const rejectCorr = `trace-app-reject-${suffix}`;
		const rejected = await rejectApplication(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: rejectCorr,
				applicationId: rejectApp.data.id,
				expectedVersion: rejectApp.data.version,
			},
			ready,
		);
		expect(rejected.ok).toBe(true);
		if (!rejected.ok) {
			return;
		}
		assertCorrelationPropagated(ready, rejectCorr, {
			expectOutbox: true,
			operation: HUMAN_RESOURCES_COMMAND_APPLICATION_REJECT,
		});

		const withdrawSeed = await seedOpenRequisitionForCorrelation(ready, {
			organizationId: ORG,
			actorUserId: ACTOR,
			code: `WD-${suffix.slice(-6)}`,
			correlationPrefix: `${prefix}-wd`,
		});
		expect(withdrawSeed.ok).toBe(true);
		if (!withdrawSeed.ok) {
			return;
		}
		const withdrawOpened = await approveAndOpenRequisitionForCorrelation(
			ready,
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				requisitionId: withdrawSeed.submitted.data.id,
				expectedVersion: withdrawSeed.submitted.data.version,
				approveCorrelationId: `corr-wd-approve-${suffix}`,
				openCorrelationId: `corr-wd-open-${suffix}`,
			},
		);
		expect(withdrawOpened.ok).toBe(true);
		if (!withdrawOpened.ok) {
			return;
		}
		const withdrawCandidate = await seedCandidateForCorrelation(ready, {
			organizationId: ORG,
			actorUserId: ACTOR,
			email: `rec-withdraw-${suffix}@example.com`,
			correlationId: `corr-wd-cand-${suffix}`,
			idempotencyKey: `idem-wd-cand-${suffix}`,
		});
		expect(withdrawCandidate.ok).toBe(true);
		if (!withdrawCandidate.ok) {
			return;
		}
		const withdrawApp = await createApplication(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-wd-app-${suffix}`,
				candidateId: withdrawCandidate.data.id,
				requisitionId: withdrawOpened.data.id,
			},
			ready,
		);
		expect(withdrawApp.ok).toBe(true);
		if (!withdrawApp.ok) {
			return;
		}
		clearPorts(ready);
		const withdrawAppCorr = `trace-app-withdraw-${suffix}`;
		const withdrawnApp = await withdrawApplication(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: withdrawAppCorr,
				applicationId: withdrawApp.data.id,
				expectedVersion: withdrawApp.data.version,
			},
			ready,
		);
		expect(withdrawnApp.ok).toBe(true);
		if (!withdrawnApp.ok) {
			return;
		}
		assertCorrelationPropagated(ready, withdrawAppCorr, {
			expectOutbox: true,
			operation: HUMAN_RESOURCES_COMMAND_APPLICATION_WITHDRAW,
		});

		const offerBranch = await seedOpenRequisitionForCorrelation(ready, {
			organizationId: ORG,
			actorUserId: ACTOR,
			code: `OF-${suffix.slice(-6)}`,
			correlationPrefix: `${prefix}-of`,
		});
		expect(offerBranch.ok).toBe(true);
		if (!offerBranch.ok) {
			return;
		}
		const offerOpened = await approveAndOpenRequisitionForCorrelation(ready, {
			organizationId: ORG,
			actorUserId: ACTOR,
			requisitionId: offerBranch.submitted.data.id,
			expectedVersion: offerBranch.submitted.data.version,
			approveCorrelationId: `corr-of-approve-${suffix}`,
			openCorrelationId: `corr-of-open-${suffix}`,
		});
		expect(offerOpened.ok).toBe(true);
		if (!offerOpened.ok) {
			return;
		}
		const offerCandidate = await seedCandidateForCorrelation(ready, {
			organizationId: ORG,
			actorUserId: ACTOR,
			email: `rec-offer-branch-${suffix}@example.com`,
			correlationId: `corr-of-cand-${suffix}`,
			idempotencyKey: `idem-of-cand-${suffix}`,
		});
		expect(offerCandidate.ok).toBe(true);
		if (!offerCandidate.ok) {
			return;
		}
		const offerApp = await createApplication(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-of-app-${suffix}`,
				candidateId: offerCandidate.data.id,
				requisitionId: offerOpened.data.id,
			},
			ready,
		);
		expect(offerApp.ok).toBe(true);
		if (!offerApp.ok) {
			return;
		}
		const offerInReview = await moveApplicationToInReview(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-of-review-${suffix}`,
				applicationId: offerApp.data.id,
				expectedVersion: offerApp.data.version,
			},
			ready,
		);
		expect(offerInReview.ok).toBe(true);
		if (!offerInReview.ok) {
			return;
		}

		const declineOfferEntity = await createOffer(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-decline-create-${suffix}`,
				applicationId: offerInReview.data.id,
				termsSummary: "Decline branch",
				expiresOn: "2030-12-31",
			},
			ready,
		);
		expect(declineOfferEntity.ok).toBe(true);
		if (!declineOfferEntity.ok) {
			return;
		}
		const declineIssued = await attachApprovedProposalAndIssueExistingOffer(
			ready,
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				offer: declineOfferEntity.data,
				tag: `decline-${suffix}`,
				correlationPrefix: `corr-decline-${suffix}`,
			},
		);
		expect(declineIssued.ok).toBe(true);
		if (!declineIssued.ok) {
			return;
		}
		clearPorts(ready);
		const declineCorr = `trace-offer-decline-${suffix}`;
		const declined = await declineOffer(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: declineCorr,
				offerId: declineIssued.data.id,
				expectedVersion: declineIssued.data.version,
			},
			ready,
		);
		expect(declined.ok).toBe(true);
		if (!declined.ok) {
			return;
		}
		assertCorrelationPropagated(ready, declineCorr, {
			expectOutbox: true,
			operation: HUMAN_RESOURCES_COMMAND_OFFER_DECLINE,
		});

		const expireSeed = await seedOpenRequisitionForCorrelation(ready, {
			organizationId: ORG,
			actorUserId: ACTOR,
			code: `EX-${suffix.slice(-6)}`,
			correlationPrefix: `${prefix}-ex`,
		});
		expect(expireSeed.ok).toBe(true);
		if (!expireSeed.ok) {
			return;
		}
		const expireOpened = await approveAndOpenRequisitionForCorrelation(ready, {
			organizationId: ORG,
			actorUserId: ACTOR,
			requisitionId: expireSeed.submitted.data.id,
			expectedVersion: expireSeed.submitted.data.version,
			approveCorrelationId: `corr-ex-approve-${suffix}`,
			openCorrelationId: `corr-ex-open-${suffix}`,
		});
		expect(expireOpened.ok).toBe(true);
		if (!expireOpened.ok) {
			return;
		}
		const expireCandidate = await seedCandidateForCorrelation(ready, {
			organizationId: ORG,
			actorUserId: ACTOR,
			email: `rec-expire-${suffix}@example.com`,
			correlationId: `corr-ex-cand-${suffix}`,
			idempotencyKey: `idem-ex-cand-${suffix}`,
		});
		expect(expireCandidate.ok).toBe(true);
		if (!expireCandidate.ok) {
			return;
		}
		const expireApp = await createApplication(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-ex-app-${suffix}`,
				candidateId: expireCandidate.data.id,
				requisitionId: expireOpened.data.id,
			},
			ready,
		);
		expect(expireApp.ok).toBe(true);
		if (!expireApp.ok) {
			return;
		}
		const expireInReview = await moveApplicationToInReview(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-ex-review-${suffix}`,
				applicationId: expireApp.data.id,
				expectedVersion: expireApp.data.version,
			},
			ready,
		);
		expect(expireInReview.ok).toBe(true);
		if (!expireInReview.ok) {
			return;
		}
		const expireOfferDraft = await createOffer(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-ex-create-${suffix}`,
				applicationId: expireInReview.data.id,
				termsSummary: "Expire branch",
				expiresOn: "2030-12-31",
			},
			ready,
		);
		expect(expireOfferDraft.ok).toBe(true);
		if (!expireOfferDraft.ok) {
			return;
		}
		const expireIssued = await attachApprovedProposalAndIssueExistingOffer(
			ready,
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				offer: expireOfferDraft.data,
				tag: `expire-${suffix}`,
				correlationPrefix: `corr-ex-${suffix}`,
			},
		);
		expect(expireIssued.ok).toBe(true);
		if (!expireIssued.ok) {
			return;
		}
		clearPorts(ready);
		const expireCorr = `trace-offer-expire-${suffix}`;
		const expired = await expireOffer(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: expireCorr,
				offerId: expireIssued.data.id,
				expectedVersion: expireIssued.data.version,
			},
			ready,
		);
		expect(expired.ok).toBe(true);
		if (!expired.ok) {
			return;
		}
		assertCorrelationPropagated(ready, expireCorr, {
			expectOutbox: true,
			operation: HUMAN_RESOURCES_COMMAND_OFFER_EXPIRE,
		});

		const withdrawOfferSeed = await seedOpenRequisitionForCorrelation(ready, {
			organizationId: ORG,
			actorUserId: ACTOR,
			code: `OW-${suffix.slice(-6)}`,
			correlationPrefix: `${prefix}-ow`,
		});
		expect(withdrawOfferSeed.ok).toBe(true);
		if (!withdrawOfferSeed.ok) {
			return;
		}
		const withdrawOfferOpened = await approveAndOpenRequisitionForCorrelation(
			ready,
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				requisitionId: withdrawOfferSeed.submitted.data.id,
				expectedVersion: withdrawOfferSeed.submitted.data.version,
				approveCorrelationId: `corr-ow-approve-${suffix}`,
				openCorrelationId: `corr-ow-open-${suffix}`,
			},
		);
		expect(withdrawOfferOpened.ok).toBe(true);
		if (!withdrawOfferOpened.ok) {
			return;
		}
		const withdrawOfferCandidate = await seedCandidateForCorrelation(ready, {
			organizationId: ORG,
			actorUserId: ACTOR,
			email: `rec-offer-wd-${suffix}@example.com`,
			correlationId: `corr-ow-cand-${suffix}`,
			idempotencyKey: `idem-ow-cand-${suffix}`,
		});
		expect(withdrawOfferCandidate.ok).toBe(true);
		if (!withdrawOfferCandidate.ok) {
			return;
		}
		const withdrawOfferApp = await createApplication(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-ow-app-${suffix}`,
				candidateId: withdrawOfferCandidate.data.id,
				requisitionId: withdrawOfferOpened.data.id,
			},
			ready,
		);
		expect(withdrawOfferApp.ok).toBe(true);
		if (!withdrawOfferApp.ok) {
			return;
		}
		const withdrawOfferInReview = await moveApplicationToInReview(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-ow-review-${suffix}`,
				applicationId: withdrawOfferApp.data.id,
				expectedVersion: withdrawOfferApp.data.version,
			},
			ready,
		);
		expect(withdrawOfferInReview.ok).toBe(true);
		if (!withdrawOfferInReview.ok) {
			return;
		}
		const withdrawOfferDraft = await createOffer(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-ow-create-${suffix}`,
				applicationId: withdrawOfferInReview.data.id,
				termsSummary: "Withdraw branch",
				expiresOn: "2030-12-31",
			},
			ready,
		);
		expect(withdrawOfferDraft.ok).toBe(true);
		if (!withdrawOfferDraft.ok) {
			return;
		}
		const withdrawOfferIssued =
			await attachApprovedProposalAndIssueExistingOffer(ready, {
				organizationId: ORG,
				actorUserId: ACTOR,
				offer: withdrawOfferDraft.data,
				tag: `withdraw-${suffix}`,
				correlationPrefix: `corr-ow-${suffix}`,
			});
		expect(withdrawOfferIssued.ok).toBe(true);
		if (!withdrawOfferIssued.ok) {
			return;
		}
		clearPorts(ready);
		const withdrawOfferCorr = `trace-offer-withdraw-${suffix}`;
		const withdrawnOffer = await withdrawOffer(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: withdrawOfferCorr,
				offerId: withdrawOfferIssued.data.id,
				expectedVersion: withdrawOfferIssued.data.version,
			},
			ready,
		);
		expect(withdrawnOffer.ok).toBe(true);
		if (!withdrawnOffer.ok) {
			return;
		}
		assertCorrelationPropagated(ready, withdrawOfferCorr, {
			expectOutbox: true,
			operation: HUMAN_RESOURCES_COMMAND_OFFER_WITHDRAW,
		});

		const closeSeed = await seedOpenRequisitionForCorrelation(ready, {
			organizationId: ORG,
			actorUserId: ACTOR,
			code: `CL-${suffix.slice(-6)}`,
			correlationPrefix: `${prefix}-cl`,
		});
		expect(closeSeed.ok).toBe(true);
		if (!closeSeed.ok) {
			return;
		}
		const closeOpened = await approveAndOpenRequisitionForCorrelation(ready, {
			organizationId: ORG,
			actorUserId: ACTOR,
			requisitionId: closeSeed.submitted.data.id,
			expectedVersion: closeSeed.submitted.data.version,
			approveCorrelationId: `corr-cl-approve-${suffix}`,
			openCorrelationId: `corr-cl-open-${suffix}`,
		});
		expect(closeOpened.ok).toBe(true);
		if (!closeOpened.ok) {
			return;
		}
		clearPorts(ready);
		const closeCorr = `trace-req-close-${suffix}`;
		const closed = await closeRequisition(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: closeCorr,
				requisitionId: closeOpened.data.id,
				expectedVersion: closeOpened.data.version,
			},
			ready,
		);
		expect(closed.ok).toBe(true);
		if (!closed.ok) {
			return;
		}
		assertCorrelationPropagated(ready, closeCorr, {
			expectOutbox: true,
			operation: HUMAN_RESOURCES_COMMAND_REQUISITION_CLOSE,
		});
	});

	it("propagates correlationId across employment-lifecycle and organization domain-event mutations", async () => {
		const ready = harness();

		const employee = await createEmployee(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "seed-emp-core-org",
				idempotencyKey: "idem-emp-core-org",
				employeeNumber: "E-CORE-ORG",
				legalName: "Core Org Corr",
			},
			ready,
		);
		expect(employee.ok).toBe(true);
		if (!employee.ok) {
			return;
		}

		const employment = await createEmployment(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "seed-employment-core-org",
				employeeId: employee.data.id,
				startsOn: "2026-01-01",
				endsOn: null,
			},
			ready,
		);
		expect(employment.ok).toBe(true);
		if (!employment.ok) {
			return;
		}

		const orgSeed = await seedDepartmentAndJob(ready, {
			organizationId: ORG,
			actorUserId: ACTOR,
		});
		expect(orgSeed).not.toBeNull();
		if (orgSeed === null) {
			return;
		}

		const position = await createPosition(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "seed-position-core-org",
				code: "POS-CORE-ORG",
				title: "Core Org Role",
				status: "active",
				departmentId: orgSeed.departmentId,
				jobId: orgSeed.jobId,
			},
			ready,
		);
		expect(position.ok).toBe(true);
		if (!position.ok) {
			return;
		}

		clearPorts(ready);
		const contractCorr = "trace-employment-contract-create";
		const contract = await createEmploymentContract(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: contractCorr,
				employmentId: employment.data.id,
				referenceCode: "CONTRACT-CORE-ORG",
				startsOn: "2026-01-01",
				endsOn: null,
				reasonCode: "initial",
			},
			ready,
		);
		expect(contract.ok).toBe(true);
		if (!contract.ok) {
			return;
		}
		assertCorrelationPropagated(ready, contractCorr, {
			expectOutbox: true,
			operation: HUMAN_RESOURCES_COMMAND_EMPLOYMENT_CONTRACT_CREATE,
		});

		clearPorts(ready);
		const assignmentCorr = "trace-assignment-create";
		const assignment = await createAssignment(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: assignmentCorr,
				employmentId: employment.data.id,
				positionId: position.data.id,
				...TEST_ORGANIZATION_DIMENSION_KEYS,
				startsOn: "2026-01-01",
				endsOn: null,
			},
			ready,
		);
		expect(assignment.ok).toBe(true);
		if (!assignment.ok) {
			return;
		}
		assertCorrelationPropagated(ready, assignmentCorr, {
			expectOutbox: true,
			operation: HUMAN_RESOURCES_COMMAND_ASSIGNMENT_CREATE,
		});

		clearPorts(ready);
		const dept = await createDepartment(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "seed-dept-activate",
				code: "DEPT-ARCH",
				name: "Archive Activate Dept",
				status: "active",
			},
			ready,
		);
		expect(dept.ok).toBe(true);
		if (!dept.ok) {
			return;
		}

		const archived = await archiveDepartment(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "seed-dept-archive",
				departmentId: dept.data.id,
				expectedVersion: dept.data.version,
			},
			ready,
		);
		expect(archived.ok).toBe(true);
		if (!archived.ok) {
			return;
		}

		clearPorts(ready);
		const activateCorr = "trace-department-activate";
		const activated = await activateDepartment(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: activateCorr,
				departmentId: archived.data.id,
				expectedVersion: archived.data.version,
			},
			ready,
		);
		expect(activated.ok).toBe(true);
		if (!activated.ok) {
			return;
		}
		assertCorrelationPropagated(ready, activateCorr, {
			expectOutbox: true,
			operation: HUMAN_RESOURCES_COMMAND_DEPARTMENT_ACTIVATE,
		});
	});

	it("propagates correlationId across compliance mutations", async () => {
		const ready = harness();
		const emp = await createEmployee(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "seed-emp",
				idempotencyKey: "idem-seed-emp",
				employeeNumber: "E-CORR-2",
				legalName: "Compliance Corr",
			},
			ready,
		);
		expect(emp.ok).toBe(true);
		if (!emp.ok) {
			return;
		}

		memoryPorts(ready).audit.calls.length = 0;
		memoryPorts(ready).outbox.calls.length = 0;

		const reqCorr = "trace-req-create";
		const req = await createDocumentRequirement(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: reqCorr,
				code: "PASS-CORR",
				name: "Passport Corr",
				documentType: "passport",
			},
			ready,
		);
		expect(req.ok).toBe(true);
		if (!req.ok) {
			return;
		}
		assertCorrelationPropagated(ready, reqCorr, {
			expectOutbox: false,
			operation: HUMAN_RESOURCES_COMMAND_DOCUMENT_REQUIREMENT_CREATE,
		});

		memoryPorts(ready).audit.calls.length = 0;
		const updCorr = "trace-req-update";
		const updated = await updateDocumentRequirement(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: updCorr,
				requirementId: req.data.id,
				name: "Passport Corr Updated",
				expectedVersion: req.data.version,
			},
			ready,
		);
		expect(updated.ok).toBe(true);
		if (!updated.ok) {
			return;
		}
		assertCorrelationPropagated(ready, updCorr, {
			expectOutbox: false,
			operation: HUMAN_RESOURCES_COMMAND_DOCUMENT_REQUIREMENT_UPDATE,
		});

		memoryPorts(ready).audit.calls.length = 0;
		const pubCorr = "trace-req-publish";
		const published = await publishDocumentRequirement(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: pubCorr,
				requirementId: updated.data.id,
				expectedVersion: updated.data.version,
			},
			ready,
		);
		expect(published.ok).toBe(true);
		if (!published.ok) {
			return;
		}
		assertCorrelationPropagated(ready, pubCorr, {
			expectOutbox: false,
			operation: HUMAN_RESOURCES_COMMAND_DOCUMENT_REQUIREMENT_PUBLISH,
		});

		memoryPorts(ready).audit.calls.length = 0;
		memoryPorts(ready).outbox.calls.length = 0;
		const regCorr = "trace-doc-register";
		const registered = await registerEmployeeDocument(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: regCorr,
				employeeId: emp.data.id,
				requirementId: published.data.id,
				documentType: "passport",
				issuedOn: "2026-01-01",
				expiresOn: "2030-01-01",
				documentRef: `vault://organizations/${ORG}/passport/corr?version=1`,
				documentIdentifier: "XY 9999 1111",
				idempotencyKey: "idem-doc-corr",
			},
			ready,
		);
		expect(registered.ok).toBe(true);
		if (!registered.ok) {
			return;
		}
		assertCorrelationPropagated(ready, regCorr, {
			expectOutbox: true,
			operation: HUMAN_RESOURCES_COMMAND_EMPLOYEE_DOCUMENT_REGISTER,
		});
		expect(
			memoryPorts(ready).audit.calls.some(
				(call) =>
					call.changes.length > 0 ||
					(call.newValue !== undefined && call.newValue !== null),
			),
		).toBe(true);
		for (const call of memoryPorts(ready).audit.calls) {
			const snap = JSON.stringify(call.newValue ?? {});
			expect(snap).not.toContain(
				`vault://organizations/${ORG}/passport/corr?version=1`,
			);
		}

		memoryPorts(ready).audit.calls.length = 0;
		const metaCorr = "trace-doc-meta";
		const metaUpdated = await updateEmployeeDocumentMetadata(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: metaCorr,
				documentId: registered.data.id,
				issuingJurisdiction: "US",
				expectedVersion: registered.data.version,
			},
			ready,
		);
		expect(metaUpdated.ok).toBe(true);
		if (!metaUpdated.ok) {
			return;
		}
		assertCorrelationPropagated(ready, metaCorr, {
			expectOutbox: false,
			operation: HUMAN_RESOURCES_COMMAND_EMPLOYEE_DOCUMENT_UPDATE_METADATA,
		});

		memoryPorts(ready).audit.calls.length = 0;
		memoryPorts(ready).outbox.calls.length = 0;
		const verifyCorr = "trace-doc-verify";
		const verified = await verifyEmployeeDocument(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: verifyCorr,
				documentId: metaUpdated.data.id,
				evidenceDate: "2026-02-01",
				expectedVersion: metaUpdated.data.version,
			},
			ready,
		);
		expect(verified.ok).toBe(true);
		if (!verified.ok) {
			return;
		}
		assertCorrelationPropagated(ready, verifyCorr, {
			expectOutbox: true,
			operation: HUMAN_RESOURCES_COMMAND_EMPLOYEE_DOCUMENT_VERIFY,
		});

		memoryPorts(ready).audit.calls.length = 0;
		const revokeCorr = "trace-doc-revoke-ver";
		const revokedVer = await revokeEmployeeDocumentVerification(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: revokeCorr,
				documentId: verified.data.id,
				expectedVersion: verified.data.version,
			},
			ready,
		);
		expect(revokedVer.ok).toBe(true);
		if (!revokedVer.ok) {
			return;
		}
		assertCorrelationPropagated(ready, revokeCorr, {
			expectOutbox: false,
			operation: HUMAN_RESOURCES_COMMAND_EMPLOYEE_DOCUMENT_REVOKE_VERIFICATION,
		});

		memoryPorts(ready).audit.calls.length = 0;
		memoryPorts(ready).outbox.calls.length = 0;
		const rejectSeed = await registerEmployeeDocument(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "trace-doc-reject-seed",
				employeeId: emp.data.id,
				documentType: "drivers-license",
				issuedOn: "2026-01-01",
				expiresOn: "2030-01-01",
				documentRef: `vault://organizations/${ORG}/other/corr-license?version=1`,
				idempotencyKey: "idem-doc-reject",
			},
			ready,
		);
		expect(rejectSeed.ok).toBe(true);
		if (!rejectSeed.ok) {
			return;
		}

		memoryPorts(ready).audit.calls.length = 0;
		memoryPorts(ready).outbox.calls.length = 0;
		const rejectCorr = "trace-doc-reject";
		const rejected = await rejectEmployeeDocument(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: rejectCorr,
				documentId: rejectSeed.data.id,
				rejectionReason: "illegible",
				expectedVersion: rejectSeed.data.version,
			},
			ready,
		);
		expect(rejected.ok).toBe(true);
		if (!rejected.ok) {
			return;
		}
		assertCorrelationPropagated(ready, rejectCorr, {
			expectOutbox: true,
			operation: HUMAN_RESOURCES_COMMAND_EMPLOYEE_DOCUMENT_REJECT,
		});

		memoryPorts(ready).audit.calls.length = 0;
		memoryPorts(ready).outbox.calls.length = 0;
		const reg2 = await registerEmployeeDocument(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "trace-doc-reg2",
				employeeId: emp.data.id,
				documentType: "visa",
				issuedOn: "2026-01-01",
				expiresOn: "2026-06-01",
				documentRef: `vault://organizations/${ORG}/other/corr-visa?version=1`,
				idempotencyKey: "idem-doc-corr-2",
			},
			ready,
		);
		expect(reg2.ok).toBe(true);
		if (!reg2.ok) {
			return;
		}

		memoryPorts(ready).audit.calls.length = 0;
		memoryPorts(ready).outbox.calls.length = 0;
		const expireCorr = "trace-doc-expire";
		const expired = await markEmployeeDocumentExpired(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: expireCorr,
				documentId: reg2.data.id,
				expectedVersion: reg2.data.version,
			},
			ready,
		);
		expect(expired.ok).toBe(true);
		assertCorrelationPropagated(ready, expireCorr, {
			expectOutbox: true,
			operation: HUMAN_RESOURCES_COMMAND_EMPLOYEE_DOCUMENT_MARK_EXPIRED,
		});

		memoryPorts(ready).audit.calls.length = 0;
		const retireCorr = "trace-req-retire";
		const retired = await retireDocumentRequirement(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: retireCorr,
				requirementId: published.data.id,
				expectedVersion: published.data.version,
			},
			ready,
		);
		expect(retired.ok).toBe(true);
		assertCorrelationPropagated(ready, retireCorr, {
			expectOutbox: false,
			operation: HUMAN_RESOURCES_COMMAND_DOCUMENT_REQUIREMENT_RETIRE,
		});
	});

	it("propagates correlationId across work-eligibility mutations", async () => {
		const ready = harness();
		const emp = await createEmployee(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "seed-we",
				idempotencyKey: "idem-seed-we",
				employeeNumber: "E-CORR-WE",
				legalName: "Eligibility Corr",
			},
			ready,
		);
		expect(emp.ok).toBe(true);
		if (!emp.ok) {
			return;
		}

		memoryPorts(ready).audit.calls.length = 0;
		memoryPorts(ready).outbox.calls.length = 0;
		const recordCorr = "trace-we-record";
		const recorded = await recordWorkEligibility(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: recordCorr,
				employeeId: emp.data.id,
				countryCode: "US",
				issuedOn: "2026-01-01",
				expiresOn: "2027-01-01",
				idempotencyKey: "idem-we-corr",
			},
			ready,
		);
		expect(recorded.ok).toBe(true);
		if (!recorded.ok) {
			return;
		}
		assertCorrelationPropagated(ready, recordCorr, {
			expectOutbox: false,
			operation: HUMAN_RESOURCES_COMMAND_WORK_ELIGIBILITY_RECORD,
		});

		memoryPorts(ready).audit.calls.length = 0;
		const verifyCorr = "trace-we-verify";
		const verified = await verifyWorkEligibility(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: verifyCorr,
				eligibilityId: recorded.data.id,
				evidenceDate: "2026-01-15",
				expectedVersion: recorded.data.version,
			},
			ready,
		);
		expect(verified.ok).toBe(true);
		if (!verified.ok) {
			return;
		}
		assertCorrelationPropagated(ready, verifyCorr, {
			expectOutbox: true,
			operation: HUMAN_RESOURCES_COMMAND_WORK_ELIGIBILITY_VERIFY,
		});

		memoryPorts(ready).audit.calls.length = 0;
		memoryPorts(ready).outbox.calls.length = 0;
		const suspendCorr = "trace-we-suspend";
		const suspended = await suspendWorkEligibility(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: suspendCorr,
				eligibilityId: verified.data.id,
				expectedVersion: verified.data.version,
			},
			ready,
		);
		expect(suspended.ok).toBe(true);
		if (!suspended.ok) {
			return;
		}
		assertCorrelationPropagated(ready, suspendCorr, {
			expectOutbox: true,
			operation: HUMAN_RESOURCES_COMMAND_WORK_ELIGIBILITY_SUSPEND,
		});

		memoryPorts(ready).audit.calls.length = 0;
		memoryPorts(ready).outbox.calls.length = 0;
		const renewCorr = "trace-we-renew";
		const renewed = await renewWorkEligibility(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: renewCorr,
				eligibilityId: suspended.data.id,
				issuedOn: "2026-02-01",
				expiresOn: "2028-01-01",
				expectedVersion: suspended.data.version,
			},
			ready,
		);
		expect(renewed.ok).toBe(true);
		if (!renewed.ok) {
			return;
		}
		assertCorrelationPropagated(ready, renewCorr, {
			expectOutbox: true,
			operation: HUMAN_RESOURCES_COMMAND_WORK_ELIGIBILITY_RENEW,
		});

		memoryPorts(ready).audit.calls.length = 0;
		memoryPorts(ready).outbox.calls.length = 0;
		const closeCorr = "trace-we-close";
		const closed = await closeWorkEligibility(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: closeCorr,
				eligibilityId: renewed.data.id,
				expectedVersion: renewed.data.version,
			},
			ready,
		);
		expect(closed.ok).toBe(true);
		assertCorrelationPropagated(ready, closeCorr, {
			expectOutbox: true,
			operation: HUMAN_RESOURCES_COMMAND_WORK_ELIGIBILITY_CLOSE,
		});
	});

	it("propagates correlationId across policy acknowledgement mutations", async () => {
		const ready = harness();
		const emp = await createEmployee(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "seed-pol",
				idempotencyKey: "idem-seed-pol",
				employeeNumber: "E-CORR-POL",
				legalName: "Policy Corr",
			},
			ready,
		);
		expect(emp.ok).toBe(true);
		if (!emp.ok) {
			return;
		}

		memoryPorts(ready).audit.calls.length = 0;
		memoryPorts(ready).outbox.calls.length = 0;
		const issueCorr = "trace-pol-issue";
		const issued = await issuePolicyAcknowledgementRequirement(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: issueCorr,
				employeeId: emp.data.id,
				policyCode: "CODE-OF-CONDUCT",
				policyVersion: "v1",
				idempotencyKey: "idem-pol-corr",
			},
			ready,
		);
		expect(issued.ok).toBe(true);
		if (!issued.ok) {
			return;
		}
		assertCorrelationPropagated(ready, issueCorr, {
			expectOutbox: true,
			operation: HUMAN_RESOURCES_COMMAND_POLICY_ACKNOWLEDGEMENT_ISSUE,
		});

		memoryPorts(ready).audit.calls.length = 0;
		memoryPorts(ready).outbox.calls.length = 0;
		const ackCorr = "trace-pol-ack";
		const ack = await acknowledgePolicy(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: ackCorr,
				acknowledgementId: issued.data.id,
				expectedVersion: issued.data.version,
			},
			ready,
		);
		expect(ack.ok).toBe(true);
		if (!ack.ok) {
			return;
		}
		assertCorrelationPropagated(ready, ackCorr, {
			expectOutbox: true,
			operation: HUMAN_RESOURCES_COMMAND_POLICY_ACKNOWLEDGEMENT_ACKNOWLEDGE,
		});

		memoryPorts(ready).audit.calls.length = 0;
		memoryPorts(ready).outbox.calls.length = 0;
		const issue2 = await issuePolicyAcknowledgementRequirement(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "trace-pol-issue-2",
				employeeId: emp.data.id,
				policyCode: "SAFETY",
				policyVersion: "v1",
				idempotencyKey: "idem-pol-corr-2",
			},
			ready,
		);
		expect(issue2.ok).toBe(true);
		if (!issue2.ok) {
			return;
		}

		memoryPorts(ready).audit.calls.length = 0;
		const revokeCorr = "trace-pol-revoke";
		const revoked = await revokePolicyAcknowledgement(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: revokeCorr,
				acknowledgementId: issue2.data.id,
				expectedVersion: issue2.data.version,
			},
			ready,
		);
		expect(revoked.ok).toBe(true);
		if (!revoked.ok) {
			return;
		}
		assertCorrelationPropagated(ready, revokeCorr, {
			expectOutbox: false,
			operation: HUMAN_RESOURCES_COMMAND_POLICY_ACKNOWLEDGEMENT_REVOKE,
		});

		memoryPorts(ready).audit.calls.length = 0;
		memoryPorts(ready).outbox.calls.length = 0;
		const issue3 = await issuePolicyAcknowledgementRequirement(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "trace-pol-issue-3",
				employeeId: emp.data.id,
				policyCode: "PRIVACY",
				policyVersion: "v1",
				idempotencyKey: "idem-pol-corr-3",
			},
			ready,
		);
		expect(issue3.ok).toBe(true);
		if (!issue3.ok) {
			return;
		}

		memoryPorts(ready).audit.calls.length = 0;
		const supersedeCorr = "trace-pol-supersede";
		const superseded = await supersedePolicyAcknowledgementRequirement(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: supersedeCorr,
				acknowledgementId: issue3.data.id,
				newPolicyVersion: "v2",
				expectedVersion: issue3.data.version,
			},
			ready,
		);
		expect(superseded.ok).toBe(true);
		assertCorrelationPropagated(ready, supersedeCorr, {
			expectOutbox: false,
			operation: HUMAN_RESOURCES_COMMAND_POLICY_ACKNOWLEDGEMENT_SUPERSEDE,
		});
	});

	it("propagates correlationId across certification mutations", async () => {
		const ready = harness();
		const emp = await createEmployee(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "seed-cert",
				idempotencyKey: "idem-seed-cert",
				employeeNumber: "E-CORR-CERT",
				legalName: "Cert Corr",
			},
			ready,
		);
		expect(emp.ok).toBe(true);
		if (!emp.ok) {
			return;
		}

		const course = await createCourse(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "seed-course",
				code: "COURSE-CORR",
				title: "Safety Course",
				idempotencyKey: "idem-course-corr",
			},
			ready,
		);
		expect(course.ok).toBe(true);
		if (!course.ok) {
			return;
		}

		const assignment = await assignLearning(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "seed-assign",
				employeeId: emp.data.id,
				courseId: course.data.id,
				dueOn: null,
			},
			ready,
		);
		expect(assignment.ok).toBe(true);
		if (!assignment.ok) {
			return;
		}

		memoryPorts(ready).audit.calls.length = 0;
		memoryPorts(ready).outbox.calls.length = 0;
		const completionCorr = "trace-completion";
		const completion = await recordCompletion(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: completionCorr,
				assignmentId: assignment.data.id,
				employeeId: emp.data.id,
				courseId: course.data.id,
				sessionId: null,
				completedAt: "2026-03-01T12:00:00Z",
				outcome: "passed",
				assessorUserId: null,
				notes: null,
				idempotencyKey: "idem-completion-corr",
			},
			ready,
		);
		expect(completion.ok).toBe(true);
		if (!completion.ok) {
			return;
		}
		assertCorrelationPropagated(ready, completionCorr, {
			expectOutbox: true,
			operation: HUMAN_RESOURCES_COMMAND_COMPLETION_RECORD,
		});

		memoryPorts(ready).audit.calls.length = 0;
		memoryPorts(ready).outbox.calls.length = 0;
		const issueCorr = "trace-cert-issue";
		const issued = await issueCertification(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: issueCorr,
				employeeId: emp.data.id,
				courseId: course.data.id,
				completionId: completion.data.id,
				certificationCode: "CERT-CORR",
				issuedOn: "2026-03-02",
				expiresOn: "2027-03-02",
				idempotencyKey: "idem-cert-corr",
			},
			ready,
		);
		expect(issued.ok).toBe(true);
		if (!issued.ok) {
			return;
		}
		assertCorrelationPropagated(ready, issueCorr, {
			expectOutbox: false,
			operation: HUMAN_RESOURCES_COMMAND_CERTIFICATION_ISSUE,
		});
		expect(memoryPorts(ready).audit.calls[0]?.changes.length).toBeGreaterThan(
			0,
		);

		memoryPorts(ready).audit.calls.length = 0;
		const expireCorr = "trace-cert-expire";
		const expired = await expireCertification(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: expireCorr,
				certificationId: issued.data.id,
				expectedVersion: issued.data.version,
			},
			ready,
		);
		expect(expired.ok).toBe(true);
		if (!expired.ok) {
			return;
		}
		assertCorrelationPropagated(ready, expireCorr, {
			expectOutbox: true,
			operation: HUMAN_RESOURCES_COMMAND_CERTIFICATION_EXPIRE,
		});

		const assignment2 = await assignLearning(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "seed-assign-2",
				employeeId: emp.data.id,
				courseId: course.data.id,
				dueOn: null,
			},
			ready,
		);
		expect(assignment2.ok).toBe(true);
		if (!assignment2.ok) {
			return;
		}

		const completion2 = await recordCompletion(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "seed-completion-2",
				assignmentId: assignment2.data.id,
				employeeId: emp.data.id,
				courseId: course.data.id,
				sessionId: null,
				completedAt: "2026-04-01T12:00:00Z",
				outcome: "passed",
				assessorUserId: null,
				notes: null,
				idempotencyKey: "idem-completion-corr-2",
			},
			ready,
		);
		expect(completion2.ok).toBe(true);
		if (!completion2.ok) {
			return;
		}

		const issued2 = await issueCertification(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "seed-cert-2",
				employeeId: emp.data.id,
				courseId: course.data.id,
				completionId: completion2.data.id,
				certificationCode: "CERT-CORR-2",
				issuedOn: "2026-04-02",
				idempotencyKey: "idem-cert-corr-2",
			},
			ready,
		);
		expect(issued2.ok).toBe(true);
		if (!issued2.ok) {
			return;
		}

		memoryPorts(ready).audit.calls.length = 0;
		const revokeCorr = "trace-cert-revoke";
		const revoked = await revokeCertification(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: revokeCorr,
				certificationId: issued2.data.id,
				expectedVersion: issued2.data.version,
			},
			ready,
		);
		expect(revoked.ok).toBe(true);
		assertCorrelationPropagated(ready, revokeCorr, {
			expectOutbox: false,
			operation: HUMAN_RESOURCES_COMMAND_CERTIFICATION_REVOKE,
		});
	});

	it("does not double-emit outbox on idempotent document register replay", async () => {
		const ready = harness();
		const emp = await createEmployee(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "seed-idem",
				idempotencyKey: "idem-seed-idem",
				employeeNumber: "E-CORR-IDEM",
				legalName: "Idem Corr",
			},
			ready,
		);
		expect(emp.ok).toBe(true);
		if (!emp.ok) {
			return;
		}

		const payload = {
			organizationId: ORG,
			actorUserId: ACTOR,
			correlationId: "trace-idem-reg",
			employeeId: emp.data.id,
			documentType: "passport",
			issuedOn: "2026-01-01",
			expiresOn: "2030-01-01",
			documentRef: `vault://organizations/${ORG}/passport/idem?version=1`,
			idempotencyKey: "idem-doc-replay",
		};

		memoryPorts(ready).outbox.calls.length = 0;
		const first = await registerEmployeeDocument(payload, ready);
		expect(first.ok).toBe(true);
		const outboxAfterFirst = memoryPorts(ready).outbox.calls.length;
		expect(outboxAfterFirst).toBeGreaterThan(0);

		const replay = await registerEmployeeDocument(
			{ ...payload, correlationId: "trace-idem-reg-replay" },
			ready,
		);
		expect(replay.ok).toBe(true);
		expect(memoryPorts(ready).outbox.calls.length).toBe(outboxAfterFirst);
	});

	it("propagates correlationId for timesheet approve (domain_event)", async () => {
		const ready = harness();
		const { employee, employment } =
			await seedTimeCorrelationEmployeeEmployment(ready, {
				organizationId: ORG,
				actorUserId: ACTOR,
				suffix: "ts-legacy",
			});

		const timesheet = await createTimesheet(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "seed-ts-create",
				idempotencyKey: "idem-ts-corr",
				employeeId: employee.id,
				employmentId: employment.id,
				periodStart: "2025-07-01",
				periodEnd: "2025-07-07",
			},
			ready,
		);
		expect(timesheet.ok).toBe(true);
		if (!timesheet.ok) {
			return;
		}

		const submitted = await submitTimesheet(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "seed-ts-submit",
				timesheetId: timesheet.data.id,
				expectedVersion: timesheet.data.version,
			},
			ready,
		);
		expect(submitted.ok).toBe(true);
		if (!submitted.ok) {
			return;
		}

		await grantManagerTimeApprovalAuthority(ready, "legacy");
		clearPorts(ready);
		const approveCorr = "trace-timesheet-approve";
		const approved = await approveTimesheet(
			{
				organizationId: ORG,
				actorUserId: MANAGER,
				correlationId: approveCorr,
				authority: "line_manager",
				timesheetId: submitted.data.id,
				expectedVersion: submitted.data.version,
			},
			ready,
		);
		expect(approved.ok).toBe(true);
		if (!approved.ok) {
			return;
		}
		assertCorrelationPropagated(ready, approveCorr, {
			expectOutbox: true,
			operation: HUMAN_RESOURCES_COMMAND_TIMESHEET_APPROVE,
		});
	});

	it("propagates correlationId across time domain_event mutations", async () => {
		const ready = harness();
		const { employee, employment } =
			await seedTimeCorrelationEmployeeEmployment(ready, {
				organizationId: ORG,
				actorUserId: ACTOR,
				suffix: "time-domain",
			});

		const calendar = await createWorkCalendar(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "seed-time-domain-cal",
				idempotencyKey: "idem-time-domain-cal",
				code: "CORR-TIME",
				name: "Corr Time Calendar",
				timezone: "Asia/Singapore",
				calendarVersion: "v1",
				workWeek: TIME_CORR_STANDARD_WEEK,
				standardHoursPerDay: "8.00",
				effectiveFrom: "2025-01-01",
			},
			ready,
		);
		expect(calendar.ok).toBe(true);
		if (!calendar.ok) {
			return;
		}

		const calendarAssigned = await assignEmploymentCalendar(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "seed-time-domain-cal-assign",
				employeeId: employee.id,
				employmentId: employment.id,
				calendarId: calendar.data.id,
				effectiveFrom: "2025-01-01",
			},
			ready,
		);
		expect(calendarAssigned.ok).toBe(true);
		if (!calendarAssigned.ok) {
			return;
		}

		const shift = await createShift(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "seed-time-domain-shift",
				idempotencyKey: "idem-time-domain-shift",
				code: "CORR-DAY",
				name: "Corr Day",
				shiftKind: "fixed",
				startLocal: "09:00",
				endLocal: "17:00",
				expectedMinutes: 480,
				effectiveFrom: "2025-01-01",
			},
			ready,
		);
		expect(shift.ok).toBe(true);
		if (!shift.ok) {
			return;
		}

		const activatedShift = await activateShift(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "seed-time-domain-shift-act",
				shiftId: shift.data.id,
				expectedVersion: shift.data.version,
			},
			ready,
		);
		expect(activatedShift.ok).toBe(true);
		if (!activatedShift.ok) {
			return;
		}

		const assignment = await assignShift(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "seed-time-domain-assign",
				idempotencyKey: "idem-time-domain-assign",
				employeeId: employee.id,
				employmentId: employment.id,
				shiftId: shift.data.id,
				scheduledDate: "2025-07-01",
				startsAt: "2025-07-01T01:00:00.000Z",
				endsAt: "2025-07-01T09:00:00.000Z",
				timezone: "Asia/Singapore",
			},
			ready,
		);
		expect(assignment.ok).toBe(true);
		if (!assignment.ok) {
			return;
		}

		clearPorts(ready);
		const publishCorr = "trace-time-publish";
		const published = await publishShiftAssignment(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: publishCorr,
				assignmentId: assignment.data.id,
				expectedVersion: assignment.data.version,
			},
			ready,
		);
		expect(published.ok).toBe(true);
		if (!published.ok) {
			return;
		}
		assertCorrelationPropagated(ready, publishCorr, {
			expectOutbox: true,
			operation: HUMAN_RESOURCES_COMMAND_SHIFT_ASSIGNMENT_PUBLISH,
		});

		clearPorts(ready);
		const clockCorr = "trace-time-clock-in";
		const clockIn = await recordClockIn(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: clockCorr,
				idempotencyKey: "idem-time-clock-in",
				employeeId: employee.id,
				employmentId: employment.id,
				occurredAt: "2025-07-01T01:05:00.000Z",
				sourceTimezone: "Asia/Singapore",
				localWorkDate: "2025-07-01",
			},
			ready,
		);
		expect(clockIn.ok).toBe(true);
		if (!clockIn.ok) {
			return;
		}
		assertCorrelationPropagated(ready, clockCorr, {
			expectOutbox: true,
			operation: HUMAN_RESOURCES_COMMAND_ATTENDANCE_EVENT_RECORD,
		});

		clearPorts(ready);
		const correctCorr = "trace-time-correct";
		const corrected = await correctAttendanceEvent(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: correctCorr,
				eventId: clockIn.data.id,
				occurredAt: "2025-07-01T01:10:00.000Z",
				adjustmentReason: "corrected arrival",
				expectedVersion: clockIn.data.version,
			},
			ready,
		);
		expect(corrected.ok).toBe(true);
		if (!corrected.ok) {
			return;
		}
		assertCorrelationPropagated(ready, correctCorr, {
			expectOutbox: true,
			operation: HUMAN_RESOURCES_COMMAND_ATTENDANCE_EVENT_CORRECT,
		});

		clearPorts(ready);
		const exceptionCorr = "trace-time-exception";
		const exception = await createAttendanceException(
			{
				organizationId: ORG,
				actorUserId: MANAGER,
				correlationId: exceptionCorr,
				employeeId: employee.id,
				exceptionType: "absence",
				severity: "critical",
				remarks: "missing punch",
			},
			ready,
		);
		expect(exception.ok).toBe(true);
		if (!exception.ok) {
			return;
		}
		assertCorrelationPropagated(ready, exceptionCorr, {
			expectOutbox: true,
			operation: HUMAN_RESOURCES_COMMAND_ATTENDANCE_EXCEPTION_CREATE,
		});

		const timesheet = await createTimesheet(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "seed-time-domain-ts",
				idempotencyKey: "idem-time-domain-ts",
				employeeId: employee.id,
				employmentId: employment.id,
				periodStart: "2025-07-01",
				periodEnd: "2025-07-07",
			},
			ready,
		);
		expect(timesheet.ok).toBe(true);
		if (!timesheet.ok) {
			return;
		}

		clearPorts(ready);
		const submitCorr = "trace-time-submit";
		const submitted = await submitTimesheet(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: submitCorr,
				timesheetId: timesheet.data.id,
				expectedVersion: timesheet.data.version,
			},
			ready,
		);
		expect(submitted.ok).toBe(true);
		if (!submitted.ok) {
			return;
		}
		assertCorrelationPropagated(ready, submitCorr, {
			expectOutbox: true,
			operation: HUMAN_RESOURCES_COMMAND_TIMESHEET_SUBMIT,
		});

		const returned = await returnTimesheet(
			{
				organizationId: ORG,
				actorUserId: MANAGER,
				correlationId: "seed-time-return-for-reopen",
				timesheetId: submitted.data.id,
				expectedVersion: submitted.data.version,
			},
			ready,
		);
		expect(returned.ok).toBe(true);
		if (!returned.ok) {
			return;
		}

		clearPorts(ready);
		const reopenCorr = "trace-time-reopen";
		const reopened = await reopenTimesheet(
			{
				organizationId: ORG,
				actorUserId: MANAGER,
				correlationId: reopenCorr,
				timesheetId: returned.data.id,
				expectedVersion: returned.data.version,
			},
			ready,
		);
		expect(reopened.ok).toBe(true);
		if (!reopened.ok) {
			return;
		}
		assertCorrelationPropagated(ready, reopenCorr, {
			expectOutbox: true,
			operation: HUMAN_RESOURCES_COMMAND_TIMESHEET_REOPEN,
		});

		clearPorts(ready);
		const resubmitCorr = "trace-time-resubmit";
		const resubmitted = await submitTimesheet(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: resubmitCorr,
				timesheetId: reopened.data.id,
				expectedVersion: reopened.data.version,
			},
			ready,
		);
		expect(resubmitted.ok).toBe(true);
		if (!resubmitted.ok) {
			return;
		}
		assertCorrelationPropagated(ready, resubmitCorr, {
			expectOutbox: true,
			operation: HUMAN_RESOURCES_COMMAND_TIMESHEET_SUBMIT,
		});

		await grantManagerTimeApprovalAuthority(ready, "domain");
		clearPorts(ready);
		const approveCorr = "trace-time-approve";
		const approved = await approveTimesheet(
			{
				organizationId: ORG,
				actorUserId: MANAGER,
				correlationId: approveCorr,
				authority: "line_manager",
				timesheetId: resubmitted.data.id,
				expectedVersion: resubmitted.data.version,
			},
			ready,
		);
		expect(approved.ok).toBe(true);
		if (!approved.ok) {
			return;
		}
		assertCorrelationPropagated(ready, approveCorr, {
			expectOutbox: true,
			operation: HUMAN_RESOURCES_COMMAND_TIMESHEET_APPROVE,
		});

		clearPorts(ready);
		const lockCorr = "trace-time-lock";
		const locked = await lockTimesheet(
			{
				organizationId: ORG,
				actorUserId: MANAGER,
				correlationId: lockCorr,
				timesheetId: approved.data.id,
				expectedVersion: approved.data.version,
			},
			ready,
		);
		expect(locked.ok).toBe(true);
		if (!locked.ok) {
			return;
		}
		assertCorrelationPropagated(ready, lockCorr, {
			expectOutbox: true,
			operation: HUMAN_RESOURCES_COMMAND_TIMESHEET_LOCK,
		});
		expect(memoryPorts(ready).outbox.calls.length).toBeGreaterThanOrEqual(2);
		expect(
			memoryPorts(ready).outbox.calls.some((call) =>
				call.type.includes("timesheet.locked"),
			),
		).toBe(true);
		expect(
			memoryPorts(ready).outbox.calls.some((call) =>
				call.type.includes("payroll_handoff"),
			),
		).toBe(true);

		const overtimeRequest = await createOvertimeRequest(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "seed-time-ot",
				idempotencyKey: "idem-time-ot",
				employeeId: employee.id,
				employmentId: employment.id,
				overtimeType: "weekday_overtime",
				requestedStartsAt: "2025-07-02T10:00:00.000Z",
				requestedEndsAt: "2025-07-02T12:00:00.000Z",
				requestedMinutes: 120,
				reason: "release crunch",
			},
			ready,
		);
		expect(overtimeRequest.ok).toBe(true);
		if (!overtimeRequest.ok) {
			return;
		}

		clearPorts(ready);
		const otApproveCorr = "trace-time-ot-approve";
		const otApproved = await approveOvertimeRequest(
			{
				organizationId: ORG,
				actorUserId: MANAGER,
				correlationId: otApproveCorr,
				requestedAuthority: "line_manager",
				requestId: overtimeRequest.data.id,
				approvedMaximumMinutes: 120,
				expectedVersion: overtimeRequest.data.version,
			},
			ready,
		);
		expect(otApproved.ok).toBe(true);
		if (!otApproved.ok) {
			return;
		}
		assertCorrelationPropagated(ready, otApproveCorr, {
			expectOutbox: true,
			operation: HUMAN_RESOURCES_COMMAND_OVERTIME_REQUEST_APPROVE,
		});
	});

	it("propagates correlationId across time audit_only mutations", async () => {
		const ready = harness();
		const { employee, employment } =
			await seedTimeCorrelationEmployeeEmployment(ready, {
				organizationId: ORG,
				actorUserId: ACTOR,
				suffix: "time-audit",
			});

		clearPorts(ready);
		const calCreateCorr = "trace-time-cal-create";
		const calendar = await createWorkCalendar(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: calCreateCorr,
				idempotencyKey: "idem-time-audit-cal",
				code: "AUDIT-CAL",
				name: "Audit Calendar",
				timezone: "Asia/Singapore",
				calendarVersion: "v1",
				workWeek: TIME_CORR_STANDARD_WEEK,
				standardHoursPerDay: "8.00",
				effectiveFrom: "2025-01-01",
			},
			ready,
		);
		expect(calendar.ok).toBe(true);
		if (!calendar.ok) {
			return;
		}
		assertCorrelationPropagated(ready, calCreateCorr, {
			expectOutbox: false,
			operation: HUMAN_RESOURCES_COMMAND_WORK_CALENDAR_CREATE,
		});

		clearPorts(ready);
		const calUpdateCorr = "trace-time-cal-update";
		const updatedCalendar = await updateWorkCalendar(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: calUpdateCorr,
				calendarId: calendar.data.id,
				name: "Audit Calendar Updated",
				expectedVersion: calendar.data.version,
			},
			ready,
		);
		expect(updatedCalendar.ok).toBe(true);
		if (!updatedCalendar.ok) {
			return;
		}
		assertCorrelationPropagated(ready, calUpdateCorr, {
			expectOutbox: false,
			operation: HUMAN_RESOURCES_COMMAND_WORK_CALENDAR_UPDATE,
		});

		clearPorts(ready);
		const holidayAddCorr = "trace-time-holiday-add";
		const holiday = await addWorkCalendarHoliday(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: holidayAddCorr,
				calendarId: updatedCalendar.data.id,
				holidayDate: "2025-07-04",
				label: "Independence Day",
			},
			ready,
		);
		expect(holiday.ok).toBe(true);
		if (!holiday.ok) {
			return;
		}
		assertCorrelationPropagated(ready, holidayAddCorr, {
			expectOutbox: false,
			operation: HUMAN_RESOURCES_COMMAND_WORK_CALENDAR_HOLIDAY_ADD,
		});

		clearPorts(ready);
		const overrideAddCorr = "trace-time-override-add";
		const override = await addCalendarDateOverride(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: overrideAddCorr,
				calendarId: updatedCalendar.data.id,
				holidayDate: "2025-07-05",
				overrideKind: "shortened_day",
				isWorkingDay: true,
				expectedMinutes: 240,
				label: "Half day",
			},
			ready,
		);
		expect(override.ok).toBe(true);
		if (!override.ok) {
			return;
		}
		assertCorrelationPropagated(ready, overrideAddCorr, {
			expectOutbox: false,
			operation: HUMAN_RESOURCES_COMMAND_WORK_CALENDAR_DATE_OVERRIDE_ADD,
		});

		clearPorts(ready);
		const overrideRemoveCorr = "trace-time-override-remove";
		const overrideRemoved = await removeCalendarDateOverride(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: overrideRemoveCorr,
				holidayId: override.data.id,
			},
			ready,
		);
		expect(overrideRemoved.ok).toBe(true);
		if (!overrideRemoved.ok) {
			return;
		}
		assertCorrelationPropagated(ready, overrideRemoveCorr, {
			expectOutbox: false,
			operation: HUMAN_RESOURCES_COMMAND_WORK_CALENDAR_DATE_OVERRIDE_REMOVE,
		});

		clearPorts(ready);
		const holidayRemoveCorr = "trace-time-holiday-remove";
		const holidayRemoved = await removeWorkCalendarHoliday(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: holidayRemoveCorr,
				holidayId: holiday.data.id,
			},
			ready,
		);
		expect(holidayRemoved.ok).toBe(true);
		if (!holidayRemoved.ok) {
			return;
		}
		assertCorrelationPropagated(ready, holidayRemoveCorr, {
			expectOutbox: false,
			operation: HUMAN_RESOURCES_COMMAND_WORK_CALENDAR_HOLIDAY_REMOVE,
		});

		clearPorts(ready);
		const calAssignCorr = "trace-time-cal-assign";
		const calendarAssignment = await assignEmploymentCalendar(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: calAssignCorr,
				employeeId: employee.id,
				employmentId: employment.id,
				calendarId: updatedCalendar.data.id,
				effectiveFrom: "2025-01-01",
			},
			ready,
		);
		expect(calendarAssignment.ok).toBe(true);
		if (!calendarAssignment.ok) {
			return;
		}
		assertCorrelationPropagated(ready, calAssignCorr, {
			expectOutbox: false,
			operation: HUMAN_RESOURCES_COMMAND_EMPLOYMENT_CALENDAR_ASSIGN,
		});

		clearPorts(ready);
		const calEndCorr = "trace-time-cal-end";
		const calendarEnded = await endWorkCalendarAssignment(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: calEndCorr,
				assignmentId: calendarAssignment.data.id,
				effectiveTo: "2025-06-30",
				expectedVersion: calendarAssignment.data.version,
			},
			ready,
		);
		expect(calendarEnded.ok).toBe(true);
		if (!calendarEnded.ok) {
			return;
		}
		assertCorrelationPropagated(ready, calEndCorr, {
			expectOutbox: false,
			operation: HUMAN_RESOURCES_COMMAND_EMPLOYMENT_CALENDAR_END,
		});

		clearPorts(ready);
		const calArchiveCorr = "trace-time-cal-archive";
		const archivedCalendar = await archiveWorkCalendar(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: calArchiveCorr,
				calendarId: updatedCalendar.data.id,
				expectedVersion: updatedCalendar.data.version,
			},
			ready,
		);
		expect(archivedCalendar.ok).toBe(true);
		if (!archivedCalendar.ok) {
			return;
		}
		assertCorrelationPropagated(ready, calArchiveCorr, {
			expectOutbox: false,
			operation: HUMAN_RESOURCES_COMMAND_WORK_CALENDAR_ARCHIVE,
		});

		clearPorts(ready);
		const shiftCreateCorr = "trace-time-shift-create";
		const shift = await createShift(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: shiftCreateCorr,
				idempotencyKey: "idem-time-audit-shift",
				code: "AUDIT-SHIFT",
				name: "Audit Shift",
				shiftKind: "fixed",
				startLocal: "09:00",
				endLocal: "17:00",
				expectedMinutes: 480,
				effectiveFrom: "2025-01-01",
			},
			ready,
		);
		expect(shift.ok).toBe(true);
		if (!shift.ok) {
			return;
		}
		assertCorrelationPropagated(ready, shiftCreateCorr, {
			expectOutbox: false,
			operation: HUMAN_RESOURCES_COMMAND_SHIFT_CREATE,
		});

		clearPorts(ready);
		const shiftUpdateCorr = "trace-time-shift-update";
		const updatedShift = await updateShift(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: shiftUpdateCorr,
				shiftId: shift.data.id,
				name: "Audit Shift Updated",
				expectedVersion: shift.data.version,
			},
			ready,
		);
		expect(updatedShift.ok).toBe(true);
		if (!updatedShift.ok) {
			return;
		}
		assertCorrelationPropagated(ready, shiftUpdateCorr, {
			expectOutbox: false,
			operation: HUMAN_RESOURCES_COMMAND_SHIFT_UPDATE,
		});

		clearPorts(ready);
		const shiftActivateCorr = "trace-time-shift-activate";
		const activatedShift = await activateShift(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: shiftActivateCorr,
				shiftId: updatedShift.data.id,
				expectedVersion: updatedShift.data.version,
			},
			ready,
		);
		expect(activatedShift.ok).toBe(true);
		if (!activatedShift.ok) {
			return;
		}
		assertCorrelationPropagated(ready, shiftActivateCorr, {
			expectOutbox: false,
			operation: HUMAN_RESOURCES_COMMAND_SHIFT_ACTIVATE,
		});

		clearPorts(ready);
		const breakAddCorr = "trace-time-break-add";
		const shiftBreak = await addShiftBreak(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: breakAddCorr,
				shiftId: activatedShift.data.id,
				durationMinutes: 30,
				label: "Lunch",
			},
			ready,
		);
		expect(shiftBreak.ok).toBe(true);
		if (!shiftBreak.ok) {
			return;
		}
		assertCorrelationPropagated(ready, breakAddCorr, {
			expectOutbox: false,
			operation: HUMAN_RESOURCES_COMMAND_SHIFT_BREAK_ADD,
		});

		clearPorts(ready);
		const breakRemoveCorr = "trace-time-break-remove";
		const breakRemoved = await removeShiftBreak(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: breakRemoveCorr,
				breakId: shiftBreak.data.id,
			},
			ready,
		);
		expect(breakRemoved.ok).toBe(true);
		if (!breakRemoved.ok) {
			return;
		}
		assertCorrelationPropagated(ready, breakRemoveCorr, {
			expectOutbox: false,
			operation: HUMAN_RESOURCES_COMMAND_SHIFT_BREAK_REMOVE,
		});

		clearPorts(ready);
		const shiftDeactivateCorr = "trace-time-shift-deactivate";
		const deactivatedShift = await deactivateShift(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: shiftDeactivateCorr,
				shiftId: activatedShift.data.id,
				expectedVersion: activatedShift.data.version,
			},
			ready,
		);
		expect(deactivatedShift.ok).toBe(true);
		if (!deactivatedShift.ok) {
			return;
		}
		assertCorrelationPropagated(ready, shiftDeactivateCorr, {
			expectOutbox: false,
			operation: HUMAN_RESOURCES_COMMAND_SHIFT_DEACTIVATE,
		});

		const activeShift = await activateShift(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "seed-time-audit-shift-reactivate",
				shiftId: deactivatedShift.data.id,
				expectedVersion: deactivatedShift.data.version,
			},
			ready,
		);
		expect(activeShift.ok).toBe(true);
		if (!activeShift.ok) {
			return;
		}

		clearPorts(ready);
		const assignCorr = "trace-time-shift-assign";
		const plannedAssignment = await assignShift(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: assignCorr,
				idempotencyKey: "idem-time-audit-assign",
				employeeId: employee.id,
				employmentId: employment.id,
				shiftId: activeShift.data.id,
				scheduledDate: "2025-07-10",
				startsAt: "2025-07-10T01:00:00.000Z",
				endsAt: "2025-07-10T09:00:00.000Z",
				timezone: "Asia/Singapore",
			},
			ready,
		);
		expect(plannedAssignment.ok).toBe(true);
		if (!plannedAssignment.ok) {
			return;
		}
		assertCorrelationPropagated(ready, assignCorr, {
			expectOutbox: false,
			operation: HUMAN_RESOURCES_COMMAND_SHIFT_ASSIGN,
		});

		const cancelAssignmentSeed = await assignShift(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "seed-time-audit-cancel-assign",
				idempotencyKey: "idem-time-audit-cancel-assign",
				employeeId: employee.id,
				employmentId: employment.id,
				shiftId: activeShift.data.id,
				scheduledDate: "2025-07-11",
				startsAt: "2025-07-11T01:00:00.000Z",
				endsAt: "2025-07-11T09:00:00.000Z",
				timezone: "Asia/Singapore",
			},
			ready,
		);
		expect(cancelAssignmentSeed.ok).toBe(true);
		if (!cancelAssignmentSeed.ok) {
			return;
		}

		clearPorts(ready);
		const cancelCorr = "trace-time-assign-cancel";
		const cancelledAssignment = await cancelShiftAssignment(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: cancelCorr,
				assignmentId: cancelAssignmentSeed.data.id,
				expectedVersion: cancelAssignmentSeed.data.version,
			},
			ready,
		);
		expect(cancelledAssignment.ok).toBe(true);
		if (!cancelledAssignment.ok) {
			return;
		}
		assertCorrelationPropagated(ready, cancelCorr, {
			expectOutbox: false,
			operation: HUMAN_RESOURCES_COMMAND_SHIFT_ASSIGNMENT_CANCEL,
		});

		clearPorts(ready);
		const changeCorr = "trace-time-assign-change";
		const changedAssignment = await changeShiftAssignment(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: changeCorr,
				assignmentId: plannedAssignment.data.id,
				startsAt: "2025-07-10T02:00:00.000Z",
				endsAt: "2025-07-10T10:00:00.000Z",
				expectedVersion: plannedAssignment.data.version,
			},
			ready,
		);
		expect(changedAssignment.ok).toBe(true);
		if (!changedAssignment.ok) {
			return;
		}
		assertCorrelationPropagated(ready, changeCorr, {
			expectOutbox: false,
			operation: HUMAN_RESOURCES_COMMAND_SHIFT_ASSIGNMENT_CHANGE,
		});

		const completeAssignmentSeed = await assignShift(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "seed-time-audit-complete-assign",
				idempotencyKey: "idem-time-audit-complete-assign",
				employeeId: employee.id,
				employmentId: employment.id,
				shiftId: activeShift.data.id,
				scheduledDate: "2025-07-12",
				startsAt: "2025-07-12T01:00:00.000Z",
				endsAt: "2025-07-12T09:00:00.000Z",
				timezone: "Asia/Singapore",
			},
			ready,
		);
		expect(completeAssignmentSeed.ok).toBe(true);
		if (!completeAssignmentSeed.ok) {
			return;
		}

		const publishedForComplete = await publishShiftAssignment(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "seed-time-audit-complete-publish",
				assignmentId: completeAssignmentSeed.data.id,
				expectedVersion: completeAssignmentSeed.data.version,
			},
			ready,
		);
		expect(publishedForComplete.ok).toBe(true);
		if (!publishedForComplete.ok) {
			return;
		}

		clearPorts(ready);
		const completeCorr = "trace-time-assign-complete";
		const completedAssignment = await completeShiftAssignment(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: completeCorr,
				assignmentId: publishedForComplete.data.id,
				expectedVersion: publishedForComplete.data.version,
			},
			ready,
		);
		expect(completedAssignment.ok).toBe(true);
		if (!completedAssignment.ok) {
			return;
		}
		assertCorrelationPropagated(ready, completeCorr, {
			expectOutbox: false,
			operation: HUMAN_RESOURCES_COMMAND_SHIFT_ASSIGNMENT_COMPLETE,
		});

		clearPorts(ready);
		const importCorr = "trace-time-import";
		const imported = await importAttendanceEvents(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: importCorr,
				idempotencyKey: "idem-time-audit-import",
				batchId: "batch-time-audit",
				sourceKey: "terminal-audit",
				events: [
					{
						employeeId: employee.id,
						eventType: "clock_in",
						occurredAt: "2025-07-15T01:00:00.000Z",
						sourceTimezone: "Asia/Singapore",
						localWorkDate: "2025-07-15",
						sourceReference: "audit-cin-1",
					},
				],
			},
			ready,
		);
		expect(imported.ok).toBe(true);
		if (!imported.ok) {
			return;
		}
		assertCorrelationPropagated(ready, importCorr, {
			expectOutbox: false,
			operation: HUMAN_RESOURCES_COMMAND_ATTENDANCE_EVENTS_IMPORT,
		});

		const voidSeed = await recordClockIn(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "seed-time-void-event",
				idempotencyKey: "idem-time-void-event",
				employeeId: employee.id,
				employmentId: employment.id,
				occurredAt: "2025-07-16T01:00:00.000Z",
				sourceTimezone: "Asia/Singapore",
				localWorkDate: "2025-07-16",
			},
			ready,
		);
		expect(voidSeed.ok).toBe(true);
		if (!voidSeed.ok) {
			return;
		}

		clearPorts(ready);
		const voidCorr = "trace-time-void";
		const voided = await voidAttendanceEvent(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: voidCorr,
				eventId: voidSeed.data.id,
				voidReason: "duplicate punch",
				expectedVersion: voidSeed.data.version,
			},
			ready,
		);
		expect(voided.ok).toBe(true);
		if (!voided.ok) {
			return;
		}
		assertCorrelationPropagated(ready, voidCorr, {
			expectOutbox: false,
			operation: HUMAN_RESOURCES_COMMAND_ATTENDANCE_EVENT_VOID,
		});

		await recordClockIn(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "seed-time-session-cin",
				idempotencyKey: "idem-time-session-cin",
				employeeId: employee.id,
				employmentId: employment.id,
				occurredAt: "2025-07-17T01:00:00.000Z",
				sourceTimezone: "Asia/Singapore",
				localWorkDate: "2025-07-17",
			},
			ready,
		);
		await recordClockOut(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "seed-time-session-cout",
				idempotencyKey: "idem-time-session-cout",
				employeeId: employee.id,
				employmentId: employment.id,
				occurredAt: "2025-07-17T09:00:00.000Z",
				sourceTimezone: "Asia/Singapore",
				localWorkDate: "2025-07-17",
			},
			ready,
		);

		clearPorts(ready);
		const sessionCorr = "trace-time-session-resolve";
		const session = await resolveAttendanceSession(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: sessionCorr,
				idempotencyKey: "idem-time-session",
				employeeId: employee.id,
				localWorkDate: "2025-07-17",
				timezone: "Asia/Singapore",
			},
			ready,
		);
		expect(session.ok).toBe(true);
		if (!session.ok) {
			return;
		}
		assertCorrelationPropagated(ready, sessionCorr, {
			expectOutbox: false,
			operation: HUMAN_RESOURCES_COMMAND_ATTENDANCE_SESSION_RESOLVE,
		});

		const reviewExceptionSeed = await createAttendanceException(
			{
				organizationId: ORG,
				actorUserId: MANAGER,
				correlationId: "seed-time-exc-review",
				employeeId: employee.id,
				exceptionType: "late_arrival",
				severity: "warning",
				remarks: "late",
			},
			ready,
		);
		expect(reviewExceptionSeed.ok).toBe(true);
		if (!reviewExceptionSeed.ok) {
			return;
		}

		clearPorts(ready);
		const reviewCorr = "trace-time-exc-review";
		const reviewed = await reviewAttendanceException(
			{
				organizationId: ORG,
				actorUserId: MANAGER,
				correlationId: reviewCorr,
				exceptionId: reviewExceptionSeed.data.id,
				expectedVersion: reviewExceptionSeed.data.version,
			},
			ready,
		);
		expect(reviewed.ok).toBe(true);
		if (!reviewed.ok) {
			return;
		}
		assertCorrelationPropagated(ready, reviewCorr, {
			expectOutbox: false,
			operation: HUMAN_RESOURCES_COMMAND_ATTENDANCE_EXCEPTION_REVIEW,
		});

		clearPorts(ready);
		const excuseCorr = "trace-time-exc-excuse";
		const excused = await excuseAttendanceException(
			{
				organizationId: ORG,
				actorUserId: MANAGER,
				correlationId: excuseCorr,
				exceptionId: reviewed.data.id,
				resolution: "traffic",
				expectedVersion: reviewed.data.version,
			},
			ready,
		);
		expect(excused.ok).toBe(true);
		if (!excused.ok) {
			return;
		}
		assertCorrelationPropagated(ready, excuseCorr, {
			expectOutbox: false,
			operation: HUMAN_RESOURCES_COMMAND_ATTENDANCE_EXCEPTION_EXCUSE,
		});

		const rejectExceptionSeed = await createAttendanceException(
			{
				organizationId: ORG,
				actorUserId: MANAGER,
				correlationId: "seed-time-exc-reject",
				employeeId: employee.id,
				exceptionType: "early_departure",
				severity: "warning",
				remarks: "left early",
			},
			ready,
		);
		expect(rejectExceptionSeed.ok).toBe(true);
		if (!rejectExceptionSeed.ok) {
			return;
		}

		const rejectReviewed = await reviewAttendanceException(
			{
				organizationId: ORG,
				actorUserId: MANAGER,
				correlationId: "seed-time-exc-reject-review",
				exceptionId: rejectExceptionSeed.data.id,
				expectedVersion: rejectExceptionSeed.data.version,
			},
			ready,
		);
		expect(rejectReviewed.ok).toBe(true);
		if (!rejectReviewed.ok) {
			return;
		}

		clearPorts(ready);
		const rejectExcCorr = "trace-time-exc-reject";
		const rejectedException = await rejectAttendanceException(
			{
				organizationId: ORG,
				actorUserId: MANAGER,
				correlationId: rejectExcCorr,
				exceptionId: rejectReviewed.data.id,
				resolution: "unapproved leave",
				expectedVersion: rejectReviewed.data.version,
			},
			ready,
		);
		expect(rejectedException.ok).toBe(true);
		if (!rejectedException.ok) {
			return;
		}
		assertCorrelationPropagated(ready, rejectExcCorr, {
			expectOutbox: false,
			operation: HUMAN_RESOURCES_COMMAND_ATTENDANCE_EXCEPTION_REJECT,
		});

		const resolveExceptionSeed = await createAttendanceException(
			{
				organizationId: ORG,
				actorUserId: MANAGER,
				correlationId: "seed-time-exc-resolve",
				employeeId: employee.id,
				exceptionType: "missing_clock_out",
				severity: "warning",
				remarks: "missing out punch",
			},
			ready,
		);
		expect(resolveExceptionSeed.ok).toBe(true);
		if (!resolveExceptionSeed.ok) {
			return;
		}

		const resolveReviewed = await reviewAttendanceException(
			{
				organizationId: ORG,
				actorUserId: MANAGER,
				correlationId: "seed-time-exc-resolve-review",
				exceptionId: resolveExceptionSeed.data.id,
				expectedVersion: resolveExceptionSeed.data.version,
			},
			ready,
		);
		expect(resolveReviewed.ok).toBe(true);
		if (!resolveReviewed.ok) {
			return;
		}

		clearPorts(ready);
		const resolveExcCorr = "trace-time-exc-resolve";
		const resolvedException = await resolveAttendanceException(
			{
				organizationId: ORG,
				actorUserId: MANAGER,
				correlationId: resolveExcCorr,
				exceptionId: resolveReviewed.data.id,
				resolution: "manual correction filed",
				expectedVersion: resolveReviewed.data.version,
			},
			ready,
		);
		expect(resolvedException.ok).toBe(true);
		if (!resolvedException.ok) {
			return;
		}
		assertCorrelationPropagated(ready, resolveExcCorr, {
			expectOutbox: false,
			operation: HUMAN_RESOURCES_COMMAND_ATTENDANCE_EXCEPTION_RESOLVE,
		});

		const auditCalendar = await createWorkCalendar(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "seed-time-audit-ts-cal",
				idempotencyKey: "idem-time-audit-ts-cal",
				code: "AUDIT-TS-CAL",
				name: "Audit TS Calendar",
				timezone: "Asia/Singapore",
				calendarVersion: "v1",
				workWeek: TIME_CORR_STANDARD_WEEK,
				standardHoursPerDay: "8.00",
				effectiveFrom: "2025-01-01",
			},
			ready,
		);
		expect(auditCalendar.ok).toBe(true);
		if (!auditCalendar.ok) {
			return;
		}

		await assignEmploymentCalendar(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "seed-time-audit-ts-cal-assign",
				employeeId: employee.id,
				employmentId: employment.id,
				calendarId: auditCalendar.data.id,
				effectiveFrom: "2025-07-01",
			},
			ready,
		);

		clearPorts(ready);
		const tsCreateCorr = "trace-time-ts-create";
		const timesheet = await createTimesheet(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: tsCreateCorr,
				idempotencyKey: "idem-time-audit-ts",
				employeeId: employee.id,
				employmentId: employment.id,
				periodStart: "2025-07-01",
				periodEnd: "2025-07-07",
			},
			ready,
		);
		expect(timesheet.ok).toBe(true);
		if (!timesheet.ok) {
			return;
		}
		assertCorrelationPropagated(ready, tsCreateCorr, {
			expectOutbox: false,
			operation: HUMAN_RESOURCES_COMMAND_TIMESHEET_CREATE,
		});

		clearPorts(ready);
		const generateCorr = "trace-time-ts-generate";
		const generated = await generateTimesheetEntries(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: generateCorr,
				timesheetId: timesheet.data.id,
				expectedVersion: timesheet.data.version,
			},
			ready,
		);
		expect(generated.ok).toBe(true);
		if (!generated.ok) {
			return;
		}
		assertCorrelationPropagated(ready, generateCorr, {
			expectOutbox: false,
			operation: HUMAN_RESOURCES_COMMAND_TIMESHEET_GENERATE_ENTRIES,
		});

		clearPorts(ready);
		const entryAddCorr = "trace-time-ts-entry-add";
		const entry = await addTimesheetEntry(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: entryAddCorr,
				timesheetId: generated.data.timesheet.id,
				employeeId: employee.id,
				workDate: "2025-07-02",
				timezone: "Asia/Singapore",
				sourceType: "manual",
				timeType: "regular",
				recordedMinutes: 480,
				approvedMinutes: 480,
			},
			ready,
		);
		expect(entry.ok).toBe(true);
		if (!entry.ok) {
			return;
		}
		assertCorrelationPropagated(ready, entryAddCorr, {
			expectOutbox: false,
			operation: HUMAN_RESOURCES_COMMAND_TIMESHEET_ENTRY_ADD,
		});

		clearPorts(ready);
		const entryUpdateCorr = "trace-time-ts-entry-update";
		const updatedEntry = await updateTimesheetEntry(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: entryUpdateCorr,
				entryId: entry.data.id,
				approvedMinutes: 450,
				expectedVersion: entry.data.version,
			},
			ready,
		);
		expect(updatedEntry.ok).toBe(true);
		if (!updatedEntry.ok) {
			return;
		}
		assertCorrelationPropagated(ready, entryUpdateCorr, {
			expectOutbox: false,
			operation: HUMAN_RESOURCES_COMMAND_TIMESHEET_ENTRY_UPDATE,
		});

		clearPorts(ready);
		const entryRemoveCorr = "trace-time-ts-entry-remove";
		const removedEntry = await removeTimesheetEntry(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: entryRemoveCorr,
				entryId: updatedEntry.data.id,
				expectedVersion: updatedEntry.data.version,
			},
			ready,
		);
		expect(removedEntry.ok).toBe(true);
		if (!removedEntry.ok) {
			return;
		}
		assertCorrelationPropagated(ready, entryRemoveCorr, {
			expectOutbox: false,
			operation: HUMAN_RESOURCES_COMMAND_TIMESHEET_ENTRY_REMOVE,
		});

		const timesheetForReturn = await getTimesheet(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "seed-time-ts-return-get",
				timesheetId: generated.data.timesheet.id,
			},
			ready,
		);
		expect(timesheetForReturn.ok).toBe(true);
		if (!timesheetForReturn.ok || timesheetForReturn.data === null) {
			return;
		}
		const submittedForReturn = await submitTimesheet(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "seed-time-ts-return-submit",
				timesheetId: timesheetForReturn.data.id,
				expectedVersion: timesheetForReturn.data.version,
			},
			ready,
		);
		expect(submittedForReturn.ok).toBe(true);
		if (!submittedForReturn.ok) {
			return;
		}

		clearPorts(ready);
		const returnCorr = "trace-time-ts-return";
		const returned = await returnTimesheet(
			{
				organizationId: ORG,
				actorUserId: MANAGER,
				correlationId: returnCorr,
				timesheetId: submittedForReturn.data.id,
				approverNotes: "fix entries",
				expectedVersion: submittedForReturn.data.version,
			},
			ready,
		);
		expect(returned.ok).toBe(true);
		if (!returned.ok) {
			return;
		}
		assertCorrelationPropagated(ready, returnCorr, {
			expectOutbox: false,
			operation: HUMAN_RESOURCES_COMMAND_TIMESHEET_RETURN,
		});

		const rejectTimesheetSeed = await createTimesheet(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "seed-time-ts-reject",
				idempotencyKey: "idem-time-ts-reject",
				employeeId: employee.id,
				employmentId: employment.id,
				periodStart: "2025-08-01",
				periodEnd: "2025-08-07",
			},
			ready,
		);
		expect(rejectTimesheetSeed.ok).toBe(true);
		if (!rejectTimesheetSeed.ok) {
			return;
		}

		const submittedForReject = await submitTimesheet(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "seed-time-ts-reject-submit",
				timesheetId: rejectTimesheetSeed.data.id,
				expectedVersion: rejectTimesheetSeed.data.version,
			},
			ready,
		);
		expect(submittedForReject.ok).toBe(true);
		if (!submittedForReject.ok) {
			return;
		}

		clearPorts(ready);
		const rejectTsCorr = "trace-time-ts-reject";
		const rejectedTimesheet = await rejectTimesheet(
			{
				organizationId: ORG,
				actorUserId: MANAGER,
				correlationId: rejectTsCorr,
				timesheetId: submittedForReject.data.id,
				rejectionReason: "unsupported overtime",
				expectedVersion: submittedForReject.data.version,
			},
			ready,
		);
		expect(rejectedTimesheet.ok).toBe(true);
		if (!rejectedTimesheet.ok) {
			return;
		}
		assertCorrelationPropagated(ready, rejectTsCorr, {
			expectOutbox: false,
			operation: HUMAN_RESOURCES_COMMAND_TIMESHEET_REJECT,
		});

		const supersedeTimesheetSeed = await createTimesheet(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "seed-time-ts-supersede",
				idempotencyKey: "idem-time-ts-supersede",
				employeeId: employee.id,
				employmentId: employment.id,
				periodStart: "2025-09-01",
				periodEnd: "2025-09-07",
			},
			ready,
		);
		expect(supersedeTimesheetSeed.ok).toBe(true);
		if (!supersedeTimesheetSeed.ok) {
			return;
		}

		const submittedForSupersede = await submitTimesheet(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "seed-time-ts-supersede-submit",
				timesheetId: supersedeTimesheetSeed.data.id,
				expectedVersion: supersedeTimesheetSeed.data.version,
			},
			ready,
		);
		expect(submittedForSupersede.ok).toBe(true);
		if (!submittedForSupersede.ok) {
			return;
		}

		await grantManagerTimeApprovalAuthority(ready, "supersede");
		const approvedForSupersede = await approveTimesheet(
			{
				organizationId: ORG,
				actorUserId: MANAGER,
				correlationId: "seed-time-ts-supersede-approve",
				authority: "line_manager",
				timesheetId: submittedForSupersede.data.id,
				expectedVersion: submittedForSupersede.data.version,
			},
			ready,
		);
		expect(approvedForSupersede.ok).toBe(true);
		if (!approvedForSupersede.ok) {
			return;
		}

		clearPorts(ready);
		const supersedeCorr = "trace-time-ts-supersede";
		const superseded = await supersedeTimesheet(
			{
				organizationId: ORG,
				actorUserId: MANAGER,
				correlationId: supersedeCorr,
				timesheetId: approvedForSupersede.data.id,
				expectedVersion: approvedForSupersede.data.version,
				idempotencyKey: "idem-time-ts-supersede-op",
			},
			ready,
		);
		expect(superseded.ok).toBe(true);
		if (!superseded.ok) {
			return;
		}
		assertCorrelationPropagated(ready, supersedeCorr, {
			expectOutbox: false,
			operation: HUMAN_RESOURCES_COMMAND_TIMESHEET_SUPERSEDE,
		});

		clearPorts(ready);
		const otCreateCorr = "trace-time-ot-create";
		const otRejectSeed = await createOvertimeRequest(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: otCreateCorr,
				idempotencyKey: "idem-time-ot-reject",
				employeeId: employee.id,
				employmentId: employment.id,
				overtimeType: "weekday_overtime",
				requestedStartsAt: "2025-07-20T10:00:00.000Z",
				requestedEndsAt: "2025-07-20T12:00:00.000Z",
				requestedMinutes: 120,
				reason: "audit reject path",
			},
			ready,
		);
		expect(otRejectSeed.ok).toBe(true);
		if (!otRejectSeed.ok) {
			return;
		}
		assertCorrelationPropagated(ready, otCreateCorr, {
			expectOutbox: false,
			operation: HUMAN_RESOURCES_COMMAND_OVERTIME_REQUEST_CREATE,
		});

		clearPorts(ready);
		const otRejectCorr = "trace-time-ot-reject";
		const otRejected = await rejectOvertimeRequest(
			{
				organizationId: ORG,
				actorUserId: MANAGER,
				correlationId: otRejectCorr,
				requestId: otRejectSeed.data.id,
				comment: "not approved",
				expectedVersion: otRejectSeed.data.version,
			},
			ready,
		);
		expect(otRejected.ok).toBe(true);
		if (!otRejected.ok) {
			return;
		}
		assertCorrelationPropagated(ready, otRejectCorr, {
			expectOutbox: false,
			operation: HUMAN_RESOURCES_COMMAND_OVERTIME_REQUEST_REJECT,
		});

		const otCancelSeed = await createOvertimeRequest(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "seed-time-ot-cancel",
				idempotencyKey: "idem-time-ot-cancel",
				employeeId: employee.id,
				employmentId: employment.id,
				overtimeType: "weekday_overtime",
				requestedStartsAt: "2025-07-21T10:00:00.000Z",
				requestedEndsAt: "2025-07-21T11:00:00.000Z",
				requestedMinutes: 60,
				reason: "audit cancel path",
			},
			ready,
		);
		expect(otCancelSeed.ok).toBe(true);
		if (!otCancelSeed.ok) {
			return;
		}

		clearPorts(ready);
		const otCancelCorr = "trace-time-ot-cancel";
		const otCancelled = await cancelOvertimeRequest(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: otCancelCorr,
				requestId: otCancelSeed.data.id,
				expectedVersion: otCancelSeed.data.version,
			},
			ready,
		);
		expect(otCancelled.ok).toBe(true);
		if (!otCancelled.ok) {
			return;
		}
		assertCorrelationPropagated(ready, otCancelCorr, {
			expectOutbox: false,
			operation: HUMAN_RESOURCES_COMMAND_OVERTIME_REQUEST_CANCEL,
		});

		const otActualSeed = await createOvertimeRequest(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "seed-time-ot-actual",
				idempotencyKey: "idem-time-ot-actual",
				employeeId: employee.id,
				employmentId: employment.id,
				overtimeType: "weekday_overtime",
				requestedStartsAt: "2025-07-22T10:00:00.000Z",
				requestedEndsAt: "2025-07-22T12:00:00.000Z",
				requestedMinutes: 120,
				reason: "audit actual path",
			},
			ready,
		);
		expect(otActualSeed.ok).toBe(true);
		if (!otActualSeed.ok) {
			return;
		}

		const otApprovedForActual = await approveOvertimeRequest(
			{
				organizationId: ORG,
				actorUserId: MANAGER,
				correlationId: "seed-time-ot-actual-approve",
				requestedAuthority: "line_manager",
				requestId: otActualSeed.data.id,
				approvedMaximumMinutes: 120,
				expectedVersion: otActualSeed.data.version,
			},
			ready,
		);
		expect(otApprovedForActual.ok).toBe(true);
		if (!otApprovedForActual.ok) {
			return;
		}

		clearPorts(ready);
		const otActualCorr = "trace-time-ot-actual";
		const otActual = await recordOvertimeActual(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: otActualCorr,
				requestId: otApprovedForActual.data.id,
				actualMinutes: 90,
				expectedVersion: otApprovedForActual.data.version,
			},
			ready,
		);
		expect(otActual.ok).toBe(true);
		if (!otActual.ok) {
			return;
		}
		assertCorrelationPropagated(ready, otActualCorr, {
			expectOutbox: false,
			operation: HUMAN_RESOURCES_COMMAND_OVERTIME_REQUEST_RECORD_ACTUAL,
		});

		clearPorts(ready);
		const otVerifyCorr = "trace-time-ot-verify";
		const otVerified = await verifyOvertimeRequest(
			{
				organizationId: ORG,
				actorUserId: MANAGER,
				correlationId: otVerifyCorr,
				requestId: otActual.data.id,
				payrollApprovedMinutes: 90,
				expectedVersion: otActual.data.version,
			},
			ready,
		);
		expect(otVerified.ok).toBe(true);
		if (!otVerified.ok) {
			return;
		}
		assertCorrelationPropagated(ready, otVerifyCorr, {
			expectOutbox: false,
			operation: HUMAN_RESOURCES_COMMAND_OVERTIME_REQUEST_VERIFY,
		});
	});

	it("propagates correlationId for leave submit, approve, and reject", async () => {
		const ready = harness();
		const leaveReady = {
			...ready,
			workCalendar: createMemoryWorkCalendar(),
		};
		const managerSeed = await createEmployee(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "corr-leave-manager-seed",
				idempotencyKey: "idem-leave-manager",
				employeeNumber: "E-LEAVE-MGR",
				legalName: "Leave Manager",
			},
			ready,
		);
		expect(managerSeed.ok).toBe(true);
		if (!managerSeed.ok) {
			return;
		}

		const submitSeed = await seedLeaveCorrelationFixture({
			organizationId: ORG,
			actorUserId: ACTOR,
			ready: leaveReady,
		});
		const draft = await createDraftLeaveRequest(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "corr-leave-corr-draft-main",
				idempotencyKey: "idem-leave-corr-draft-main",
				employeeId: submitSeed.employee.id,
				entitlementId: submitSeed.entitlement.id,
				startDate: "2025-08-01",
				endDate: "2025-08-01",
				requestedQuantity: "1",
			},
			leaveReady,
		);
		expect(draft.ok).toBe(true);
		if (!draft.ok) {
			return;
		}

		clearPorts(ready);
		const submitCorr = "trace-leave-submit";
		const submitted = await submitLeaveRequest(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: submitCorr,
				requestId: draft.data.id,
				expectedVersion: draft.data.version,
			},
			submitSeed.seedReady,
		);
		expect(submitted.ok).toBe(true);
		if (!submitted.ok) {
			return;
		}
		assertCorrelationPropagated(ready, submitCorr, {
			expectOutbox: true,
			operation: HUMAN_RESOURCES_COMMAND_LEAVE_REQUEST_SUBMIT,
		});

		const approvalReady = {
			...ready,
			authorization: createGrantingHumanResourcesAuthorization([
				...HUMAN_RESOURCES_PERMISSION_CODES,
				HUMAN_RESOURCES_PERMISSION_LEAVE_REQUEST_APPROVE_TEAM,
				HUMAN_RESOURCES_PERMISSION_ORGANIZATION_MANAGE,
			]),
		};
		await assignPrimaryReportingLine(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "corr-leave-reporting-line",
				employeeId: submitSeed.employee.id,
				managerEmployeeId: managerSeed.data.id,
				startsOn: "2025-01-01",
			},
			approvalReady,
		);
		await mapActorToEmployee(ready.store, {
			organizationId: ORG,
			userId: MANAGER,
			employeeId: managerSeed.data.id,
			actorUserId: ACTOR,
			effectiveFrom: "2025-01-01",
		});

		clearPorts(ready);
		const approveCorr = "trace-leave-approve";
		const approved = await approveLeaveRequest(
			{
				organizationId: ORG,
				actorUserId: MANAGER,
				correlationId: approveCorr,
				requestId: submitted.data.id,
				expectedVersion: submitted.data.version,
			},
			approvalReady,
		);
		expect(approved.ok).toBe(true);
		if (!approved.ok) {
			return;
		}
		assertCorrelationPropagated(ready, approveCorr, {
			expectOutbox: true,
			operation: HUMAN_RESOURCES_COMMAND_LEAVE_REQUEST_APPROVE,
		});

		const rejectSeed = await seedLeaveCorrelationFixture({
			organizationId: ORG,
			actorUserId: ACTOR,
			ready: leaveReady,
			suffix: "reject",
		});
		const rejectDraft = await createDraftLeaveRequest(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "corr-leave-corr-draft-reject",
				idempotencyKey: "idem-leave-corr-draft-reject",
				employeeId: rejectSeed.employee.id,
				entitlementId: rejectSeed.entitlement.id,
				startDate: "2025-08-04",
				endDate: "2025-08-04",
				requestedQuantity: "1",
			},
			leaveReady,
		);
		expect(rejectDraft.ok).toBe(true);
		if (!rejectDraft.ok) {
			return;
		}
		const rejectSubmitted = await submitLeaveRequest(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "trace-leave-reject-seed",
				requestId: rejectDraft.data.id,
				expectedVersion: rejectDraft.data.version,
			},
			rejectSeed.seedReady,
		);
		expect(rejectSubmitted.ok).toBe(true);
		if (!rejectSubmitted.ok) {
			return;
		}
		await assignPrimaryReportingLine(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "corr-leave-reporting-line-reject",
				employeeId: rejectSeed.employee.id,
				managerEmployeeId: managerSeed.data.id,
				startsOn: "2025-01-01",
			},
			approvalReady,
		);
		clearPorts(ready);
		const rejectCorr = "trace-leave-reject";
		const rejected = await rejectLeaveRequest(
			{
				organizationId: ORG,
				actorUserId: MANAGER,
				correlationId: rejectCorr,
				requestId: rejectSubmitted.data.id,
				expectedVersion: rejectSubmitted.data.version,
				note: "coverage reject path",
			},
			approvalReady,
		);
		expect(rejected.ok).toBe(true);
		if (!rejected.ok) {
			return;
		}
		assertCorrelationPropagated(ready, rejectCorr, {
			expectOutbox: true,
			operation: HUMAN_RESOURCES_COMMAND_LEAVE_REQUEST_REJECT,
		});
	});

	it("first createEmployment emits employment.started.v1 with effectiveOn", async () => {
		const ready = harness();
		const employee = await createEmployee(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "seed-emp-started-effective",
				idempotencyKey: "idem-emp-started-effective",
				employeeNumber: "E-START-EFF",
				legalName: "Started Effective Worker",
			},
			ready,
		);
		expect(employee.ok).toBe(true);
		if (!employee.ok) {
			return;
		}

		clearPorts(ready);
		const correlationId = "trace-employment-started-effective";
		const employment = await createEmployment(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId,
				employeeId: employee.data.id,
				startsOn: "2026-04-01",
			},
			ready,
		);
		expect(employment.ok).toBe(true);
		if (!employment.ok) {
			return;
		}
		assertCorrelationPropagated(ready, correlationId, {
			expectOutbox: true,
			operation: HUMAN_RESOURCES_COMMAND_EMPLOYMENT_CREATE,
		});
		const outboxCall = memoryPorts(ready).outbox.calls.at(-1);
		expect(outboxCall?.type).toBe(HUMAN_RESOURCES_EMPLOYMENT_STARTED_EVENT);
		expect(outboxCall?.payload.effectiveOn).toBe("2026-04-01");
	});

	it("createEmployment after ended employment emits employee.rehired.v1 with effectiveOn", async () => {
		const ready = harness();
		const employee = await createEmployee(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "seed-emp-rehire-effective",
				idempotencyKey: "idem-emp-rehire-effective",
				employeeNumber: "E-REHIRE-EFF",
				legalName: "Rehire Effective Worker",
			},
			ready,
		);
		expect(employee.ok).toBe(true);
		if (!employee.ok) {
			return;
		}

		const firstEmployment = await createEmployment(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "seed-employment-rehire-first",
				employeeId: employee.data.id,
				startsOn: "2025-01-01",
				endsOn: "2025-12-31",
			},
			ready,
		);
		expect(firstEmployment.ok).toBe(true);
		if (!firstEmployment.ok) {
			return;
		}

		clearPorts(ready);
		const correlationId = "trace-employment-rehired-effective";
		const rehire = await createEmployment(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId,
				employeeId: employee.data.id,
				startsOn: "2026-06-01",
			},
			ready,
		);
		expect(rehire.ok).toBe(true);
		if (!rehire.ok) {
			return;
		}
		assertCorrelationPropagated(ready, correlationId, {
			expectOutbox: true,
			operation: HUMAN_RESOURCES_COMMAND_EMPLOYMENT_CREATE,
		});
		const outboxCall = memoryPorts(ready).outbox.calls.at(-1);
		expect(outboxCall?.type).toBe(HUMAN_RESOURCES_EMPLOYEE_REHIRED_EVENT);
		expect(outboxCall?.payload.effectiveOn).toBe("2026-06-01");
	});

	it("propagates correlationId across lifecycle domain_event and audit_only mutations", async () => {
		const ready = harness();
		const suffix = `${Date.now()}`;
		const seeded = await seedLifecycleEmploymentWithAssignment(ready, {
			organizationId: ORG,
			actorUserId: ACTOR,
			suffix,
		});
		expect(seeded.ok).toBe(true);
		if (!seeded.ok) {
			return;
		}

		clearPorts(ready);
		const onboardingStartCorr = `trace-onboarding-start-${suffix}`;
		const onboardingStarted = await startOnboarding(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: onboardingStartCorr,
				idempotencyKey: `idem-onb-${suffix}`,
				employmentId: seeded.employment.id,
				tasks: [
					{
						code: "identity_documents",
						title: "Identity documents",
						mandatory: true,
					},
				],
			},
			ready,
		);
		expect(onboardingStarted.ok).toBe(true);
		if (!onboardingStarted.ok) {
			return;
		}
		assertCorrelationPropagated(ready, onboardingStartCorr, {
			expectOutbox: true,
			operation: HUMAN_RESOURCES_COMMAND_ONBOARDING_START,
		});

		const onboardingTasks = await listOnboardingTasks(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-onb-tasks-${suffix}`,
				onboardingCaseId: onboardingStarted.data.id,
			},
			ready,
		);
		expect(onboardingTasks.ok).toBe(true);
		if (!onboardingTasks.ok) {
			return;
		}
		const orientationTask = onboardingTasks.data.find(
			(row) => row.code === ONBOARDING_TASK_CODE_ORIENTATION,
		);
		expect(orientationTask).toBeDefined();
		if (!orientationTask) {
			return;
		}

		clearPorts(ready);
		const onboardingTaskCorr = `trace-onboarding-task-${suffix}`;
		const onboardingTaskDone = await completeOnboardingTask(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: onboardingTaskCorr,
				taskId: orientationTask.id,
				status: "completed",
				expectedVersion: orientationTask.version,
			},
			ready,
		);
		expect(onboardingTaskDone.ok).toBe(true);
		if (!onboardingTaskDone.ok) {
			return;
		}
		assertCorrelationPropagated(ready, onboardingTaskCorr, {
			expectOutbox: false,
			operation: HUMAN_RESOURCES_COMMAND_ONBOARDING_COMPLETE_TASK,
		});

		const recordedEligibility = await recordWorkEligibility(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-onb-eligibility-${suffix}`,
				employeeId: seeded.employee.id,
				countryCode: "US",
				issuedOn: "2025-01-01",
				idempotencyKey: `idem-onb-eligibility-${suffix}`,
			},
			ready,
		);
		expect(recordedEligibility.ok).toBe(true);
		if (!recordedEligibility.ok) {
			return;
		}
		const verifiedEligibility = await verifyWorkEligibility(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-onb-eligibility-verify-${suffix}`,
				eligibilityId: recordedEligibility.data.id,
				evidenceDate: "2025-01-02",
				expectedVersion: recordedEligibility.data.version,
			},
			ready,
		);
		expect(verifiedEligibility.ok).toBe(true);
		if (!verifiedEligibility.ok) {
			return;
		}

		let onboardingCase = onboardingTaskDone.data;
		const sequentialOutcome1 = await runSequential(
			[
				ONBOARDING_TASK_CODE_IDENTITY_DOCUMENTS,
				ONBOARDING_TASK_CODE_WORK_ELIGIBILITY,
			] as const,
			async (code) => {
				const tasks = await listOnboardingTasks(
					{
						organizationId: ORG,
						actorUserId: ACTOR,
						correlationId: `corr-onb-task-${code}-${suffix}`,
						onboardingCaseId: onboardingCase.id,
					},
					ready,
				);
				expect(tasks.ok).toBe(true);
				if (!tasks.ok) {
					return sequentialReturn(undefined);
				}
				const task = tasks.data.find((row) => row.code === code);
				expect(task).toBeDefined();
				if (!task) {
					return sequentialReturn(undefined);
				}
				const done = await completeOnboardingTask(
					{
						organizationId: ORG,
						actorUserId: ACTOR,
						correlationId: `corr-onb-task-${code}-done-${suffix}`,
						taskId: task.id,
						status: "completed",
						expectedVersion: task.version,
					},
					ready,
				);
				expect(done.ok).toBe(true);
				if (!done.ok) {
					return sequentialReturn(undefined);
				}
				onboardingCase = done.data;
			},
		);
		if (sequentialOutcome1.kind === "return") {
			return sequentialOutcome1.value;
		}

		const orientation = await getOnboardingOrientationByCase(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-onb-orientation-${suffix}`,
				onboardingCaseId: onboardingCase.id,
			},
			ready,
		);
		expect(orientation.ok).toBe(true);
		if (!orientation.ok || orientation.data === null) {
			return;
		}
		const orientationRecorded = await recordOnboardingOrientation(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-onb-orientation-record-${suffix}`,
				orientationId: orientation.data.id,
				acknowledgedOn: "2025-01-15",
				expectedVersion: orientation.data.version,
			},
			ready,
		);
		expect(orientationRecorded.ok).toBe(true);
		if (!orientationRecorded.ok) {
			return;
		}
		onboardingCase = orientationRecorded.data;

		const equipment = await getOnboardingEquipmentHandoffByCase(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-onb-equipment-${suffix}`,
				onboardingCaseId: onboardingCase.id,
			},
			ready,
		);
		expect(equipment.ok).toBe(true);
		if (!equipment.ok || equipment.data === null) {
			return;
		}
		const equipmentRecorded = await recordOnboardingEquipmentHandoff(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-onb-equipment-record-${suffix}`,
				equipmentHandoffId: equipment.data.id,
				handedOverOn: "2025-01-16",
				expectedVersion: equipment.data.version,
			},
			ready,
		);
		expect(equipmentRecorded.ok).toBe(true);
		if (!equipmentRecorded.ok) {
			return;
		}
		onboardingCase = equipmentRecorded.data;

		const access = await getOnboardingAccessHandoffByCase(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-onb-access-${suffix}`,
				onboardingCaseId: onboardingCase.id,
			},
			ready,
		);
		expect(access.ok).toBe(true);
		if (!access.ok || access.data === null) {
			return;
		}
		const onboardingAccessRecorded = await recordOnboardingAccessHandoff(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-onb-access-record-${suffix}`,
				accessHandoffId: access.data.id,
				grantedOn: "2025-01-17",
				expectedVersion: access.data.version,
			},
			ready,
		);
		expect(onboardingAccessRecorded.ok).toBe(true);
		if (!onboardingAccessRecorded.ok) {
			return;
		}
		onboardingCase = onboardingAccessRecorded.data;

		clearPorts(ready);
		const onboardingCompleteCorr = `trace-onboarding-complete-${suffix}`;
		const onboardingCompleted = await completeOnboarding(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: onboardingCompleteCorr,
				onboardingCaseId: onboardingCase.id,
				expectedVersion: onboardingCase.version,
			},
			ready,
		);
		expect(onboardingCompleted.ok).toBe(true);
		if (!onboardingCompleted.ok) {
			return;
		}
		assertCorrelationPropagated(ready, onboardingCompleteCorr, {
			expectOutbox: true,
			operation: HUMAN_RESOURCES_COMMAND_ONBOARDING_COMPLETE,
		});

		clearPorts(ready);
		const probationOpenCorr = `trace-probation-open-${suffix}`;
		const probation = await openProbation(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: probationOpenCorr,
				idempotencyKey: `idem-prob-${suffix}`,
				employmentId: seeded.employment.id,
				startsOn: "2025-01-01",
				endsOn: "2025-04-01",
			},
			ready,
		);
		expect(probation.ok).toBe(true);
		if (!probation.ok) {
			return;
		}
		assertCorrelationPropagated(ready, probationOpenCorr, {
			expectOutbox: false,
			operation: HUMAN_RESOURCES_COMMAND_PROBATION_OPEN,
		});

		clearPorts(ready);
		const probationExtendCorr = `trace-probation-extend-${suffix}`;
		const probationExtended = await extendProbation(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: probationExtendCorr,
				probationReviewId: probation.data.id,
				newEndsOn: "2025-05-01",
				reason: "Extended review window",
				expectedVersion: probation.data.version,
			},
			ready,
		);
		expect(probationExtended.ok).toBe(true);
		if (!probationExtended.ok) {
			return;
		}
		assertCorrelationPropagated(ready, probationExtendCorr, {
			expectOutbox: true,
			operation: HUMAN_RESOURCES_COMMAND_PROBATION_EXTEND,
		});

		clearPorts(ready);
		const probationOutcomeCorr = `trace-probation-outcome-${suffix}`;
		const probationOutcome = await recordProbationOutcome(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: probationOutcomeCorr,
				probationReviewId: probationExtended.data.id,
				outcome: "passed",
				outcomeRecordedOn: "2025-03-15",
				reason: "Probation passed",
				expectedVersion: probationExtended.data.version,
			},
			ready,
		);
		expect(probationOutcome.ok).toBe(true);
		if (!probationOutcome.ok) {
			return;
		}
		assertCorrelationPropagated(ready, probationOutcomeCorr, {
			expectOutbox: true,
			operation: HUMAN_RESOURCES_COMMAND_PROBATION_RECORD_OUTCOME,
		});

		clearPorts(ready);
		const confirmCorr = `trace-employment-confirm-${suffix}`;
		const confirmed = await confirmEmployment(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: confirmCorr,
				idempotencyKey: `idem-confirm-${suffix}`,
				employmentId: seeded.employment.id,
				confirmedOn: "2025-03-16",
				evidenceNote: "Probation passed",
			},
			ready,
		);
		expect(confirmed.ok).toBe(true);
		if (!confirmed.ok) {
			return;
		}
		assertCorrelationPropagated(ready, confirmCorr, {
			expectOutbox: true,
			operation: HUMAN_RESOURCES_COMMAND_EMPLOYMENT_CONFIRM,
		});

		clearPorts(ready);
		const transferCorr = `trace-assignment-transfer-${suffix}`;
		const transferEffectiveOn = "2025-05-01";
		const transferred = await transferAssignment(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: transferCorr,
				idempotencyKey: `idem-transfer-${suffix}`,
				employmentId: seeded.employment.id,
				toPositionId: seeded.positionB.id,
				...TEST_ORGANIZATION_DIMENSION_KEYS,
				effectiveOn: transferEffectiveOn,
				reason: "Org restructure",
			},
			ready,
		);
		expect(transferred.ok).toBe(true);
		if (!transferred.ok) {
			return;
		}
		assertCorrelationPropagated(ready, transferCorr, {
			expectOutbox: true,
			operation: HUMAN_RESOURCES_COMMAND_ASSIGNMENT_TRANSFER,
		});
		const transferOutbox = memoryPorts(ready).outbox.calls.at(-1);
		expect(transferOutbox?.type).toBe(
			HUMAN_RESOURCES_EMPLOYEE_TRANSFERRED_EVENT,
		);
		expect(transferOutbox?.payload.effectiveOn).toBe(transferEffectiveOn);

		clearPorts(ready);
		const terminationCorr = `trace-termination-finalize-${suffix}`;
		const terminationEffectiveOn = "2025-06-01";
		const proposed = await proposeTermination(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `${terminationCorr}-propose`,
				idempotencyKey: `idem-term-${suffix}`,
				employmentId: seeded.employment.id,
				reasonCode: "resignation",
				reasonDetail: "Voluntary resignation",
				effectiveOn: terminationEffectiveOn,
				rehireEligible: true,
			},
			ready,
		);
		expect(proposed.ok).toBe(true);
		if (!proposed.ok) {
			return;
		}

		const approved = await approveTermination(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `${terminationCorr}-approve`,
				terminationId: proposed.data.id,
				expectedVersion: proposed.data.version,
			},
			ready,
		);
		expect(approved.ok).toBe(true);
		if (!approved.ok) {
			return;
		}

		clearPorts(ready);
		const termination = await finalizeTermination(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: terminationCorr,
				terminationId: approved.data.id,
				expectedVersion: approved.data.version,
			},
			ready,
		);
		expect(termination.ok).toBe(true);
		if (!termination.ok) {
			return;
		}
		assertCorrelationPropagated(ready, terminationCorr, {
			expectOutbox: true,
			operation: HUMAN_RESOURCES_COMMAND_TERMINATION_FINALIZE,
		});
		const terminationOutbox = memoryPorts(ready).outbox.calls.at(-1);
		expect(terminationOutbox?.type).toBe(
			HUMAN_RESOURCES_EMPLOYEE_TERMINATED_EVENT,
		);
		expect(terminationOutbox?.payload.effectiveOn).toBe(terminationEffectiveOn);

		clearPorts(ready);
		const offboardingStartCorr = `trace-offboarding-start-${suffix}`;
		const offboarding = await startOffboarding(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: offboardingStartCorr,
				idempotencyKey: `idem-off-${suffix}`,
				employmentId: seeded.employment.id,
				terminationId: termination.data.id,
				tasks: [
					{ code: "return_badge", title: "Return badge", mandatory: true },
				],
			},
			ready,
		);
		expect(offboarding.ok).toBe(true);
		if (!offboarding.ok) {
			return;
		}
		assertCorrelationPropagated(ready, offboardingStartCorr, {
			expectOutbox: true,
			operation: HUMAN_RESOURCES_COMMAND_OFFBOARDING_START,
		});

		const offboardingTasks = await listOffboardingTasks(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-off-tasks-${suffix}`,
				offboardingCaseId: offboarding.data.id,
			},
			ready,
		);
		expect(offboardingTasks.ok).toBe(true);
		if (!offboardingTasks.ok) {
			return;
		}
		const [offboardingTask] = offboardingTasks.data;
		expect(offboardingTask).toBeDefined();
		if (!offboardingTask) {
			return;
		}

		clearPorts(ready);
		const offboardingTaskCorr = `trace-offboarding-task-${suffix}`;
		const offboardingTaskDone = await completeOffboardingTask(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: offboardingTaskCorr,
				taskId: offboardingTask.id,
				status: "completed",
				expectedVersion: offboardingTask.version,
			},
			ready,
		);
		expect(offboardingTaskDone.ok).toBe(true);
		if (!offboardingTaskDone.ok) {
			return;
		}
		assertCorrelationPropagated(ready, offboardingTaskCorr, {
			expectOutbox: false,
			operation: HUMAN_RESOURCES_COMMAND_OFFBOARDING_COMPLETE_TASK,
		});

		clearPorts(ready);
		const exitInterviewCorr = `trace-exit-interview-${suffix}`;
		const exitInterview = await recordExitInterview(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: exitInterviewCorr,
				offboardingCaseId: offboarding.data.id,
				conductedOn: "2025-06-02",
				notes: "confidential exit interview notes",
			},
			ready,
		);
		expect(exitInterview.ok).toBe(true);
		if (!exitInterview.ok) {
			return;
		}
		assertCorrelationPropagated(ready, exitInterviewCorr, {
			expectOutbox: false,
			operation: HUMAN_RESOURCES_COMMAND_OFFBOARDING_RECORD_EXIT_INTERVIEW,
		});
		for (const call of memoryPorts(ready).outbox.calls) {
			expect(JSON.stringify(call.payload)).not.toContain(
				"confidential exit interview notes",
			);
		}

		const clearance = await getClearanceByOffboardingCase(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-clearance-get-${suffix}`,
				offboardingCaseId: offboarding.data.id,
			},
			ready,
		);
		expect(clearance.ok).toBe(true);
		if (!(clearance.ok && clearance.data)) {
			return;
		}

		clearPorts(ready);
		const clearanceCorr = `trace-clearance-${suffix}`;
		const cleared = await recordClearance(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: clearanceCorr,
				clearanceId: clearance.data.id,
				clearedOn: "2025-06-03",
				expectedVersion: clearance.data.version,
			},
			ready,
		);
		expect(cleared.ok).toBe(true);
		if (!cleared.ok) {
			return;
		}
		assertCorrelationPropagated(ready, clearanceCorr, {
			expectOutbox: true,
			operation: HUMAN_RESOURCES_COMMAND_OFFBOARDING_RECORD_CLEARANCE,
		});

		const accessRevocation = await getOffboardingAccessRevocationByCase(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-access-get-${suffix}`,
				offboardingCaseId: offboarding.data.id,
			},
			ready,
		);
		expect(accessRevocation.ok).toBe(true);
		if (!(accessRevocation.ok && accessRevocation.data)) {
			return;
		}

		clearPorts(ready);
		const accessRevocationCorr = `trace-access-revocation-${suffix}`;
		const accessRecorded = await recordOffboardingAccessRevocation(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: accessRevocationCorr,
				accessRevocationId: accessRevocation.data.id,
				revokedOn: "2025-06-04",
				summary: "Access revoked",
				expectedVersion: accessRevocation.data.version,
			},
			ready,
		);
		expect(accessRecorded.ok).toBe(true);
		if (!accessRecorded.ok) {
			return;
		}
		assertCorrelationPropagated(ready, accessRevocationCorr, {
			expectOutbox: false,
			operation: HUMAN_RESOURCES_COMMAND_OFFBOARDING_RECORD_ACCESS_REVOCATION,
		});

		const payrollHandoff = await getOffboardingPayrollHandoffByCase(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-payroll-get-${suffix}`,
				offboardingCaseId: offboarding.data.id,
			},
			ready,
		);
		expect(payrollHandoff.ok).toBe(true);
		if (!(payrollHandoff.ok && payrollHandoff.data)) {
			return;
		}

		clearPorts(ready);
		const payrollHandoffCorr = `trace-payroll-handoff-${suffix}`;
		const payrollRecorded = await recordOffboardingPayrollHandoff(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: payrollHandoffCorr,
				payrollHandoffId: payrollHandoff.data.id,
				readyOn: "2025-06-05",
				summary: "Final payroll handoff ready",
				expectedVersion: payrollHandoff.data.version,
			},
			ready,
		);
		expect(payrollRecorded.ok).toBe(true);
		if (!payrollRecorded.ok) {
			return;
		}
		assertCorrelationPropagated(ready, payrollHandoffCorr, {
			expectOutbox: false,
			operation: HUMAN_RESOURCES_COMMAND_OFFBOARDING_RECORD_PAYROLL_HANDOFF,
		});

		clearPorts(ready);
		const offboardingCompleteCorr = `trace-offboarding-complete-${suffix}`;
		const offboardingCompleted = await completeOffboarding(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: offboardingCompleteCorr,
				offboardingCaseId: offboarding.data.id,
				expectedVersion: offboarding.data.version,
			},
			ready,
		);
		expect(offboardingCompleted.ok).toBe(true);
		if (!offboardingCompleted.ok) {
			return;
		}
		assertCorrelationPropagated(ready, offboardingCompleteCorr, {
			expectOutbox: true,
			operation: HUMAN_RESOURCES_COMMAND_OFFBOARDING_COMPLETE,
		});
	});

	it("propagates correlationId across employee-relations domain_event mutations", async () => {
		const ready = harness();
		const suffix = `${Date.now()}`;
		const emp = await createEmployee(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `seed-er-${suffix}`,
				idempotencyKey: `idem-er-${suffix}`,
				employeeNumber: `E-ER-CORR-${suffix}`,
				legalName: "ER Correlation Subject",
			},
			ready,
		);
		expect(emp.ok).toBe(true);
		if (!emp.ok) {
			return;
		}

		const employment = await createEmployment(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `seed-er-employ-${suffix}`,
				employeeId: emp.data.id,
				startsOn: "2026-01-01",
			},
			ready,
		);
		expect(employment.ok).toBe(true);
		if (!employment.ok) {
			return;
		}

		const openedForAssign = await openEmployeeCase(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `seed-er-open-assign-${suffix}`,
				idempotencyKey: `idem-er-case-assign-${suffix}`,
				employeeId: emp.data.id,
				employmentId: employment.data.id,
				caseType: "conduct",
				severity: "medium",
				allegationSummary: "Policy breach",
				classificationCode: "CONDUCT-01",
				ownerActorUserId: ACTOR,
				subjectActorUserId: null,
				conflictedActorUserIds: [],
			},
			ready,
		);
		expect(openedForAssign.ok).toBe(true);
		if (!openedForAssign.ok) {
			return;
		}

		clearPorts(ready);
		const assignCorr = `trace-er-assign-${suffix}`;
		const assigned = await assignEmployeeCaseOwner(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: assignCorr,
				caseId: openedForAssign.data.id,
				ownerActorUserId: MANAGER,
				expectedVersion: openedForAssign.data.version,
			},
			ready,
		);
		expect(assigned.ok).toBe(true);
		if (!assigned.ok) {
			return;
		}
		assertCorrelationPropagated(ready, assignCorr, {
			expectOutbox: true,
			operation: HUMAN_RESOURCES_COMMAND_EMPLOYEE_CASE_ASSIGN_OWNER,
		});

		const openedForAppeal = await openEmployeeCase(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `seed-er-open-appeal-${suffix}`,
				idempotencyKey: `idem-er-case-appeal-${suffix}`,
				employeeId: emp.data.id,
				employmentId: employment.data.id,
				caseType: "conduct",
				severity: "medium",
				allegationSummary: "Appeal path",
				classificationCode: "CONDUCT-01",
				ownerActorUserId: ACTOR,
				subjectActorUserId: null,
				conflictedActorUserIds: [],
			},
			ready,
		);
		expect(openedForAppeal.ok).toBe(true);
		if (!openedForAppeal.ok) {
			return;
		}

		await recordEmployeeCaseEvent(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `seed-er-inv-${suffix}`,
				caseId: openedForAppeal.data.id,
				eventKind: "investigation_note",
			},
			ready,
		);

		const finding = await recordEmployeeCaseFinding(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `seed-er-finding-${suffix}`,
				caseId: openedForAppeal.data.id,
				findingCode: "SUBSTANTIATED",
				findingSummary: "Confirmed",
				expectedVersion: openedForAppeal.data.version + 1,
			},
			ready,
		);
		expect(finding.ok).toBe(true);
		if (!finding.ok) {
			return;
		}

		const recommended = await recommendEmployeeCaseAction(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `seed-er-rec-${suffix}`,
				caseId: finding.data.id,
				idempotencyKey: `idem-er-action-${suffix}`,
				actionType: "warning",
				expectedVersion: finding.data.version,
			},
			ready,
		);
		expect(recommended.ok).toBe(true);
		if (!recommended.ok) {
			return;
		}

		const approved = await approveEmployeeCaseAction(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `seed-er-app-${suffix}`,
				caseId: finding.data.id,
				actionId: recommended.data.id,
				policyValidationRecorded: true,
				expectedVersion: finding.data.version + 1,
			},
			ready,
		);
		expect(approved.ok).toBe(true);
		if (!approved.ok) {
			return;
		}

		clearPorts(ready);
		const appealCorr = `trace-er-appeal-${suffix}`;
		const appealed = await recordEmployeeCaseAppeal(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: appealCorr,
				caseId: finding.data.id,
				idempotencyKey: `idem-er-appeal-${suffix}`,
				appealGroundsSummary: "Procedural fairness",
				expectedVersion: finding.data.version + 2,
			},
			ready,
		);
		expect(appealed.ok).toBe(true);
		if (!appealed.ok) {
			return;
		}
		assertCorrelationPropagated(ready, appealCorr, {
			expectOutbox: true,
			operation: HUMAN_RESOURCES_COMMAND_EMPLOYEE_CASE_RECORD_APPEAL,
		});

		const openedForReopen = await openEmployeeCase(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `seed-er-open-reopen-${suffix}`,
				idempotencyKey: `idem-er-case-reopen-${suffix}`,
				employeeId: emp.data.id,
				employmentId: employment.data.id,
				caseType: "conduct",
				severity: "medium",
				allegationSummary: "Reopen path",
				classificationCode: "CONDUCT-01",
				ownerActorUserId: ACTOR,
				subjectActorUserId: null,
				conflictedActorUserIds: [],
			},
			ready,
		);
		expect(openedForReopen.ok).toBe(true);
		if (!openedForReopen.ok) {
			return;
		}

		await recordEmployeeCaseEvent(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `seed-er-inv-reopen-${suffix}`,
				caseId: openedForReopen.data.id,
				eventKind: "investigation_note",
			},
			ready,
		);

		const findingForClose = await recordEmployeeCaseFinding(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `seed-er-finding-reopen-${suffix}`,
				caseId: openedForReopen.data.id,
				findingCode: "SUBSTANTIATED",
				findingSummary: "Close path",
				expectedVersion: openedForReopen.data.version + 1,
			},
			ready,
		);
		expect(findingForClose.ok).toBe(true);
		if (!findingForClose.ok) {
			return;
		}

		const closed = await closeEmployeeCase(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `seed-er-close-${suffix}`,
				caseId: findingForClose.data.id,
				outcomeCode: "NO_ACTION",
				expectedVersion: findingForClose.data.version,
			},
			ready,
		);
		expect(closed.ok).toBe(true);
		if (!closed.ok) {
			return;
		}

		clearPorts(ready);
		const reopenCorr = `trace-er-reopen-${suffix}`;
		const reopened = await reopenEmployeeCase(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: reopenCorr,
				caseId: closed.data.id,
				reasonCode: "NEW_EVIDENCE",
				expectedVersion: closed.data.version,
			},
			ready,
		);
		expect(reopened.ok).toBe(true);
		if (!reopened.ok) {
			return;
		}
		assertCorrelationPropagated(ready, reopenCorr, {
			expectOutbox: true,
			operation: HUMAN_RESOURCES_COMMAND_EMPLOYEE_CASE_REOPEN,
		});
	});

	it("propagates correlationId across talent profile and pool domain_event mutations", async () => {
		const ready = harness();
		const suffix = `${Date.now()}`;
		const emp = await createEmployee(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `seed-talent-${suffix}`,
				idempotencyKey: `idem-talent-${suffix}`,
				employeeNumber: `E-TALENT-${suffix}`,
				legalName: "Talent Correlation",
			},
			ready,
		);
		expect(emp.ok).toBe(true);
		if (!emp.ok) {
			return;
		}

		clearPorts(ready);
		const createProfileCorr = `trace-talent-profile-create-${suffix}`;
		const profile = await createTalentProfile(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: createProfileCorr,
				idempotencyKey: `idem-profile-${suffix}`,
				employeeId: emp.data.id,
				summary: "High potential",
			},
			ready,
		);
		expect(profile.ok).toBe(true);
		if (!profile.ok) {
			return;
		}
		assertCorrelationPropagated(ready, createProfileCorr, {
			expectOutbox: true,
			operation: HUMAN_RESOURCES_COMMAND_TALENT_PROFILE_CREATE,
		});

		clearPorts(ready);
		const updateProfileCorr = `trace-talent-profile-update-${suffix}`;
		const updated = await updateTalentProfile(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: updateProfileCorr,
				talentProfileId: profile.data.id,
				summary: "Updated summary",
				expectedVersion: profile.data.version,
			},
			ready,
		);
		expect(updated.ok).toBe(true);
		if (!updated.ok) {
			return;
		}
		assertCorrelationPropagated(ready, updateProfileCorr, {
			expectOutbox: true,
			operation: HUMAN_RESOURCES_COMMAND_TALENT_PROFILE_UPDATE,
		});

		const pool = await createTalentPool(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `seed-pool-${suffix}`,
				idempotencyKey: `idem-pool-${suffix}`,
				code: `POOL-${suffix}`.slice(0, 64),
				name: "Leadership bench",
			},
			ready,
		);
		expect(pool.ok).toBe(true);
		if (!pool.ok) {
			return;
		}

		const nominated = await nominateTalentPoolMember(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `seed-pool-nom-${suffix}`,
				idempotencyKey: `idem-pool-nom-${suffix}`,
				poolId: pool.data.id,
				employeeId: emp.data.id,
				nominatorUserId: ACTOR,
			},
			ready,
		);
		expect(nominated.ok).toBe(true);
		if (!nominated.ok) {
			return;
		}

		const membership = await approveTalentPoolMember(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `seed-pool-app-${suffix}`,
				memberId: nominated.data.id,
				approverUserId: ACTOR,
				expectedVersion: nominated.data.version,
			},
			ready,
		);
		expect(membership.ok).toBe(true);
		if (!membership.ok) {
			return;
		}

		clearPorts(ready);
		const removeCorr = `trace-talent-pool-remove-${suffix}`;
		const removed = await removeTalentPoolMember(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: removeCorr,
				memberId: membership.data.id,
				expectedVersion: membership.data.version,
			},
			ready,
		);
		expect(removed.ok).toBe(true);
		if (!removed.ok) {
			return;
		}
		assertCorrelationPropagated(ready, removeCorr, {
			expectOutbox: true,
			operation: HUMAN_RESOURCES_COMMAND_TALENT_POOL_MEMBER_REMOVE,
		});
	});

	it("propagates correlationId across workforce-planning domain_event mutations", async () => {
		const ready = harness();
		const suffix = `${Date.now()}`;
		const seeded = await seedDepartmentAndJob(ready, {
			organizationId: ORG,
			actorUserId: ACTOR,
			correlationId: `seed-wfp-${suffix}`,
		});
		expect(seeded).not.toBeNull();
		if (!seeded) {
			return;
		}

		const plan = await createHeadcountPlan(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `seed-wfp-plan-${suffix}`,
				idempotencyKey: `idem-wfp-plan-${suffix}`,
				code: `WFP-${suffix}`.slice(0, 64),
				title: "FY headcount",
				planningScopeKey: "org",
				periodStart: "2026-01-01",
				periodEnd: "2026-12-31",
			},
			ready,
		);
		expect(plan.ok).toBe(true);
		if (!plan.ok) {
			return;
		}

		const line = await addHeadcountPlanLine(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `seed-wfp-line-${suffix}`,
				planId: plan.data.id,
				departmentId: seeded.departmentId,
				jobId: seeded.jobId,
				plannedFte: "2.0000",
				plannedHeadcount: 2,
			},
			ready,
		);
		expect(line.ok).toBe(true);
		if (!line.ok) {
			return;
		}

		const submitted = await submitHeadcountPlan(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `seed-wfp-submit-${suffix}`,
				planId: plan.data.id,
				expectedVersion: plan.data.version,
			},
			ready,
		);
		expect(submitted.ok).toBe(true);
		if (!submitted.ok) {
			return;
		}

		clearPorts(ready);
		const approveCorr = `trace-wfp-approve-${suffix}`;
		const approved = await approveHeadcountPlan(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: approveCorr,
				planId: submitted.data.id,
				expectedVersion: submitted.data.version,
			},
			ready,
		);
		expect(approved.ok).toBe(true);
		if (!approved.ok) {
			return;
		}
		assertCorrelationPropagated(ready, approveCorr, {
			expectOutbox: true,
			operation: HUMAN_RESOURCES_COMMAND_HEADCOUNT_PLAN_APPROVE,
		});

		const manager = await seedDefaultHiringManager(ready, {
			organizationId: ORG,
			actorUserId: ACTOR,
			tag: suffix,
		});
		expect(manager.ok).toBe(true);
		if (!manager.ok) {
			return;
		}

		const requisition = await createDraftRequisition(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `seed-wfp-req-${suffix}`,
				idempotencyKey: `idem-wfp-req-${suffix}`,
				code: `REQ-${suffix}`.slice(0, 64),
				title: "Hire",
				hiringManagerEmployeeId: manager.employeeId,
			},
			ready,
		);
		expect(requisition.ok).toBe(true);
		if (!requisition.ok) {
			return;
		}

		let req = requisition.data;
		const sequentialOutcome2 = await runSequential(
			[
				[submitRequisition, `seed-wfp-req-submit-${suffix}`],
				[approveRequisition, `seed-wfp-req-approve-${suffix}`],
				[openRequisition, `seed-wfp-req-open-${suffix}`],
			] as const,
			async ([cmd, corr]) => {
				const next = await cmd(
					{
						organizationId: ORG,
						actorUserId: ACTOR,
						correlationId: corr,
						requisitionId: req.id,
						expectedVersion: req.version,
					},
					ready,
				);
				expect(next.ok).toBe(true);
				if (!next.ok) {
					return sequentialReturn(undefined);
				}
				req = next.data;
			},
		);
		if (sequentialOutcome2.kind === "return") {
			return sequentialOutcome2.value;
		}

		clearPorts(ready);
		const reserveCorr = `trace-wfp-reserve-${suffix}`;
		const reserved = await reserveHeadcount(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: reserveCorr,
				idempotencyKey: `idem-wfp-res-${suffix}`,
				planLineId: line.data.id,
				requisitionId: req.id,
				reservedFte: "1.0000",
				reservedHeadcount: 1,
			},
			ready,
		);
		expect(reserved.ok).toBe(true);
		if (!reserved.ok) {
			return;
		}
		assertCorrelationPropagated(ready, reserveCorr, {
			expectOutbox: true,
			operation: HUMAN_RESOURCES_COMMAND_HEADCOUNT_RESERVE,
		});

		clearPorts(ready);
		const releaseCorr = `trace-wfp-release-${suffix}`;
		const released = await releaseHeadcountReservation(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: releaseCorr,
				reservationId: reserved.data.id,
				expectedVersion: reserved.data.version,
			},
			ready,
		);
		expect(released.ok).toBe(true);
		if (!released.ok) {
			return;
		}
		assertCorrelationPropagated(ready, releaseCorr, {
			expectOutbox: true,
			operation: HUMAN_RESOURCES_COMMAND_HEADCOUNT_RESERVATION_RELEASE,
		});

		const reservedAgain = await reserveHeadcount(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `seed-wfp-res2-${suffix}`,
				idempotencyKey: `idem-wfp-res2-${suffix}`,
				planLineId: line.data.id,
				requisitionId: req.id,
				reservedFte: "1.0000",
				reservedHeadcount: 1,
			},
			ready,
		);
		expect(reservedAgain.ok).toBe(true);
		if (!reservedAgain.ok) {
			return;
		}

		clearPorts(ready);
		const consumeCorr = `trace-wfp-consume-${suffix}`;
		const consumed = await consumeHeadcountReservation(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: consumeCorr,
				reservationId: reservedAgain.data.id,
				expectedVersion: reservedAgain.data.version,
			},
			ready,
		);
		expect(consumed.ok).toBe(true);
		if (!consumed.ok) {
			return;
		}
		assertCorrelationPropagated(ready, consumeCorr, {
			expectOutbox: true,
			operation: HUMAN_RESOURCES_COMMAND_HEADCOUNT_RESERVATION_CONSUME,
		});
	});

	it("propagates correlationId across compensation-benefits domain_event mutations", async () => {
		const ready = harness();
		const seeded = await seedCompensationCorrelationFixture({
			organizationId: ORG,
			actorUserId: ACTOR,
			ready,
			suffix: "main",
		});

		clearPorts(ready);
		const createCorr = "trace-comp-create";
		const created = await createEmployeeCompensation(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: createCorr,
				idempotencyKey: "idem-comp-corr-create",
				employeeId: seeded.employee.id,
				employmentId: seeded.employment.id,
				baseAmount: "72000",
				currencyCode: "USD",
				payFrequency: "monthly",
				effectiveFrom: "2025-01-01",
				reason: "Correlation create",
			},
			seeded.seedReady,
		);
		expect(
			created.ok,
			created.ok ? "ok" : `${created.code}: ${created.message}`,
		).toBe(true);
		if (!created.ok) {
			return;
		}
		assertCorrelationPropagated(seeded.seedReady, createCorr, {
			expectOutbox: true,
			operation: HUMAN_RESOURCES_COMMAND_EMPLOYEE_COMPENSATION_CREATE,
		});

		clearPorts(ready);
		const endCorr = "trace-comp-end";
		const ended = await endEmployeeCompensation(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: endCorr,
				compensationId: created.data.id,
				endsOn: "2025-12-31",
				expectedVersion: created.data.version,
			},
			seeded.seedReady,
		);
		expect(ended.ok).toBe(true);
		if (!ended.ok) {
			return;
		}
		assertCorrelationPropagated(ready, endCorr, {
			expectOutbox: true,
			operation: HUMAN_RESOURCES_COMMAND_EMPLOYEE_COMPENSATION_END,
		});

		const review = await seedFinalizedCompensationReview({
			organizationId: ORG,
			actorUserId: ACTOR,
			seedReady: seeded.seedReady,
			employeeId: seeded.employee.id,
			employmentId: seeded.employment.id,
			suffix: "apply",
		});
		clearPorts(ready);
		const applyCorr = "trace-comp-review-apply";
		const applied = await applyApprovedCompensationResult(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: applyCorr,
				reviewId: review.id,
				reason: "Annual review apply",
				idempotencyKey: "idem-comp-corr-apply",
			},
			seeded.seedReady,
		);
		expect(applied.ok).toBe(true);
		if (!applied.ok) {
			return;
		}
		assertCorrelationPropagated(ready, applyCorr, {
			expectOutbox: true,
			operation:
				HUMAN_RESOURCES_COMMAND_COMPENSATION_REVIEW_APPLY_APPROVED_RESULT,
		});

		clearPorts(ready);
		const enrolCorr = "trace-benefit-enrol";
		const enrolled = await enrolBenefit(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: enrolCorr,
				idempotencyKey: "idem-benefit-corr-enrol",
				employeeId: seeded.employee.id,
				employmentId: seeded.employment.id,
				planId: seeded.plan.id,
				effectiveFrom: "2025-01-01",
			},
			seeded.seedReady,
		);
		expect(enrolled.ok).toBe(true);
		if (!enrolled.ok) {
			return;
		}
		assertCorrelationPropagated(ready, enrolCorr, {
			expectOutbox: true,
			operation: HUMAN_RESOURCES_COMMAND_BENEFIT_ENROLLMENT_ENROL,
		});

		clearPorts(ready);
		const endEnrolCorr = "trace-benefit-end";
		const endedEnrollment = await endBenefitEnrollment(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: endEnrolCorr,
				enrollmentId: enrolled.data.id,
				endsOn: "2025-12-31",
				expectedVersion: enrolled.data.version,
			},
			seeded.seedReady,
		);
		expect(endedEnrollment.ok).toBe(true);
		if (!endedEnrollment.ok) {
			return;
		}
		assertCorrelationPropagated(ready, endEnrolCorr, {
			expectOutbox: true,
			operation: HUMAN_RESOURCES_COMMAND_BENEFIT_ENROLLMENT_END,
		});

		const enrolledAgain = await enrolBenefit(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "seed-benefit-cancel",
				idempotencyKey: "idem-benefit-corr-cancel",
				employeeId: seeded.employee.id,
				employmentId: seeded.employment.id,
				planId: seeded.plan.id,
				effectiveFrom: "2026-01-01",
			},
			seeded.seedReady,
		);
		expect(enrolledAgain.ok).toBe(true);
		if (!enrolledAgain.ok) {
			return;
		}

		clearPorts(ready);
		const cancelCorr = "trace-benefit-cancel";
		const cancelled = await cancelBenefitEnrollment(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: cancelCorr,
				enrollmentId: enrolledAgain.data.id,
				expectedVersion: enrolledAgain.data.version,
			},
			seeded.seedReady,
		);
		expect(cancelled.ok).toBe(true);
		if (!cancelled.ok) {
			return;
		}
		assertCorrelationPropagated(ready, cancelCorr, {
			expectOutbox: true,
			operation: HUMAN_RESOURCES_COMMAND_BENEFIT_ENROLLMENT_CANCEL,
		});
	});

	it("propagates correlationId across performance domain_event mutations", async () => {
		const ready = harness();
		const worker = await seedPerformanceCorrelationWorker({
			organizationId: ORG,
			actorUserId: ACTOR,
			ready,
			suffix: "worker",
		});
		const manager = await seedPerformanceCorrelationWorker({
			organizationId: ORG,
			actorUserId: MANAGER,
			ready,
			suffix: "manager",
		});

		const draftCycle = await seedDraftPerformanceCycle({
			organizationId: ORG,
			actorUserId: ACTOR,
			perfReady: worker.perfReady,
			suffix: "open",
		});
		clearPorts(ready);
		const openCycleCorr = "trace-perf-cycle-open";
		const published = await publishPerformanceCycleReady(worker.perfReady, {
			organizationId: ORG,
			actorUserId: ACTOR,
			correlationIdPrefix: openCycleCorr,
			cycle: draftCycle,
		});
		expect(published.ok).toBe(true);
		if (!published.ok) {
			return;
		}

		clearPorts(ready);

		const cycleParticipant = await addCycleParticipant(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `${openCycleCorr}-participant`,
				cycleId: published.data.id,
				employeeId: worker.employee.id,
				employmentId: worker.employment.id,
			},
			worker.perfReady,
		);
		expect(cycleParticipant.ok).toBe(true);
		if (!cycleParticipant.ok) {
			return;
		}

		clearPorts(ready);

		const openedCycle = await openPerformanceCycle(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: openCycleCorr,
				cycleId: published.data.id,
				expectedVersion: published.data.version,
			},
			worker.perfReady,
		);
		expect(openedCycle.ok).toBe(true);
		if (!openedCycle.ok) {
			return;
		}
		assertCorrelationPropagated(ready, openCycleCorr, {
			expectOutbox: true,
			operation: HUMAN_RESOURCES_COMMAND_PERFORMANCE_CYCLE_OPEN,
		});

		const opened = await seedOpenPerformanceCycleWithParticipant({
			organizationId: ORG,
			actorUserId: ACTOR,
			perfReady: worker.perfReady,
			worker: {
				employeeId: worker.employee.id,
				employmentId: worker.employment.id,
			},
			suffix: "goal",
		});

		const submittedGoal = await seedSubmittedPerformanceGoal({
			organizationId: ORG,
			actorUserId: ACTOR,
			perfReady: worker.perfReady,
			cycleId: opened.cycle.id,
			employeeId: worker.employee.id,
			employmentId: worker.employment.id,
			suffix: "goal",
		});
		clearPorts(ready);
		const approveGoalCorr = "trace-perf-goal-approve";
		const approvedGoal = await approvePerformanceGoal(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: approveGoalCorr,
				goalId: submittedGoal.id,
				expectedVersion: submittedGoal.version,
			},
			worker.perfReady,
		);
		expect(approvedGoal.ok).toBe(true);
		if (!approvedGoal.ok) {
			return;
		}
		assertCorrelationPropagated(ready, approveGoalCorr, {
			expectOutbox: true,
			operation: HUMAN_RESOURCES_COMMAND_PERFORMANCE_GOAL_APPROVE,
		});

		const reviewCycle = await seedOpenPerformanceCycleWithParticipant({
			organizationId: ORG,
			actorUserId: ACTOR,
			perfReady: worker.perfReady,
			worker: {
				employeeId: worker.employee.id,
				employmentId: worker.employment.id,
			},
			suffix: "review",
		});
		const managerReview = await seedManagerSubmittedPerformanceReview({
			organizationId: ORG,
			actorUserId: ACTOR,
			perfReady: worker.perfReady,
			cycleId: reviewCycle.cycle.id,
			employeeId: worker.employee.id,
			employmentId: worker.employment.id,
			managerEmployeeId: manager.employee.id,
			suffix: "review",
		});
		const acknowledged = await acknowledgePerformanceReview(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "seed-perf-review-ack",
				reviewId: managerReview.id,
				acknowledgementNote: "Acknowledged for correlation test.",
				expectedVersion: managerReview.version,
			},
			worker.perfReady,
		);
		expect(acknowledged.ok).toBe(true);
		if (!acknowledged.ok) {
			return;
		}

		clearPorts(ready);
		const finalizeCorr = "trace-perf-review-finalize";
		const finalized = await finalizePerformanceReview(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: finalizeCorr,
				reviewId: acknowledged.data.id,
				overallRating: "meets",
				idempotencyKey: "idem-perf-review-finalize-corr",
				expectedVersion: acknowledged.data.version,
			},
			worker.perfReady,
		);
		expect(finalized.ok).toBe(true);
		if (!finalized.ok) {
			return;
		}
		assertCorrelationPropagated(ready, finalizeCorr, {
			expectOutbox: true,
			operation: HUMAN_RESOURCES_COMMAND_PERFORMANCE_REVIEW_FINALIZE,
		});

		clearPorts(ready);
		const reopenCorr = "trace-perf-review-reopen";
		const reopened = await reopenPerformanceReview(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: reopenCorr,
				reviewId: finalized.data.id,
				reason: "Calibration adjustment",
				expectedVersion: finalized.data.version,
			},
			ready,
		);
		expect(reopened.ok).toBe(true);
		if (!reopened.ok) {
			return;
		}
		assertCorrelationPropagated(ready, reopenCorr, {
			expectOutbox: true,
			operation: HUMAN_RESOURCES_COMMAND_PERFORMANCE_REVIEW_REOPEN,
		});

		const pipCycle = await seedOpenPerformanceCycleWithParticipant({
			organizationId: ORG,
			actorUserId: ACTOR,
			perfReady: worker.perfReady,
			worker: {
				employeeId: worker.employee.id,
				employmentId: worker.employment.id,
			},
			suffix: "pip",
		});
		const pipReview = await seedManagerSubmittedPerformanceReview({
			organizationId: ORG,
			actorUserId: ACTOR,
			perfReady: worker.perfReady,
			cycleId: pipCycle.cycle.id,
			employeeId: worker.employee.id,
			employmentId: worker.employment.id,
			managerEmployeeId: manager.employee.id,
			suffix: "pip-review",
		});
		const pipAcknowledged = await acknowledgePerformanceReview(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "seed-perf-pip-ack",
				reviewId: pipReview.id,
				acknowledgementNote: "PIP review acknowledged.",
				expectedVersion: pipReview.version,
			},
			worker.perfReady,
		);
		expect(pipAcknowledged.ok).toBe(true);
		if (!pipAcknowledged.ok) {
			return;
		}

		const pipFinalized = await finalizePerformanceReview(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "seed-perf-pip-finalize",
				reviewId: pipAcknowledged.data.id,
				overallRating: "meets",
				idempotencyKey: "idem-perf-pip-finalize",
				expectedVersion: pipAcknowledged.data.version,
			},
			worker.perfReady,
		);
		expect(pipFinalized.ok).toBe(true);
		if (!pipFinalized.ok) {
			return;
		}

		const draftPlan = await createImprovementPlan(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "seed-perf-pip-draft",
				idempotencyKey: "idem-perf-pip-draft",
				reviewId: pipFinalized.data.id,
				employeeId: worker.employee.id,
				employmentId: worker.employment.id,
				performanceGap: "Below expectations",
				expectedOutcome: "Meet baseline",
				measurableActions: "Weekly 1:1",
				supportResources: "Mentor",
				dueDate: "2025-09-30",
				accountableManagerEmployeeId: manager.employee.id,
			},
			worker.perfReady,
		);
		expect(draftPlan.ok).toBe(true);
		if (!draftPlan.ok) {
			return;
		}

		clearPorts(ready);
		const openPipCorr = "trace-perf-pip-open";
		const openedPip = await openImprovementPlan(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: openPipCorr,
				planId: draftPlan.data.id,
				expectedVersion: draftPlan.data.version,
			},
			worker.perfReady,
		);
		expect(openedPip.ok).toBe(true);
		if (!openedPip.ok) {
			return;
		}
		assertCorrelationPropagated(ready, openPipCorr, {
			expectOutbox: true,
			operation: HUMAN_RESOURCES_COMMAND_IMPROVEMENT_PLAN_OPEN,
		});

		const reviewedPip = await recordImprovementCheckpoint(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "trace-perf-pip-checkpoint",
				planId: openedPip.data.id,
				sequenceNumber: 1,
				outcome: "met",
				notes: "Correlation checkpoint",
			},
			worker.perfReady,
		);
		expect(reviewedPip.ok).toBe(true);
		if (!reviewedPip.ok) {
			return;
		}

		clearPorts(ready);
		const completePipCorr = "trace-perf-pip-complete";
		const completedPip = await completeImprovementPlan(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: completePipCorr,
				planId: openedPip.data.id,
				expectedVersion: openedPip.data.version,
			},
			worker.perfReady,
		);
		expect(completedPip.ok).toBe(true);
		if (!completedPip.ok) {
			return;
		}
		assertCorrelationPropagated(ready, completePipCorr, {
			expectOutbox: true,
			operation: HUMAN_RESOURCES_COMMAND_IMPROVEMENT_PLAN_COMPLETE,
		});
	});

	it("propagates correlationId for learning assignment create (domain_event)", async () => {
		const ready = harness();
		const emp = await createEmployee(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "seed-learning-assign-emp",
				idempotencyKey: "idem-learning-assign-emp",
				employeeNumber: "E-LEARN-CORR",
				legalName: "Learning Corr Worker",
			},
			ready,
		);
		expect(emp.ok).toBe(true);
		if (!emp.ok) {
			return;
		}

		const course = await createCourse(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: "seed-learning-assign-course",
				code: "COURSE-LEARN-CORR",
				title: "Learning Correlation Course",
				idempotencyKey: "idem-learning-assign-course",
			},
			ready,
		);
		expect(course.ok).toBe(true);
		if (!course.ok) {
			return;
		}

		clearPorts(ready);
		const assignCorr = "trace-learning-assign";
		const assignment = await assignLearning(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: assignCorr,
				employeeId: emp.data.id,
				courseId: course.data.id,
				dueOn: null,
			},
			ready,
		);
		expect(assignment.ok).toBe(true);
		if (!assignment.ok) {
			return;
		}
		assertCorrelationPropagated(ready, assignCorr, {
			expectOutbox: true,
			operation: HUMAN_RESOURCES_COMMAND_LEARNING_ASSIGNMENT_CREATE,
		});
	});
});
