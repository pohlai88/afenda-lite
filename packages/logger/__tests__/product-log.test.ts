import { afterEach, describe, expect, it, vi } from "vitest";

import { logProductEvent as logProductEventEdge } from "../src/edge";
import { logProductEvent } from "../src/product-log";

describe("logProductEvent (Node / Pino)", () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("emits allowlisted fields with string level and service binding", () => {
		const chunks: string[] = [];
		vi.spyOn(process.stdout, "write").mockImplementation((chunk) => {
			chunks.push(String(chunk));
			return true;
		});

		logProductEvent({
			level: "info",
			event: "org_role.assign.ok",
			correlationId: "11111111-1111-4111-8111-111111111111",
			orgId: "org-1",
		});

		const line = chunks.find((c) => c.includes("org_role.assign.ok"));
		expect(line).toBeDefined();
		const parsed: unknown = JSON.parse(line ?? "{}");
		expect(parsed).toEqual(
			expect.objectContaining({
				level: "info",
				service: "afenda-web",
				event: "org_role.assign.ok",
				correlationId: "11111111-1111-4111-8111-111111111111",
				orgId: "org-1",
			}),
		);
	});

	it("supports service override for non-web emitters", () => {
		const chunks: string[] = [];
		vi.spyOn(process.stdout, "write").mockImplementation((chunk) => {
			chunks.push(String(chunk));
			return true;
		});

		logProductEvent(
			{
				level: "error",
				event: "auth_bff.unexpected_error",
				correlationId: "22222222-2222-4222-8222-222222222222",
				path: "/api/auth/x",
			},
			{ service: "afenda-auth-bff" },
		);

		const line = chunks.find((c) => c.includes("auth_bff.unexpected_error"));
		expect(line).toBeDefined();
		const parsed: unknown = JSON.parse(line ?? "{}");
		expect(parsed).toEqual(
			expect.objectContaining({
				level: "error",
				service: "afenda-auth-bff",
				path: "/api/auth/x",
			}),
		);
	});
});

describe("logProductEvent (edge)", () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("writes closed JSON fields via console", () => {
		const info = vi.spyOn(console, "info").mockImplementation(() => {});

		logProductEventEdge({
			level: "info",
			event: "proxy.session_redirect",
			correlationId: "33333333-3333-4333-8333-333333333333",
			path: "/dashboard",
		});

		expect(info).toHaveBeenCalledTimes(1);
		const parsed: unknown = JSON.parse(String(info.mock.calls[0]?.[0]));
		expect(parsed).toEqual(
			expect.objectContaining({
				time: expect.any(String),
				level: "info",
				service: "afenda-web",
				event: "proxy.session_redirect",
				correlationId: "33333333-3333-4333-8333-333333333333",
				path: "/dashboard",
			}),
		);
	});
});
