import type { Result } from "@afenda/errors/result";

import type { MasterAuthorizationPort } from "../../authorization";
import type {
	OrganizationDimension,
	OrganizationDimensionKind,
} from "./organization-dimension";

export type CreateOrganizationDimensionStoreRecord = Omit<
	OrganizationDimension,
	"id" | "version" | "createdAt"
> & {
	normalizedKey: string;
	correlationId: string;
	supersedesExpectedVersion: number | null;
};

/** Persistence boundary for effective-dated organization dimensions. */
export type OrganizationDimensionStore = {
	create(
		record: CreateOrganizationDimensionStoreRecord,
	): Promise<Result<OrganizationDimension>>;
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
