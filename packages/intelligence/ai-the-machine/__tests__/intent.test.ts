import { describe, expect, it } from "vitest";
import { estimateTokens, truncateContext } from "../src/context";
import { classifyIntent } from "../src/intent";

describe("classifyIntent", () => {
	it("routes org/rbac language to platform", () => {
		expect(
			classifyIntent("How do I invite a member to my organization?").module,
		).toBe("platform");
	});

	it("routes session language to identity", () => {
		expect(classifyIntent("My sign-in session expired").module).toBe(
			"identity",
		);
	});

	it("falls back to general", () => {
		expect(classifyIntent("Hello there").module).toBe("general");
	});
});

describe("estimateTokens / truncateContext", () => {
	it("estimates positive tokens for english text", () => {
		expect(estimateTokens("one two three four")).toBeGreaterThan(0);
	});

	it("truncates when over budget", () => {
		const long = "word ".repeat(500);
		const truncated = truncateContext(long, 20);
		expect(truncated.length).toBeLessThan(long.length);
		expect(truncated).toContain("[truncated]");
	});
});
