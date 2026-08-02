import type { HumanResourcesComplianceStore } from "../compliance/store-contract";
import type { HumanResourcesTimeStore } from "../time/store-contract";
import type { HumanResourcesCoreStore } from "../workforce-records/employment/store-contract";
import type { HumanResourcesLifecycleStore } from "./store-contract";

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
