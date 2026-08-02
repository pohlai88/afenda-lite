import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { HUMAN_RESOURCES_MUTATION_EMISSION_REGISTRY_RECORD } from "../src/emissions/registry";
import {
	HUMAN_RESOURCES_HIRE_ORCHESTRATION_COMMAND_AUTHORIZATION,
	HUMAN_RESOURCES_HIRE_ORCHESTRATION_COMMAND_IDS,
	HUMAN_RESOURCES_HIRE_ORCHESTRATION_COMMANDS,
} from "../src/hire-orchestration/operation-registry";
import { humanResourcesModuleManifest } from "../src/module.manifest";
import { HUMAN_RESOURCES_REGISTERED_OPERATION_DEFINITIONS } from "../src/operation-registry/registry";
import { resolveHumanResourcesAuthorizationPolicy } from "../src/shared/authorization-policy-registry";

const definition =
	HUMAN_RESOURCES_HIRE_ORCHESTRATION_COMMANDS.hireFromAcceptedOffer;
const handlerSource = readFileSync(
	path.resolve(
		import.meta.dirname,
		"../src/hire-orchestration/hire-from-accepted-offer.ts",
	),
	"utf8",
);
const runnerSource = readFileSync(
	path.resolve(
		import.meta.dirname,
		"../src/hire-orchestration/run-operation.ts",
	),
	"utf8",
);
const moduleIdsSource = readFileSync(
	path.resolve(import.meta.dirname, "../src/module-ids.ts"),
	"utf8",
);
const publicCapabilitiesSource = readFileSync(
	path.resolve(import.meta.dirname, "../src/public-capabilities.ts"),
	"utf8",
);
const drizzleSource = readFileSync(
	path.resolve(
		import.meta.dirname,
		"../src/adapters/drizzle/hire-orchestration.ts",
	),
	"utf8",
);

describe("Hire orchestration operation registry", () => {
	it("keeps the saga physically modular under the Recruitment semantic owner", () => {
		expect(HUMAN_RESOURCES_HIRE_ORCHESTRATION_COMMAND_IDS).toEqual([
			definition.id,
		]);
		expect(definition.owner).toBe("recruitment");
		expect(definition.authorizationPolicy).toBe("hr.recruitment");
		expect(resolveHumanResourcesAuthorizationPolicy(definition.id).id).toBe(
			definition.authorizationPolicy,
		);
		expect(publicCapabilitiesSource).toMatch(
			/export const hireFromAcceptedOffer\s*=/,
		);
		expect(HUMAN_RESOURCES_REGISTERED_OPERATION_DEFINITIONS).toContainEqual(
			definition,
		);
	});

	it("derives manifest authorization and emission coverage", () => {
		for (const [operationId, permission] of Object.entries(
			HUMAN_RESOURCES_HIRE_ORCHESTRATION_COMMAND_AUTHORIZATION,
		)) {
			expect(
				humanResourcesModuleManifest.authorization.commands,
			).toHaveProperty(operationId, permission);
		}
		expect(HUMAN_RESOURCES_MUTATION_EMISSION_REGISTRY_RECORD).toHaveProperty(
			definition.id,
		);
	});

	it("confines the saga to its exact store projection and rejects the old runner", () => {
		expect(handlerSource.match(/storeMethods:/g)).toHaveLength(1);
		expect(handlerSource).not.toContain("HumanResourcesStore");
		expect(handlerSource).not.toContain("runHireOrchestrationCommand");
		expect(runnerSource).toMatch(
			/Pick<\s*HumanResourcesHireOrchestrationCapabilityStore,\s*TMethods\[number\]\s*>/,
		);
		expect(moduleIdsSource).not.toContain(
			'"human-resources.hire.from-accepted-offer"',
		);
		expect(
			existsSync(
				path.resolve(
					import.meta.dirname,
					"../src/shared/hire-orchestration-command.ts",
				),
			),
		).toBe(false);
	});

	it("commits final saga state, audit, and outbox in one production transaction", () => {
		expect(handlerSource).not.toContain("appendRegistryGatedOutbox");
		expect(handlerSource).toContain('"completeHireAttempt"');
		expect(drizzleSource).toMatch(
			/completeHireAttempt[\s\S]*?WITH mutated AS[\s\S]*?audited AS[\s\S]*?outboxed AS/,
		);
		expect(drizzleSource).toContain(
			"HUMAN_RESOURCES_HIRE_FROM_ACCEPTED_OFFER_COMPLETED_EVENT",
		);
	});
});
