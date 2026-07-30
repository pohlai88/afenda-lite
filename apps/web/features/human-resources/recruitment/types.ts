import type {
	Candidate,
	CandidateApplication,
	EmploymentOffer,
	Interview,
	JobRequisition,
} from "@afenda/human-resources";

export interface RecruitmentCapabilities {
	canHire: boolean;
	canManageCandidates: boolean;
	canManageOffers: boolean;
	canManageRequisitions: boolean;
	canReadInterviews: boolean;
	canRecordInterviews: boolean;
}

export interface RecruitmentWorkspaceData {
	applications: CandidateApplication[];
	candidates: Candidate[];
	errors: Partial<
		Record<"requisitions" | "candidates" | "interviews" | "offers", string>
	>;
	interviews: Interview[];
	offers: EmploymentOffer[];
	requisitions: JobRequisition[];
}
