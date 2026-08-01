import type { Result } from "@afenda/errors";

import type { MasterAuthorizationPort } from "../../authorization";
import type {
	OrganizationDimension,
	OrganizationDimensionKind,
} from "./organization-dimension";

export type CreateOrganizationDimensionStoreRecord = Omit<
	OrganizationDimension,
	"id" | "version" | "createdAt" | "updatedAt"
> & {
	normalizedKey: string;
	correlationId: string;
	supersedesExpectedVersion: number | null;
};

export interface UpdateOrganizationDimensionStoreRecord {
	correlationId: string;
	effectiveTo?: string | null | undefined;
	expectedVersion: number;
	id: string;
	name?: string | undefined;
	organizationId: string;
	parentId?: string | null | undefined;
	parentIdProvided: boolean;
	updatedBy: string;
}

export type OrganizationDimensionLifecycleStatus =
	| "active"
	| "inactive"
	| "archived";

/** Persistence boundary for effective-dated organization dimensions. */
export interface OrganizationDimensionStore {
	create: (
		record: CreateOrganizationDimensionStoreRecord,
	) => Promise<Result<OrganizationDimension>>;
	findEffective: (input: {
		organizationId: string;
		kind: OrganizationDimensionKind;
		normalizedKey: string;
		asOf: string;
	}) => Promise<Result<OrganizationDimension[]>>;
	findEffectiveById: (input: {
		organizationId: string;
		id: string;
		kind: OrganizationDimensionKind;
		asOf: string;
	}) => Promise<Result<OrganizationDimension[]>>;
	getByCode: (input: {
		organizationId: string;
		kind: OrganizationDimensionKind;
		normalizedKey: string;
	}) => Promise<Result<OrganizationDimension | null>>;
	getById: (input: {
		organizationId: string;
		id: string;
	}) => Promise<Result<OrganizationDimension | null>>;
	list: (input: {
		organizationId: string;
		kind?: OrganizationDimensionKind | undefined;
		status?: OrganizationDimensionLifecycleStatus | "all" | undefined;
		parentId?: string | null | undefined;
		page: number;
		pageSize: number;
	}) => Promise<Result<{ items: OrganizationDimension[]; total: number }>>;
	transition: (input: {
		organizationId: string;
		id: string;
		expectedVersion: number;
		status: OrganizationDimensionLifecycleStatus;
		updatedBy: string;
		correlationId: string;
	}) => Promise<Result<OrganizationDimension>>;
	update: (
		record: UpdateOrganizationDimensionStoreRecord,
	) => Promise<Result<OrganizationDimension>>;
}

export interface OrganizationDimensionOptions {
	authorization?: MasterAuthorizationPort | undefined;
	store?: OrganizationDimensionStore;
}
