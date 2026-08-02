import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { HUMAN_RESOURCES_MUTATION_EMISSION_REGISTRY_RECORD } from "../src/emissions/registry";
import { humanResourcesModuleManifest } from "../src/module.manifest";
import { resolveHumanResourcesAuthorizationPolicy } from "../src/shared/authorization-policy-registry";
import {
	HUMAN_RESOURCES_TIME_POLICY_COMMAND_AUTHORIZATION,
	HUMAN_RESOURCES_TIME_POLICY_COMMAND_IDS,
	HUMAN_RESOURCES_TIME_POLICY_COMMANDS,
	HUMAN_RESOURCES_TIME_POLICY_QUERIES,
	HUMAN_RESOURCES_TIME_POLICY_QUERY_AUTHORIZATION,
	HUMAN_RESOURCES_TIME_POLICY_QUERY_IDS,
} from "../src/time/operation-registry";

const definitions = [
	...Object.values(HUMAN_RESOURCES_TIME_POLICY_COMMANDS),
	...Object.values(HUMAN_RESOURCES_TIME_POLICY_QUERIES),
];
const publicCapabilitiesSource = readFileSync(
	path.resolve(import.meta.dirname, "../src/public-capabilities.ts"),
	"utf8",
);
const handlerSource = readFileSync(
	path.resolve(import.meta.dirname, "../src/time/policy.ts"),
	"utf8",
);
const moduleIdsSource = readFileSync(
	path.resolve(import.meta.dirname, "../src/module-ids.ts"),
	"utf8",
);

describe("time policy operation registry", () => {
	it("owns each policy capability exactly once with valid policy resolution", () => {
		expect(definitions).toHaveLength(8);
		expect(new Set(definitions.map((definition) => definition.id)).size).toBe(
			definitions.length,
		);

		for (const definition of definitions) {
			expect(definition.owner).toBe("time-attendance");
			expect(publicCapabilitiesSource).toMatch(
				new RegExp(`export const ${definition.publicName}\\s*=`),
			);
			expect(resolveHumanResourcesAuthorizationPolicy(definition.id).id).toBe(
				definition.authorizationPolicy,
			);
		}
	});

	it("derives ids, authorization, and emission coverage", () => {
		expect(HUMAN_RESOURCES_TIME_POLICY_COMMAND_IDS).toEqual(
			Object.values(HUMAN_RESOURCES_TIME_POLICY_COMMANDS).map(
				(definition) => definition.id,
			),
		);
		expect(HUMAN_RESOURCES_TIME_POLICY_QUERY_IDS).toEqual(
			Object.values(HUMAN_RESOURCES_TIME_POLICY_QUERIES).map(
				(definition) => definition.id,
			),
		);

		for (const commandId of HUMAN_RESOURCES_TIME_POLICY_COMMAND_IDS) {
			expect(HUMAN_RESOURCES_MUTATION_EMISSION_REGISTRY_RECORD).toHaveProperty(
				commandId,
			);
		}
		for (const [operationId, permission] of Object.entries(
			HUMAN_RESOURCES_TIME_POLICY_COMMAND_AUTHORIZATION,
		)) {
			expect(
				humanResourcesModuleManifest.authorization.commands,
			).toHaveProperty(operationId, permission);
		}
		for (const [operationId, permission] of Object.entries(
			HUMAN_RESOURCES_TIME_POLICY_QUERY_AUTHORIZATION,
		)) {
			expect(humanResourcesModuleManifest.authorization.queries).toHaveProperty(
				operationId,
				permission,
			);
		}
	});

	it("confines every policy operation to an exact store projection", () => {
		expect(handlerSource.match(/storeMethods:/g)).toHaveLength(
			definitions.length,
		);
		expect(handlerSource).not.toContain("HumanResourcesStore");
		expect(handlerSource).not.toContain("runTimeCommand");
		expect(handlerSource).not.toContain("runTimeQuery");
		expect(moduleIdsSource).not.toContain("human-resources.time-policy.");
		expect(moduleIdsSource).not.toContain(
			"human-resources.time-approval-authority.",
		);
	});
});
