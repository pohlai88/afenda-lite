import { describe, expect, it } from "vitest";

import { chatRequestSchema, conversationContextSchema } from "../src/schemas";

describe("@afenda/ai-the-machine schemas", () => {
	it("accepts a minimal useChat UIMessage body", () => {
		const parsed = chatRequestSchema.parse({
			messages: [
				{
					id: "m1",
					role: "user",
					parts: [{ type: "text", text: "Help with org invites" }],
				},
			],
			module: "platform",
		});
		expect(parsed.module).toBe("platform");
		expect(parsed.messages).toHaveLength(1);
	});

	it("rejects client tenant spoof fields by omission (strict object)", () => {
		const result = chatRequestSchema.safeParse({
			messages: [
				{
					id: "m1",
					role: "user",
					parts: [{ type: "text", text: "hi" }],
				},
			],
			userId: "attacker",
			organizationId: "spoof-org",
		});
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data).not.toHaveProperty("userId");
			expect(result.data).not.toHaveProperty("organizationId");
		}
	});

	it("requires server-minted conversation context fields", () => {
		const parsed = conversationContextSchema.parse({
			conversationId: "c1",
			userId: "u1",
			organizationId: "o1",
			module: "general",
		});
		expect(parsed.language).toBe("en");
	});

	it("rejects oversized user text parts", () => {
		const result = chatRequestSchema.safeParse({
			messages: [
				{
					id: "m1",
					role: "user",
					parts: [{ type: "text", text: "x".repeat(9000) }],
				},
			],
		});
		expect(result.success).toBe(false);
	});
});
