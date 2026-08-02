import type { HumanResourcesCoreStore } from "../workforce-records/employment/store-contract";
import type { HumanResourcesRecruitmentStore } from "./store-contract";

export type HumanResourcesRecruitmentCapabilityStore = Pick<
	HumanResourcesRecruitmentStore,
	| "acceptOffer"
	| "amendOfferDraft"
	| "amendRequisition"
	| "anonymizeCandidate"
	| "assignHiringManager"
	| "assignInterviewInterviewer"
	| "cancelInterview"
	| "changeCandidateRetention"
	| "createApplication"
	| "createCandidate"
	| "createDraftRequisition"
	| "createOffer"
	| "detectCandidateDuplicates"
	| "findCandidateByIdempotencyKey"
	| "findOfferByAcceptIdempotencyKey"
	| "findRequisitionByIdempotencyKey"
	| "getApplicationById"
	| "getCandidateById"
	| "getInterviewById"
	| "getInterviewEvaluationByInterviewId"
	| "getOfferById"
	| "getRequisitionById"
	| "listApplications"
	| "listApplicationStatusHistory"
	| "listCandidates"
	| "listInterviews"
	| "listOffers"
	| "listRequisitions"
	| "recordInterviewEvaluation"
	| "reopenApplication"
	| "scheduleInterview"
	| "transitionApplicationStatus"
	| "transitionOfferStatus"
	| "transitionRequisitionStatus"
	| "updateCandidateProfile"
	| "withdrawCandidateConsent"
> &
	Pick<
		HumanResourcesCoreStore,
		"findEmploymentByEmployeeAsOf" | "getEmployeeById"
	>;
