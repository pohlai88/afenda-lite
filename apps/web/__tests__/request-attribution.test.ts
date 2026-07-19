import { beforeEach, describe, expect, it, vi } from "vitest";

const headersMock = vi.fn();

vi.mock("next/headers", () => ({
	headers: () => headersMock(),
}));

describe("readRequestAttribution", () => {
	beforeEach(() => {
		headersMock.mockReset();
		vi.resetModules();
	});

	it("prefers first x-forwarded-for hop and truncates user-agent", async () => {
		const longUa = `UA-${"a".repeat(600)}`;
		headersMock.mockResolvedValue({
			get(name: string) {
				if (name === "x-forwarded-for") {
					return "203.0.113.10, 198.51.100.1";
				}
				if (name === "user-agent") {
					return longUa;
				}
				return null;
			},
		});

		const { readRequestAttribution } = await import(
			"../modules/platform/domain/request-attribution"
		);

		await expect(readRequestAttribution()).resolves.toEqual({
			ipAddress: "203.0.113.10",
			userAgent: longUa.slice(0, 512),
		});
	});

	it("falls back to x-real-ip when forwarded is absent", async () => {
		headersMock.mockResolvedValue({
			get(name: string) {
				if (name === "x-real-ip") {
					return "198.51.100.20";
				}
				return null;
			},
		});

		const { readRequestAttribution } = await import(
			"../modules/platform/domain/request-attribution"
		);

		await expect(readRequestAttribution()).resolves.toEqual({
			ipAddress: "198.51.100.20",
			userAgent: undefined,
		});
	});
});
