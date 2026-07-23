import {
	db,
	eq,
	hrAttendanceAdjustment,
	hrAttendanceBreakWaiverDecision,
	hrAttendanceEvent,
	hrAttendanceException,
	hrAttendanceSession,
	hrBenefitEligibility,
	hrBenefitEnrollment,
	hrBenefitPlan,
	hrCandidate,
	hrCandidateApplication,
	hrCareerPlan,
	hrCareerPlanAction,
	hrClearance,
	hrCompensationGrade,
	hrCompensationReview,
	hrCompensationReviewCycle,
	hrCompetency,
	hrCompetencyAssessment,
	hrDepartment,
	hrDocumentRequirement,
	hrEmployee,
	hrEmployeeCase,
	hrEmployeeCaseAction,
	hrEmployeeCaseAppeal,
	hrEmployeeCaseEvent,
	hrEmployeeCertification,
	hrEmployeeCompensation,
	hrEmployeeDocument,
	hrEmployment,
	hrEmploymentCalendarAssignment,
	hrEmploymentConfirmation,
	hrEmploymentContract,
	hrEmploymentMovement,
	hrEmploymentOffer,
	hrExitInterview,
	hrHeadcountPlan,
	hrHeadcountPlanLine,
	hrHeadcountReservation,
	hrInterview,
	hrInterviewEvaluation,
	hrJob,
	hrJobCompetency,
	hrJobRequisition,
	hrLearningAssignment,
	hrLearningCompletion,
	hrLearningCourse,
	hrLearningSession,
	hrLeaveAdjustment,
	hrLeaveApprovalDecision,
	hrLeaveEntitlement,
	hrLeavePolicy,
	hrLeavePolicyEligibility,
	hrLeaveRequest,
	hrLeaveRequestSegment,
	hrOffboardingCase,
	hrOffboardingTask,
	hrOnboardingCase,
	hrOnboardingTask,
	hrOvertimeApproval,
	hrOvertimeRequest,
	hrPerformanceAssessment,
	hrPerformanceCycle,
	hrPerformanceCycleParticipant,
	hrPerformanceGoal,
	hrPerformanceGoalProgress,
	hrPerformanceImprovementCheckpoint,
	hrPerformanceImprovementPlan,
	hrPerformanceReview,
	hrPerformanceReviewParticipant,
	hrPolicyAcknowledgement,
	hrPosition,
	hrProbationReview,
	hrReportingLine,
	hrSalaryBand,
	hrShift,
	hrShiftAssignment,
	hrShiftAssignmentSegment,
	hrShiftBreak,
	hrSuccessionCandidate,
	hrSuccessionPlan,
	hrTalentPool,
	hrTalentPoolMember,
	hrTalentProfile,
	hrTalentProfileAssessment,
	hrTermination,
	hrTimeApprovalAuthorityAssignment,
	hrTimePolicy,
	hrTimePolicyAssignment,
	hrTimesheet,
	hrTimesheetApprovalDecision,
	hrTimesheetEntry,
	hrUserEmployee,
	hrWorkAssignment,
	hrWorkCalendar,
	hrWorkCalendarHoliday,
	hrWorkEligibility,
	inArray,
	platformAuditLog,
	platformDomainEvent,
} from "@afenda/db";

function isForeignKeyViolation(error: unknown): boolean {
	let current: unknown = error;
	for (let depth = 0; depth < 4 && current != null; depth += 1) {
		if (
			typeof current === "object" &&
			"code" in current &&
			(current as { code: unknown }).code === "23503"
		) {
			return true;
		}
		if (
			current instanceof Error &&
			/foreign key constraint/i.test(current.message)
		) {
			return true;
		}
		current =
			typeof current === "object" && current !== null && "cause" in current
				? (current as { cause: unknown }).cause
				: null;
	}
	return false;
}

async function deleteLeaveChildrenForOrganization(
	organizationId: string,
): Promise<void> {
	const leaveRequests = await db
		.select({ id: hrLeaveRequest.id })
		.from(hrLeaveRequest)
		.where(eq(hrLeaveRequest.organizationId, organizationId));
	const leaveRequestIds = leaveRequests.map((row) => row.id);

	await db
		.delete(hrLeaveApprovalDecision)
		.where(eq(hrLeaveApprovalDecision.organizationId, organizationId));
	await db
		.delete(hrLeaveRequestSegment)
		.where(eq(hrLeaveRequestSegment.organizationId, organizationId));
	await db
		.delete(hrLeaveAdjustment)
		.where(eq(hrLeaveAdjustment.organizationId, organizationId));

	// Request-id deletes catch mismatched organization_id and late writers.
	if (leaveRequestIds.length > 0) {
		await db
			.delete(hrLeaveApprovalDecision)
			.where(inArray(hrLeaveApprovalDecision.requestId, leaveRequestIds));
		await db
			.delete(hrLeaveRequestSegment)
			.where(inArray(hrLeaveRequestSegment.requestId, leaveRequestIds));
		await db
			.delete(hrLeaveAdjustment)
			.where(inArray(hrLeaveAdjustment.sourceRequestId, leaveRequestIds));
	}
}

async function deleteLeaveGraphForOrganization(
	organizationId: string,
): Promise<void> {
	const maxAttempts = 3;
	for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
		await deleteLeaveChildrenForOrganization(organizationId);
		try {
			await db
				.delete(hrLeaveRequest)
				.where(eq(hrLeaveRequest.organizationId, organizationId));
			break;
		} catch (error) {
			if (!isForeignKeyViolation(error) || attempt === maxAttempts) {
				throw error;
			}
		}
	}

	await db
		.delete(hrLeaveEntitlement)
		.where(eq(hrLeaveEntitlement.organizationId, organizationId));
	await db
		.delete(hrLeavePolicyEligibility)
		.where(eq(hrLeavePolicyEligibility.organizationId, organizationId));
	await db
		.delete(hrLeavePolicy)
		.where(eq(hrLeavePolicy.organizationId, organizationId));
}

function isUndefinedTable(error: unknown): boolean {
	let current: unknown = error;
	for (let depth = 0; depth < 4 && current != null; depth += 1) {
		if (
			typeof current === "object" &&
			"code" in current &&
			(current as { code: unknown }).code === "42P01"
		) {
			return true;
		}
		if (
			current instanceof Error &&
			/relation .* does not exist/i.test(current.message)
		) {
			return true;
		}
		current =
			typeof current === "object" && current !== null && "cause" in current
				? (current as { cause: unknown }).cause
				: null;
	}
	return false;
}

async function deleteOrgRows(deleteFn: () => Promise<unknown>): Promise<void> {
	try {
		await deleteFn();
	} catch (error) {
		if (!isUndefinedTable(error)) {
			throw error;
		}
	}
}

async function deleteTimeGraphForOrganization(
	organizationId: string,
): Promise<void> {
	await deleteOrgRows(() =>
		db
			.delete(hrOvertimeApproval)
			.where(eq(hrOvertimeApproval.organizationId, organizationId)),
	);
	await deleteOrgRows(() =>
		db
			.delete(hrOvertimeRequest)
			.where(eq(hrOvertimeRequest.organizationId, organizationId)),
	);
	await deleteOrgRows(() =>
		db
			.delete(hrTimesheetEntry)
			.where(eq(hrTimesheetEntry.organizationId, organizationId)),
	);
	await deleteOrgRows(() =>
		db
			.delete(hrTimesheetApprovalDecision)
			.where(eq(hrTimesheetApprovalDecision.organizationId, organizationId)),
	);
	await deleteOrgRows(() =>
		db
			.delete(hrTimesheet)
			.where(eq(hrTimesheet.organizationId, organizationId)),
	);
	await deleteOrgRows(() =>
		db
			.delete(hrAttendanceBreakWaiverDecision)
			.where(
				eq(hrAttendanceBreakWaiverDecision.organizationId, organizationId),
			),
	);
	await deleteOrgRows(() =>
		db
			.delete(hrTimeApprovalAuthorityAssignment)
			.where(
				eq(hrTimeApprovalAuthorityAssignment.organizationId, organizationId),
			),
	);
	await deleteOrgRows(() =>
		db
			.delete(hrTimePolicyAssignment)
			.where(eq(hrTimePolicyAssignment.organizationId, organizationId)),
	);
	await deleteOrgRows(() =>
		db
			.delete(hrTimePolicy)
			.where(eq(hrTimePolicy.organizationId, organizationId)),
	);
	await deleteOrgRows(() =>
		db
			.delete(hrAttendanceAdjustment)
			.where(eq(hrAttendanceAdjustment.organizationId, organizationId)),
	);
	await deleteOrgRows(() =>
		db
			.delete(hrAttendanceException)
			.where(eq(hrAttendanceException.organizationId, organizationId)),
	);
	await deleteOrgRows(() =>
		db
			.delete(hrAttendanceSession)
			.where(eq(hrAttendanceSession.organizationId, organizationId)),
	);
	await deleteOrgRows(() =>
		db
			.delete(hrAttendanceEvent)
			.where(eq(hrAttendanceEvent.organizationId, organizationId)),
	);
	await deleteOrgRows(() =>
		db
			.delete(hrShiftAssignmentSegment)
			.where(eq(hrShiftAssignmentSegment.organizationId, organizationId)),
	);
	await deleteOrgRows(() =>
		db
			.delete(hrShiftAssignment)
			.where(eq(hrShiftAssignment.organizationId, organizationId)),
	);
	await deleteOrgRows(() =>
		db
			.delete(hrShiftBreak)
			.where(eq(hrShiftBreak.organizationId, organizationId)),
	);
	await deleteOrgRows(() =>
		db.delete(hrShift).where(eq(hrShift.organizationId, organizationId)),
	);
	await deleteOrgRows(() =>
		db
			.delete(hrEmploymentCalendarAssignment)
			.where(eq(hrEmploymentCalendarAssignment.organizationId, organizationId)),
	);
	await deleteOrgRows(() =>
		db
			.delete(hrWorkCalendarHoliday)
			.where(eq(hrWorkCalendarHoliday.organizationId, organizationId)),
	);
	await deleteOrgRows(() =>
		db
			.delete(hrWorkCalendar)
			.where(eq(hrWorkCalendar.organizationId, organizationId)),
	);
}

/** Wipe synthetic-org HR fixtures and co-written audit / domain-event rows. */
export async function cleanupHumanResourcesNeonOrgs(
	organizationIds: readonly string[],
): Promise<void> {
	for (const organizationId of organizationIds) {
		await deleteTimeGraphForOrganization(organizationId);
		await db
			.delete(hrInterviewEvaluation)
			.where(eq(hrInterviewEvaluation.organizationId, organizationId));
		await db
			.delete(hrInterview)
			.where(eq(hrInterview.organizationId, organizationId));
		await db
			.delete(hrEmploymentOffer)
			.where(eq(hrEmploymentOffer.organizationId, organizationId));
		await db
			.delete(hrCandidateApplication)
			.where(eq(hrCandidateApplication.organizationId, organizationId));
		await db
			.delete(hrCandidate)
			.where(eq(hrCandidate.organizationId, organizationId));
		await db
			.delete(hrHeadcountReservation)
			.where(eq(hrHeadcountReservation.organizationId, organizationId));
		await db
			.delete(hrHeadcountPlanLine)
			.where(eq(hrHeadcountPlanLine.organizationId, organizationId));
		await db
			.delete(hrHeadcountPlan)
			.where(eq(hrHeadcountPlan.organizationId, organizationId));
		await db
			.delete(hrJobRequisition)
			.where(eq(hrJobRequisition.organizationId, organizationId));
		await db
			.delete(hrExitInterview)
			.where(eq(hrExitInterview.organizationId, organizationId));
		await db
			.delete(hrClearance)
			.where(eq(hrClearance.organizationId, organizationId));
		await db
			.delete(hrOffboardingTask)
			.where(eq(hrOffboardingTask.organizationId, organizationId));
		await db
			.delete(hrOffboardingCase)
			.where(eq(hrOffboardingCase.organizationId, organizationId));
		await db
			.delete(hrOnboardingTask)
			.where(eq(hrOnboardingTask.organizationId, organizationId));
		await db
			.delete(hrOnboardingCase)
			.where(eq(hrOnboardingCase.organizationId, organizationId));
		await db
			.delete(hrProbationReview)
			.where(eq(hrProbationReview.organizationId, organizationId));
		await db
			.delete(hrEmploymentConfirmation)
			.where(eq(hrEmploymentConfirmation.organizationId, organizationId));
		await db
			.delete(hrEmploymentMovement)
			.where(eq(hrEmploymentMovement.organizationId, organizationId));
		await db
			.delete(hrTermination)
			.where(eq(hrTermination.organizationId, organizationId));
		await db
			.delete(hrWorkAssignment)
			.where(eq(hrWorkAssignment.organizationId, organizationId));
		await db
			.delete(hrReportingLine)
			.where(eq(hrReportingLine.organizationId, organizationId));
		await db
			.delete(hrEmploymentContract)
			.where(eq(hrEmploymentContract.organizationId, organizationId));
		await db
			.delete(hrPerformanceImprovementCheckpoint)
			.where(
				eq(hrPerformanceImprovementCheckpoint.organizationId, organizationId),
			);
		await db
			.delete(hrPerformanceImprovementPlan)
			.where(eq(hrPerformanceImprovementPlan.organizationId, organizationId));
		await db
			.delete(hrPerformanceAssessment)
			.where(eq(hrPerformanceAssessment.organizationId, organizationId));
		await db
			.delete(hrPerformanceReviewParticipant)
			.where(eq(hrPerformanceReviewParticipant.organizationId, organizationId));
		await db
			.delete(hrPerformanceReview)
			.where(eq(hrPerformanceReview.organizationId, organizationId));
		await db
			.delete(hrPerformanceGoalProgress)
			.where(eq(hrPerformanceGoalProgress.organizationId, organizationId));
		await db
			.delete(hrPerformanceGoal)
			.where(eq(hrPerformanceGoal.organizationId, organizationId));
		await db
			.delete(hrPerformanceCycleParticipant)
			.where(eq(hrPerformanceCycleParticipant.organizationId, organizationId));
		await db
			.delete(hrPerformanceCycle)
			.where(eq(hrPerformanceCycle.organizationId, organizationId));
		await db
			.delete(hrSuccessionCandidate)
			.where(eq(hrSuccessionCandidate.organizationId, organizationId));
		await db
			.delete(hrSuccessionPlan)
			.where(eq(hrSuccessionPlan.organizationId, organizationId));
		await db
			.delete(hrCareerPlanAction)
			.where(eq(hrCareerPlanAction.organizationId, organizationId));
		await db
			.delete(hrCareerPlan)
			.where(eq(hrCareerPlan.organizationId, organizationId));
		await db
			.delete(hrTalentPoolMember)
			.where(eq(hrTalentPoolMember.organizationId, organizationId));
		await db
			.delete(hrTalentPool)
			.where(eq(hrTalentPool.organizationId, organizationId));
		await db
			.delete(hrTalentProfileAssessment)
			.where(eq(hrTalentProfileAssessment.organizationId, organizationId));
		await db
			.delete(hrTalentProfile)
			.where(eq(hrTalentProfile.organizationId, organizationId));
		await db
			.delete(hrCompetencyAssessment)
			.where(eq(hrCompetencyAssessment.organizationId, organizationId));
		await db
			.delete(hrJobCompetency)
			.where(eq(hrJobCompetency.organizationId, organizationId));
		await db
			.delete(hrCompetency)
			.where(eq(hrCompetency.organizationId, organizationId));
		await deleteLeaveGraphForOrganization(organizationId);
		await db
			.delete(hrEmployeeCaseEvent)
			.where(eq(hrEmployeeCaseEvent.organizationId, organizationId));
		await db
			.delete(hrEmployeeCaseAction)
			.where(eq(hrEmployeeCaseAction.organizationId, organizationId));
		await db
			.delete(hrEmployeeCaseAppeal)
			.where(eq(hrEmployeeCaseAppeal.organizationId, organizationId));
		await db
			.delete(hrEmployeeCase)
			.where(eq(hrEmployeeCase.organizationId, organizationId));
		await db
			.delete(hrCompensationReview)
			.where(eq(hrCompensationReview.organizationId, organizationId));
		await db
			.delete(hrCompensationReviewCycle)
			.where(eq(hrCompensationReviewCycle.organizationId, organizationId));
		await db
			.delete(hrBenefitEnrollment)
			.where(eq(hrBenefitEnrollment.organizationId, organizationId));
		await db
			.delete(hrBenefitEligibility)
			.where(eq(hrBenefitEligibility.organizationId, organizationId));
		await db
			.delete(hrBenefitPlan)
			.where(eq(hrBenefitPlan.organizationId, organizationId));
		for (let attempt = 1; attempt <= 3; attempt++) {
			await db
				.delete(hrEmployeeCompensation)
				.where(eq(hrEmployeeCompensation.organizationId, organizationId));
			try {
				await db
					.delete(hrEmployment)
					.where(eq(hrEmployment.organizationId, organizationId));
				break;
			} catch (error) {
				if (!isForeignKeyViolation(error) || attempt === 3) {
					throw error;
				}
			}
		}
		await db
			.delete(hrSalaryBand)
			.where(eq(hrSalaryBand.organizationId, organizationId));
		await db
			.delete(hrCompensationGrade)
			.where(eq(hrCompensationGrade.organizationId, organizationId));
		await db
			.delete(hrPosition)
			.where(eq(hrPosition.organizationId, organizationId));
		await db
			.update(hrDepartment)
			.set({ parentDepartmentId: null })
			.where(eq(hrDepartment.organizationId, organizationId));
		await db
			.delete(hrDepartment)
			.where(eq(hrDepartment.organizationId, organizationId));
		await db.delete(hrJob).where(eq(hrJob.organizationId, organizationId));
		await db
			.delete(hrEmployeeCertification)
			.where(eq(hrEmployeeCertification.organizationId, organizationId));
		await db
			.delete(hrLearningCompletion)
			.where(eq(hrLearningCompletion.organizationId, organizationId));
		await db
			.delete(hrLearningAssignment)
			.where(eq(hrLearningAssignment.organizationId, organizationId));
		await db
			.delete(hrLearningSession)
			.where(eq(hrLearningSession.organizationId, organizationId));
		await db
			.delete(hrLearningCourse)
			.where(eq(hrLearningCourse.organizationId, organizationId));
		await db
			.delete(hrPolicyAcknowledgement)
			.where(eq(hrPolicyAcknowledgement.organizationId, organizationId));
		await db
			.delete(hrWorkEligibility)
			.where(eq(hrWorkEligibility.organizationId, organizationId));
		await db
			.delete(hrEmployeeDocument)
			.where(eq(hrEmployeeDocument.organizationId, organizationId));
		await db
			.delete(hrDocumentRequirement)
			.where(eq(hrDocumentRequirement.organizationId, organizationId));
		await db
			.delete(hrUserEmployee)
			.where(eq(hrUserEmployee.organizationId, organizationId));
		await db
			.delete(hrEmployee)
			.where(eq(hrEmployee.organizationId, organizationId));
		await db
			.delete(platformAuditLog)
			.where(eq(platformAuditLog.organizationId, organizationId));
		await db
			.delete(platformDomainEvent)
			.where(eq(platformDomainEvent.organizationId, organizationId));
	}
}
