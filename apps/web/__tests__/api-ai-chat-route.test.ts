/**
 * The Machine chat RH — session gate, fail-closed Gateway, validation.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const authMocks = vi.hoisted(() => ({
	getApiSession: vi.fn(),
}));

const envState = vi.hoisted(() => ({
	AI_GATEWAY_API_KEY: undefined as string | undefined,
	AI_THE_MACHINE_MODEL: undefined as string | undefined,
}));

const machineMocks = vi.hoisted(() => ({
	stream: vi.fn(),
	canReach: vi.fn(() => false),
}));

vi.mock("@afenda/auth", () => ({
	getApiSession: authMocks.getApiSession,
}));

vi.mock("@afenda/env", () => ({
	env: {
		get AI_GATEWAY_API_KEY() {
			return envState.AI_GATEWAY_API_KEY;
		},
		get AI_THE_MACHINE_MODEL() {
			return envState.AI_THE_MACHINE_MODEL;
		},
	},
	isVercelRuntimeNow: () => false,
}));

vi.mock("@afenda/rate-limit", () => ({
	checkRateLimit: vi.fn(async () => ({
		ok: true,
		quota: { limit: 20, remaining: 19, resetEpochMs: Date.now() + 60_000 },
	})),
	toRateLimitAppError: vi.fn(),
}));

vi.mock("@/modules/platform/ai/create-web-machine", () => ({
	canReachAiGateway: () => machineMocks.canReach(),
	createWebTheMachine: () => ({
		stream: machineMocks.stream,
		chat: vi.fn(),
		getAssistant: vi.fn(),
	}),
}));

import { POST } from "../app/api/ai/chat/route";

describe("POST /api/ai/chat", () => {
	beforeEach(() => {
		authMocks.getApiSession.mockReset();
		machineMocks.stream.mockReset();
		machineMocks.canReach.mockReturnValue(false);
		envState.AI_GATEWAY_API_KEY = undefined;
	});

	it("returns 401 when session is missing", async () => {
		authMocks.getApiSession.mockResolvedValue(null);
		const response = await POST(
			new Request("http://local.test/api/ai/chat", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					messages: [
						{
							id: "m1",
							role: "user",
							parts: [{ type: "text", text: "hi" }],
						},
					],
				}),
			}),
		);
		expect(response.status).toBe(401);
	});

	it("returns 503 when Gateway credentials are unavailable", async () => {
		authMocks.getApiSession.mockResolvedValue({
			userId: "u1",
			orgId: "o1",
			role: "client",
			email: "u@example.test",
		});
		machineMocks.canReach.mockReturnValue(false);

		const response = await POST(
			new Request("http://local.test/api/ai/chat", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					messages: [
						{
							id: "m1",
							role: "user",
							parts: [{ type: "text", text: "hi" }],
						},
					],
				}),
			}),
		);
		expect(response.status).toBe(503);
	});

	it("returns 422 for invalid body when Gateway reachable", async () => {
		authMocks.getApiSession.mockResolvedValue({
			userId: "u1",
			orgId: "o1",
			role: "client",
			email: "u@example.test",
		});
		machineMocks.canReach.mockReturnValue(true);

		const response = await POST(
			new Request("http://local.test/api/ai/chat", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ messages: [] }),
			}),
		);
		expect(response.status).toBe(422);
	});

	it("streams when session + Gateway + valid body", async () => {
		authMocks.getApiSession.mockResolvedValue({
			userId: "u1",
			orgId: "o1",
			role: "client",
			email: "u@example.test",
		});
		machineMocks.canReach.mockReturnValue(true);
		machineMocks.stream.mockResolvedValue(
			new Response("ok-stream", { status: 200 }),
		);

		const response = await POST(
			new Request("http://local.test/api/ai/chat", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					messages: [
						{
							id: "m1",
							role: "user",
							parts: [{ type: "text", text: "Help with org invites" }],
						},
					],
				}),
			}),
		);
		expect(response.status).toBe(200);
		expect(await response.text()).toBe("ok-stream");
		expect(machineMocks.stream).toHaveBeenCalledOnce();
	});
});
