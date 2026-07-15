import { describe, expect, it } from "vitest";

describe("@afenda/env", () => {
	it("exports typed env under SKIP_ENV_VALIDATION", async () => {
		process.env.SKIP_ENV_VALIDATION = "true";
		const { env } = await import("../src/web");
		expect(env).toBeDefined();
		expect(typeof env).toBe("object");
	});
});
