import { randomUUID } from "node:crypto";

import { errorResult } from "@afenda/errors";
import { resolveAsync } from "../../resolve-async";
import type { OrganizationDimension } from "./organization-dimension";
import type { OrganizationDimensionStore } from "./organization-dimension-store";

type CreateRecord = Parameters<OrganizationDimensionStore["create"]>[0];
type UpdateRecord = Parameters<OrganizationDimensionStore["update"]>[0];
type StoredOrganizationDimension = OrganizationDimension & {
	normalizedKey: string;
};
type OrganizationDimensionRecords = Map<string, StoredOrganizationDimension>;

export type MemoryOrganizationDimensionStore = OrganizationDimensionStore & {
	/** Seeds impossible legacy/corrupt states so ambiguity handling can be tested. */
	seed: (record: OrganizationDimension) => void;
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
	const records: OrganizationDimensionRecords = new Map();

	return {
		create(record: CreateRecord) {
			return resolveAsync(() => {
				if (record.parentId !== null) {
					const parent = records.get(record.parentId);
					if (
						parent === undefined ||
						parent.organizationId !== record.organizationId
					) {
						return errorResult.fail("BAD_REQUEST", {
							publicMessage:
								"Organization dimension parent does not exist in organization",
						});
					}
					if (parent.status !== "active") {
						return errorResult.fail("CONFLICT", {
							publicMessage:
								"Inactive organization dimension parents cannot receive new children",
						});
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
					return errorResult.fail("CONFLICT", {
						publicMessage:
							"Organization dimension overlaps an effective version",
					});
				}
				const created: StoredOrganizationDimension = {
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
				return errorResult.ok(clone(created));
			});
		},
		update(record) {
			return resolveAsync(() => {
				const current = records.get(record.id);
				if (
					current === undefined ||
					current.organizationId !== record.organizationId
				) {
					return errorResult.fail("NOT_FOUND", {
						publicMessage: "Organization dimension not found",
					});
				}
				const stateValidation = validateUpdateState(current, record);
				if (!stateValidation.ok) {
					return stateValidation;
				}
				if (record.parentIdProvided) {
					const parentCheck = canReparent(
						records,
						current,
						record.parentId ?? null,
					);
					if (!parentCheck.ok) {
						return parentCheck;
					}
					current.parentId = record.parentId ?? null;
				}
				applyOrganizationDimensionUpdate(current, record);
				return errorResult.ok(clone(current));
			});
		},
		transition(input) {
			return resolveAsync(() => {
				const current = records.get(input.id);
				if (
					current === undefined ||
					current.organizationId !== input.organizationId
				) {
					return errorResult.fail("NOT_FOUND", {
						publicMessage: "Organization dimension not found",
					});
				}
				if (current.version !== input.expectedVersion) {
					return errorResult.fail("CONFLICT", {
						publicMessage: "Organization dimension version conflict",
					});
				}
				current.status = input.status;
				current.version += 1;
				current.updatedBy = input.updatedBy;
				current.updatedAt = new Date();
				return errorResult.ok(clone(current));
			});
		},
		getById(input) {
			return resolveAsync(() => {
				const current = records.get(input.id);
				if (
					current === undefined ||
					current.organizationId !== input.organizationId
				) {
					return errorResult.ok(null);
				}
				return errorResult.ok(clone(current));
			});
		},
		getByCode(input) {
			return resolveAsync(() => {
				const matches = [...records.values()].filter(
					(record) =>
						record.organizationId === input.organizationId &&
						record.kind === input.kind &&
						record.normalizedKey === input.normalizedKey,
				);
				if (matches.length > 1) {
					return errorResult.fail("CONFLICT", {
						publicMessage: "Organization dimension code is ambiguous",
					});
				}
				return errorResult.ok(
					matches[0] === undefined ? null : clone(matches[0]),
				);
			});
		},
		list(input) {
			return resolveAsync(() => {
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
						if (byKind !== 0) {
							return byKind;
						}
						const byKey = left.normalizedKey.localeCompare(right.normalizedKey);
						if (byKey !== 0) {
							return byKey;
						}
						return left.effectiveFrom.localeCompare(right.effectiveFrom);
					});
				const offset = (input.page - 1) * input.pageSize;
				return errorResult.ok({
					items: rows.slice(offset, offset + input.pageSize).map(clone),
					total: rows.length,
				});
			});
		},
		findEffective(input) {
			return resolveAsync(() =>
				errorResult.ok(
					[...records.values()]
						.filter(
							(record) =>
								record.organizationId === input.organizationId &&
								record.kind === input.kind &&
								record.normalizedKey === input.normalizedKey &&
								record.effectiveFrom <= input.asOf &&
								(record.effectiveTo === null ||
									record.effectiveTo >= input.asOf),
						)
						.map(clone),
				),
			);
		},
		findEffectiveById(input) {
			return resolveAsync(() =>
				errorResult.ok(
					[...records.values()]
						.filter(
							(record) =>
								record.organizationId === input.organizationId &&
								record.id === input.id &&
								record.kind === input.kind &&
								record.effectiveFrom <= input.asOf &&
								(record.effectiveTo === null ||
									record.effectiveTo >= input.asOf),
						)
						.map(clone),
				),
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

function validateUpdateState(
	current: StoredOrganizationDimension,
	record: UpdateRecord,
) {
	if (current.version !== record.expectedVersion) {
		return errorResult.fail("CONFLICT", {
			publicMessage: "Organization dimension version conflict",
		});
	}
	if (current.status === "archived") {
		return errorResult.fail("CONFLICT", {
			publicMessage: "Archived organization dimension cannot change",
		});
	}
	return errorResult.ok(true);
}

function applyOrganizationDimensionUpdate(
	current: StoredOrganizationDimension,
	record: UpdateRecord,
): void {
	if (record.name !== undefined) {
		current.name = record.name;
	}
	if (record.effectiveTo !== undefined) {
		current.effectiveTo = record.effectiveTo;
	}
	current.version += 1;
	current.updatedBy = record.updatedBy;
	current.updatedAt = new Date();
}

function canReparent(
	records: ReadonlyMap<string, StoredOrganizationDimension>,
	current: StoredOrganizationDimension,
	parentId: string | null,
) {
	if (parentId === null) {
		return errorResult.ok(undefined);
	}
	if (parentId === current.id) {
		return errorResult.fail("CONFLICT", {
			publicMessage: "Organization dimension cannot parent itself",
		});
	}
	const parent = records.get(parentId);
	if (
		parent === undefined ||
		parent.organizationId !== current.organizationId
	) {
		return errorResult.fail("BAD_REQUEST", {
			publicMessage:
				"Organization dimension parent does not exist in organization",
		});
	}
	if (parent.status !== "active") {
		return errorResult.fail("CONFLICT", {
			publicMessage:
				"Inactive organization dimension parents cannot receive children",
		});
	}
	let next: string | null = parent.parentId;
	while (next !== null) {
		if (next === current.id) {
			return errorResult.fail("CONFLICT", {
				publicMessage: "Organization dimension parent cycle detected",
			});
		}
		next = records.get(next)?.parentId ?? null;
	}
	return errorResult.ok(undefined);
}
