import { HumanResourcesEventSchemas } from "@afenda/events";
import { describe, expect, it } from "vitest";
import { humanResourcesModuleManifest } from "../src/module.manifest";
import { HUMAN_RESOURCES_TIME_COMMAND_IDS } from "../src/module-ids";
import { HUMAN_RESOURCES_MUTATION_EMISSION_REGISTRY } from "../src/mutation-emission-registry";

describe("mutation emission registry parity", () => {
	it("every manifest emit type has a Zod schema entry", () => {
		for (const eventType of humanResourcesModuleManifest.events.emits) {
			expect(HumanResourcesEventSchemas[eventType]).toBeDefined();
		}
	});

	it("domain_event registry entries map to known emit types", () => {
		const emitSet = new Set(humanResourcesModuleManifest.events.emits);
		for (const entry of HUMAN_RESOURCES_MUTATION_EMISSION_REGISTRY) {
			if (entry.emission !== "domain_event") continue;
			expect(entry.eventTypes?.length).toBeGreaterThan(0);
			for (const eventType of entry.eventTypes ?? []) {
				expect(emitSet.has(eventType)).toBe(true);
				expect(HumanResourcesEventSchemas[eventType]).toBeDefined();
			}
		}
	});

	it("registry command ids are unique", () => {
		const commands = HUMAN_RESOURCES_MUTATION_EMISSION_REGISTRY.map(
			(entry) => entry.command,
		);
		expect(new Set(commands).size).toBe(commands.length);
	});

	it("every time command appears exactly once in the emission registry", () => {
		const registryCommands = new Set(
			HUMAN_RESOURCES_MUTATION_EMISSION_REGISTRY.map((entry) => entry.command),
		);
		for (const command of HUMAN_RESOURCES_TIME_COMMAND_IDS) {
			expect(registryCommands.has(command)).toBe(true);
		}
		const timeRows = HUMAN_RESOURCES_MUTATION_EMISSION_REGISTRY.filter(
			(entry) =>
				(HUMAN_RESOURCES_TIME_COMMAND_IDS as readonly string[]).includes(
					entry.command,
				),
		);
		expect(timeRows).toHaveLength(HUMAN_RESOURCES_TIME_COMMAND_IDS.length);
	});
});
