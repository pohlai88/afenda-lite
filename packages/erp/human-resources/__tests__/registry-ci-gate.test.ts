/**
 * Slice 3.8 — fail-closed HR mutation-emission registry CI gate.
 * Strict 364/364 — zero HR-AUD-06 exemptions.
 */

import { HumanResourcesEventSchemas } from "@afenda/events/schemas";
import { describe, expect, it } from "vitest";
import { HUMAN_RESOURCES_MUTATION_EMISSION_REGISTRY } from "../src/kernel/emissions/mutation-emission-registry";
import { HUMAN_RESOURCES_MUTATION_EMISSION_REGISTRY_RECORD } from "../src/kernel/emissions/registry";
import { validateHumanResourcesMutationEmissionRegistry } from "../src/kernel/emissions/validate-emission";
import { HUMAN_RESOURCES_EVENT_CATALOG } from "../src/kernel/events/index";
import {
	HUMAN_RESOURCES_COMMAND_IDS,
	type HumanResourcesCommandId,
} from "../src/kernel/operations/module-ids";
import mutationInventoryFixture from "./fixtures/mutation-inventory.json";

describe("Slice 3.8 — HR mutation-emission registry CI gate", () => {
	const classifiedIds = new Set(
		Object.keys(HUMAN_RESOURCES_MUTATION_EMISSION_REGISTRY_RECORD),
	);

	it("Test 1 — classifies every mutation command with zero missing_command issues", () => {
		const issues = validateHumanResourcesMutationEmissionRegistry();
		const missingCommandIds = issues
			.filter((issue) => issue.code === "missing_command")
			.map((issue) => issue.commandId)
			.filter((id): id is HumanResourcesCommandId => id !== undefined)
			.toSorted();

		expect(missingCommandIds).toEqual([]);
		expect(issues.filter((issue) => issue.code === "missing_command")).toEqual(
			[],
		);
		expect(classifiedIds.size).toBe(HUMAN_RESOURCES_COMMAND_IDS.length);
	});

	it("Test 2 — contains no unknown command IDs in the registry", () => {
		const commandIdSet = new Set<string>(HUMAN_RESOURCES_COMMAND_IDS);
		const unknown = Object.keys(
			HUMAN_RESOURCES_MUTATION_EMISSION_REGISTRY_RECORD,
		).filter((commandId) => !commandIdSet.has(commandId));

		expect(unknown).toEqual([]);

		const issues = validateHumanResourcesMutationEmissionRegistry();
		expect(issues.filter((issue) => issue.code === "unknown_command")).toEqual(
			[],
		);
	});

	it("Test 3 — references only cataloged event types for classified commands", () => {
		const issues = validateHumanResourcesMutationEmissionRegistry();
		expect(
			issues.filter(
				(issue) =>
					issue.code === "unknown_event" ||
					issue.code === "missing_catalog_entry",
			),
		).toEqual([]);

		const missingEvents: string[] = [];
		for (const definition of Object.values(
			HUMAN_RESOURCES_MUTATION_EMISSION_REGISTRY_RECORD,
		)) {
			if (!definition) {
				continue;
			}
			for (const eventType of definition.eventTypes) {
				if (!HumanResourcesEventSchemas[eventType]) {
					missingEvents.push(`${definition.commandId} -> ${eventType}`);
				}
				if (!(eventType in HUMAN_RESOURCES_EVENT_CATALOG)) {
					missingEvents.push(
						`${definition.commandId} -> ${eventType} (catalog)`,
					);
				}
			}
		}
		expect(missingEvents).toEqual([]);
	});

	it("Test 4 — requires events for domain_event commands", () => {
		const issues = validateHumanResourcesMutationEmissionRegistry();
		expect(
			issues.filter((issue) => issue.code === "domain_event_without_event"),
		).toEqual([]);

		for (const definition of Object.values(
			HUMAN_RESOURCES_MUTATION_EMISSION_REGISTRY_RECORD,
		)) {
			if (!definition) {
				continue;
			}
			if (definition.emissionMode === "domain_event") {
				expect(definition.eventTypes.length).toBeGreaterThan(0);
			}
		}
	});

	it("Test 5 — does not assign events to audit-only commands", () => {
		const issues = validateHumanResourcesMutationEmissionRegistry();
		expect(
			issues.filter((issue) => issue.code === "audit_only_with_event"),
		).toEqual([]);

		for (const definition of Object.values(
			HUMAN_RESOURCES_MUTATION_EMISSION_REGISTRY_RECORD,
		)) {
			if (!definition) {
				continue;
			}
			if (definition.emissionMode === "audit_only") {
				expect(definition.eventTypes).toEqual([]);
			}
		}
	});

	it("Test 6 — requires correlation for every classified mutation", () => {
		const issues = validateHumanResourcesMutationEmissionRegistry();
		expect(
			issues.filter((issue) => issue.code === "missing_correlation"),
		).toEqual([]);

		for (const definition of Object.values(
			HUMAN_RESOURCES_MUTATION_EMISSION_REGISTRY_RECORD,
		)) {
			if (!definition) {
				continue;
			}
			expect(definition.correlationRequired).toBe(true);
		}
	});

	it("Test 7 — requires audit for every classified mutation", () => {
		const issues = validateHumanResourcesMutationEmissionRegistry();
		expect(issues.filter((issue) => issue.code === "missing_audit")).toEqual(
			[],
		);

		for (const definition of Object.values(
			HUMAN_RESOURCES_MUTATION_EMISSION_REGISTRY_RECORD,
		)) {
			if (!definition) {
				continue;
			}
			expect(definition.auditRequired).toBe(true);
		}
	});

	it("Test 8 — requires idempotency for every classified mutation", () => {
		const issues = validateHumanResourcesMutationEmissionRegistry();
		expect(
			issues.filter((issue) => issue.code === "missing_idempotency"),
		).toEqual([]);

		for (const definition of Object.values(
			HUMAN_RESOURCES_MUTATION_EMISSION_REGISTRY_RECORD,
		)) {
			if (definition !== undefined) {
				expect(definition.idempotencyRequired).toBe(true);
			}
		}
	});

	it("Test 10 — gives every HR event catalog entry an owner and consumer disposition", () => {
		for (const entry of Object.values(HUMAN_RESOURCES_EVENT_CATALOG)) {
			expect(entry.ownerPackage).toBe("@afenda/human-resources");
			expect(entry.projection).toBeDefined();
			if (entry.projection.mode !== "documented_no_consumer") {
				expect(entry.consumers.length).toBeGreaterThan(0);
			}
		}
	});

	it("locks classified count at 364 and inventory alignment with zero unclassified", () => {
		expect(
			Object.keys(HUMAN_RESOURCES_MUTATION_EMISSION_REGISTRY_RECORD),
		).toHaveLength(364);
		expect(HUMAN_RESOURCES_MUTATION_EMISSION_REGISTRY).toHaveLength(364);
		expect(mutationInventoryFixture.classifiedMutationIds).toBe(364);
		expect(mutationInventoryFixture.unclassifiedMutationIds).toBe(0);
		expect(mutationInventoryFixture.unclassified).toEqual([]);
		expect(classifiedIds.size).toBe(364);
	});
});
