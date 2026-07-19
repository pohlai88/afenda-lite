import { afterEach, describe, expect, it, vi } from "vitest";

import { createLogger } from "../src/create-logger";
import { createEdgeLogger } from "../src/edge";
import { DEFAULT_REDACT_PATHS } from "../src/redact-paths";

describe("createLogger", () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("returns a pino logger with configured level", () => {
		const logger = createLogger({ service: "afenda-web", level: "debug" });
		expect(logger.level).toBe("debug");
		expect(typeof logger.child).toBe("function");
	});

	it("exports default redact paths for sensitive keys", () => {
		expect(DEFAULT_REDACT_PATHS).toContain("password");
		expect(DEFAULT_REDACT_PATHS).toContain("authorization");
		expect(DEFAULT_REDACT_PATHS).toContain("*.token");
	});

	it("redacts sensitive fields on write", () => {
		const chunks: string[] = [];
		const write = vi
			.spyOn(process.stdout, "write")
			.mockImplementation((chunk) => {
				chunks.push(String(chunk));
				return true;
			});

		try {
			const logger = createLogger({ service: "test-service" });
			logger.info({
				event: "probe",
				password: "super-secret",
				ok: "visible",
			});
		} finally {
			write.mockRestore();
		}

		const line = chunks.find((c) => c.includes('"event":"probe"'));
		expect(line).toBeDefined();
		const parsed = JSON.parse(line ?? "{}") as Record<string, unknown>;
		expect(parsed.service).toBe("test-service");
		expect(parsed.level).toBe("info");
		expect(parsed.password).toBe("[Redacted]");
		expect(parsed.ok).toBe("visible");
	});

	it("child bindings appear on every line", () => {
		const chunks: string[] = [];
		const write = vi
			.spyOn(process.stdout, "write")
			.mockImplementation((chunk) => {
				chunks.push(String(chunk));
				return true;
			});

		try {
			const logger = createLogger({ service: "afenda-auth-bff" });
			const child = logger.child({
				correlationId: "44444444-4444-4444-8444-444444444444",
			});
			child.error({
				event: "auth_bff.unexpected_error",
				path: "/api/auth/ok",
				method: "POST",
			});
		} finally {
			write.mockRestore();
		}

		const line = chunks.find((c) => c.includes("auth_bff.unexpected_error"));
		expect(line).toBeDefined();
		const parsed = JSON.parse(line ?? "{}") as Record<string, unknown>;
		expect(parsed).toEqual(
			expect.objectContaining({
				level: "error",
				service: "afenda-auth-bff",
				correlationId: "44444444-4444-4444-8444-444444444444",
				event: "auth_bff.unexpected_error",
				path: "/api/auth/ok",
				method: "POST",
			}),
		);
	});
});

describe("createEdgeLogger", () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("merges child bindings into every line", () => {
		const info = vi.spyOn(console, "info").mockImplementation(() => {});

		const log = createEdgeLogger({ service: "afenda-web" }).child({
			correlationId: "55555555-5555-4555-8555-555555555555",
			module: "proxy",
		});
		log.info({ event: "proxy.session_redirect", path: "/account" });

		expect(info).toHaveBeenCalledTimes(1);
		const parsed = JSON.parse(String(info.mock.calls[0]?.[0])) as Record<
			string,
			unknown
		>;
		expect(parsed).toEqual(
			expect.objectContaining({
				service: "afenda-web",
				level: "info",
				correlationId: "55555555-5555-4555-8555-555555555555",
				module: "proxy",
				event: "proxy.session_redirect",
				path: "/account",
			}),
		);
	});
});
