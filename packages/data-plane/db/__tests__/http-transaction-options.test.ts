import { beforeEach, describe, expect, it, vi } from "vitest";

const TEST_DATABASE_URL =
	"postgresql://user:password@ep-example-pooler.region.aws.neon.tech/neondb";

const neonMocks = vi.hoisted(() => {
	const transaction = vi.fn();
	const sql = Object.assign(
		vi.fn((strings: TemplateStringsArray) => ({ text: strings.join("") })),
		{ transaction },
	);
	return {
		neon: vi.fn(() => sql),
		sql,
		transaction,
	};
});

vi.mock("@neondatabase/serverless", () => ({ neon: neonMocks.neon }));
vi.mock("../src/env", () => ({
	requireProductDatabaseUrl: () => TEST_DATABASE_URL,
}));

beforeEach(() => {
	vi.resetModules();
	neonMocks.neon.mockClear();
	neonMocks.sql.mockClear();
	neonMocks.transaction.mockReset();
});

describe("runNeonHttpTransaction options", () => {
	it("preserves query order and supplies ReadCommitted by default", async () => {
		const resultRows = [[{ id: "first" }], [{ id: "second" }]];
		neonMocks.transaction.mockResolvedValueOnce(resultRows);
		const { runNeonHttpTransaction } = await import("../src/http-transaction");

		const result = await runNeonHttpTransaction((sql) => [
			sql`SELECT 1`,
			sql`SELECT 2`,
		]);

		const firstQuery = neonMocks.sql.mock.results[0]?.value;
		const secondQuery = neonMocks.sql.mock.results[1]?.value;
		expect(neonMocks.transaction).toHaveBeenCalledWith(
			[firstQuery, secondQuery],
			{ isolationLevel: "ReadCommitted" },
		);
		expect(result).toBe(resultRows);
	});

	it("forwards a valid serializable read-only deferrable combination", async () => {
		neonMocks.transaction.mockResolvedValueOnce([[]]);
		const { runNeonHttpTransaction } = await import("../src/http-transaction");

		await runNeonHttpTransaction((sql) => [sql`SELECT 1`], {
			deferrable: true,
			isolationLevel: "Serializable",
			readOnly: true,
		});

		expect(neonMocks.transaction).toHaveBeenCalledWith(expect.any(Array), {
			deferrable: true,
			isolationLevel: "Serializable",
			readOnly: true,
		});
	});

	it.each([
		{ deferrable: true },
		{ deferrable: true, isolationLevel: "Serializable" as const },
		{ deferrable: true, readOnly: true },
		{
			deferrable: true,
			isolationLevel: "RepeatableRead" as const,
			readOnly: true,
		},
	])("rejects invalid deferrable options before client creation", async (options) => {
		const { runNeonHttpTransaction } = await import("../src/http-transaction");

		await expect(
			runNeonHttpTransaction((sql) => [sql`SELECT 1`], options),
		).rejects.toThrow(/deferrable requires readOnly=true/);
		expect(neonMocks.neon).not.toHaveBeenCalled();
		expect(neonMocks.transaction).not.toHaveBeenCalled();
	});

	it("propagates transaction failure unchanged and does not retry", async () => {
		const failure = new Error("transaction failed");
		neonMocks.transaction.mockRejectedValueOnce(failure);
		const { runNeonHttpTransaction } = await import("../src/http-transaction");

		await expect(runNeonHttpTransaction((sql) => [sql`SELECT 1`])).rejects.toBe(
			failure,
		);
		expect(neonMocks.transaction).toHaveBeenCalledTimes(1);
	});
});
