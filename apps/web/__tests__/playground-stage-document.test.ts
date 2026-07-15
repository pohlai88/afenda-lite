import { describe, expect, it } from "vitest";

import {
	normalizeStageDocument,
	parseStageDocument,
	serializeStageDocument,
} from "../features/playground/compose/stage-document";
import { createEmptyStage } from "../features/playground/compose/stage-types";

describe("compose stage document", () => {
	it("normalizes inspector defaults and drops unknown labs", () => {
		const normalized = normalizeStageDocument({
			version: 1,
			items: [
				{ instanceId: "a", labId: "profile-dropdown" },
				{ instanceId: "b", labId: "not-a-lab" },
				{ instanceId: "a", labId: "notification-dropdown" },
			],
			inspector: {
				sidebarOpen: true,
				viewport: "tablet",
				mode: "dark",
			},
		});

		expect(normalized.items).toEqual([
			{ instanceId: "a", labId: "profile-dropdown" },
		]);
		expect(normalized.inspector).toEqual({
			sidebarOpen: true,
			viewport: "tablet",
			mode: "dark",
		});
	});

	it("parseStageDocument recovers from invalid payloads", () => {
		expect(parseStageDocument(null)).toEqual(createEmptyStage());
		expect(parseStageDocument({ version: 2 })).toEqual(createEmptyStage());
	});

	it("serializeStageDocument is stable JSON for agents", () => {
		const stage = createEmptyStage();
		stage.items.push({
			instanceId: "stage-1",
			labId: "activity-dialog",
		});
		stage.inspector.mode = "light";
		const json = serializeStageDocument(stage);
		expect(JSON.parse(json)).toEqual({
			version: 1,
			items: [{ instanceId: "stage-1", labId: "activity-dialog" }],
			inspector: {
				sidebarOpen: false,
				viewport: "desktop",
				mode: "light",
			},
		});
	});
});
