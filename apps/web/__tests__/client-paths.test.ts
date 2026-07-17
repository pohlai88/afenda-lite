import { describe, expect, it } from "vitest";

import {
	CLIENT_DASHBOARD_PATH,
	CLIENT_GATE_PATHS,
	CLIENT_LOGIN_PATH,
	CLIENT_PREVIEW_UNAVAILABLE_PATH,
} from "../features/auth/client-paths";

describe("client path SSOT", () => {
	it("keeps gate paths aligned with session-gate bypasses", () => {
		expect(CLIENT_LOGIN_PATH).toBe("/client/login");
		expect(CLIENT_PREVIEW_UNAVAILABLE_PATH).toBe("/client/preview-unavailable");
		expect([...CLIENT_GATE_PATHS]).toEqual([
			"/client/login",
			"/client/preview-unavailable",
		]);
	});

	it("keeps workspace declarations home path stable", () => {
		expect(CLIENT_DASHBOARD_PATH).toBe("/client/declarations");
	});
});
