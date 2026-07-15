import { describe, expect, it } from "vitest";

import { shouldBypassSessionGate } from "../session-gate-policy";

function req(partial: {
	method?: string;
	pathname: string;
	search?: Record<string, string>;
	headers?: string[];
}) {
	const searchParams = new URLSearchParams(partial.search);
	const headerSet = new Set(
		(partial.headers ?? []).map((name) => name.toLowerCase()),
	);

	return {
		method: partial.method ?? "GET",
		pathname: partial.pathname,
		searchParams,
		hasHeader: (name: string) => headerSet.has(name.toLowerCase()),
	};
}

describe("shouldBypassSessionGate", () => {
	it("does not bypass ordinary protected GET navigations", () => {
		expect(shouldBypassSessionGate(req({ pathname: "/fft" }))).toBe(false);
		expect(shouldBypassSessionGate(req({ pathname: "/admin" }))).toBe(false);
		expect(
			shouldBypassSessionGate(req({ pathname: "/client/dashboard" })),
		).toBe(false);
	});

	it("bypasses Server Actions only when method is POST with next-action", () => {
		expect(
			shouldBypassSessionGate(
				req({
					method: "POST",
					pathname: "/fft",
					headers: ["next-action"],
				}),
			),
		).toBe(true);

		expect(
			shouldBypassSessionGate(
				req({
					method: "GET",
					pathname: "/fft",
					headers: ["next-action"],
				}),
			),
		).toBe(false);
	});

	it("bypasses ARCH-012 embed and client public prefixes", () => {
		expect(
			shouldBypassSessionGate(
				req({ pathname: "/fft", search: { embed: "1" } }),
			),
		).toBe(true);

		expect(shouldBypassSessionGate(req({ pathname: "/client/login" }))).toBe(
			true,
		);
		expect(
			shouldBypassSessionGate(req({ pathname: "/client/preview-unavailable" })),
		).toBe(true);
	});
});
