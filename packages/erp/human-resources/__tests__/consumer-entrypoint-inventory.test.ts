import path from "node:path";

import { beforeAll, describe, expect, it } from "vitest";

import {
	buildConsumerInventory,
	type ConsumerInventory,
	classifyConsumerDisposition,
	readConsumerInventoryFixture,
} from "./helpers/consumer-inventory";

const packageRoot = path.resolve(import.meta.dirname, "..");
const workspaceRoot = path.resolve(packageRoot, "../../..");
const fixturePath = path.join(
	packageRoot,
	"__tests__/fixtures/consumer-inventory.fixture.json",
);

let inventory: ConsumerInventory;

describe("@afenda/human-resources consumer and entrypoint inventory", () => {
	beforeAll(() => {
		inventory = buildConsumerInventory(workspaceRoot, packageRoot);
	}, 60_000);

	it("matches the reviewed resolver-backed manifest", () => {
		expect(inventory).toEqual(readConsumerInventoryFixture(fixturePath));
	});

	it("contains no rejected consumer", () => {
		expect(
			inventory.references.filter(
				(reference) => reference.disposition === "forbidden",
			),
		).toEqual([]);
	});

	it("allowlists every test-only entrypoint consumer by exact file", () => {
		const testingConsumers = inventory.references
			.filter((reference) => reference.entrypoint === "./testing")
			.map((reference) => reference.file);

		expect([...new Set(testingConsumers)].toSorted()).toEqual(
			inventory.approvedTestingConsumers,
		);
	});

	it("rejects production access to the testing entrypoint", () => {
		expect(
			classifyConsumerDisposition({
				consumerClass: "production",
				entrypoint: "./testing",
				referenceKind: "module",
				resolution: "resolved",
			}),
		).toBe("forbidden");
	});

	it("rejects deep internal imports even from tests", () => {
		expect(
			classifyConsumerDisposition({
				consumerClass: "testing",
				entrypoint: "deep-internal",
				referenceKind: "module",
				resolution: "resolved",
			}),
		).toBe("forbidden");
	});
});
