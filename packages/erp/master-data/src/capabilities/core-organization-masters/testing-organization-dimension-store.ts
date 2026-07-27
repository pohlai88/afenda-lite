import { randomUUID } from "node:crypto";

import { fail, ok } from "@afenda/errors/result";

import type { OrganizationDimension } from "./organization-dimension";
import type { OrganizationDimensionStore } from "./organization-dimension-store";

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
			if (record.parentId !== null) {
				const parent = records.get(record.parentId);
				if (
					parent === undefined ||
					parent.organizationId !== record.organizationId
				) {
					return fail(
						"BAD_REQUEST",
						"Organization dimension parent does not exist in organization",
						{ reason: "MASTER_CROSS_ORG_REFERENCE" },
					);
				}
				if (parent.status !== "active") {
					return fail(
						"CONFLICT",
						"Inactive organization dimension parents cannot receive new children",
						{ reason: "MASTER_INVALID_STATE" },
					);
				}
			}
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
				parentId: record.parentId,
				status: record.status,
				effectiveFrom: record.effectiveFrom,
				effectiveTo: record.effectiveTo,
				supersedesId: record.supersedesId,
				version: 1,
				createdBy: record.createdBy,
				createdAt: new Date(),
				updatedBy: record.updatedBy,
				updatedAt: new Date(),
			};
			records.set(created.id, created);
			return ok(clone(created));
		},
		async update(record) {
			const current = records.get(record.id);
			if (
				current === undefined ||
				current.organizationId !== record.organizationId
			) {
				return fail("NOT_FOUND", "Organization dimension not found", {
					reason: "MASTER_NOT_FOUND",
				});
			}
			if (current.version !== record.expectedVersion) {
				return fail("CONFLICT", "Organization dimension version conflict", {
					reason: "MASTER_VERSION_CONFLICT",
					expectedVersion: record.expectedVersion,
				});
			}
			if (current.status === "archived") {
				return fail(
					"CONFLICT",
					"Archived organization dimension cannot change",
					{
						reason: "MASTER_INVALID_STATE",
					},
				);
			}
			if (record.parentIdProvided) {
				const parentCheck = canReparent(
					records,
					current,
					record.parentId ?? null,
				);
				if (!parentCheck.ok) return parentCheck;
				current.parentId = record.parentId ?? null;
			}
			if (record.name !== undefined) current.name = record.name;
			if (record.effectiveTo !== undefined)
				current.effectiveTo = record.effectiveTo;
			current.version += 1;
			current.updatedBy = record.updatedBy;
			current.updatedAt = new Date();
			return ok(clone(current));
		},
		async transition(input) {
			const current = records.get(input.id);
			if (
				current === undefined ||
				current.organizationId !== input.organizationId
			) {
				return fail("NOT_FOUND", "Organization dimension not found", {
					reason: "MASTER_NOT_FOUND",
				});
			}
			if (current.version !== input.expectedVersion) {
				return fail("CONFLICT", "Organization dimension version conflict", {
					reason: "MASTER_VERSION_CONFLICT",
					expectedVersion: input.expectedVersion,
				});
			}
			current.status = input.status;
			current.version += 1;
			current.updatedBy = input.updatedBy;
			current.updatedAt = new Date();
			return ok(clone(current));
		},
		async getById(input) {
			const current = records.get(input.id);
			if (
				current === undefined ||
				current.organizationId !== input.organizationId
			) {
				return ok(null);
			}
			return ok(clone(current));
		},
		async getByCode(input) {
			const matches = [...records.values()].filter(
				(record) =>
					record.organizationId === input.organizationId &&
					record.kind === input.kind &&
					record.normalizedKey === input.normalizedKey,
			);
			if (matches.length > 1) {
				return fail("CONFLICT", "Organization dimension code is ambiguous", {
					reason: "MASTER_DIMENSION_AMBIGUOUS",
					kind: input.kind,
				});
			}
			return ok(matches[0] === undefined ? null : clone(matches[0]));
		},
		async list(input) {
			const rows = [...records.values()]
				.filter(
					(record) =>
						record.organizationId === input.organizationId &&
						(input.kind === undefined || record.kind === input.kind) &&
						(input.status === undefined ||
							input.status === "all" ||
							record.status === input.status) &&
						(input.parentId === undefined ||
							record.parentId === input.parentId),
				)
				.sort((left, right) => {
					const byKind = left.kind.localeCompare(right.kind);
					if (byKind !== 0) return byKind;
					const byKey = left.normalizedKey.localeCompare(right.normalizedKey);
					if (byKey !== 0) return byKey;
					return left.effectiveFrom.localeCompare(right.effectiveFrom);
				});
			const offset = (input.page - 1) * input.pageSize;
			return ok({
				items: rows.slice(offset, offset + input.pageSize).map(clone),
				total: rows.length,
			});
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
		async findEffectiveById(input) {
			return ok(
				[...records.values()]
					.filter(
						(record) =>
							record.organizationId === input.organizationId &&
							record.id === input.id &&
							record.kind === input.kind &&
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

function canReparent(
	records: ReadonlyMap<
		string,
		OrganizationDimension & { normalizedKey: string }
	>,
	current: OrganizationDimension & { normalizedKey: string },
	parentId: string | null,
) {
	if (parentId === null) return ok(undefined);
	if (parentId === current.id) {
		return fail("CONFLICT", "Organization dimension cannot parent itself", {
			reason: "MASTER_INVALID_STATE",
		});
	}
	const parent = records.get(parentId);
	if (
		parent === undefined ||
		parent.organizationId !== current.organizationId
	) {
		return fail(
			"BAD_REQUEST",
			"Organization dimension parent does not exist in organization",
			{ reason: "MASTER_CROSS_ORG_REFERENCE" },
		);
	}
	if (parent.status !== "active") {
		return fail(
			"CONFLICT",
			"Inactive organization dimension parents cannot receive children",
			{ reason: "MASTER_INVALID_STATE" },
		);
	}
	let next: string | null = parent.parentId;
	while (next !== null) {
		if (next === current.id) {
			return fail("CONFLICT", "Organization dimension parent cycle detected", {
				reason: "MASTER_INVALID_STATE",
			});
		}
		next = records.get(next)?.parentId ?? null;
	}
	return ok(undefined);
}
