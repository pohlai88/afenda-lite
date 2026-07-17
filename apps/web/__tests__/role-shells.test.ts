import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
	CLIENT_DASHBOARD_PATH,
	CLIENT_GATE_PATHS,
} from "../features/auth/client-paths";
import { OPERATOR_SHELL_PATHS } from "../features/auth/operator-paths";

const webRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

/**
 * GUIDE-018 I1.4 — Living shell wiring (fail-closed layouts).
 * Path SSOT for `/403` / `/auth/login` lives in `@afenda/auth` unit tests.
 */
describe("role shells wiring (I1.4)", () => {
	it("wires operator route-group layout to requireRole('operator')", () => {
		const source = readFileSync(
			join(webRoot, "app/(operator)/layout.tsx"),
			"utf8",
		);
		expect(source).toContain('requireRole("operator")');
		expect(source).toContain("OperatorPlatformShell");
		expect(OPERATOR_SHELL_PATHS).toEqual(["/admin", "/fft"]);
	});

	it("wires client workspace layout to requireRole('client')", () => {
		const source = readFileSync(
			join(webRoot, "app/(client)/client/(workspace)/layout.tsx"),
			"utf8",
		);
		expect(source).toContain('requireRole("client")');
		expect(CLIENT_DASHBOARD_PATH).toBe("/client/declarations");
		expect([...CLIENT_GATE_PATHS]).not.toContain(CLIENT_DASHBOARD_PATH);
	});

	it("exposes the public /403 page via ForbiddenShell", () => {
		const source = readFileSync(
			join(webRoot, "app/(public)/403/page.tsx"),
			"utf8",
		);
		expect(source).toContain("ForbiddenShell");
	});
});
