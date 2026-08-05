import { describe, expect, it } from "vitest";
import { HUMAN_RESOURCES_MUTATION_EMISSION_REGISTRY_RECORD } from "../src/kernel/emissions/registry";
import type { HumanResourcesEmissionRegistry } from "../src/kernel/emissions/types";
import {
	composeHumanResourcesOperationGovernanceManifest,
	HUMAN_RESOURCES_OPERATION_GOVERNANCE_MANIFEST,
} from "../src/kernel/operations/governance-manifest";
import { HUMAN_RESOURCES_REGISTERED_OPERATION_DEFINITIONS } from "../src/kernel/operations/registry";

describe("Human Resources operation governance manifest", () => {
	it("joins every operation to one explicit emission disposition", () => {
		const entries = Object.values(
			HUMAN_RESOURCES_OPERATION_GOVERNANCE_MANIFEST,
		);
		expect(entries).toHaveLength(562);
		expect(entries.filter(({ kind }) => kind === "command")).toHaveLength(362);
		expect(entries.filter(({ kind }) => kind === "query")).toHaveLength(200);

		for (const definition of HUMAN_RESOURCES_REGISTERED_OPERATION_DEFINITIONS) {
			const governed =
				HUMAN_RESOURCES_OPERATION_GOVERNANCE_MANIFEST[definition.id];
			expect(governed).toBeDefined();
			expect(governed?.id).toBe(definition.id);
			if (governed?.kind === "command") {
				expect(governed.emission).toBe(
					HUMAN_RESOURCES_MUTATION_EMISSION_REGISTRY_RECORD[definition.id],
				);
				expect(governed.emission.idempotencyRequired).toBe(true);
				expect(governed.execution).toEqual({
					audit: "required",
					emission: "required",
					idempotency: "required",
					transaction: "required",
				});
			} else {
				expect(governed?.emission.emissionMode).toBe("not_applicable");
				expect(governed?.execution).toEqual({
					audit: "none",
					emission: "none",
					idempotency: "none",
					transaction: "none",
				});
			}
		}
	});

	it("is immutable without duplicating canonical emission definitions", () => {
		expect(Object.isFrozen(HUMAN_RESOURCES_OPERATION_GOVERNANCE_MANIFEST)).toBe(
			true,
		);
		for (const governed of Object.values(
			HUMAN_RESOURCES_OPERATION_GOVERNANCE_MANIFEST,
		)) {
			expect(Object.isFrozen(governed)).toBe(true);
			if (governed.kind === "command") {
				expect(Object.isFrozen(governed.emission)).toBe(true);
			}
		}
	});

	it("fails closed when a command has no emission definition", () => {
		const command = HUMAN_RESOURCES_REGISTERED_OPERATION_DEFINITIONS.find(
			(definition) => definition.kind === "command",
		);
		if (command === undefined) {
			throw new Error("Expected at least one registered HR command");
		}
		expect(() =>
			composeHumanResourcesOperationGovernanceManifest([command], {}),
		).toThrow("has no canonical emission definition");
	});

	it("fails closed when an emission references an unknown operation", () => {
		const [emission] = Object.values(
			HUMAN_RESOURCES_MUTATION_EMISSION_REGISTRY_RECORD,
		);
		expect(emission).toBeDefined();
		expect(() =>
			composeHumanResourcesOperationGovernanceManifest([], {
				"human-resources.unknown-command": emission,
			} as HumanResourcesEmissionRegistry),
		).toThrow("references an unknown operation");
	});
});
