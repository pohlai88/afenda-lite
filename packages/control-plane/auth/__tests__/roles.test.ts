import { describe, expect, it } from "vitest";

import {
	canInviteMember,
	inviteableRolesFor,
	roleSatisfies,
	toNeonOrgRole,
	toSessionRole,
} from "../src/roles";

describe("roleSatisfies", () => {
	it("lets admin satisfy operator shells", () => {
		expect(roleSatisfies("admin", "operator")).toBe(true);
	});

	it("does not let operator satisfy admin shells", () => {
		expect(roleSatisfies("operator", "admin")).toBe(false);
	});

	it("keeps client exclusive", () => {
		expect(roleSatisfies("client", "client")).toBe(true);
		expect(roleSatisfies("admin", "client")).toBe(false);
		expect(roleSatisfies("client", "operator")).toBe(false);
	});
});

describe("Neon ↔ session role map", () => {
	it("round-trips every Afenda shell role", () => {
		for (const role of ["admin", "operator", "client"] as const) {
			expect(toSessionRole(toNeonOrgRole(role))).toBe(role);
		}
	});

	it("rejects unknown Neon roles", () => {
		expect(() => toSessionRole("superuser")).toThrow(/unhandled Neon org role/);
	});
});

describe("canInviteMember / inviteableRolesFor", () => {
	it("lets operators invite clients only", () => {
		expect(canInviteMember("operator", "client")).toBe(true);
		expect(canInviteMember("operator", "operator")).toBe(false);
		expect(canInviteMember("operator", "admin")).toBe(false);
		expect(inviteableRolesFor("operator")).toEqual(["client"]);
	});

	it("lets admin invite every membership role", () => {
		expect(canInviteMember("admin", "client")).toBe(true);
		expect(canInviteMember("admin", "operator")).toBe(true);
		expect(canInviteMember("admin", "admin")).toBe(true);
		expect(inviteableRolesFor("admin")).toEqual([
			"client",
			"operator",
			"admin",
		]);
	});

	it("blocks clients from inviting", () => {
		expect(canInviteMember("client", "client")).toBe(false);
		expect(inviteableRolesFor("client")).toEqual([]);
	});
});
