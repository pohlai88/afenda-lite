import { describe, expect, it, vi } from "vitest";

const neonMocks = vi.hoisted(() => {
	const sql = vi.fn();
	return {
		getNeonDriverSql: vi.fn(() => sql),
		sql,
	};
});

vi.mock("../src/http-transaction", () => ({
	getNeonDriverSql: neonMocks.getNeonDriverSql,
}));

describe("database client lazy proxy", () => {
	it("constructs once, binds methods to the database, and sends no query on access", async () => {
		const { db } = await import("../src/client");

		expect(neonMocks.getNeonDriverSql).not.toHaveBeenCalled();
		expect(neonMocks.sql).not.toHaveBeenCalled();

		const { select } = db;
		expect(neonMocks.getNeonDriverSql).toHaveBeenCalledTimes(1);
		expect(neonMocks.sql).not.toHaveBeenCalled();
		expect(() => select()).not.toThrow();

		const { insert } = db;
		expect(insert).toBeTypeOf("function");
		expect(neonMocks.getNeonDriverSql).toHaveBeenCalledTimes(1);
		expect(neonMocks.sql).not.toHaveBeenCalled();
	});
});
