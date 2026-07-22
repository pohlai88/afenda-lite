import {
	db,
	eq,
	hrCandidate,
	hrCandidateApplication,
	hrClearance,
	hrDepartment,
	hrEmployee,
	hrEmployeeCase,
	hrEmployeeCaseAction,
	hrEmployeeCaseAppeal,
	hrEmployeeCaseEvent,
	hrEmployeeCertification,
	hrEmployment,
	hrEmploymentConfirmation,
	hrEmploymentContract,
	hrEmploymentMovement,
	hrEmploymentOffer,
	hrExitInterview,
	hrInterview,
	hrInterviewEvaluation,
	hrJob,
	hrJobRequisition,
	hrLearningAssignment,
	hrLearningCompletion,
	hrLearningCourse,
	hrLearningSession,
	hrOffboardingCase,
	hrOffboardingTask,
	hrOnboardingCase,
	hrOnboardingTask,
	hrPerformanceAssessment,
	hrPerformanceCycle,
	hrPerformanceCycleParticipant,
	hrPerformanceGoal,
	hrPerformanceGoalProgress,
	hrPerformanceImprovementCheckpoint,
	hrPerformanceImprovementPlan,
	hrPerformanceReview,
	hrPerformanceReviewParticipant,
	hrPosition,
	hrProbationReview,
	hrReportingLine,
	hrTermination,
	hrWorkAssignment,
	platformAuditLog,
	platformDomainEvent,
} from "@afenda/db";

/** Wipe synthetic-org HR fixtures and co-written audit / domain-event rows. */
export async function cleanupHumanResourcesNeonOrgs(
	organizationIds: readonly string[],
): Promise<void> {
	for (const organizationId of organizationIds) {
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
			.where(eq(hrPerformanceImprovementCheckpoint.organizationId, organizationId));
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
			.delete(hrEmployment)
			.where(eq(hrEmployment.organizationId, organizationId));
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
