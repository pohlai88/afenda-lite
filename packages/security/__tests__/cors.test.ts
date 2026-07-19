import { describe, expect, it } from "vitest";

import {
	ACCESS_CONTROL_ALLOW_CREDENTIALS,
	ACCESS_CONTROL_ALLOW_METHODS,
	ACCESS_CONTROL_ALLOW_ORIGIN,
	ACCESS_CONTROL_EXPOSE_HEADERS,
	buildCorsHeaders,
	createCorsConfig,
	handleCorsPreflight,
} from "../src/cors";

const config = {
	origins: ["https://afenda-lite.vercel.app", "http://localhost:3000"],
} as const;

describe("@afenda/security CORS", () => {
	it("sets ACAO for allow-listed origins only", () => {
		const allowed = buildCorsHeaders({
			config,
			requestOrigin: "https://afenda-lite.vercel.app",
		});
		expect(allowed.get(ACCESS_CONTROL_ALLOW_ORIGIN)).toBe(
			"https://afenda-lite.vercel.app",
		);

		const denied = buildCorsHeaders({
			config,
			requestOrigin: "https://evil.example",
		});
		expect(denied.has(ACCESS_CONTROL_ALLOW_ORIGIN)).toBe(false);
	});

	it("trims allow-list and request origins", () => {
		const headers = buildCorsHeaders({
			config: { origins: [" https://afenda-lite.vercel.app "] },
			requestOrigin: " https://afenda-lite.vercel.app ",
		});
		expect(headers.get(ACCESS_CONTROL_ALLOW_ORIGIN)).toBe(
			"https://afenda-lite.vercel.app",
		);
	});

	it("rejects wildcard and blank origin config", () => {
		expect(() =>
			buildCorsHeaders({
				config: { origins: ["*"] },
				requestOrigin: "https://afenda-lite.vercel.app",
			}),
		).toThrow(/wildcard/);
		expect(() =>
			buildCorsHeaders({
				config: { origins: ["  "] },
				requestOrigin: "https://afenda-lite.vercel.app",
			}),
		).toThrow(/blank/);
	});

	it("sets credentials and exposed headers when configured", () => {
		const headers = buildCorsHeaders({
			config: {
				...config,
				credentials: true,
				exposedHeaders: ["x-correlation-id"],
			},
			requestOrigin: "http://localhost:3000",
		});
		expect(headers.get(ACCESS_CONTROL_ALLOW_CREDENTIALS)).toBe("true");
		expect(headers.get(ACCESS_CONTROL_EXPOSE_HEADERS)).toBe("x-correlation-id");
	});

	it("returns 204 preflight for allow-listed OPTIONS", () => {
		const request = new Request("http://local.test/api", {
			method: "OPTIONS",
			headers: { Origin: "http://localhost:3000" },
		});
		const response = handleCorsPreflight({ request, config });
		expect(response?.status).toBe(204);
		expect(response?.headers.get(ACCESS_CONTROL_ALLOW_ORIGIN)).toBe(
			"http://localhost:3000",
		);
	});

	it("returns null for non-OPTIONS", () => {
		const request = new Request("http://local.test/api", { method: "GET" });
		expect(handleCorsPreflight({ request, config })).toBeNull();
	});

	it("returns 403 preflight for unknown origin", () => {
		const request = new Request("http://local.test/api", {
			method: "OPTIONS",
			headers: { Origin: "https://evil.example" },
		});
		expect(handleCorsPreflight({ request, config })?.status).toBe(403);
	});
});

describe("@afenda/security createCorsConfig", () => {
	it("fills defaults and normalizes origins", () => {
		const created = createCorsConfig({
			origins: [" https://afenda-lite.vercel.app "],
		});
		expect(created.origins).toEqual(["https://afenda-lite.vercel.app"]);
		expect(created.methods).toContain("HEAD");
		expect(created.allowedHeaders).toContain("x-correlation-id");
		expect(created.maxAgeSeconds).toBe(600);
	});

	it("rejects wildcard and blank origins", () => {
		expect(() => createCorsConfig({ origins: ["*"] })).toThrow(/wildcard/);
		expect(() => createCorsConfig({ origins: ["  "] })).toThrow(/blank/);
	});

	it("works with buildCorsHeaders after createCorsConfig", () => {
		const created = createCorsConfig({
			origins: ["https://afenda-lite.vercel.app"],
			credentials: true,
		});
		const headers = buildCorsHeaders({
			config: created,
			requestOrigin: "https://afenda-lite.vercel.app",
		});
		expect(headers.get(ACCESS_CONTROL_ALLOW_ORIGIN)).toBe(
			"https://afenda-lite.vercel.app",
		);
		expect(headers.get(ACCESS_CONTROL_ALLOW_METHODS)).toContain("HEAD");
		expect(headers.get(ACCESS_CONTROL_ALLOW_CREDENTIALS)).toBe("true");
	});
});
