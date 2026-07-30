import type {
	CompensationGrade,
	CompensationReviewCycle,
} from "@afenda/human-resources";

export interface CompensationCapabilities {
	canManage: boolean;
	canManageBenefits: boolean;
	canRead: boolean;
}

export interface CompensationWorkspaceData {
	errors: Partial<Record<"grades" | "reviews", string>>;
	grades: CompensationGrade[];
	reviewCycles: CompensationReviewCycle[];
}
