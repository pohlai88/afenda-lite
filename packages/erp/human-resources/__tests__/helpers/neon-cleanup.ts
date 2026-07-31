import {
	database as afendaDatabase,
	eq,
	hrAllowanceEntitlement,
	hrAttendanceAdjustment,
	hrAttendanceBreakWaiverDecision,
	hrAttendanceEvent,
	hrAttendanceException,
	hrAttendanceImportBatch,
	hrAttendanceImportError,
	hrAttendanceSession,
	hrBenefitEligibility,
	hrBenefitEnrollment,
	hrBenefitEnrollmentDependent,
	hrBenefitPlan,
	hrBonusEligibility,
	hrCandidate,
	hrCandidateApplication,
	hrCandidateApplicationStatusHistory,
	hrCareerPlan,
	hrCareerPlanAction,
	hrClearance,
	hrCompensationGrade,
	hrCompensationGradeProgressionRule,
	hrCompensationProposal,
	hrCompensationReview,
	hrCompensationReviewCycle,
	hrCompetency,
	hrCompetencyAssessment,
	hrDepartment,
	hrDepartmentStructureVersion,
	hrDevelopmentPlan,
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
	hrEmploymentStatusHistory,
	hrExitInterview,
	hrHeadcountPlan,
	hrHeadcountPlanLine,
	hrHeadcountReservation,
	hrHireAttempt,
	hrInterview,
	hrInterviewEvaluation,
	hrJob,
	hrJobCompetency,
	hrJobDefinitionVersion,
	hrJobRequisition,
	hrLearningAssessment,
	hrLearningAssignment,
	hrLearningAttendance,
	hrLearningCompletion,
	hrLearningCourse,
	hrLearningProgram,
	hrLearningSession,
	hrLeaveAdjustment,
	hrLeaveApprovalDecision,
	hrLeaveEntitlement,
	hrLeavePolicy,
	hrLeavePolicyEligibility,
	hrLeaveRequest,
	hrLeaveRequestSegment,
	hrOffboardingAccessRevocation,
	hrOffboardingCase,
	hrOffboardingPayrollHandoff,
	hrOffboardingTask,
	hrOnboardingAccessHandoff,
	hrOnboardingCase,
	hrOnboardingEquipmentHandoff,
	hrOnboardingOrientation,
	hrOnboardingTask,
	hrOvertimeApproval,
	hrOvertimeRequest,
	hrPerformanceAssessment,
	hrPerformanceCycle,
	hrPerformanceCycleEligibility,
	hrPerformanceCycleParticipant,
	hrPerformanceCycleReviewPeriod,
	hrPerformanceGoal,
	hrPerformanceGoalProgress,
	hrPerformanceImprovementCheckpoint,
	hrPerformanceImprovementPlan,
	hrPerformanceReview,
	hrPerformanceReviewParticipant,
	hrPerson,
	hrPersonContact,
	hrPersonIdentifier,
	hrPersonIdentityVersion,
	hrPolicyAcknowledgement,
	hrPosition,
	hrPositionDefinitionVersion,
	hrProbationAssessment,
	hrProbationReview,
	hrReportingLine,
	hrSalaryBand,
	hrShift,
	hrShiftAssignment,
	hrShiftAssignmentSegment,
	hrShiftBreak,
	hrSuccessionCandidate,
	hrSuccessionPlan,
	hrTalentCriticalRoleReadiness,
	hrTalentPool,
	hrTalentPoolMember,
	hrTalentProfile,
	hrTalentProfileAssessment,
	hrTalentProfileMobility,
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
	hrWorkCalendarScopeAssignment,
	hrWorkEligibility,
	hrWorker,
	hrWorkerClassificationVersion,
	inArray,
	mdOrganizationDimension,
	platformAuditLog,
	platformDomainEvent,
} from "@afenda/db";
import {
	runSequential,
	sequentialBreak,
} from "../../src/shared/run-sequential";

function isForeignKeyViolation(error: unknown): boolean {
	let current: unknown = error;
	for (let depth = 0; depth < 4 && current !== null; depth += 1) {
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
	const leaveRequests = await afendaDatabase.client
		.select({ id: hrLeaveRequest.id })
		.from(hrLeaveRequest)
		.where(eq(hrLeaveRequest.organizationId, organizationId));
	const leaveRequestIds = leaveRequests.map((row) => row.id);

	await afendaDatabase.client
		.delete(hrLeaveApprovalDecision)
		.where(eq(hrLeaveApprovalDecision.organizationId, organizationId));
	await afendaDatabase.client
		.delete(hrLeaveRequestSegment)
		.where(eq(hrLeaveRequestSegment.organizationId, organizationId));
	await afendaDatabase.client
		.delete(hrLeaveAdjustment)
		.where(eq(hrLeaveAdjustment.organizationId, organizationId));

	// Request-id deletes catch mismatched organization_id and late writers.
	if (leaveRequestIds.length > 0) {
		await afendaDatabase.client
			.delete(hrLeaveApprovalDecision)
			.where(inArray(hrLeaveApprovalDecision.requestId, leaveRequestIds));
		await afendaDatabase.client
			.delete(hrLeaveRequestSegment)
			.where(inArray(hrLeaveRequestSegment.requestId, leaveRequestIds));
		await afendaDatabase.client
			.delete(hrLeaveAdjustment)
			.where(inArray(hrLeaveAdjustment.sourceRequestId, leaveRequestIds));
	}
}

async function deleteLeaveGraphForOrganization(
	organizationId: string,
): Promise<void> {
	const maxAttempts = 3;
	await runSequential([1, 2, 3], async (attempt) => {
		await deleteLeaveChildrenForOrganization(organizationId);
		try {
			await afendaDatabase.client
				.delete(hrLeaveRequest)
				.where(eq(hrLeaveRequest.organizationId, organizationId));
			return sequentialBreak();
		} catch (error) {
			if (!isForeignKeyViolation(error) || attempt === maxAttempts) {
				throw error;
			}
		}
	});

	await afendaDatabase.client
		.delete(hrLeaveEntitlement)
		.where(eq(hrLeaveEntitlement.organizationId, organizationId));
	await afendaDatabase.client
		.delete(hrLeavePolicyEligibility)
		.where(eq(hrLeavePolicyEligibility.organizationId, organizationId));
	await afendaDatabase.client
		.delete(hrLeavePolicy)
		.where(eq(hrLeavePolicy.organizationId, organizationId));
}

function isUndefinedTable(error: unknown): boolean {
	let current: unknown = error;
	for (let depth = 0; depth < 4 && current !== null; depth += 1) {
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
		afendaDatabase.client
			.delete(hrAttendanceImportError)
			.where(eq(hrAttendanceImportError.organizationId, organizationId)),
	);
	await deleteOrgRows(() =>
		afendaDatabase.client
			.delete(hrAttendanceImportBatch)
			.where(eq(hrAttendanceImportBatch.organizationId, organizationId)),
	);
	await deleteOrgRows(() =>
		afendaDatabase.client
			.delete(hrOvertimeApproval)
			.where(eq(hrOvertimeApproval.organizationId, organizationId)),
	);
	await deleteOrgRows(() =>
		afendaDatabase.client
			.delete(hrOvertimeRequest)
			.where(eq(hrOvertimeRequest.organizationId, organizationId)),
	);
	await deleteOrgRows(() =>
		afendaDatabase.client
			.delete(hrTimesheetEntry)
			.where(eq(hrTimesheetEntry.organizationId, organizationId)),
	);
	await deleteOrgRows(() =>
		afendaDatabase.client
			.delete(hrTimesheetApprovalDecision)
			.where(eq(hrTimesheetApprovalDecision.organizationId, organizationId)),
	);
	await deleteOrgRows(() =>
		afendaDatabase.client
			.delete(hrTimesheet)
			.where(eq(hrTimesheet.organizationId, organizationId)),
	);
	await deleteOrgRows(() =>
		afendaDatabase.client
			.delete(hrAttendanceBreakWaiverDecision)
			.where(
				eq(hrAttendanceBreakWaiverDecision.organizationId, organizationId),
			),
	);
	await deleteOrgRows(() =>
		afendaDatabase.client
			.delete(hrTimeApprovalAuthorityAssignment)
			.where(
				eq(hrTimeApprovalAuthorityAssignment.organizationId, organizationId),
			),
	);
	await deleteOrgRows(() =>
		afendaDatabase.client
			.delete(hrTimePolicyAssignment)
			.where(eq(hrTimePolicyAssignment.organizationId, organizationId)),
	);
	await deleteOrgRows(() =>
		afendaDatabase.client
			.delete(hrTimePolicy)
			.where(eq(hrTimePolicy.organizationId, organizationId)),
	);
	await deleteOrgRows(() =>
		afendaDatabase.client
			.delete(hrAttendanceAdjustment)
			.where(eq(hrAttendanceAdjustment.organizationId, organizationId)),
	);
	await deleteOrgRows(() =>
		afendaDatabase.client
			.delete(hrAttendanceException)
			.where(eq(hrAttendanceException.organizationId, organizationId)),
	);
	await deleteOrgRows(() =>
		afendaDatabase.client
			.delete(hrAttendanceSession)
			.where(eq(hrAttendanceSession.organizationId, organizationId)),
	);
	await deleteOrgRows(() =>
		afendaDatabase.client
			.delete(hrAttendanceEvent)
			.where(eq(hrAttendanceEvent.organizationId, organizationId)),
	);
	await deleteOrgRows(() =>
		afendaDatabase.client
			.delete(hrShiftAssignmentSegment)
			.where(eq(hrShiftAssignmentSegment.organizationId, organizationId)),
	);
	await deleteOrgRows(() =>
		afendaDatabase.client
			.delete(hrShiftAssignment)
			.where(eq(hrShiftAssignment.organizationId, organizationId)),
	);
	await deleteOrgRows(() =>
		afendaDatabase.client
			.delete(hrShiftBreak)
			.where(eq(hrShiftBreak.organizationId, organizationId)),
	);
	await deleteOrgRows(() =>
		afendaDatabase.client
			.delete(hrShift)
			.where(eq(hrShift.organizationId, organizationId)),
	);
	await deleteOrgRows(() =>
		afendaDatabase.client
			.delete(hrEmploymentCalendarAssignment)
			.where(eq(hrEmploymentCalendarAssignment.organizationId, organizationId)),
	);
	await deleteOrgRows(() =>
		afendaDatabase.client
			.delete(hrWorkCalendarHoliday)
			.where(eq(hrWorkCalendarHoliday.organizationId, organizationId)),
	);
	await deleteOrgRows(() =>
		afendaDatabase.client
			.delete(hrWorkCalendarScopeAssignment)
			.where(eq(hrWorkCalendarScopeAssignment.organizationId, organizationId)),
	);
}

/** Wipe synthetic-org HR fixtures and co-written audit / domain-event rows. */
export async function cleanupHumanResourcesNeonOrgs(
	organizationIds: readonly string[],
): Promise<void> {
	await runSequential(organizationIds, async (organizationId) => {
		await deleteTimeGraphForOrganization(organizationId);
		await afendaDatabase.client
			.delete(hrInterviewEvaluation)
			.where(eq(hrInterviewEvaluation.organizationId, organizationId));
		await afendaDatabase.client
			.delete(hrInterview)
			.where(eq(hrInterview.organizationId, organizationId));
		await afendaDatabase.client
			.delete(hrHireAttempt)
			.where(eq(hrHireAttempt.organizationId, organizationId));
		await afendaDatabase.client
			.delete(hrEmploymentOffer)
			.where(eq(hrEmploymentOffer.organizationId, organizationId));
		await afendaDatabase.client
			.delete(hrCompensationProposal)
			.where(eq(hrCompensationProposal.organizationId, organizationId));
		await afendaDatabase.client
			.delete(hrCandidateApplicationStatusHistory)
			.where(
				eq(hrCandidateApplicationStatusHistory.organizationId, organizationId),
			);
		await afendaDatabase.client
			.delete(hrCandidateApplication)
			.where(eq(hrCandidateApplication.organizationId, organizationId));
		await afendaDatabase.client
			.delete(hrCandidate)
			.where(eq(hrCandidate.organizationId, organizationId));
		await afendaDatabase.client
			.delete(hrHeadcountReservation)
			.where(eq(hrHeadcountReservation.organizationId, organizationId));
		await afendaDatabase.client
			.delete(hrHeadcountPlanLine)
			.where(eq(hrHeadcountPlanLine.organizationId, organizationId));
		await afendaDatabase.client
			.delete(hrHeadcountPlan)
			.where(eq(hrHeadcountPlan.organizationId, organizationId));
		await afendaDatabase.client
			.delete(hrJobRequisition)
			.where(eq(hrJobRequisition.organizationId, organizationId));
		await afendaDatabase.client
			.delete(hrExitInterview)
			.where(eq(hrExitInterview.organizationId, organizationId));
		await afendaDatabase.client
			.delete(hrClearance)
			.where(eq(hrClearance.organizationId, organizationId));
		await afendaDatabase.client
			.delete(hrOffboardingTask)
			.where(eq(hrOffboardingTask.organizationId, organizationId));
		await afendaDatabase.client
			.delete(hrOffboardingAccessRevocation)
			.where(eq(hrOffboardingAccessRevocation.organizationId, organizationId));
		await afendaDatabase.client
			.delete(hrOffboardingPayrollHandoff)
			.where(eq(hrOffboardingPayrollHandoff.organizationId, organizationId));
		await afendaDatabase.client
			.delete(hrOffboardingCase)
			.where(eq(hrOffboardingCase.organizationId, organizationId));
		await afendaDatabase.client
			.delete(hrOnboardingTask)
			.where(eq(hrOnboardingTask.organizationId, organizationId));
		await afendaDatabase.client
			.delete(hrOnboardingAccessHandoff)
			.where(eq(hrOnboardingAccessHandoff.organizationId, organizationId));
		await afendaDatabase.client
			.delete(hrOnboardingEquipmentHandoff)
			.where(eq(hrOnboardingEquipmentHandoff.organizationId, organizationId));
		await afendaDatabase.client
			.delete(hrOnboardingOrientation)
			.where(eq(hrOnboardingOrientation.organizationId, organizationId));
		await afendaDatabase.client
			.delete(hrOnboardingCase)
			.where(eq(hrOnboardingCase.organizationId, organizationId));
		await afendaDatabase.client
			.delete(hrProbationAssessment)
			.where(eq(hrProbationAssessment.organizationId, organizationId));
		await afendaDatabase.client
			.delete(hrProbationReview)
			.where(eq(hrProbationReview.organizationId, organizationId));
		await afendaDatabase.client
			.delete(hrEmploymentConfirmation)
			.where(eq(hrEmploymentConfirmation.organizationId, organizationId));
		await afendaDatabase.client
			.update(hrWorkAssignment)
			.set({
				predecessorAssignmentId: null,
				successorAssignmentId: null,
				transferMovementId: null,
			})
			.where(eq(hrWorkAssignment.organizationId, organizationId));
		await afendaDatabase.client
			.delete(hrEmploymentMovement)
			.where(eq(hrEmploymentMovement.organizationId, organizationId));
		await afendaDatabase.client
			.delete(hrWorkAssignment)
			.where(eq(hrWorkAssignment.organizationId, organizationId));
		await afendaDatabase.client
			.delete(hrWorkCalendar)
			.where(eq(hrWorkCalendar.organizationId, organizationId));
		await afendaDatabase.client
			.delete(hrTermination)
			.where(eq(hrTermination.organizationId, organizationId));
		await afendaDatabase.client
			.delete(hrReportingLine)
			.where(eq(hrReportingLine.organizationId, organizationId));
		await afendaDatabase.client
			.delete(hrEmploymentContract)
			.where(eq(hrEmploymentContract.organizationId, organizationId));
		await afendaDatabase.client
			.delete(hrPerformanceImprovementCheckpoint)
			.where(
				eq(hrPerformanceImprovementCheckpoint.organizationId, organizationId),
			);
		await afendaDatabase.client
			.delete(hrPerformanceImprovementPlan)
			.where(eq(hrPerformanceImprovementPlan.organizationId, organizationId));
		await afendaDatabase.client
			.delete(hrPerformanceAssessment)
			.where(eq(hrPerformanceAssessment.organizationId, organizationId));
		await afendaDatabase.client
			.delete(hrPerformanceReviewParticipant)
			.where(eq(hrPerformanceReviewParticipant.organizationId, organizationId));
		await afendaDatabase.client
			.delete(hrPerformanceReview)
			.where(eq(hrPerformanceReview.organizationId, organizationId));
		await afendaDatabase.client
			.delete(hrPerformanceGoalProgress)
			.where(eq(hrPerformanceGoalProgress.organizationId, organizationId));
		await afendaDatabase.client
			.delete(hrPerformanceGoal)
			.where(eq(hrPerformanceGoal.organizationId, organizationId));
		await afendaDatabase.client
			.delete(hrPerformanceCycleParticipant)
			.where(eq(hrPerformanceCycleParticipant.organizationId, organizationId));
		await afendaDatabase.client
			.delete(hrPerformanceCycleReviewPeriod)
			.where(eq(hrPerformanceCycleReviewPeriod.organizationId, organizationId));
		await afendaDatabase.client
			.delete(hrPerformanceCycleEligibility)
			.where(eq(hrPerformanceCycleEligibility.organizationId, organizationId));
		await afendaDatabase.client
			.delete(hrPerformanceCycle)
			.where(eq(hrPerformanceCycle.organizationId, organizationId));
		await afendaDatabase.client
			.delete(hrSuccessionCandidate)
			.where(eq(hrSuccessionCandidate.organizationId, organizationId));
		await afendaDatabase.client
			.delete(hrSuccessionPlan)
			.where(eq(hrSuccessionPlan.organizationId, organizationId));
		await afendaDatabase.client
			.delete(hrCareerPlanAction)
			.where(eq(hrCareerPlanAction.organizationId, organizationId));
		await afendaDatabase.client
			.delete(hrCareerPlan)
			.where(eq(hrCareerPlan.organizationId, organizationId));
		await afendaDatabase.client
			.delete(hrTalentPoolMember)
			.where(eq(hrTalentPoolMember.organizationId, organizationId));
		await afendaDatabase.client
			.delete(hrTalentPool)
			.where(eq(hrTalentPool.organizationId, organizationId));
		await afendaDatabase.client
			.delete(hrTalentProfileAssessment)
			.where(eq(hrTalentProfileAssessment.organizationId, organizationId));
		await afendaDatabase.client
			.delete(hrTalentCriticalRoleReadiness)
			.where(eq(hrTalentCriticalRoleReadiness.organizationId, organizationId));
		await afendaDatabase.client
			.delete(hrTalentProfileMobility)
			.where(eq(hrTalentProfileMobility.organizationId, organizationId));
		await afendaDatabase.client
			.delete(hrTalentProfile)
			.where(eq(hrTalentProfile.organizationId, organizationId));
		await afendaDatabase.client
			.delete(hrCompetencyAssessment)
			.where(eq(hrCompetencyAssessment.organizationId, organizationId));
		await afendaDatabase.client
			.delete(hrJobCompetency)
			.where(eq(hrJobCompetency.organizationId, organizationId));
		await afendaDatabase.client
			.delete(hrCompetency)
			.where(eq(hrCompetency.organizationId, organizationId));
		await deleteLeaveGraphForOrganization(organizationId);
		await afendaDatabase.client
			.delete(hrEmployeeCaseEvent)
			.where(eq(hrEmployeeCaseEvent.organizationId, organizationId));
		await afendaDatabase.client
			.delete(hrEmployeeCaseAction)
			.where(eq(hrEmployeeCaseAction.organizationId, organizationId));
		await afendaDatabase.client
			.delete(hrEmployeeCaseAppeal)
			.where(eq(hrEmployeeCaseAppeal.organizationId, organizationId));
		await afendaDatabase.client
			.delete(hrEmployeeCase)
			.where(eq(hrEmployeeCase.organizationId, organizationId));
		await afendaDatabase.client
			.delete(hrCompensationReview)
			.where(eq(hrCompensationReview.organizationId, organizationId));
		await afendaDatabase.client
			.delete(hrCompensationReviewCycle)
			.where(eq(hrCompensationReviewCycle.organizationId, organizationId));
		await afendaDatabase.client
			.delete(hrBenefitEnrollmentDependent)
			.where(eq(hrBenefitEnrollmentDependent.organizationId, organizationId));
		await afendaDatabase.client
			.delete(hrBenefitEnrollment)
			.where(eq(hrBenefitEnrollment.organizationId, organizationId));
		await afendaDatabase.client
			.delete(hrBenefitEligibility)
			.where(eq(hrBenefitEligibility.organizationId, organizationId));
		await afendaDatabase.client
			.delete(hrBenefitPlan)
			.where(eq(hrBenefitPlan.organizationId, organizationId));
		await afendaDatabase.client
			.delete(hrAllowanceEntitlement)
			.where(eq(hrAllowanceEntitlement.organizationId, organizationId));
		await afendaDatabase.client
			.delete(hrBonusEligibility)
			.where(eq(hrBonusEligibility.organizationId, organizationId));
		await runSequential([1, 2, 3], async (attempt) => {
			await afendaDatabase.client
				.delete(hrEmployeeCompensation)
				.where(eq(hrEmployeeCompensation.organizationId, organizationId));
			await afendaDatabase.client
				.delete(hrEmploymentStatusHistory)
				.where(eq(hrEmploymentStatusHistory.organizationId, organizationId));
			try {
				await afendaDatabase.client
					.delete(hrEmployment)
					.where(eq(hrEmployment.organizationId, organizationId));
				return sequentialBreak();
			} catch (error) {
				if (!isForeignKeyViolation(error) || attempt === 3) {
					throw error;
				}
			}
		});
		await afendaDatabase.client
			.delete(hrSalaryBand)
			.where(eq(hrSalaryBand.organizationId, organizationId));
		await afendaDatabase.client
			.delete(hrCompensationGradeProgressionRule)
			.where(
				eq(hrCompensationGradeProgressionRule.organizationId, organizationId),
			);
		await afendaDatabase.client
			.delete(hrCompensationGrade)
			.where(eq(hrCompensationGrade.organizationId, organizationId));
		await afendaDatabase.client
			.delete(hrPositionDefinitionVersion)
			.where(eq(hrPositionDefinitionVersion.organizationId, organizationId));
		await afendaDatabase.client
			.delete(hrPosition)
			.where(eq(hrPosition.organizationId, organizationId));
		await afendaDatabase.client
			.delete(hrDepartmentStructureVersion)
			.where(eq(hrDepartmentStructureVersion.organizationId, organizationId));
		await afendaDatabase.client
			.update(hrDepartment)
			.set({ parentDepartmentId: null })
			.where(eq(hrDepartment.organizationId, organizationId));
		await afendaDatabase.client
			.delete(hrDepartment)
			.where(eq(hrDepartment.organizationId, organizationId));
		await afendaDatabase.client
			.delete(hrJobDefinitionVersion)
			.where(eq(hrJobDefinitionVersion.organizationId, organizationId));
		await afendaDatabase.client
			.delete(hrJob)
			.where(eq(hrJob.organizationId, organizationId));
		await afendaDatabase.client
			.delete(hrEmployeeCertification)
			.where(eq(hrEmployeeCertification.organizationId, organizationId));
		await afendaDatabase.client
			.delete(hrLearningAttendance)
			.where(eq(hrLearningAttendance.organizationId, organizationId));
		await afendaDatabase.client
			.delete(hrLearningCompletion)
			.where(eq(hrLearningCompletion.organizationId, organizationId));
		await afendaDatabase.client
			.delete(hrLearningAssignment)
			.where(eq(hrLearningAssignment.organizationId, organizationId));
		await afendaDatabase.client
			.delete(hrLearningSession)
			.where(eq(hrLearningSession.organizationId, organizationId));
		await afendaDatabase.client
			.delete(hrLearningCourse)
			.where(eq(hrLearningCourse.organizationId, organizationId));
		await afendaDatabase.client
			.delete(hrLearningAssessment)
			.where(eq(hrLearningAssessment.organizationId, organizationId));
		await afendaDatabase.client
			.delete(hrLearningProgram)
			.where(eq(hrLearningProgram.organizationId, organizationId));
		await afendaDatabase.client
			.delete(hrDevelopmentPlan)
			.where(eq(hrDevelopmentPlan.organizationId, organizationId));
		await afendaDatabase.client
			.delete(hrPolicyAcknowledgement)
			.where(eq(hrPolicyAcknowledgement.organizationId, organizationId));
		await afendaDatabase.client
			.delete(hrWorkEligibility)
			.where(eq(hrWorkEligibility.organizationId, organizationId));
		await afendaDatabase.client
			.delete(hrEmployeeDocument)
			.where(eq(hrEmployeeDocument.organizationId, organizationId));
		await afendaDatabase.client
			.delete(hrDocumentRequirement)
			.where(eq(hrDocumentRequirement.organizationId, organizationId));
		await afendaDatabase.client
			.delete(hrUserEmployee)
			.where(eq(hrUserEmployee.organizationId, organizationId));
		await afendaDatabase.client
			.delete(hrWorkerClassificationVersion)
			.where(eq(hrWorkerClassificationVersion.organizationId, organizationId));
		await afendaDatabase.client
			.delete(hrWorker)
			.where(eq(hrWorker.organizationId, organizationId));
		await afendaDatabase.client
			.delete(hrEmployee)
			.where(eq(hrEmployee.organizationId, organizationId));
		await afendaDatabase.client
			.delete(hrPersonContact)
			.where(eq(hrPersonContact.organizationId, organizationId));
		await afendaDatabase.client
			.delete(hrPersonIdentifier)
			.where(eq(hrPersonIdentifier.organizationId, organizationId));
		await afendaDatabase.client
			.delete(hrPersonIdentityVersion)
			.where(eq(hrPersonIdentityVersion.organizationId, organizationId));
		await afendaDatabase.client
			.delete(hrPerson)
			.where(eq(hrPerson.organizationId, organizationId));
		await afendaDatabase.client
			.delete(mdOrganizationDimension)
			.where(eq(mdOrganizationDimension.organizationId, organizationId));
		await afendaDatabase.client
			.delete(platformAuditLog)
			.where(eq(platformAuditLog.organizationId, organizationId));
		await afendaDatabase.client
			.delete(platformDomainEvent)
			.where(eq(platformDomainEvent.organizationId, organizationId));
	});
}

export function createNeonOrgTracker(): {
	trackOrg: (organizationId: string) => string;
	cleanup: () => Promise<void>;
} {
	const organizationIds: string[] = [];
	return {
		trackOrg(organizationId: string): string {
			if (!organizationIds.includes(organizationId)) {
				organizationIds.push(organizationId);
			}
			return organizationId;
		},
		async cleanup(): Promise<void> {
			if (organizationIds.length === 0) {
				return;
			}
			await cleanupHumanResourcesNeonOrgs(organizationIds);
		},
	};
}
