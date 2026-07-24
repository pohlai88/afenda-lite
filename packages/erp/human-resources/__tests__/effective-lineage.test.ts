import { describe, expect, it } from "vitest";

import {
	resolveEffectiveLineageRecord,
	selectEffectiveLineageRecord,
} from "../src/shared/effective-lineage";

type Record = {
	id: string;
	predecessorId: string | null;
	effectiveFrom: string;
	effectiveTo: string | null;
	status: "active" | "superseded";
};

function select(records: readonly Record[], asOf: string): Record | null {
	return selectEffectiveLineageRecord({
		assignedId: "root",
		records,
		asOf,
		getPredecessorId: (record) => record.predecessorId,
		isEligible: (record) =>
			record.status === "active" || record.status === "superseded",
	});
}

describe("selectEffectiveLineageRecord", () => {
	it("selects the one effective record from a linear successor chain", () => {
		const records: Record[] = [
			{
				id: "root",
				predecessorId: null,
				effectiveFrom: "2025-01-01",
				effectiveTo: "2025-06-30",
				status: "superseded",
			},
			{
				id: "successor",
				predecessorId: "root",
				effectiveFrom: "2025-07-01",
				effectiveTo: null,
				status: "active",
			},
			{
				id: "unrelated",
				predecessorId: null,
				effectiveFrom: "2025-08-01",
				effectiveTo: null,
				status: "active",
			},
		];

		expect(select(records, "2025-08-01")?.id).toBe("successor");
	});

	it("fails closed for a cyclic lineage", () => {
		expect(
			select(
				[
					{
						id: "root",
						predecessorId: "successor",
						effectiveFrom: "2025-01-01",
						effectiveTo: "2025-06-30",
						status: "superseded",
					},
					{
						id: "successor",
						predecessorId: "root",
						effectiveFrom: "2025-07-01",
						effectiveTo: null,
						status: "active",
					},
				],
				"2025-08-01",
			),
		).toBeNull();
	});

	it("fails closed for a missing predecessor", () => {
		expect(
			select(
				[
					{
						id: "root",
						predecessorId: "missing",
						effectiveFrom: "2025-01-01",
						effectiveTo: null,
						status: "active",
					},
				],
				"2025-08-01",
			),
		).toBeNull();
	});

	it("fails closed for a branching successor graph", () => {
		expect(
			select(
				[
					{
						id: "root",
						predecessorId: null,
						effectiveFrom: "2025-01-01",
						effectiveTo: "2025-06-30",
						status: "superseded",
					},
					{
						id: "branch-a",
						predecessorId: "root",
						effectiveFrom: "2025-07-01",
						effectiveTo: null,
						status: "active",
					},
					{
						id: "branch-b",
						predecessorId: "root",
						effectiveFrom: "2025-08-01",
						effectiveTo: null,
						status: "active",
					},
				],
				"2025-09-01",
			),
		).toBeNull();
	});

	it("fails closed for an effective-date gap", () => {
		expect(
			select(
				[
					{
						id: "root",
						predecessorId: null,
						effectiveFrom: "2025-01-01",
						effectiveTo: "2025-06-30",
						status: "superseded",
					},
					{
						id: "successor",
						predecessorId: "root",
						effectiveFrom: "2025-08-01",
						effectiveTo: null,
						status: "active",
					},
				],
				"2025-07-15",
			),
		).toBeNull();
	});

	it("fails closed when effective records overlap", () => {
		expect(
			select(
				[
					{
						id: "root",
						predecessorId: null,
						effectiveFrom: "2025-01-01",
						effectiveTo: "2025-08-31",
						status: "superseded",
					},
					{
						id: "successor",
						predecessorId: "root",
						effectiveFrom: "2025-07-01",
						effectiveTo: null,
						status: "active",
					},
				],
				"2025-08-01",
			),
		).toBeNull();
	});

	it("reports a historical gap even when asOf is after the successor", () => {
		const resolved = resolveEffectiveLineageRecord({
			assignedId: "root",
			records: [
				{
					id: "root",
					predecessorId: null,
					effectiveFrom: "2025-01-01",
					effectiveTo: "2025-06-30",
					status: "superseded",
				},
				{
					id: "successor",
					predecessorId: "root",
					effectiveFrom: "2025-08-01",
					effectiveTo: null,
					status: "active",
				},
			],
			asOf: "2025-09-01",
			getPredecessorId: (record) => record.predecessorId,
			isEligible: (record) =>
				record.status === "active" || record.status === "superseded",
		});

		expect(resolved).toEqual({ ok: false, reason: "GAP" });
	});

	it("reports a historical overlap even when asOf is after the overlap", () => {
		const resolved = resolveEffectiveLineageRecord({
			assignedId: "root",
			records: [
				{
					id: "root",
					predecessorId: null,
					effectiveFrom: "2025-01-01",
					effectiveTo: "2025-08-31",
					status: "superseded",
				},
				{
					id: "successor",
					predecessorId: "root",
					effectiveFrom: "2025-07-01",
					effectiveTo: "2025-07-31",
					status: "superseded",
				},
				{
					id: "latest",
					predecessorId: "successor",
					effectiveFrom: "2025-08-01",
					effectiveTo: null,
					status: "active",
				},
			],
			asOf: "2025-09-01",
			getPredecessorId: (record) => record.predecessorId,
			isEligible: (record) =>
				record.status === "active" || record.status === "superseded",
		});

		expect(resolved).toEqual({ ok: false, reason: "OVERLAP" });
	});

	it("rejects a successor whose effective dates precede its predecessor", () => {
		const resolved = resolveEffectiveLineageRecord({
			assignedId: "root",
			records: [
				{
					id: "root",
					predecessorId: null,
					effectiveFrom: "2025-07-01",
					effectiveTo: null,
					status: "active",
				},
				{
					id: "successor",
					predecessorId: "root",
					effectiveFrom: "2025-01-01",
					effectiveTo: "2025-06-30",
					status: "superseded",
				},
			],
			asOf: "2025-08-01",
			getPredecessorId: (record) => record.predecessorId,
			isEligible: (record) =>
				record.status === "active" || record.status === "superseded",
		});

		expect(resolved).toEqual({ ok: false, reason: "OVERLAP" });
	});

	it.each([
		{
			name: "cycle",
			records: [
				{
					id: "root",
					predecessorId: "successor",
					effectiveFrom: "2025-01-01",
					effectiveTo: "2025-06-30",
					status: "superseded" as const,
				},
				{
					id: "successor",
					predecessorId: "root",
					effectiveFrom: "2025-07-01",
					effectiveTo: null,
					status: "active" as const,
				},
			],
			reason: "CYCLE",
		},
		{
			name: "missing predecessor",
			records: [
				{
					id: "root",
					predecessorId: "missing",
					effectiveFrom: "2025-01-01",
					effectiveTo: null,
					status: "active" as const,
				},
			],
			reason: "MISSING_PREDECESSOR",
		},
	])("reports the typed reason for $name", ({ records, reason }) => {
		const resolved = resolveEffectiveLineageRecord({
			assignedId: "root",
			records,
			asOf: "2025-08-01",
			getPredecessorId: (record) => record.predecessorId,
			isEligible: (record) =>
				record.status === "active" || record.status === "superseded",
		});

		expect(resolved).toEqual({ ok: false, reason });
	});
});
