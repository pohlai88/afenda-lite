/**
 * HR-OPS-LEAVE-OVERLAP-GUARD — exclusion register (command + Serializable TX bar).
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const registerPath = fileURLToPath(
	new URL(
		"../../../../docs-V2/_scratch/erp/human-resources-enterprise-audit/hr-leave-overlap-exclusion-register.json",
		import.meta.url,
	),
);
const leaveGuardsPath = fileURLToPath(
	new URL(
		"../../../../packages/erp/human-resources/src/shared/leave-guards.ts",
		import.meta.url,
	),
);
const register = JSON.parse(readFileSync(registerPath, "utf8")) as {
	mission: string;
	closedOn: string;
	finding: string;
	tables: string[];
	overlapPolicies: Array<{
		table: string;
		policy: string;
		blockingStatuses: string[];
		segmentRule: string;
		enforcement: string;
		databaseOverlapExclusion: boolean;
		enforcementSurface: string[];
		notes: string;
	}>;
	verification: string[];
};

function readActiveLeaveOverlapStatusesFromLeaveGuards(): string[] {
	const source = readFileSync(leaveGuardsPath, "utf8");
	const match = source.match(
		/export const ACTIVE_LEAVE_OVERLAP_STATUSES = \[([\s\S]*?)\] as const/,
	);
	if (!match) {
		throw new Error("ACTIVE_LEAVE_OVERLAP_STATUSES declaration not found");
	}
	return [...match[1].matchAll(/"([^"]+)"/g)].map((entry) => entry[1]);
}

describe("HR leave overlap exclusion register", () => {
	it("documents mission, finding closure, and affected tables", () => {
		expect(register.mission).toBe("HR-OPS-LEAVE-OVERLAP-GUARD");
		expect(register.finding).toBe("HR-OPS-P2-004");
		expect(register.closedOn).toBe("2026-07-25");
		expect(register.tables).toEqual([
			"hr_leave_request",
			"hr_leave_request_segment",
		]);
	});

	it("records command + transaction enforcement without database exclusion", () => {
		expect(register.overlapPolicies).toHaveLength(1);
		const [policy] = register.overlapPolicies;
		expect(policy.table).toBe("hr_leave_request_segment");
		expect(policy.policy).toBe(
			"prevent_overlapping_leave_segments_per_employee",
		);
		expect(policy.enforcement).toBe(
			"command_enforced_and_serializable_transaction",
		);
		expect(policy.databaseOverlapExclusion).toBe(false);
		expect(policy.segmentRule).toContain("day_portion");
	});

	it("matches ACTIVE_LEAVE_OVERLAP_STATUSES from leave-guards.ts on disk", () => {
		const leaveGuardsStatuses = readActiveLeaveOverlapStatusesFromLeaveGuards();
		expect(leaveGuardsStatuses.length).toBeGreaterThan(0);
		const [policy] = register.overlapPolicies;
		expect([...policy.blockingStatuses].sort()).toEqual(
			[...leaveGuardsStatuses].sort(),
		);
	});

	it("lists command and adapter enforcement surfaces", () => {
		const [{ enforcementSurface }] = register.overlapPolicies;
		const surfaces = enforcementSurface.join(" ");
		expect(surfaces).toMatch(/assertNoLeaveOverlap/);
		expect(surfaces).toMatch(/submitLeaveRequest/);
		expect(surfaces).toMatch(/approveLeaveRequest/);
		expect(surfaces).toMatch(/withLeaveEmployeeBookingLock/);
		expect(surfaces).toMatch(/buildLeaveOverlapGuardCtes/);
		expect(surfaces).toMatch(/pg_advisory_xact_lock/);
	});

	it("documents why no Postgres EXCLUDE constraint is applied", () => {
		const [{ notes }] = register.overlapPolicies;
		expect(notes).toMatch(/morning|afternoon|full/);
		expect(notes).toMatch(/exclusion constraint|EXCLUDE/i);
	});

	it("includes verification commands from Slice 4.7", () => {
		const verification = register.verification.join("\n");
		expect(verification).toContain("human-resources.leave");
		expect(verification).toContain(
			"pnpm --filter @afenda/db test -- hr-leave-overlap-exclusion-register",
		);
		expect(verification).toContain("typecheck");
	});
});
