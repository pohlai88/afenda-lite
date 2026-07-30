import {
	buildHumanResourcesReportingSnapshot,
	HUMAN_RESOURCES_REPORTING_FACT_KINDS,
} from "@afenda/human-resources";
import { describe, expect, it } from "vitest";

import { createDrizzleHumanResourcesReportingSource } from "../src/adapters/drizzle/reporting";
import { createMemoryHumanResourcesReportingSource } from "../src/adapters/memory/reporting";
import { createMemoryHumanResourcesStore } from "../src/adapters/memory/store";
import { runSequential } from "../src/shared/run-sequential";
import { runDrizzleParity } from "./helpers/database-gate";

const EMPTY_ORGANIZATION_ID = `reporting-empty-${crypto.randomUUID()}`;
const REPORTING_WINDOW = {
	organizationId: EMPTY_ORGANIZATION_ID,
	asOf: "2026-07-31",
	periodStart: "2026-07-01",
	periodEnd: "2026-07-31",
} as const;

describe("Human Resources reporting source parity", () => {
	it("maps every reporting fact kind from an empty memory tenant", async () => {
		const source = createMemoryHumanResourcesReportingSource(
			createMemoryHumanResourcesStore(),
		);

		await runSequential(HUMAN_RESOURCES_REPORTING_FACT_KINDS, async (kind) => {
			const page = await source.listFacts({
				organizationId: EMPTY_ORGANIZATION_ID,
				kind,
				page: 1,
				pageSize: 100,
			});
			expect(page).toEqual({
				ok: true,
				data: { entries: [], total: 0, page: 1, pageSize: 100 },
			});
		});
	});

	describe.runIf(runDrizzleParity)("Drizzle", () => {
		it("reconciles the same empty-tenant snapshot as memory", async () => {
			const memory = await buildHumanResourcesReportingSnapshot(
				REPORTING_WINDOW,
				createMemoryHumanResourcesReportingSource(
					createMemoryHumanResourcesStore(),
				),
			);
			const drizzle = await buildHumanResourcesReportingSnapshot(
				REPORTING_WINDOW,
				createDrizzleHumanResourcesReportingSource(),
			);

			expect(memory.ok).toBe(true);
			expect(drizzle).toEqual(memory);
		});
	});
});
