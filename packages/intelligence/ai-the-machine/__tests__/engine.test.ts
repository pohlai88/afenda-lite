import { beforeEach, describe, expect, it, vi } from "vitest";

const streamTextMock = vi.hoisted(() =>
	vi.fn(() => ({
		toUIMessageStreamResponse: () =>
			new Response("stream", {
				status: 200,
				headers: { "Content-Type": "text/plain" },
			}),
	})),
);

const generateTextMock = vi.hoisted(() =>
	vi.fn(async () => ({ text: "hello from machine" })),
);

const convertMock = vi.hoisted(() =>
	vi.fn(async (messages: unknown) => messages),
);

vi.mock("ai", () => ({
	streamText: streamTextMock,
	generateText: generateTextMock,
	convertToModelMessages: convertMock,
}));

import type { LanguageModel } from "ai";
import { createTheMachine } from "../src/create-the-machine";

describe("createTheMachine", () => {
	beforeEach(() => {
		streamTextMock.mockClear();
		generateTextMock.mockClear();
		convertMock.mockClear();
	});

	const model = { modelId: "test-model" } as LanguageModel;

	const context = {
		conversationId: "c1",
		userId: "u1",
		organizationId: "o1",
		module: "general" as const,
		language: "en" as const,
	};

	const messages = [
		{
			id: "m1",
			role: "user" as const,
			parts: [{ type: "text" as const, text: "Hello" }],
		},
	];

	it("streams via streamText and returns UI message response", async () => {
		const machine = createTheMachine({ model });
		const response = await machine.stream({ messages, context });
		expect(response.status).toBe(200);
		expect(streamTextMock).toHaveBeenCalledOnce();
		expect(await response.text()).toBe("stream");
	});

	it("chats via generateText", async () => {
		const machine = createTheMachine({ model });
		const result = await machine.chat({ messages, context });
		expect(result.text).toBe("hello from machine");
		expect(result.module).toBe("general");
		expect(generateTextMock).toHaveBeenCalledOnce();
	});

	it("resolves platform assistant", () => {
		const machine = createTheMachine({ model });
		expect(machine.getAssistant("platform").module).toBe("platform");
	});
});
