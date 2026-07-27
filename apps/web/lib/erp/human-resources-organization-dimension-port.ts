import type { Result } from "@afenda/errors/result";
import { fail } from "@afenda/errors/result";
import type {
	HumanResourcesOrganizationDimensionKind,
	HumanResourcesOrganizationDimensionSnapshot,
	HumanResourcesOrganizationDimensions,
	OrganizationDimensionDirectoryPort,
} from "@afenda/human-resources";
import {
	type OrganizationDimensionKind,
	type OrganizationDimensionReference,
	resolveOrganizationDimensionsAsOf,
} from "@afenda/master-data";
import { createMasterDataAuthorizationPort } from "@/lib/erp/master-data-authorization-port";

type MasterDataOrganizationDimensionMap = Partial<
	Record<OrganizationDimensionKind, OrganizationDimensionReference>
>;

function requireHumanResourcesDimension(
	kind: HumanResourcesOrganizationDimensionKind,
	dimensions: MasterDataOrganizationDimensionMap,
): Result<HumanResourcesOrganizationDimensionSnapshot> {
	const dimension = dimensions[kind];
	if (dimension === undefined) {
		return fail(
			"INTERNAL_ERROR",
			"Master Data did not return required HR organization dimension.",
			{ kind },
		);
	}
	if (dimension.kind !== kind) {
		return fail(
			"INTERNAL_ERROR",
			"Master Data returned a mismatched HR organization dimension.",
			{ actualKind: dimension.kind, expectedKind: kind },
		);
	}
	return {
		ok: true,
		data: {
			id: dimension.id,
			kind,
			key: dimension.key,
			name: dimension.name,
		},
	};
}

function toHumanResourcesOrganizationDimensions(
	dimensions: MasterDataOrganizationDimensionMap,
): Result<HumanResourcesOrganizationDimensions> {
	const legalEntity = requireHumanResourcesDimension(
		"legal_entity",
		dimensions,
	);
	if (!legalEntity.ok) return legalEntity;

	const businessUnit = requireHumanResourcesDimension(
		"business_unit",
		dimensions,
	);
	if (!businessUnit.ok) return businessUnit;

	const location = requireHumanResourcesDimension("location", dimensions);
	if (!location.ok) return location;

	const costCentre = requireHumanResourcesDimension("cost_centre", dimensions);
	if (!costCentre.ok) return costCentre;

	const project = requireHumanResourcesDimension("project", dimensions);
	if (!project.ok) return project;

	return {
		ok: true,
		data: {
			legal_entity: legalEntity.data,
			business_unit: businessUnit.data,
			location: location.data,
			cost_centre: costCentre.data,
			project: project.data,
		},
	};
}

/**
 * Application composition boundary: HR supplies tenant/date/key intent while
 * master data remains the sole owner and reader of governed dimensions.
 */
export function createHumanResourcesOrganizationDimensionPort(): OrganizationDimensionDirectoryPort {
	return {
		async resolveRequiredAsOf(input) {
			const result = await resolveOrganizationDimensionsAsOf(
				{
					organizationId: input.organizationId,
					actorUserId: input.actorUserId,
					asOf: input.asOf,
					keys: input.keys,
				},
				{ authorization: createMasterDataAuthorizationPort() },
			);
			if (!result.ok) return result;
			return toHumanResourcesOrganizationDimensions(result.data);
		},
	};
}
