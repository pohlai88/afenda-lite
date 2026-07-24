import { randomUUID } from "node:crypto";

import { ok } from "@afenda/errors/result";

import type {
	HumanResourcesOrganizationDimensions,
	OrganizationDimensionDirectoryPort,
} from "../ports";

/** Deterministic test adapter for unit tests that do not exercise database FKs. */
export function createMemoryOrganizationDimensionDirectory(): OrganizationDimensionDirectoryPort {
	const ids = new Map<string, string>();
	return {
		async resolveRequiredAsOf(input) {
			const dimension = (
				kind: keyof HumanResourcesOrganizationDimensions,
			): HumanResourcesOrganizationDimensions[typeof kind] => {
				const identity = `${input.organizationId}:${kind}:${input.keys[kind]}`;
				let id = ids.get(identity);
				if (id === undefined) {
					id = randomUUID();
					ids.set(identity, id);
				}
				return {
					id,
					kind,
					key: input.keys[kind],
					name: `${kind}:${input.keys[kind]}`,
				};
			};
			return ok({
				legal_entity: dimension("legal_entity"),
				business_unit: dimension("business_unit"),
				location: dimension("location"),
				cost_centre: dimension("cost_centre"),
				project: dimension("project"),
			});
		},
	};
}
