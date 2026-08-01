import type { HumanResourcesComplianceStore } from "../store/compliance";
import type { HumanResourcesCoreStore } from "../store/core";
import type { HumanResourcesLifecycleStore } from "../store/lifecycle";
import type { HumanResourcesTimeStore } from "../store/time";

type EmploymentCoreStore = Pick<
	HumanResourcesCoreStore,
	| "amendEmployment"
	| "correctEmployment"
	| "correctEmploymentContract"
	| "createAssignment"
	| "createEmployment"
	| "createEmploymentContract"
	| "endAssignment"
	| "findAssignmentByEmploymentAsOf"
	| "findContractByEmploymentAndCode"
	| "findEmploymentByEmployeeAsOf"
	| "findEmploymentContractByEmploymentAsOf"
	| "findOpenEmploymentByEmployee"
	| "findPositionAsOf"
	| "getAssignmentById"
	| "getEmploymentById"
	| "getEmploymentContractById"
	| "getPositionById"
	| "listActiveContractsByEmployment"
	| "listAssignmentsByEmployment"
	| "listEmploymentContractsByEmployment"
	| "listEmploymentsByEmployee"
	| "listEmploymentStatusHistory"
	| "resolvePrimaryManager"
	| "supersedeEmploymentContract"
>;

type EmploymentCalendarStore = Pick<
	HumanResourcesTimeStore,
	| "getWorkCalendar"
	| "listWorkCalendarScopeAssignments"
	| "listWorkCalendars"
	| "resolveEmploymentCalendar"
>;

type EmploymentWorkflowStore = Pick<
	HumanResourcesLifecycleStore,
	| "approveTermination"
	| "completeOffboarding"
	| "completeOffboardingTask"
	| "completeOnboarding"
	| "completeOnboardingTask"
	| "confirmEmployment"
	| "extendProbation"
	| "finalizeTermination"
	| "getClearanceByOffboardingCase"
	| "getEmploymentConfirmation"
	| "getOffboardingAccessRevocationByCase"
	| "getOffboardingCase"
	| "getOffboardingPayrollHandoffByCase"
	| "getOnboardingAccessHandoffByCase"
	| "getOnboardingCase"
	| "getOnboardingEquipmentHandoffByCase"
	| "getOnboardingOrientationByCase"
	| "getOnboardingTask"
	| "getProbationReview"
	| "getTermination"
	| "listOffboardingTasks"
	| "listOnboardingTasks"
	| "listProbationAssessments"
	| "listProbationReviewsByEmployment"
	| "openProbation"
	| "proposeTermination"
	| "recordClearance"
	| "recordExitInterview"
	| "recordOffboardingAccessRevocation"
	| "recordOffboardingPayrollHandoff"
	| "recordOnboardingAccessHandoff"
	| "recordOnboardingEquipmentHandoff"
	| "recordOnboardingOrientation"
	| "recordProbationAssessment"
	| "recordProbationOutcome"
	| "startOffboarding"
	| "startOnboarding"
	| "transferAssignment"
>;

type EmploymentComplianceStore = Pick<
	HumanResourcesComplianceStore,
	"getActiveWorkEligibilityForEmployee" | "listMissingRequiredDocuments"
>;

export type HumanResourcesEmploymentLifecycleStore = EmploymentCoreStore &
	EmploymentCalendarStore &
	EmploymentWorkflowStore &
	EmploymentComplianceStore;
