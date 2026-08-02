import path from "node:path";

import { beforeAll, describe, expect, it } from "vitest";

import {
	buildRegistryProjectionContract,
	type RegistryProjectionContract,
	readRegistryProjectionFixture,
	validateRegistryProjectionContract,
} from "./helpers/registry-projection";

const packageRoot = path.resolve(import.meta.dirname, "..");
const fixturePath = path.join(
	packageRoot,
	"__tests__/fixtures/registry-projection.fixture.json",
);

let contract: RegistryProjectionContract;

function cloneContract(): RegistryProjectionContract {
	return structuredClone(contract);
}

describe("Human Resources canonical registry projections", () => {
	beforeAll(() => {
		contract = buildRegistryProjectionContract(packageRoot);
	}, 60_000);

	it("matches the intentionally reviewed semantic fixture", () => {
		expect(contract).toEqual(readRegistryProjectionFixture(fixturePath));
		expect(validateRegistryProjectionContract(contract)).toEqual([]);
	});

	it("rejects an operation without authorization", () => {
		const mutated = cloneContract();
		mutated.operations[0].permission = "";
		expect(validateRegistryProjectionContract(mutated)).toContainEqual(
			expect.objectContaining({ code: "missing-authorization" }),
		);
	});

	it("rejects duplicate operation identifiers", () => {
		const mutated = cloneContract();
		mutated.operations.push(structuredClone(mutated.operations[0]));
		expect(validateRegistryProjectionContract(mutated)).toContainEqual(
			expect.objectContaining({ code: "duplicate-operation" }),
		);
	});

	it("rejects a divergent permission projection", () => {
		const mutated = cloneContract();
		mutated.authorizationProjection[mutated.operations[0].id] =
			"human-resources.invalid.permission";
		expect(validateRegistryProjectionContract(mutated)).toContainEqual(
			expect.objectContaining({ code: "permission-projection-drift" }),
		);
	});

	it("rejects an emitted event absent from the canonical catalog", () => {
		const mutated = cloneContract();
		const operation = mutated.operations.find(
			(candidate) => candidate.eventTypes.length > 0,
		);
		expect(operation).toBeDefined();
		if (operation === undefined) {
			return;
		}
		mutated.eventCatalog = mutated.eventCatalog.filter(
			(eventType) => eventType !== operation.eventTypes[0],
		);
		expect(validateRegistryProjectionContract(mutated)).toContainEqual(
			expect.objectContaining({
				code: "event-not-catalogued",
				id: operation.id,
			}),
		);
	});

	it("rejects an operation without a temporal policy", () => {
		const mutated = cloneContract();
		const operation = mutated.operations.find(
			(candidate) => candidate.temporalPolicy === "effective-as-of",
		);
		expect(operation).toBeDefined();
		if (operation === undefined) {
			return;
		}
		operation.temporalPolicy = null;
		expect(validateRegistryProjectionContract(mutated)).toContainEqual(
			expect.objectContaining({
				code: "missing-temporal-policy",
				id: operation.id,
			}),
		);
	});

	it("rejects a sensitive operation without privacy classification", () => {
		const mutated = cloneContract();
		const operation = mutated.operations.find(
			(candidate) => candidate.privacyDisposition?.mode === "sensitive",
		);
		expect(operation).toBeDefined();
		if (operation === undefined) {
			return;
		}
		operation.privacyDisposition = null;
		expect(validateRegistryProjectionContract(mutated)).toContainEqual(
			expect.objectContaining({
				code: "missing-privacy-disposition",
				id: operation.id,
			}),
		);
	});
});
