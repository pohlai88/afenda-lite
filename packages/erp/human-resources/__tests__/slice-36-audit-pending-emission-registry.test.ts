import { describe, expect, it } from "vitest";

import { HUMAN_RESOURCES_COMPENSATION_EMISSIONS } from "../src/emissions/domains/compensation";
import { HUMAN_RESOURCES_LEARNING_EMISSIONS } from "../src/emissions/domains/learning";
import { HUMAN_RESOURCES_PERFORMANCE_EMISSIONS } from "../src/emissions/domains/performance";
import { HUMAN_RESOURCES_PRIVACY_EMISSIONS } from "../src/emissions/domains/privacy";
import { HUMAN_RESOURCES_MUTATION_EMISSION_REGISTRY_RECORD } from "../src/emissions/registry";
import {
	HUMAN_RESOURCES_COMMAND_PRIVACY_LEGAL_HOLD_PLACE,
	HUMAN_RESOURCES_COMMAND_PRIVACY_LEGAL_HOLD_RELEASE,
	HUMAN_RESOURCES_COMMAND_PRIVACY_SUBJECT_ANONYMIZE,
	HUMAN_RESOURCES_COMPENSATION_BENEFITS_COMMAND_IDS,
	HUMAN_RESOURCES_LEARNING_COMMAND_IDS,
	HUMAN_RESOURCES_PERFORMANCE_COMMAND_IDS,
} from "../src/module-ids";

const SLICE_36_CLASSIFIED_PACKS = [
	{
		label: "compensation-benefits",
		expectedCount: 36,
		commandIds: HUMAN_RESOURCES_COMPENSATION_BENEFITS_COMMAND_IDS,
		emissions: HUMAN_RESOURCES_COMPENSATION_EMISSIONS,
	},
	{
		label: "performance",
		expectedCount: 32,
		commandIds: HUMAN_RESOURCES_PERFORMANCE_COMMAND_IDS,
		emissions: HUMAN_RESOURCES_PERFORMANCE_EMISSIONS,
	},
	{
		label: "learning",
		expectedCount: 11,
		commandIds: HUMAN_RESOURCES_LEARNING_COMMAND_IDS,
		emissions: HUMAN_RESOURCES_LEARNING_EMISSIONS,
	},
] as const;

const PRIVACY_COMMAND_IDS = [
	HUMAN_RESOURCES_COMMAND_PRIVACY_LEGAL_HOLD_PLACE,
	HUMAN_RESOURCES_COMMAND_PRIVACY_LEGAL_HOLD_RELEASE,
	HUMAN_RESOURCES_COMMAND_PRIVACY_SUBJECT_ANONYMIZE,
] as const;

describe("Slice 3.6 classified emission registry", () => {
	it.each(
		SLICE_36_CLASSIFIED_PACKS,
	)("classifies every $label command in the registry pack", ({
		emissions,
		expectedCount,
		commandIds,
	}) => {
		expect(Object.keys(emissions)).toHaveLength(expectedCount);
		expect(commandIds).toHaveLength(expectedCount);
	});

	it.each(
		SLICE_36_CLASSIFIED_PACKS,
	)("registers every $label command in the composed registry", ({
		commandIds,
	}) => {
		for (const commandId of commandIds) {
			expect(
				HUMAN_RESOURCES_MUTATION_EMISSION_REGISTRY_RECORD[commandId],
			).toBeDefined();
		}
	});

	it("classifies all three privacy commands in the privacy pack", () => {
		expect(Object.keys(HUMAN_RESOURCES_PRIVACY_EMISSIONS)).toHaveLength(3);
		for (const commandId of PRIVACY_COMMAND_IDS) {
			expect(
				HUMAN_RESOURCES_MUTATION_EMISSION_REGISTRY_RECORD[commandId],
			).toBeDefined();
		}
	});
});
