import { afterEach, describe, expect, it, vi } from "vitest";

import { logger as edgeLogger } from "../src/edge";
import { logger as nodeLogger } from "../src/index";

const EVENT = {
	level: "warn",
	event: "auth_bff.rate_limited",
	correlationId: "11111111-1111-4111-8111-111111111111",
	orgId: "org-1",
	path: "/api/auth/sign-in",
	code: "RATE_LIMITED",
} as const;

describe("logger capability", () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("projects the canonical fields through Node/Pino", () => {
		const chunks: string[] = [];
		vi.spyOn(process.stdout, "write").mockImplementation((chunk) => {
			chunks.push(String(chunk));
			return true;
		});

		nodeLogger.event(EVENT, { service: "afenda-auth-bff" });

		const line = chunks.find((chunk) => chunk.includes(EVENT.event));
		expect(line).toBeDefined();
		expect(JSON.parse(line ?? "{}")).toEqual(
			expect.objectContaining({
				time: expect.any(String),
				service: "afenda-auth-bff",
				...EVENT,
			}),
		);
	});

	it("projects the same canonical fields through the edge sink", () => {
		const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);

		edgeLogger.event(EVENT, { service: "afenda-auth-bff" });

		expect(warn).toHaveBeenCalledTimes(1);
		expect(JSON.parse(String(warn.mock.calls[0]?.[0]))).toEqual(
			expect.objectContaining({
				time: expect.any(String),
				service: "afenda-auth-bff",
				...EVENT,
			}),
		);
	});

	it("uses the same default service in both projections", () => {
		const info = vi.spyOn(console, "info").mockImplementation(() => undefined);
		edgeLogger.event({ ...EVENT, level: "info" });
		const parsed = JSON.parse(String(info.mock.calls[0]?.[0]));
		expect(parsed.service).toBe("afenda-web");
	});

	it.each([
		"Authorization",
		"Cookie",
		"Set-Cookie",
		"X-Auth-Token",
		"X-Cookie-Secret",
		"api_key",
	])("redacts hostile sensitive field spelling %s", (name) => {
		expect(nodeLogger.redactFieldValue(name, "credential")).toBe("[redacted]");
		expect(edgeLogger.redactFieldValue(name, "credential")).toBe("[redacted]");
	});

	it("preserves non-sensitive field values", () => {
		expect(
			nodeLogger.redactFieldValue("Content-Type", "application/json"),
		).toBe("application/json");
	});
});
