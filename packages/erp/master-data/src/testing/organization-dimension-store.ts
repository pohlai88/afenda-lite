import { randomUUID } from "node:crypto";

import { fail, ok } from "@afenda/errors/result";

import type {
	OrganizationDimension,
	OrganizationDimensionStore,
} from "../organization-dimension";

type CreateRecord = Parameters<OrganizationDimensionStore["create"]>[0];

export type MemoryOrganizationDimensionStore = OrganizationDimensionStore & {
	/** Seeds impossible legacy/corrupt states so ambiguity handling can be tested. */
	seed(record: OrganizationDimension): void;
};

function clone(record: OrganizationDimension): OrganizationDimension {
	return structuredClone(record);
}

function overlaps(
	left: Pick<OrganizationDimension, "effectiveFrom" | "effectiveTo">,
	right: Pick<OrganizationDimension, "effectiveFrom" | "effectiveTo">,
): boolean {
	return (
		left.effectiveFrom <= (right.effectiveTo ?? "9999-12-31") &&
		(left.effectiveTo ?? "9999-12-31") >= right.effectiveFrom
	);
}

export function createMemoryOrganizationDimensionStore(): MemoryOrganizationDimensionStore {
	const records = new Map<
		string,
		OrganizationDimension & { normalizedKey: string }
	>();

	return {
		async create(record: CreateRecord) {
			const conflict = [...records.values()].some(
				(existing) =>
					existing.organizationId === record.organizationId &&
					existing.kind === record.kind &&
					existing.normalizedKey === record.normalizedKey &&
					overlaps(existing, record),
			);
			if (conflict) {
				return fail(
					"CONFLICT",
					"Organization dimension overlaps an effective version",
					{ reason: "MASTER_EFFECTIVE_RANGE_OVERLAP" },
				);
			}
			const created: OrganizationDimension & { normalizedKey: string } = {
				id: randomUUID(),
				organizationId: record.organizationId,
				kind: record.kind,
				key: record.key,
				normalizedKey: record.normalizedKey,
				name: record.name,
				effectiveFrom: record.effectiveFrom,
				effectiveTo: record.effectiveTo,
				supersedesId: record.supersedesId,
				version: 1,
				createdBy: record.createdBy,
				createdAt: new Date(),
			};
			records.set(created.id, created);
			return ok(clone(created));
		},
		async findEffective(input) {
			return ok(
				[...records.values()]
					.filter(
						(record) =>
							record.organizationId === input.organizationId &&
							record.kind === input.kind &&
							record.normalizedKey === input.normalizedKey &&
							record.effectiveFrom <= input.asOf &&
							(record.effectiveTo === null || record.effectiveTo >= input.asOf),
					)
					.map(clone),
			);
		},
		seed(record) {
			records.set(record.id, {
				...clone(record),
				normalizedKey: record.key.normalize("NFC").trim().toUpperCase(),
			});
		},
	};
}
