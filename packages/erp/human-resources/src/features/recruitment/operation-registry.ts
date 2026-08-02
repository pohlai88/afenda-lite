import {
	HUMAN_RESOURCES_PERMISSION_CANDIDATE_MANAGE,
	HUMAN_RESOURCES_PERMISSION_INTERVIEW_READ,
	HUMAN_RESOURCES_PERMISSION_INTERVIEW_RECORD,
	HUMAN_RESOURCES_PERMISSION_OFFER_APPROVE,
	HUMAN_RESOURCES_PERMISSION_REQUISITION_CREATE,
} from "../../kernel/authorization/permissions";
import {
	defineHumanResourcesOperationRegistry,
	projectHumanResourcesAuthorization,
	projectHumanResourcesOperationIds,
} from "../../kernel/operations/define-registry";

const RECRUITMENT_OWNER = "recruitment" as const;
const RECRUITMENT_POLICY = "hr.recruitment" as const;

const REQUISITION_COMMAND = {
	authorizationPolicy: RECRUITMENT_POLICY,
	kind: "command",
	owner: RECRUITMENT_OWNER,
	permission: HUMAN_RESOURCES_PERMISSION_REQUISITION_CREATE,
} as const;

const REQUISITION_QUERY = {
	...REQUISITION_COMMAND,
	kind: "query",
} as const;

const CANDIDATE_COMMAND = {
	...REQUISITION_COMMAND,
	permission: HUMAN_RESOURCES_PERMISSION_CANDIDATE_MANAGE,
} as const;

const CANDIDATE_QUERY = {
	...CANDIDATE_COMMAND,
	kind: "query",
} as const;

const INTERVIEW_COMMAND = {
	...REQUISITION_COMMAND,
	permission: HUMAN_RESOURCES_PERMISSION_INTERVIEW_RECORD,
} as const;

const INTERVIEW_QUERY = {
	...INTERVIEW_COMMAND,
	kind: "query",
	permission: HUMAN_RESOURCES_PERMISSION_INTERVIEW_READ,
} as const;

const OFFER_COMMAND = {
	...REQUISITION_COMMAND,
	permission: HUMAN_RESOURCES_PERMISSION_OFFER_APPROVE,
} as const;

const OFFER_QUERY = {
	...OFFER_COMMAND,
	kind: "query",
} as const;

export const HUMAN_RESOURCES_RECRUITMENT_COMMANDS =
	defineHumanResourcesOperationRegistry({
		createDraftRequisition: {
			sensitivity: null,
			...REQUISITION_COMMAND,
			id: "human-resources.requisition.create-draft",
			publicName: "createDraftRequisition",
		},
		amendRequisition: {
			sensitivity: null,
			...REQUISITION_COMMAND,
			id: "human-resources.requisition.amend",
			publicName: "amendRequisition",
		},
		submitRequisition: {
			sensitivity: null,
			...REQUISITION_COMMAND,
			id: "human-resources.requisition.submit",
			publicName: "submitRequisition",
		},
		approveRequisition: {
			sensitivity: null,
			...REQUISITION_COMMAND,
			id: "human-resources.requisition.approve",
			publicName: "approveRequisition",
		},
		openRequisition: {
			sensitivity: null,
			...REQUISITION_COMMAND,
			id: "human-resources.requisition.open",
			publicName: "openRequisition",
		},
		placeRequisitionOnHold: {
			sensitivity: null,
			...REQUISITION_COMMAND,
			id: "human-resources.requisition.place-on-hold",
			publicName: "placeRequisitionOnHold",
		},
		closeRequisition: {
			sensitivity: null,
			...REQUISITION_COMMAND,
			id: "human-resources.requisition.close",
			publicName: "closeRequisition",
		},
		cancelRequisition: {
			sensitivity: null,
			...REQUISITION_COMMAND,
			id: "human-resources.requisition.cancel",
			publicName: "cancelRequisition",
		},
		assignHiringManager: {
			sensitivity: null,
			...REQUISITION_COMMAND,
			id: "human-resources.requisition.assign-hiring-manager",
			publicName: "assignHiringManager",
		},
		createCandidate: {
			...CANDIDATE_COMMAND,
			id: "human-resources.candidate.create",
			publicName: "createCandidate",
		},
		updateCandidateProfile: {
			...CANDIDATE_COMMAND,
			id: "human-resources.candidate.update-profile",
			publicName: "updateCandidateProfile",
		},
		withdrawCandidateConsent: {
			...CANDIDATE_COMMAND,
			id: "human-resources.candidate.withdraw-consent",
			publicName: "withdrawCandidateConsent",
		},
		changeCandidateRetention: {
			...CANDIDATE_COMMAND,
			id: "human-resources.candidate.change-retention",
			publicName: "changeCandidateRetention",
		},
		anonymizeCandidate: {
			...CANDIDATE_COMMAND,
			id: "human-resources.candidate.anonymize",
			publicName: "anonymizeCandidate",
		},
		createApplication: {
			...CANDIDATE_COMMAND,
			id: "human-resources.application.create",
			publicName: "createApplication",
		},
		moveApplicationToInReview: {
			...CANDIDATE_COMMAND,
			id: "human-resources.application.move-to-in-review",
			publicName: "moveApplicationToInReview",
		},
		moveApplicationToInterviewing: {
			...CANDIDATE_COMMAND,
			id: "human-resources.application.move-to-interviewing",
			publicName: "moveApplicationToInterviewing",
		},
		rejectApplication: {
			...CANDIDATE_COMMAND,
			id: "human-resources.application.reject",
			publicName: "rejectApplication",
		},
		withdrawApplication: {
			...CANDIDATE_COMMAND,
			id: "human-resources.application.withdraw",
			publicName: "withdrawApplication",
		},
		reopenApplication: {
			...CANDIDATE_COMMAND,
			id: "human-resources.application.reopen",
			publicName: "reopenApplication",
		},
		scheduleInterview: {
			...INTERVIEW_COMMAND,
			id: "human-resources.interview.schedule",
			publicName: "scheduleInterview",
		},
		assignInterviewInterviewer: {
			...INTERVIEW_COMMAND,
			id: "human-resources.interview.assign-interviewer",
			publicName: "assignInterviewInterviewer",
		},
		cancelInterview: {
			...INTERVIEW_COMMAND,
			id: "human-resources.interview.cancel",
			publicName: "cancelInterview",
		},
		recordInterviewEvaluation: {
			...INTERVIEW_COMMAND,
			id: "human-resources.interview.record-evaluation",
			publicName: "recordInterviewEvaluation",
		},
		createOffer: {
			...OFFER_COMMAND,
			id: "human-resources.offer.create",
			publicName: "createOffer",
		},
		amendOfferDraft: {
			...OFFER_COMMAND,
			id: "human-resources.offer.amend-draft",
			publicName: "amendOfferDraft",
		},
		issueOffer: {
			...OFFER_COMMAND,
			id: "human-resources.offer.issue",
			publicName: "issueOffer",
		},
		acceptOffer: {
			...OFFER_COMMAND,
			id: "human-resources.offer.accept",
			publicName: "acceptOffer",
		},
		declineOffer: {
			...OFFER_COMMAND,
			id: "human-resources.offer.decline",
			publicName: "declineOffer",
		},
		expireOffer: {
			...OFFER_COMMAND,
			id: "human-resources.offer.expire",
			publicName: "expireOffer",
		},
		withdrawOffer: {
			...OFFER_COMMAND,
			id: "human-resources.offer.withdraw",
			publicName: "withdrawOffer",
		},
		approveOffer: {
			...OFFER_COMMAND,
			id: "human-resources.offer.approve",
			publicName: "approveOffer",
		},
	});

export const HUMAN_RESOURCES_RECRUITMENT_QUERIES =
	defineHumanResourcesOperationRegistry({
		getRequisition: {
			sensitivity: null,
			...REQUISITION_QUERY,
			id: "human-resources.requisition.get",
			publicName: "getRequisition",
		},
		listRequisitions: {
			sensitivity: null,
			...REQUISITION_QUERY,
			id: "human-resources.requisition.list",
			publicName: "listRequisitions",
		},
		getCandidate: {
			...CANDIDATE_QUERY,
			id: "human-resources.candidate.get",
			publicName: "getCandidate",
		},
		listCandidates: {
			...CANDIDATE_QUERY,
			id: "human-resources.candidate.list",
			publicName: "listCandidates",
		},
		detectCandidateDuplicates: {
			...CANDIDATE_QUERY,
			id: "human-resources.candidate.duplicates.detect",
			publicName: "detectCandidateDuplicates",
		},
		getApplication: {
			...CANDIDATE_QUERY,
			id: "human-resources.application.get",
			publicName: "getApplication",
		},
		listApplications: {
			...CANDIDATE_QUERY,
			id: "human-resources.application.list",
			publicName: "listApplications",
		},
		listApplicationStatusHistory: {
			...CANDIDATE_QUERY,
			id: "human-resources.application.status-history.list",
			publicName: "listApplicationStatusHistory",
		},
		getInterview: {
			...INTERVIEW_QUERY,
			id: "human-resources.interview.get",
			publicName: "getInterview",
		},
		listInterviews: {
			...INTERVIEW_QUERY,
			id: "human-resources.interview.list",
			publicName: "listInterviews",
		},
		getInterviewEvaluation: {
			...INTERVIEW_QUERY,
			id: "human-resources.interview-evaluation.get",
			publicName: "getInterviewEvaluation",
		},
		getOffer: {
			...OFFER_QUERY,
			id: "human-resources.offer.get",
			publicName: "getOffer",
		},
		listOffers: {
			...OFFER_QUERY,
			id: "human-resources.offer.list",
			publicName: "listOffers",
		},
	});

export const HUMAN_RESOURCES_COMMAND_REQUISITION_CREATE_DRAFT =
	HUMAN_RESOURCES_RECRUITMENT_COMMANDS.createDraftRequisition.id;
export const HUMAN_RESOURCES_COMMAND_REQUISITION_AMEND =
	HUMAN_RESOURCES_RECRUITMENT_COMMANDS.amendRequisition.id;
export const HUMAN_RESOURCES_COMMAND_REQUISITION_ASSIGN_HIRING_MANAGER =
	HUMAN_RESOURCES_RECRUITMENT_COMMANDS.assignHiringManager.id;
export const HUMAN_RESOURCES_COMMAND_REQUISITION_SUBMIT =
	HUMAN_RESOURCES_RECRUITMENT_COMMANDS.submitRequisition.id;
export const HUMAN_RESOURCES_COMMAND_REQUISITION_APPROVE =
	HUMAN_RESOURCES_RECRUITMENT_COMMANDS.approveRequisition.id;
export const HUMAN_RESOURCES_COMMAND_REQUISITION_OPEN =
	HUMAN_RESOURCES_RECRUITMENT_COMMANDS.openRequisition.id;
export const HUMAN_RESOURCES_COMMAND_REQUISITION_PLACE_ON_HOLD =
	HUMAN_RESOURCES_RECRUITMENT_COMMANDS.placeRequisitionOnHold.id;
export const HUMAN_RESOURCES_COMMAND_REQUISITION_CLOSE =
	HUMAN_RESOURCES_RECRUITMENT_COMMANDS.closeRequisition.id;
export const HUMAN_RESOURCES_COMMAND_REQUISITION_CANCEL =
	HUMAN_RESOURCES_RECRUITMENT_COMMANDS.cancelRequisition.id;
export const HUMAN_RESOURCES_COMMAND_CANDIDATE_CREATE =
	HUMAN_RESOURCES_RECRUITMENT_COMMANDS.createCandidate.id;
export const HUMAN_RESOURCES_COMMAND_CANDIDATE_UPDATE_PROFILE =
	HUMAN_RESOURCES_RECRUITMENT_COMMANDS.updateCandidateProfile.id;
export const HUMAN_RESOURCES_COMMAND_CANDIDATE_WITHDRAW_CONSENT =
	HUMAN_RESOURCES_RECRUITMENT_COMMANDS.withdrawCandidateConsent.id;
export const HUMAN_RESOURCES_COMMAND_CANDIDATE_CHANGE_RETENTION =
	HUMAN_RESOURCES_RECRUITMENT_COMMANDS.changeCandidateRetention.id;
export const HUMAN_RESOURCES_COMMAND_CANDIDATE_ANONYMIZE =
	HUMAN_RESOURCES_RECRUITMENT_COMMANDS.anonymizeCandidate.id;
export const HUMAN_RESOURCES_COMMAND_APPLICATION_CREATE =
	HUMAN_RESOURCES_RECRUITMENT_COMMANDS.createApplication.id;
export const HUMAN_RESOURCES_COMMAND_APPLICATION_MOVE_TO_IN_REVIEW =
	HUMAN_RESOURCES_RECRUITMENT_COMMANDS.moveApplicationToInReview.id;
export const HUMAN_RESOURCES_COMMAND_APPLICATION_MOVE_TO_INTERVIEWING =
	HUMAN_RESOURCES_RECRUITMENT_COMMANDS.moveApplicationToInterviewing.id;
export const HUMAN_RESOURCES_COMMAND_APPLICATION_REJECT =
	HUMAN_RESOURCES_RECRUITMENT_COMMANDS.rejectApplication.id;
export const HUMAN_RESOURCES_COMMAND_APPLICATION_WITHDRAW =
	HUMAN_RESOURCES_RECRUITMENT_COMMANDS.withdrawApplication.id;
export const HUMAN_RESOURCES_COMMAND_APPLICATION_REOPEN =
	HUMAN_RESOURCES_RECRUITMENT_COMMANDS.reopenApplication.id;
export const HUMAN_RESOURCES_COMMAND_INTERVIEW_SCHEDULE =
	HUMAN_RESOURCES_RECRUITMENT_COMMANDS.scheduleInterview.id;
export const HUMAN_RESOURCES_COMMAND_INTERVIEW_ASSIGN_INTERVIEWER =
	HUMAN_RESOURCES_RECRUITMENT_COMMANDS.assignInterviewInterviewer.id;
export const HUMAN_RESOURCES_COMMAND_INTERVIEW_CANCEL =
	HUMAN_RESOURCES_RECRUITMENT_COMMANDS.cancelInterview.id;
export const HUMAN_RESOURCES_COMMAND_INTERVIEW_RECORD_EVALUATION =
	HUMAN_RESOURCES_RECRUITMENT_COMMANDS.recordInterviewEvaluation.id;
export const HUMAN_RESOURCES_COMMAND_OFFER_CREATE =
	HUMAN_RESOURCES_RECRUITMENT_COMMANDS.createOffer.id;
export const HUMAN_RESOURCES_COMMAND_OFFER_AMEND_DRAFT =
	HUMAN_RESOURCES_RECRUITMENT_COMMANDS.amendOfferDraft.id;
export const HUMAN_RESOURCES_COMMAND_OFFER_APPROVE =
	HUMAN_RESOURCES_RECRUITMENT_COMMANDS.approveOffer.id;
export const HUMAN_RESOURCES_COMMAND_OFFER_ISSUE =
	HUMAN_RESOURCES_RECRUITMENT_COMMANDS.issueOffer.id;
export const HUMAN_RESOURCES_COMMAND_OFFER_ACCEPT =
	HUMAN_RESOURCES_RECRUITMENT_COMMANDS.acceptOffer.id;
export const HUMAN_RESOURCES_COMMAND_OFFER_DECLINE =
	HUMAN_RESOURCES_RECRUITMENT_COMMANDS.declineOffer.id;
export const HUMAN_RESOURCES_COMMAND_OFFER_EXPIRE =
	HUMAN_RESOURCES_RECRUITMENT_COMMANDS.expireOffer.id;
export const HUMAN_RESOURCES_COMMAND_OFFER_WITHDRAW =
	HUMAN_RESOURCES_RECRUITMENT_COMMANDS.withdrawOffer.id;

export const HUMAN_RESOURCES_QUERY_REQUISITION_GET =
	HUMAN_RESOURCES_RECRUITMENT_QUERIES.getRequisition.id;
export const HUMAN_RESOURCES_QUERY_REQUISITION_LIST =
	HUMAN_RESOURCES_RECRUITMENT_QUERIES.listRequisitions.id;
export const HUMAN_RESOURCES_QUERY_CANDIDATE_GET =
	HUMAN_RESOURCES_RECRUITMENT_QUERIES.getCandidate.id;
export const HUMAN_RESOURCES_QUERY_CANDIDATE_LIST =
	HUMAN_RESOURCES_RECRUITMENT_QUERIES.listCandidates.id;
export const HUMAN_RESOURCES_QUERY_CANDIDATE_DUPLICATES_DETECT =
	HUMAN_RESOURCES_RECRUITMENT_QUERIES.detectCandidateDuplicates.id;
export const HUMAN_RESOURCES_QUERY_APPLICATION_GET =
	HUMAN_RESOURCES_RECRUITMENT_QUERIES.getApplication.id;
export const HUMAN_RESOURCES_QUERY_APPLICATION_LIST =
	HUMAN_RESOURCES_RECRUITMENT_QUERIES.listApplications.id;
export const HUMAN_RESOURCES_QUERY_APPLICATION_STATUS_HISTORY_LIST =
	HUMAN_RESOURCES_RECRUITMENT_QUERIES.listApplicationStatusHistory.id;
export const HUMAN_RESOURCES_QUERY_INTERVIEW_GET =
	HUMAN_RESOURCES_RECRUITMENT_QUERIES.getInterview.id;
export const HUMAN_RESOURCES_QUERY_INTERVIEW_LIST =
	HUMAN_RESOURCES_RECRUITMENT_QUERIES.listInterviews.id;
export const HUMAN_RESOURCES_QUERY_INTERVIEW_EVALUATION_GET =
	HUMAN_RESOURCES_RECRUITMENT_QUERIES.getInterviewEvaluation.id;
export const HUMAN_RESOURCES_QUERY_OFFER_GET =
	HUMAN_RESOURCES_RECRUITMENT_QUERIES.getOffer.id;
export const HUMAN_RESOURCES_QUERY_OFFER_LIST =
	HUMAN_RESOURCES_RECRUITMENT_QUERIES.listOffers.id;

export const HUMAN_RESOURCES_RECRUITMENT_COMMAND_IDS =
	projectHumanResourcesOperationIds(HUMAN_RESOURCES_RECRUITMENT_COMMANDS);
export const HUMAN_RESOURCES_RECRUITMENT_QUERY_IDS =
	projectHumanResourcesOperationIds(HUMAN_RESOURCES_RECRUITMENT_QUERIES);
export const HUMAN_RESOURCES_RECRUITMENT_COMMAND_AUTHORIZATION =
	projectHumanResourcesAuthorization(HUMAN_RESOURCES_RECRUITMENT_COMMANDS);
export const HUMAN_RESOURCES_RECRUITMENT_QUERY_AUTHORIZATION =
	projectHumanResourcesAuthorization(HUMAN_RESOURCES_RECRUITMENT_QUERIES);
