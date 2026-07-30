import type {
	DocumentRequirement,
	EmployeeDocumentListItem,
	HeadcountPlan,
	ProjectedEmployeeCase,
} from "@afenda/human-resources";

export interface HrOperationsCapabilities {
	canAdministerCompliance: boolean;
	canManageEmployment: boolean;
	canOffboard: boolean;
	canOnboard: boolean;
	canOpenCases: boolean;
	canPrepareWorkforcePlans: boolean;
	canReadCases: boolean;
	canReadWorkforcePlans: boolean;
	canViewIntegrationHealth: boolean;
}

export interface HrOperationsData {
	cases: ProjectedEmployeeCase[];
	errors: Partial<Record<"compliance" | "cases" | "plans", string>>;
	expiringDocuments: EmployeeDocumentListItem[];
	missingRequirements: DocumentRequirement[];
	plans: HeadcountPlan[];
}
