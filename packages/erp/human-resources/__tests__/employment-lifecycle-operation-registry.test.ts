import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";
import { HUMAN_RESOURCES_EMPLOYMENT_LIFECYCLE_EMISSIONS } from "../src/emissions/domains/employment-lifecycle";
import { HUMAN_RESOURCES_EMPLOYMENT_WORKFLOW_EMISSIONS } from "../src/emissions/domains/employment-workflow";
import {
	HUMAN_RESOURCES_EMPLOYMENT_LIFECYCLE_COMMAND_AUTHORIZATION,
	HUMAN_RESOURCES_EMPLOYMENT_LIFECYCLE_COMMANDS,
	HUMAN_RESOURCES_EMPLOYMENT_LIFECYCLE_QUERIES,
	HUMAN_RESOURCES_EMPLOYMENT_LIFECYCLE_QUERY_AUTHORIZATION,
} from "../src/employment-lifecycle/operation-registry";
import { humanResourcesModuleManifest } from "../src/module.manifest";
import {
	HUMAN_RESOURCES_EMPLOYMENT_LIFECYCLE_COMMAND_IDS,
	HUMAN_RESOURCES_EMPLOYMENT_LIFECYCLE_QUERY_IDS,
} from "../src/module-ids";
import { HUMAN_RESOURCES_REGISTERED_OPERATION_DEFINITIONS } from "../src/operation-registry/registry";
import { resolveHumanResourcesAuthorizationPolicy } from "../src/shared/authorization-policy-registry";

const definitions = [
	...Object.values(HUMAN_RESOURCES_EMPLOYMENT_LIFECYCLE_COMMANDS),
	...Object.values(HUMAN_RESOURCES_EMPLOYMENT_LIFECYCLE_QUERIES),
];
const publicCapabilitiesSource = readFileSync(
	path.resolve(import.meta.dirname, "../src/public-capabilities.ts"),
	"utf8",
);
const handlerSources = [
	"../src/core/employment.ts",
	"../src/core/employment-management.ts",
	"../src/core/employment-contract.ts",
	"../src/core/employment-contract-management.ts",
	"../src/core/assignment.ts",
	"../src/core/org-context.ts",
	"../src/lifecycle/onboarding.ts",
	"../src/lifecycle/probation.ts",
	"../src/lifecycle/confirmation.ts",
	"../src/lifecycle/transfer.ts",
	"../src/lifecycle/termination.ts",
	"../src/lifecycle/offboarding.ts",
].map((relativePath) =>
	readFileSync(path.resolve(import.meta.dirname, relativePath), "utf8"),
);
const runnerSource = readFileSync(
	path.resolve(
		import.meta.dirname,
		"../src/employment-lifecycle/run-operation.ts",
	),
	"utf8",
);

describe("employment lifecycle operation registry", () => {
	it("owns every employment record, workflow, and effective-truth operation exactly once", () => {
		expect(definitions).toHaveLength(63);
		expect(new Set(definitions.map((definition) => definition.id)).size).toBe(
			definitions.length,
		);
		expect(
			new Set(definitions.map((definition) => definition.publicName)).size,
		).toBe(definitions.length);

		for (const definition of definitions) {
			expect(definition.owner).toBe("employment-lifecycle");
			expect(publicCapabilitiesSource).toMatch(
				new RegExp(`export const ${definition.publicName}\\s*=`),
			);
			expect(resolveHumanResourcesAuthorizationPolicy(definition.id).id).toBe(
				definition.authorizationPolicy,
			);
		}
	});

	it("derives command, query, authorization, and emission projections", () => {
		expect(HUMAN_RESOURCES_EMPLOYMENT_LIFECYCLE_COMMAND_IDS).toEqual(
			Object.values(HUMAN_RESOURCES_EMPLOYMENT_LIFECYCLE_COMMANDS).map(
				(definition) => definition.id,
			),
		);
		expect(HUMAN_RESOURCES_EMPLOYMENT_LIFECYCLE_QUERY_IDS).toEqual(
			Object.values(HUMAN_RESOURCES_EMPLOYMENT_LIFECYCLE_QUERIES).map(
				(definition) => definition.id,
			),
		);
		expect([
			...Object.keys(HUMAN_RESOURCES_EMPLOYMENT_LIFECYCLE_EMISSIONS),
			...Object.keys(HUMAN_RESOURCES_EMPLOYMENT_WORKFLOW_EMISSIONS),
		]).toEqual(HUMAN_RESOURCES_EMPLOYMENT_LIFECYCLE_COMMAND_IDS);

		for (const [operationId, permission] of Object.entries(
			HUMAN_RESOURCES_EMPLOYMENT_LIFECYCLE_COMMAND_AUTHORIZATION,
		)) {
			expect(
				humanResourcesModuleManifest.authorization.commands,
			).toHaveProperty(operationId, permission);
		}
		for (const [operationId, permission] of Object.entries(
			HUMAN_RESOURCES_EMPLOYMENT_LIFECYCLE_QUERY_AUTHORIZATION,
		)) {
			expect(humanResourcesModuleManifest.authorization.queries).toHaveProperty(
				operationId,
				permission,
			);
		}
	});

	it("composes with peer capability registries without collisions", () => {
		expect(
			new Set(
				HUMAN_RESOURCES_REGISTERED_OPERATION_DEFINITIONS.map(
					(definition) => definition.id,
				),
			).size,
		).toBe(HUMAN_RESOURCES_REGISTERED_OPERATION_DEFINITIONS.length);
	});

	it("confines every handler to its declared employment capability projection", () => {
		const handlerSource = handlerSources.join("\n");
		const projectionCount = handlerSources.reduce(
			(count, source) => count + (source.match(/storeMethods:/g)?.length ?? 0),
			0,
		);

		// Seven lifecycle commands intentionally reuse an existing mutation
		// capability while carrying their own canonical operation identity.
		expect(projectionCount).toBe(56);
		for (const commandConstant of [
			"HUMAN_RESOURCES_COMMAND_EMPLOYMENT_HIRE",
			"HUMAN_RESOURCES_COMMAND_EMPLOYMENT_REHIRE",
			"HUMAN_RESOURCES_COMMAND_EMPLOYMENT_SUSPEND",
			"HUMAN_RESOURCES_COMMAND_EMPLOYMENT_REACTIVATE",
			"HUMAN_RESOURCES_COMMAND_EMPLOYMENT_TERMINATE",
			"HUMAN_RESOURCES_COMMAND_EMPLOYMENT_CONTRACT_AMEND",
			"HUMAN_RESOURCES_COMMAND_EMPLOYMENT_CONTRACT_RENEW",
		]) {
			expect(handlerSource).toContain(commandConstant);
		}
		expect(handlerSource).not.toContain("HumanResourcesStore");
		expect(handlerSource).not.toContain("resolveCommandDeps");
		expect(handlerSource).not.toMatch(/runCore(?:Command|Query)/);
		expect(runnerSource).toMatch(
			/Pick<\s*HumanResourcesEmploymentLifecycleStore,\s*TMethods\[number\]\s*>/,
		);
		expect(runnerSource).not.toContain("HumanResourcesStore");
		expect(
			existsSync(
				path.resolve(import.meta.dirname, "../src/shared/core-command.ts"),
			),
		).toBe(false);
		expect(
			existsSync(
				path.resolve(import.meta.dirname, "../src/shared/lifecycle-command.ts"),
			),
		).toBe(false);
		expect(
			existsSync(
				path.resolve(
					import.meta.dirname,
					"../src/emissions/domains/lifecycle.ts",
				),
			),
		).toBe(false);
	});
});
