import { and, db, eq, mdOrganizationDimension } from "@afenda/db";
import { fail, ok } from "@afenda/errors/result";

import type {
	HumanResourcesOrganizationDimensions,
	OrganizationDimensionDirectoryPort,
} from "../../src/ports";

/** Seeds real governed masters for database-enforced HR parity tests. */
export function createDrizzleTestOrganizationDimensionDirectory(): OrganizationDimensionDirectoryPort {
	return {
		async resolveRequiredAsOf(input) {
			const resolved = {} as HumanResourcesOrganizationDimensions;
			for (const kind of [
				"legal_entity",
				"business_unit",
				"location",
				"cost_centre",
				"project",
			] as const) {
				const key = input.keys[kind].trim().toUpperCase();
				await db
					.insert(mdOrganizationDimension)
					.values({
						organizationId: input.organizationId,
						kind,
						key,
						normalizedKey: key,
						name: `${kind}:${key}`,
						effectiveFrom: "1900-01-01",
						effectiveTo: null,
						supersedesId: null,
						createdBy: input.actorUserId,
					})
					.onConflictDoNothing();
				const rows = await db
					.select()
					.from(mdOrganizationDimension)
					.where(
						and(
							eq(mdOrganizationDimension.organizationId, input.organizationId),
							eq(mdOrganizationDimension.kind, kind),
							eq(mdOrganizationDimension.normalizedKey, key),
							eq(mdOrganizationDimension.effectiveFrom, "1900-01-01"),
						),
					);
				const row = rows[0];
				if (row === undefined) {
					return fail(
						"INTERNAL_ERROR",
						"Could not seed governed organization dimension",
					);
				}
				resolved[kind] = {
					id: row.id,
					kind,
					key: row.key,
					name: row.name,
				};
			}
			return ok(resolved);
		},
	};
}
