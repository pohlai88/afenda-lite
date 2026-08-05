import { describe, expect, it } from "vitest";

import { HUMAN_RESOURCES_COMPENSATION_EMISSIONS } from "../src/kernel/emissions/domains/compensation";
import { HUMAN_RESOURCES_LEARNING_EMISSIONS } from "../src/kernel/emissions/domains/learning";
import { HUMAN_RESOURCES_PERFORMANCE_EMISSIONS } from "../src/kernel/emissions/domains/performance";
import { HUMAN_RESOURCES_PRIVACY_EMISSIONS } from "../src/kernel/emissions/domains/privacy";
import { HUMAN_RESOURCES_MUTATION_EMISSION_REGISTRY_RECORD } from "../src/kernel/emissions/registry";
import {
	HUMAN_RESOURCES_COMMAND_PRIVACY_LEGAL_HOLD_PLACE,
	HUMAN_RESOURCES_COMMAND_PRIVACY_LEGAL_HOLD_RELEASE,
	HUMAN_RESOURCES_COMMAND_PRIVACY_RESTRICTION_LIFT,
	HUMAN_RESOURCES_COMMAND_PRIVACY_RESTRICTION_PLACE,
	HUMAN_RESOURCES_COMMAND_PRIVACY_SUBJECT_ANONYMIZE,
	HUMAN_RESOURCES_COMPENSATION_BENEFITS_COMMAND_IDS,
	HUMAN_RESOURCES_LEARNING_COMMAND_IDS,
	HUMAN_RESOURCES_PERFORMANCE_COMMAND_IDS,
} from "../src/kernel/operations/module-ids";

const SLICE_36_CLASSIFIED_PACKS = [
	{
		label: "compensation-benefits",
		commandIds: HUMAN_RESOURCES_COMPENSATION_BENEFITS_COMMAND_IDS,
		emissions: HUMAN_RESOURCES_COMPENSATION_EMISSIONS,
	},
	{
		label: "performance",
		commandIds: HUMAN_RESOURCES_PERFORMANCE_COMMAND_IDS,
		emissions: HUMAN_RESOURCES_PERFORMANCE_EMISSIONS,
	},
	{
		label: "learning",
		commandIds: HUMAN_RESOURCES_LEARNING_COMMAND_IDS,
		emissions: HUMAN_RESOURCES_LEARNING_EMISSIONS,
	},
] as const;

const PRIVACY_COMMAND_IDS = [
	HUMAN_RESOURCES_COMMAND_PRIVACY_LEGAL_HOLD_PLACE,
	HUMAN_RESOURCES_COMMAND_PRIVACY_LEGAL_HOLD_RELEASE,
	HUMAN_RESOURCES_COMMAND_PRIVACY_RESTRICTION_PLACE,
	HUMAN_RESOURCES_COMMAND_PRIVACY_RESTRICTION_LIFT,
	HUMAN_RESOURCES_COMMAND_PRIVACY_SUBJECT_ANONYMIZE,
] as const;

describe("Slice 3.6 classified emission registry", () => {
	it.each(
		SLICE_36_CLASSIFIED_PACKS,
	)("classifies every $label command in the registry pack", ({
		emissions,
		commandIds,
	}) => {
		expect(Object.keys(emissions)).toHaveLength(commandIds.length);
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

	it("classifies all five privacy commands in the privacy pack", () => {
		expect(Object.keys(HUMAN_RESOURCES_PRIVACY_EMISSIONS)).toHaveLength(5);
		for (const commandId of PRIVACY_COMMAND_IDS) {
			expect(
				HUMAN_RESOURCES_MUTATION_EMISSION_REGISTRY_RECORD[commandId],
			).toBeDefined();
		}
	});
});
