import path from "node:path";

import { beforeAll, describe, expect, it } from "vitest";

import {
	buildPublicContract,
	buildPublicContractFixture,
	comparePublicContracts,
	type PublicContract,
	readPublicContractFixture,
} from "./helpers/public-contract";

const packageRoot = path.resolve(import.meta.dirname, "..");
const fixturePath = path.join(
	packageRoot,
	"__tests__/fixtures/public-contract.fixture.json",
);

let contract: PublicContract;

function cloneContract(source: PublicContract): PublicContract {
	return structuredClone(source);
}

describe("@afenda/human-resources semantic public contract", () => {
	beforeAll(() => {
		contract = buildPublicContract(packageRoot);
	}, 60_000);

	it("matches the reviewed root and testing fixture", () => {
		const expected = readPublicContractFixture(fixturePath);
		const actual = buildPublicContractFixture(contract);

		expect(actual).toEqual(expected);
	});

	it("detects removal of a production symbol", () => {
		const expected = contract;
		const actual = cloneContract(expected);
		actual.entrypoints["."].symbols = actual.entrypoints["."].symbols.filter(
			(symbol) => symbol.name !== "createEmployee",
		);

		expect(comparePublicContracts(expected, actual)).toContainEqual(
			expect.objectContaining({
				code: "missing-symbol",
				entrypoint: ".",
				symbol: "createEmployee",
			}),
		);
	});

	it("detects a newly exposed internal adapter", () => {
		const expected = contract;
		const actual = cloneContract(expected);
		actual.entrypoints["."].symbols.push({
			category: "adapter",
			kind: "function",
			name: "createDrizzleEmployeeAdapter",
			signatures: [],
		});

		const issues = comparePublicContracts(expected, actual);
		expect(issues).toContainEqual(
			expect.objectContaining({
				code: "unexpected-symbol",
				entrypoint: ".",
				symbol: "createDrizzleEmployeeAdapter",
			}),
		);
		expect(issues).toContainEqual(
			expect.objectContaining({
				code: "forbidden-category",
				entrypoint: ".",
				symbol: "createDrizzleEmployeeAdapter",
			}),
		);
	});

	it("detects a capability signature change", () => {
		const expected = contract;
		const actual = cloneContract(expected);
		const createEmployee = actual.entrypoints["."].symbols.find(
			(symbol) => symbol.name === "createEmployee",
		);
		expect(createEmployee?.signatures?.[0]).toBeDefined();
		if (createEmployee?.signatures?.[0] === undefined) {
			return;
		}
		createEmployee.signatures[0].minimumArgumentCount += 1;

		expect(comparePublicContracts(expected, actual)).toContainEqual(
			expect.objectContaining({
				code: "signature-mismatch",
				entrypoint: ".",
				symbol: "createEmployee",
			}),
		);
	});

	it("detects a third package entrypoint", () => {
		const expected = contract;
		const actual = cloneContract(expected);
		actual.entrypoints["./internal"] = {
			owner: "unclassified",
			symbols: [],
		};

		expect(comparePublicContracts(expected, actual)).toContainEqual(
			expect.objectContaining({
				code: "unexpected-entrypoint",
				entrypoint: "./internal",
			}),
		);
	});

	it("detects a production symbol moved to the testing entrypoint", () => {
		const expected = contract;
		const actual = cloneContract(expected);
		const symbol = actual.entrypoints["."].symbols.find(
			(candidate) => candidate.name === "createEmployee",
		);
		expect(symbol).toBeDefined();
		if (symbol === undefined) {
			return;
		}
		actual.entrypoints["."].symbols = actual.entrypoints["."].symbols.filter(
			(candidate) => candidate.name !== symbol.name,
		);
		actual.entrypoints["./testing"].symbols.push(symbol);

		expect(comparePublicContracts(expected, actual)).toContainEqual(
			expect.objectContaining({
				code: "symbol-owner-mismatch",
				entrypoint: "./testing",
				symbol: "createEmployee",
			}),
		);
	});
});
