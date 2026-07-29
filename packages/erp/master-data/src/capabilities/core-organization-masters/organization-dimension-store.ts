import type { Result } from "@afenda/errors/result";

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

export type UpdateOrganizationDimensionStoreRecord = {
	organizationId: string;
	id: string;
	expectedVersion: number;
	name?: string | undefined;
	parentId?: string | null | undefined;
	parentIdProvided: boolean;
	effectiveTo?: string | null | undefined;
	updatedBy: string;
	correlationId: string;
};

export type OrganizationDimensionLifecycleStatus =
	| "active"
	| "inactive"
	| "archived";

/** Persistence boundary for effective-dated organization dimensions. */
export type OrganizationDimensionStore = {
	create(
		record: CreateOrganizationDimensionStoreRecord,
	): Promise<Result<OrganizationDimension>>;
	update(
		record: UpdateOrganizationDimensionStoreRecord,
	): Promise<Result<OrganizationDimension>>;
	transition(input: {
		organizationId: string;
		id: string;
		expectedVersion: number;
		status: OrganizationDimensionLifecycleStatus;
		updatedBy: string;
		correlationId: string;
	}): Promise<Result<OrganizationDimension>>;
	getById(input: {
		organizationId: string;
		id: string;
	}): Promise<Result<OrganizationDimension | null>>;
	getByCode(input: {
		organizationId: string;
		kind: OrganizationDimensionKind;
		normalizedKey: string;
	}): Promise<Result<OrganizationDimension | null>>;
	list(input: {
		organizationId: string;
		kind?: OrganizationDimensionKind | undefined;
		status?: OrganizationDimensionLifecycleStatus | "all" | undefined;
		parentId?: string | null | undefined;
		page: number;
		pageSize: number;
	}): Promise<Result<{ items: OrganizationDimension[]; total: number }>>;
	findEffective(input: {
		organizationId: string;
		kind: OrganizationDimensionKind;
		normalizedKey: string;
		asOf: string;
	}): Promise<Result<OrganizationDimension[]>>;
	findEffectiveById(input: {
		organizationId: string;
		id: string;
		kind: OrganizationDimensionKind;
		asOf: string;
	}): Promise<Result<OrganizationDimension[]>>;
};

export type OrganizationDimensionOptions = {
	store?: OrganizationDimensionStore;
	authorization?: MasterAuthorizationPort;
};
