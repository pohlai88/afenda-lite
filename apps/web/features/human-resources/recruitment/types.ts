import type {
	Candidate,
	CandidateApplication,
	EmploymentOffer,
	Interview,
	JobRequisition,
} from "@afenda/human-resources";

export type RecruitmentCapabilities = {
	canManageRequisitions: boolean;
	canManageCandidates: boolean;
	canReadInterviews: boolean;
	canRecordInterviews: boolean;
	canManageOffers: boolean;
	canHire: boolean;
};

export type RecruitmentWorkspaceData = {
	requisitions: JobRequisition[];
	candidates: Candidate[];
	applications: CandidateApplication[];
	interviews: Interview[];
	offers: EmploymentOffer[];
	errors: Partial<
		Record<"requisitions" | "candidates" | "interviews" | "offers", string>
	>;
};
