import { describe, expect, it } from "vitest";

import { security } from "../src";

const config = {
	origins: ["https://afenda-lite.vercel.app", "http://localhost:3000"],
} as const;

describe("@afenda/security CORS", () => {
	it("sets ACAO for allow-listed origins only", () => {
		const allowed = security.cors.project({
			config,
			requestOrigin: "https://afenda-lite.vercel.app",
		});
		expect(allowed.get("Access-Control-Allow-Origin")).toBe(
			"https://afenda-lite.vercel.app",
		);

		const denied = security.cors.project({
			config,
			requestOrigin: "https://evil.example",
		});
		expect(denied.has("Access-Control-Allow-Origin")).toBe(false);
	});

	it("trims allow-list and request origins", () => {
		const headers = security.cors.project({
			config: { origins: [" https://afenda-lite.vercel.app "] },
			requestOrigin: " https://afenda-lite.vercel.app ",
		});
		expect(headers.get("Access-Control-Allow-Origin")).toBe(
			"https://afenda-lite.vercel.app",
		);
	});

	it("rejects wildcard and blank origin config", () => {
		expect(() =>
			security.cors.project({
				config: { origins: ["*"] },
				requestOrigin: "https://afenda-lite.vercel.app",
			}),
		).toThrow(RangeError);
		expect(() =>
			security.cors.project({
				config: { origins: ["  "] },
				requestOrigin: "https://afenda-lite.vercel.app",
			}),
		).toThrow(RangeError);
	});

	it("sets credentials and exposed headers when configured", () => {
		const headers = security.cors.project({
			config: {
				...config,
				credentials: true,
				exposedHeaders: ["x-correlation-id"],
			},
			requestOrigin: "http://localhost:3000",
		});
		expect(headers.get("Access-Control-Allow-Credentials")).toBe("true");
		expect(headers.get("Access-Control-Expose-Headers")).toBe(
			"x-correlation-id",
		);
	});

	it("returns 204 preflight for allow-listed OPTIONS", () => {
		const request = new Request("http://local.test/api", {
			method: "OPTIONS",
			headers: { Origin: "http://localhost:3000" },
		});
		const response = security.cors.preflight({ request, config });
		expect(response?.status).toBe(204);
		expect(response?.headers.get("Access-Control-Allow-Origin")).toBe(
			"http://localhost:3000",
		);
	});

	it("returns null for non-OPTIONS", () => {
		const request = new Request("http://local.test/api", { method: "GET" });
		expect(security.cors.preflight({ request, config })).toBeNull();
	});

	it("returns 403 preflight for unknown origin", () => {
		const request = new Request("http://local.test/api", {
			method: "OPTIONS",
			headers: { Origin: "https://evil.example" },
		});
		expect(security.cors.preflight({ request, config })?.status).toBe(403);
	});
});

describe("@afenda/security createCorsConfig", () => {
	it("fills defaults and normalizes origins", () => {
		const created = security.cors.resolve({
			origins: [" https://afenda-lite.vercel.app "],
		});
		expect(created.origins).toEqual(["https://afenda-lite.vercel.app"]);
		expect(created.methods).toContain("HEAD");
		expect(created.allowedHeaders).toContain("x-correlation-id");
		expect(created.maxAgeSeconds).toBe(600);
	});

	it("rejects wildcard and blank origins", () => {
		expect(() => security.cors.resolve({ origins: ["*"] })).toThrow();
		expect(() => security.cors.resolve({ origins: ["  "] })).toThrow();
	});

	it("works with buildCorsHeaders after createCorsConfig", () => {
		const created = security.cors.resolve({
			origins: ["https://afenda-lite.vercel.app"],
			credentials: true,
		});
		const headers = security.cors.project({
			config: created,
			requestOrigin: "https://afenda-lite.vercel.app",
		});
		expect(headers.get("Access-Control-Allow-Origin")).toBe(
			"https://afenda-lite.vercel.app",
		);
		expect(headers.get("Access-Control-Allow-Methods")).toContain("HEAD");
		expect(headers.get("Access-Control-Allow-Credentials")).toBe("true");
	});

	it("rejects paths, unsafe tokens, and invalid max age", () => {
		expect(() =>
			security.cors.resolve({ origins: ["https://example.com/path"] }),
		).toThrow(RangeError);
		expect(() =>
			security.cors.resolve({
				origins: ["https://example.com"],
				allowedHeaders: ["X-Good\r\nX-Evil"],
			}),
		).toThrow(RangeError);
		expect(() =>
			security.cors.resolve({
				origins: ["https://example.com"],
				maxAgeSeconds: -1,
			}),
		).toThrow(RangeError);
	});
});
