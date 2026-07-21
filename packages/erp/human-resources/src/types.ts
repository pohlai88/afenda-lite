import type {
	HumanResourcesAssignmentId,
	HumanResourcesDepartmentId,
	HumanResourcesEmployeeId,
	HumanResourcesEmploymentContractId,
	HumanResourcesEmploymentId,
	HumanResourcesJobId,
	HumanResourcesPositionId,
	HumanResourcesReportingLineId,
} from "./brands";
import type {
	DepartmentStatus,
	EmploymentStatus,
	JobStatus,
	PositionStatus,
	ReportingRelationshipKind,
} from "./shared/employment-status";

export type Employee = {
	id: HumanResourcesEmployeeId;
	organizationId: string;
	employeeNumber: string;
	legalName: string;
	version: number;
	createdBy: string;
	updatedBy: string;
	createdAt: Date;
	updatedAt: Date;
};

export type Employment = {
	id: HumanResourcesEmploymentId;
	organizationId: string;
	employeeId: HumanResourcesEmployeeId;
	status: EmploymentStatus;
	startsOn: string;
	endsOn: string | null;
	version: number;
	createdBy: string;
	updatedBy: string;
	createdAt: Date;
	updatedAt: Date;
};

export type EmploymentContract = {
	id: HumanResourcesEmploymentContractId;
	organizationId: string;
	employmentId: HumanResourcesEmploymentId;
	employeeId: HumanResourcesEmployeeId;
	referenceCode: string;
	startsOn: string;
	endsOn: string | null;
	version: number;
	createdBy: string;
	updatedBy: string;
	createdAt: Date;
	updatedAt: Date;
};

export type Department = {
	id: HumanResourcesDepartmentId;
	organizationId: string;
	code: string;
	name: string;
	parentDepartmentId: HumanResourcesDepartmentId | null;
	status: DepartmentStatus;
	version: number;
	createdBy: string;
	updatedBy: string;
	createdAt: Date;
	updatedAt: Date;
};

export type Job = {
	id: HumanResourcesJobId;
	organizationId: string;
	code: string;
	title: string;
	status: JobStatus;
	version: number;
	createdBy: string;
	updatedBy: string;
	createdAt: Date;
	updatedAt: Date;
};

export type Position = {
	id: HumanResourcesPositionId;
	organizationId: string;
	code: string;
	title: string;
	departmentId: HumanResourcesDepartmentId | null;
	jobId: HumanResourcesJobId | null;
	status: PositionStatus;
	version: number;
	createdBy: string;
	updatedBy: string;
	createdAt: Date;
	updatedAt: Date;
};

export type WorkAssignment = {
	id: HumanResourcesAssignmentId;
	organizationId: string;
	employmentId: HumanResourcesEmploymentId;
	employeeId: HumanResourcesEmployeeId;
	positionId: HumanResourcesPositionId;
	startsOn: string;
	endsOn: string | null;
	version: number;
	createdBy: string;
	updatedBy: string;
	createdAt: Date;
	updatedAt: Date;
};

export type ReportingLine = {
	id: HumanResourcesReportingLineId;
	organizationId: string;
	employeeId: HumanResourcesEmployeeId;
	managerEmployeeId: HumanResourcesEmployeeId;
	relationshipKind: ReportingRelationshipKind;
	startsOn: string;
	endsOn: string | null;
	version: number;
	createdBy: string;
	updatedBy: string;
	createdAt: Date;
	updatedAt: Date;
};

export type OrganizationTreeNode = {
	id: HumanResourcesDepartmentId;
	parentDepartmentId: HumanResourcesDepartmentId | null;
	code: string;
	name: string;
	status: DepartmentStatus;
	depth: number;
};

export type OrganizationTreePage = {
	nodes: OrganizationTreeNode[];
	truncated: boolean;
};

export type EmployeeListPage = {
	employees: Employee[];
	totalCount: number;
	page: number;
	pageSize: number;
};
