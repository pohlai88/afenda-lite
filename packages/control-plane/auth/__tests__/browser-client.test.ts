import { beforeEach, describe, expect, it, vi } from "vitest";

const createAuthClientMock = vi.fn();

vi.mock("@neondatabase/auth/next", () => ({
	createAuthClient: () => createAuthClientMock(),
}));

describe("getBrowserAuthClient (N5)", () => {
	beforeEach(() => {
		vi.resetModules();
		createAuthClientMock.mockReset();
		createAuthClientMock.mockReturnValue({ id: "browser-client" });
	});

	it("creates a singleton via createAuthClient()", async () => {
		const { getBrowserAuthClient, resetBrowserAuthClientForTests } =
			await import("../src/client");
		resetBrowserAuthClientForTests();

		const first = getBrowserAuthClient();
		const second = getBrowserAuthClient();

		expect(createAuthClientMock).toHaveBeenCalledTimes(1);
		expect(first).toBe(second);
		expect(first).toEqual({ id: "browser-client" });
	});

	it("resetBrowserAuthClientForTests clears the singleton", async () => {
		const { getBrowserAuthClient, resetBrowserAuthClientForTests } =
			await import("../src/client");
		resetBrowserAuthClientForTests();
		createAuthClientMock.mockClear();

		getBrowserAuthClient();
		resetBrowserAuthClientForTests();
		createAuthClientMock.mockReturnValue({ id: "browser-client-2" });
		const next = getBrowserAuthClient();

		expect(createAuthClientMock).toHaveBeenCalledTimes(2);
		expect(next).toEqual({ id: "browser-client-2" });
	});
});
