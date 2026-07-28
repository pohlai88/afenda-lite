import type {
	CompensationGrade,
	CompensationReviewCycle,
} from "@afenda/human-resources";

export type CompensationCapabilities = {
	canRead: boolean;
	canManage: boolean;
	canManageBenefits: boolean;
};

export type CompensationWorkspaceData = {
	grades: CompensationGrade[];
	reviewCycles: CompensationReviewCycle[];
	errors: Partial<Record<"grades" | "reviews", string>>;
};
