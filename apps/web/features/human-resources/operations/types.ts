import type {
	DocumentRequirement,
	EmployeeDocumentListItem,
	HeadcountPlan,
	ProjectedEmployeeCase,
} from "@afenda/human-resources";

export type HrOperationsCapabilities = {
	canOnboard: boolean;
	canOffboard: boolean;
	canManageEmployment: boolean;
	canAdministerCompliance: boolean;
	canOpenCases: boolean;
	canReadCases: boolean;
	canReadWorkforcePlans: boolean;
	canPrepareWorkforcePlans: boolean;
	canViewIntegrationHealth: boolean;
};

export type HrOperationsData = {
	missingRequirements: DocumentRequirement[];
	expiringDocuments: EmployeeDocumentListItem[];
	cases: ProjectedEmployeeCase[];
	plans: HeadcountPlan[];
	errors: Partial<Record<"compliance" | "cases" | "plans", string>>;
};
