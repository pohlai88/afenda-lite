import { randomUUID } from "node:crypto";

import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	resolve: vi.fn(),
	authorization: { can: vi.fn() },
}));

vi.mock("@afenda/master-data", () => ({
	resolveOrganizationDimensionsAsOf: mocks.resolve,
}));

vi.mock("@/lib/erp/master-data-authorization-port", () => ({
	createMasterDataAuthorizationPort: () => mocks.authorization,
}));

import { createHumanResourcesOrganizationDimensionPort } from "@/lib/erp/human-resources-organization-dimension-port";

describe("HR organization dimension composition port", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("forwards tenant, actor, effective date, and all keys to master data", async () => {
		const organizationId = randomUUID();
		const actorUserId = randomUUID();
		const keys = {
			legal_entity: "LE-MY",
			business_unit: "BU-OPS",
			location: "LOC-KUL",
			cost_centre: "CC-100",
			project: "PRJ-ERP",
		} as const;
		const dimensions = Object.fromEntries(
			Object.entries(keys).map(([kind, key]) => [
				kind,
				{ id: randomUUID(), kind, key, name: `${kind} name` },
			]),
		);
		mocks.resolve.mockResolvedValue({ ok: true, data: dimensions });

		const result =
			await createHumanResourcesOrganizationDimensionPort().resolveRequiredAsOf(
				{
					organizationId,
					actorUserId,
					asOf: "2025-06-01",
					keys,
				},
			);

		expect(result).toEqual({ ok: true, data: dimensions });
		expect(mocks.resolve).toHaveBeenCalledWith(
			{ organizationId, actorUserId, asOf: "2025-06-01", keys },
			{ authorization: mocks.authorization },
		);
	});

	it("preserves typed master-data failures", async () => {
		const failure = {
			ok: false,
			code: "NOT_FOUND",
			message: "Organization dimension is not effective",
		} as const;
		mocks.resolve.mockResolvedValue(failure);

		const result =
			await createHumanResourcesOrganizationDimensionPort().resolveRequiredAsOf(
				{
					organizationId: randomUUID(),
					actorUserId: randomUUID(),
					asOf: "2025-06-01",
					keys: {
						legal_entity: "LE",
						business_unit: "BU",
						location: "LOC",
						cost_centre: "CC",
						project: "PRJ",
					},
				},
			);

		expect(result).toEqual(failure);
	});

	it("fails closed when master data omits a required HR dimension", async () => {
		mocks.resolve.mockResolvedValue({
			ok: true,
			data: {
				legal_entity: {
					id: randomUUID(),
					kind: "legal_entity",
					key: "LE",
					name: "Legal Entity",
				},
				business_unit: {
					id: randomUUID(),
					kind: "business_unit",
					key: "BU",
					name: "Business Unit",
				},
				location: {
					id: randomUUID(),
					kind: "location",
					key: "LOC",
					name: "Location",
				},
				cost_centre: {
					id: randomUUID(),
					kind: "cost_centre",
					key: "CC",
					name: "Cost Centre",
				},
			},
		});

		const result =
			await createHumanResourcesOrganizationDimensionPort().resolveRequiredAsOf(
				{
					organizationId: randomUUID(),
					actorUserId: randomUUID(),
					asOf: "2025-06-01",
					keys: {
						legal_entity: "LE",
						business_unit: "BU",
						location: "LOC",
						cost_centre: "CC",
						project: "PRJ",
					},
				},
			);

		expect(result).toMatchObject({
			ok: false,
			code: "INTERNAL_ERROR",
			message: "Master Data did not return required HR organization dimension.",
			details: { kind: "project" },
		});
	});
});
