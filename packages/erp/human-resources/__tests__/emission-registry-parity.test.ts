import { AllEventSchemas, HumanResourcesEventSchemas } from "@afenda/events";
import { describe, expect, it } from "vitest";
import { humanResourcesModuleManifest } from "../src/module.manifest";
import {
	HUMAN_RESOURCES_COMPENSATION_BENEFITS_COMMAND_IDS,
	HUMAN_RESOURCES_COMPLIANCE_COMMAND_IDS,
	HUMAN_RESOURCES_CORE_ORGANIZATION_COMMAND_IDS,
	HUMAN_RESOURCES_EMPLOYEE_RELATIONS_COMMAND_IDS,
	HUMAN_RESOURCES_HIRE_ORCHESTRATION_COMMAND_IDS,
	HUMAN_RESOURCES_LEARNING_COMMAND_IDS,
	HUMAN_RESOURCES_LEAVE_COMMAND_IDS,
	HUMAN_RESOURCES_LIFECYCLE_COMMAND_IDS,
	HUMAN_RESOURCES_PERFORMANCE_COMMAND_IDS,
	HUMAN_RESOURCES_RECRUITMENT_COMMAND_IDS,
	HUMAN_RESOURCES_TALENT_COMMAND_IDS,
	HUMAN_RESOURCES_TIME_COMMAND_IDS,
	HUMAN_RESOURCES_WORKFORCE_FOUNDATION_COMMAND_IDS,
	HUMAN_RESOURCES_WORKFORCE_PLANNING_COMMAND_IDS,
} from "../src/module-ids";
import { HUMAN_RESOURCES_MUTATION_EMISSION_REGISTRY } from "../src/mutation-emission-registry";

const SLICE_36_CLASSIFIED_PACKS = [
	{
		label: "compensation-benefits",
		commandIds: HUMAN_RESOURCES_COMPENSATION_BENEFITS_COMMAND_IDS,
	},
	{
		label: "performance",
		commandIds: HUMAN_RESOURCES_PERFORMANCE_COMMAND_IDS,
	},
	{
		label: "learning",
		commandIds: HUMAN_RESOURCES_LEARNING_COMMAND_IDS,
	},
] as const;

describe("mutation emission registry parity", () => {
	it("every manifest emit type has a Zod schema entry", () => {
		for (const eventType of humanResourcesModuleManifest.events.emits) {
			expect(AllEventSchemas[eventType]).toBeDefined();
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

	it("every leave command appears exactly once in the emission registry", () => {
		const registryCommands = new Set(
			HUMAN_RESOURCES_MUTATION_EMISSION_REGISTRY.map((entry) => entry.command),
		);
		for (const command of HUMAN_RESOURCES_LEAVE_COMMAND_IDS) {
			expect(registryCommands.has(command)).toBe(true);
		}
		const leaveRows = HUMAN_RESOURCES_MUTATION_EMISSION_REGISTRY.filter(
			(entry) =>
				(HUMAN_RESOURCES_LEAVE_COMMAND_IDS as readonly string[]).includes(
					entry.command,
				),
		);
		expect(leaveRows).toHaveLength(HUMAN_RESOURCES_LEAVE_COMMAND_IDS.length);
	});

	it("every workforce-foundation command appears exactly once in the emission registry", () => {
		const registryCommands = new Set(
			HUMAN_RESOURCES_MUTATION_EMISSION_REGISTRY.map((entry) => entry.command),
		);
		for (const command of HUMAN_RESOURCES_WORKFORCE_FOUNDATION_COMMAND_IDS) {
			expect(registryCommands.has(command)).toBe(true);
		}
		const rows = HUMAN_RESOURCES_MUTATION_EMISSION_REGISTRY.filter((entry) =>
			(
				HUMAN_RESOURCES_WORKFORCE_FOUNDATION_COMMAND_IDS as readonly string[]
			).includes(entry.command),
		);
		expect(rows).toHaveLength(
			HUMAN_RESOURCES_WORKFORCE_FOUNDATION_COMMAND_IDS.length,
		);
	});

	it("every core-organization command appears exactly once in the emission registry", () => {
		const registryCommands = new Set(
			HUMAN_RESOURCES_MUTATION_EMISSION_REGISTRY.map((entry) => entry.command),
		);
		for (const command of HUMAN_RESOURCES_CORE_ORGANIZATION_COMMAND_IDS) {
			expect(registryCommands.has(command)).toBe(true);
		}
		const rows = HUMAN_RESOURCES_MUTATION_EMISSION_REGISTRY.filter((entry) =>
			(
				HUMAN_RESOURCES_CORE_ORGANIZATION_COMMAND_IDS as readonly string[]
			).includes(entry.command),
		);
		expect(rows).toHaveLength(
			HUMAN_RESOURCES_CORE_ORGANIZATION_COMMAND_IDS.length,
		);
	});

	it("every recruitment command appears exactly once in the emission registry", () => {
		const registryCommands = new Set(
			HUMAN_RESOURCES_MUTATION_EMISSION_REGISTRY.map((entry) => entry.command),
		);
		for (const command of HUMAN_RESOURCES_RECRUITMENT_COMMAND_IDS) {
			expect(registryCommands.has(command)).toBe(true);
		}
		const rows = HUMAN_RESOURCES_MUTATION_EMISSION_REGISTRY.filter((entry) =>
			(HUMAN_RESOURCES_RECRUITMENT_COMMAND_IDS as readonly string[]).includes(
				entry.command,
			),
		);
		expect(rows).toHaveLength(HUMAN_RESOURCES_RECRUITMENT_COMMAND_IDS.length);
	});

	it("every lifecycle command appears exactly once in the emission registry", () => {
		const registryCommands = new Set(
			HUMAN_RESOURCES_MUTATION_EMISSION_REGISTRY.map((entry) => entry.command),
		);
		for (const command of HUMAN_RESOURCES_LIFECYCLE_COMMAND_IDS) {
			expect(registryCommands.has(command)).toBe(true);
		}
		const rows = HUMAN_RESOURCES_MUTATION_EMISSION_REGISTRY.filter((entry) =>
			(HUMAN_RESOURCES_LIFECYCLE_COMMAND_IDS as readonly string[]).includes(
				entry.command,
			),
		);
		expect(rows).toHaveLength(HUMAN_RESOURCES_LIFECYCLE_COMMAND_IDS.length);
	});

	it("every employee-relations command appears exactly once in the emission registry", () => {
		const registryCommands = new Set(
			HUMAN_RESOURCES_MUTATION_EMISSION_REGISTRY.map((entry) => entry.command),
		);
		for (const command of HUMAN_RESOURCES_EMPLOYEE_RELATIONS_COMMAND_IDS) {
			expect(registryCommands.has(command)).toBe(true);
		}
		const rows = HUMAN_RESOURCES_MUTATION_EMISSION_REGISTRY.filter((entry) =>
			(
				HUMAN_RESOURCES_EMPLOYEE_RELATIONS_COMMAND_IDS as readonly string[]
			).includes(entry.command),
		);
		expect(rows).toHaveLength(
			HUMAN_RESOURCES_EMPLOYEE_RELATIONS_COMMAND_IDS.length,
		);
	});

	it("every compliance command appears exactly once in the emission registry", () => {
		const registryCommands = new Set(
			HUMAN_RESOURCES_MUTATION_EMISSION_REGISTRY.map((entry) => entry.command),
		);
		for (const command of HUMAN_RESOURCES_COMPLIANCE_COMMAND_IDS) {
			expect(registryCommands.has(command)).toBe(true);
		}
		const rows = HUMAN_RESOURCES_MUTATION_EMISSION_REGISTRY.filter((entry) =>
			(HUMAN_RESOURCES_COMPLIANCE_COMMAND_IDS as readonly string[]).includes(
				entry.command,
			),
		);
		expect(rows).toHaveLength(HUMAN_RESOURCES_COMPLIANCE_COMMAND_IDS.length);
	});

	it("every talent command appears exactly once in the emission registry", () => {
		const registryCommands = new Set(
			HUMAN_RESOURCES_MUTATION_EMISSION_REGISTRY.map((entry) => entry.command),
		);
		for (const command of HUMAN_RESOURCES_TALENT_COMMAND_IDS) {
			expect(registryCommands.has(command)).toBe(true);
		}
		const rows = HUMAN_RESOURCES_MUTATION_EMISSION_REGISTRY.filter((entry) =>
			(HUMAN_RESOURCES_TALENT_COMMAND_IDS as readonly string[]).includes(
				entry.command,
			),
		);
		expect(rows).toHaveLength(HUMAN_RESOURCES_TALENT_COMMAND_IDS.length);
	});

	it("every workforce-planning command appears exactly once in the emission registry", () => {
		const registryCommands = new Set(
			HUMAN_RESOURCES_MUTATION_EMISSION_REGISTRY.map((entry) => entry.command),
		);
		for (const command of HUMAN_RESOURCES_WORKFORCE_PLANNING_COMMAND_IDS) {
			expect(registryCommands.has(command)).toBe(true);
		}
		const rows = HUMAN_RESOURCES_MUTATION_EMISSION_REGISTRY.filter((entry) =>
			(
				HUMAN_RESOURCES_WORKFORCE_PLANNING_COMMAND_IDS as readonly string[]
			).includes(entry.command),
		);
		expect(rows).toHaveLength(
			HUMAN_RESOURCES_WORKFORCE_PLANNING_COMMAND_IDS.length,
		);
	});

	it("every hire-orchestration command appears exactly once in the emission registry", () => {
		const registryCommands = new Set(
			HUMAN_RESOURCES_MUTATION_EMISSION_REGISTRY.map((entry) => entry.command),
		);
		for (const command of HUMAN_RESOURCES_HIRE_ORCHESTRATION_COMMAND_IDS) {
			expect(registryCommands.has(command)).toBe(true);
		}
		const rows = HUMAN_RESOURCES_MUTATION_EMISSION_REGISTRY.filter((entry) =>
			(
				HUMAN_RESOURCES_HIRE_ORCHESTRATION_COMMAND_IDS as readonly string[]
			).includes(entry.command),
		);
		expect(rows).toHaveLength(
			HUMAN_RESOURCES_HIRE_ORCHESTRATION_COMMAND_IDS.length,
		);
	});

	it.each(
		SLICE_36_CLASSIFIED_PACKS,
	)("registers every classified $label command in the emission registry", ({
		commandIds,
	}) => {
		const registryCommands = new Set(
			HUMAN_RESOURCES_MUTATION_EMISSION_REGISTRY.map((entry) => entry.command),
		);
		for (const command of commandIds) {
			expect(registryCommands.has(command)).toBe(true);
		}
		const rows = HUMAN_RESOURCES_MUTATION_EMISSION_REGISTRY.filter((entry) =>
			(commandIds as readonly string[]).includes(entry.command),
		);
		expect(rows).toHaveLength(commandIds.length);
	});
});
