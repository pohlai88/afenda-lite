import { describe, expect, it, vi } from "vitest";

const neonMocks = vi.hoisted(() => {
	const sql = vi.fn();
	return {
		getNeonSql: vi.fn(() => sql),
		sql,
	};
});

vi.mock("../src/http-transaction", () => ({
	getNeonSql: neonMocks.getNeonSql,
}));

describe("database client lazy proxy", () => {
	it("constructs once, binds methods to the database, and sends no query on access", async () => {
		const { db } = await import("../src/client");

		expect(neonMocks.getNeonSql).not.toHaveBeenCalled();
		expect(neonMocks.sql).not.toHaveBeenCalled();

		const { select } = db;
		expect(neonMocks.getNeonSql).toHaveBeenCalledTimes(1);
		expect(neonMocks.sql).not.toHaveBeenCalled();
		expect(() => select()).not.toThrow();

		const { insert } = db;
		expect(insert).toBeTypeOf("function");
		expect(neonMocks.getNeonSql).toHaveBeenCalledTimes(1);
		expect(neonMocks.sql).not.toHaveBeenCalled();
	});
});
