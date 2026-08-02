import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { HUMAN_RESOURCES_MUTATION_EMISSION_REGISTRY_RECORD } from "../src/emissions/registry";
import { humanResourcesModuleManifest } from "../src/module.manifest";
import {
	HUMAN_RESOURCES_RECRUITMENT_COMMAND_IDS,
	HUMAN_RESOURCES_RECRUITMENT_QUERY_IDS,
} from "../src/module-ids";
import { HUMAN_RESOURCES_REGISTERED_OPERATION_DEFINITIONS } from "../src/operation-registry/registry";
import {
	HUMAN_RESOURCES_RECRUITMENT_COMMAND_AUTHORIZATION,
	HUMAN_RESOURCES_RECRUITMENT_COMMANDS,
	HUMAN_RESOURCES_RECRUITMENT_QUERIES,
	HUMAN_RESOURCES_RECRUITMENT_QUERY_AUTHORIZATION,
} from "../src/recruitment/operation-registry";
import { resolveHumanResourcesAuthorizationPolicy } from "../src/shared/authorization-policy-registry";

const definitions = [
	...Object.values(HUMAN_RESOURCES_RECRUITMENT_COMMANDS),
	...Object.values(HUMAN_RESOURCES_RECRUITMENT_QUERIES),
];
const publicCapabilitiesSource = readFileSync(
	path.resolve(import.meta.dirname, "../src/public-capabilities.ts"),
	"utf8",
);
const moduleIdsSource = readFileSync(
	path.resolve(import.meta.dirname, "../src/module-ids.ts"),
	"utf8",
);
const recruitmentHandlerSources = [
	"requisition.ts",
	"candidate.ts",
	"application.ts",
	"interview.ts",
	"offer.ts",
].map((fileName) =>
	readFileSync(
		path.resolve(import.meta.dirname, `../src/recruitment/${fileName}`),
		"utf8",
	),
);
const recruitmentRunnerSource = readFileSync(
	path.resolve(import.meta.dirname, "../src/recruitment/run-operation.ts"),
	"utf8",
);

describe("Recruitment operation registry", () => {
	it("owns every recruitment operation exactly once", () => {
		expect(definitions).toHaveLength(45);
		expect(new Set(definitions.map((definition) => definition.id)).size).toBe(
			definitions.length,
		);
		expect(
			new Set(definitions.map((definition) => definition.publicName)).size,
		).toBe(definitions.length);

		for (const definition of definitions) {
			expect(definition.owner).toBe("recruitment");
			expect(publicCapabilitiesSource).toMatch(
				new RegExp(`export const ${definition.publicName}\\s*=`),
			);
			expect(resolveHumanResourcesAuthorizationPolicy(definition.id).id).toBe(
				definition.authorizationPolicy,
			);
		}
	});

	it("derives IDs, authorization, and mutation emission coverage", () => {
		expect(HUMAN_RESOURCES_RECRUITMENT_COMMAND_IDS).toEqual(
			Object.values(HUMAN_RESOURCES_RECRUITMENT_COMMANDS).map(
				(definition) => definition.id,
			),
		);
		expect(HUMAN_RESOURCES_RECRUITMENT_QUERY_IDS).toEqual(
			Object.values(HUMAN_RESOURCES_RECRUITMENT_QUERIES).map(
				(definition) => definition.id,
			),
		);

		for (const commandId of HUMAN_RESOURCES_RECRUITMENT_COMMAND_IDS) {
			expect(HUMAN_RESOURCES_MUTATION_EMISSION_REGISTRY_RECORD).toHaveProperty(
				commandId,
			);
		}
		for (const [operationId, permission] of Object.entries(
			HUMAN_RESOURCES_RECRUITMENT_COMMAND_AUTHORIZATION,
		)) {
			expect(
				humanResourcesModuleManifest.authorization.commands,
			).toHaveProperty(operationId, permission);
		}
		for (const [operationId, permission] of Object.entries(
			HUMAN_RESOURCES_RECRUITMENT_QUERY_AUTHORIZATION,
		)) {
			expect(humanResourcesModuleManifest.authorization.queries).toHaveProperty(
				operationId,
				permission,
			);
		}
	});

	it("composes with all registered capabilities without collisions", () => {
		expect(
			new Set(
				HUMAN_RESOURCES_REGISTERED_OPERATION_DEFINITIONS.map(
					(definition) => definition.id,
				),
			).size,
		).toBe(HUMAN_RESOURCES_REGISTERED_OPERATION_DEFINITIONS.length);
	});

	it("confines handlers to explicit Recruitment store projections", () => {
		const source = recruitmentHandlerSources.join("\n");
		const storeProjectionCount = recruitmentHandlerSources.reduce(
			(count, handlerSource) =>
				count + (handlerSource.match(/storeMethods:/g)?.length ?? 0),
			0,
		);

		expect(storeProjectionCount).toBe(33);
		expect(source).not.toContain("HumanResourcesStore");
		expect(source).not.toContain("runRecruitmentCommand");
		expect(source).not.toContain("runRecruitmentQuery");
		expect(recruitmentRunnerSource).toMatch(
			/Pick<\s*HumanResourcesRecruitmentCapabilityStore,\s*TMethods\[number\]\s*>/,
		);
		expect(recruitmentRunnerSource).not.toContain("HumanResourcesStore");
		expect(moduleIdsSource).not.toMatch(
			/human-resources\.(?:requisition|candidate|application|interview|interview-evaluation|offer)\./,
		);
	});
});
