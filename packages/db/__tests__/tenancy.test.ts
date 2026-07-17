import { getTableColumns } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { withOrg } from "../src/client";
import {
	HARD_TENANT_ROOT_TABLE_NAMES,
	HARD_TENANT_ROOT_TABLES,
} from "../src/hard-tenant-roots";
import { surveys } from "../src/schema/declarations";
import { fftEvent } from "../src/schema/fft";
import { platformRole, platformRbacAudit } from "../src/schema/platform";

describe("@afenda/db hard tenant roots (N9 / ARCH-023)", () => {
	it("lists exactly eight hard tenant root table names", () => {
		expect(HARD_TENANT_ROOT_TABLE_NAMES).toHaveLength(8);
		expect([...HARD_TENANT_ROOT_TABLE_NAMES]).toEqual([
			"surveys",
			"client_invitations",
			"client_profiles",
			"client_assignments",
			"fft_event",
			"fft_sales_member",
			"fft_role",
			"fft_role_assignment",
		]);
	});

	it("exposes organization_id NOT NULL on every hard tenant root", () => {
		for (const table of Object.values(HARD_TENANT_ROOT_TABLES)) {
			const columns = getTableColumns(table);
			expect(columns.organizationId.name).toBe("organization_id");
			expect(columns.organizationId.notNull).toBe(true);
		}
	});

	it("keeps organization_id on living sample roots", () => {
		expect(getTableColumns(surveys).organizationId.name).toBe(
			"organization_id",
		);
		expect(getTableColumns(fftEvent).organizationId.name).toBe(
			"organization_id",
		);
	});

	it("exposes organization_id on platform_role (templates may be NULL)", () => {
		expect(getTableColumns(platformRole).organizationId.name).toBe(
			"organization_id",
		);
	});

	it("requires organization_id and actor_user_id on platform_rbac_audit (N12)", () => {
		const columns = getTableColumns(platformRbacAudit);
		expect(columns.organizationId.notNull).toBe(true);
		expect(columns.actorUserId.notNull).toBe(true);
	});
});

describe("withOrg fail-closed (N9)", () => {
	it("rejects empty orgId before querying", async () => {
		await expect(withOrg(surveys, "   ")).rejects.toThrow(/non-empty orgId/);
	});
});
