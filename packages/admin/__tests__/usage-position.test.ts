import { describe, expect, it } from "vitest";

import { bandFor } from "../src/usage-bands";
import { buildUsagePosition } from "../src/usage-position";

describe("bandFor", () => {
	it("maps activeMembers cutpoints", () => {
		expect(bandFor("activeMembers", 0)).toBe("quiet");
		expect(bandFor("activeMembers", 4)).toBe("quiet");
		expect(bandFor("activeMembers", 5)).toBe("active");
		expect(bandFor("activeMembers", 24)).toBe("active");
		expect(bandFor("activeMembers", 25)).toBe("heavy");
		expect(bandFor("activeMembers", 99)).toBe("heavy");
		expect(bandFor("activeMembers", 100)).toBe("critical");
	});

	it("maps activeRoleAssignments cutpoints", () => {
		expect(bandFor("activeRoleAssignments", 4)).toBe("quiet");
		expect(bandFor("activeRoleAssignments", 5)).toBe("active");
		expect(bandFor("activeRoleAssignments", 20)).toBe("heavy");
		expect(bandFor("activeRoleAssignments", 50)).toBe("critical");
	});

	it("maps rbacAuditEvents cutpoints", () => {
		expect(bandFor("rbacAuditEvents", 49)).toBe("quiet");
		expect(bandFor("rbacAuditEvents", 50)).toBe("active");
		expect(bandFor("rbacAuditEvents", 500)).toBe("heavy");
		expect(bandFor("rbacAuditEvents", 5000)).toBe("critical");
	});
});

describe("buildUsagePosition", () => {
	it("builds quiet matrix with empty alerts", () => {
		expect(
			buildUsagePosition({
				orgId: "org-1",
				period: "2026-07",
				counts: {
					activeMembers: 2,
					rbacAuditEvents: 7,
					activeRoleAssignments: 3,
				},
			}),
		).toEqual({
			orgId: "org-1",
			period: "2026-07",
			metrics: {
				activeMembers: { current: 2, band: "quiet" },
				rbacAuditEvents: { current: 7, band: "quiet" },
				activeRoleAssignments: { current: 3, band: "quiet" },
			},
			alerts: [],
		});
	});

	it("emits warning for heavy and critical for critical bands", () => {
		expect(
			buildUsagePosition({
				orgId: "org-1",
				period: "2026-07",
				counts: {
					activeMembers: 30,
					rbacAuditEvents: 6000,
					activeRoleAssignments: 1,
				},
			}),
		).toEqual({
			orgId: "org-1",
			period: "2026-07",
			metrics: {
				activeMembers: { current: 30, band: "heavy" },
				rbacAuditEvents: { current: 6000, band: "critical" },
				activeRoleAssignments: { current: 1, band: "quiet" },
			},
			alerts: [
				{ metric: "activeMembers", level: "warning" },
				{ metric: "rbacAuditEvents", level: "critical" },
			],
		});
	});
});
