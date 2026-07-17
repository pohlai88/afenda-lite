/**
 * N10 — ARCH-023 v1 permission catalog + idempotent ensure.
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { db } from "../src/client";
import {
	ensurePlatformPermissionCatalog,
	isPlatformPermissionCodeV1,
	PLATFORM_PERMISSION_CODES_V1,
	PLATFORM_PERMISSION_V1,
	PLATFORM_ROLE_TEMPLATES_V1,
} from "../src/platform-permission-catalog";
import {
	platformPermission,
	platformRole,
	platformRolePermission,
} from "../src/schema/platform";

const repoRoot = path.resolve(
	path.dirname(fileURLToPath(import.meta.url)),
	"../../..",
);

function loadDatabaseUrl(): string | undefined {
	if (process.env.DATABASE_URL) {
		return process.env.DATABASE_URL;
	}
	try {
		const text = readFileSync(path.join(repoRoot, ".env.local"), "utf8");
		for (const line of text.split(/\r?\n/)) {
			const trimmed = line.trim();
			if (trimmed.length === 0 || trimmed.startsWith("#")) continue;
			const match = /^DATABASE_URL\s*=\s*(.*)$/.exec(trimmed);
			if (!match) continue;
			let value = match[1]?.trim() ?? "";
			if (
				(value.startsWith('"') && value.endsWith('"')) ||
				(value.startsWith("'") && value.endsWith("'"))
			) {
				value = value.slice(1, -1);
			}
			return value.length > 0 ? value : undefined;
		}
	} catch {
		return undefined;
	}
	return undefined;
}

const databaseUrl = loadDatabaseUrl();
if (databaseUrl) {
	process.env.DATABASE_URL = databaseUrl;
}

const hasDatabase = typeof databaseUrl === "string" && databaseUrl.length > 0;

const ARCH023_V1_CODES = [
	"org.users.manage",
	"org.roles.manage",
	"declarations.manage",
	"declarations.read",
	"clients.invite",
	"account.self",
	"fft.access",
] as const;

describe("PLATFORM_PERMISSION_V1 (N10 / ARCH-023)", () => {
	it("matches ARCH-023 §3.2 seed codes exactly", () => {
		expect([...PLATFORM_PERMISSION_CODES_V1].toSorted()).toEqual(
			[...ARCH023_V1_CODES].toSorted(),
		);
		expect(PLATFORM_PERMISSION_V1).toHaveLength(7);
	});

	it("isPlatformPermissionCodeV1 accepts only v1 codes", () => {
		expect(isPlatformPermissionCodeV1("org.roles.manage")).toBe(true);
		expect(isPlatformPermissionCodeV1("fft.orders.manage")).toBe(false);
		expect(isPlatformPermissionCodeV1("")).toBe(false);
	});

	it("defines Org Admin / Editor / Viewer templates only", () => {
		expect(
			PLATFORM_ROLE_TEMPLATES_V1.map((t) => t.templateKey).toSorted(),
		).toEqual(["editor", "org_admin", "viewer"]);

		const orgAdmin = PLATFORM_ROLE_TEMPLATES_V1.find(
			(t) => t.templateKey === "org_admin",
		);
		expect(orgAdmin?.permissionCodes.toSorted()).toEqual(
			[...ARCH023_V1_CODES].toSorted(),
		);

		const editor = PLATFORM_ROLE_TEMPLATES_V1.find(
			(t) => t.templateKey === "editor",
		);
		expect(editor?.permissionCodes.toSorted()).toEqual(
			[
				"account.self",
				"clients.invite",
				"declarations.manage",
				"declarations.read",
			].toSorted(),
		);

		const viewer = PLATFORM_ROLE_TEMPLATES_V1.find(
			(t) => t.templateKey === "viewer",
		);
		expect(viewer?.permissionCodes.toSorted()).toEqual(
			["account.self", "declarations.read"].toSorted(),
		);
	});
});

describe.skipIf(!hasDatabase)("ensurePlatformPermissionCatalog (N10)", () => {
	it("is idempotent and preserves template_key → role ids", async () => {
		const first = await ensurePlatformPermissionCatalog(db);
		expect(first.permissionCount).toBe(7);
		expect(first.templates).toHaveLength(3);

		const second = await ensurePlatformPermissionCatalog(db);
		expect(second.permissionCount).toBe(7);
		expect(second.templates.map((t) => t.roleId).toSorted()).toEqual(
			first.templates.map((t) => t.roleId).toSorted(),
		);
		expect(second.templates.every((t) => t.created === false)).toBe(true);

		const codes = await db
			.select({ code: platformPermission.code })
			.from(platformPermission)
			.where(
				inArray(platformPermission.code, [...PLATFORM_PERMISSION_CODES_V1]),
			);
		expect(codes.map((r) => r.code).toSorted()).toEqual(
			[...ARCH023_V1_CODES].toSorted(),
		);

		for (const template of PLATFORM_ROLE_TEMPLATES_V1) {
			const [role] = await db
				.select({ id: platformRole.id })
				.from(platformRole)
				.where(
					and(
						eq(platformRole.templateKey, template.templateKey),
						eq(platformRole.isSystemTemplate, true),
						isNull(platformRole.organizationId),
					),
				)
				.limit(1);
			expect(role).toBeDefined();
			if (!role) continue;

			const links = await db
				.select({ code: platformRolePermission.permissionCode })
				.from(platformRolePermission)
				.where(eq(platformRolePermission.roleId, role.id));
			expect(links.map((l) => l.code).toSorted()).toEqual(
				[...template.permissionCodes].toSorted(),
			);
		}

		// Known live Org Admin / Viewer UUIDs used by I3.1 tests
		const orgAdmin = first.templates.find((t) => t.templateKey === "org_admin");
		const viewer = first.templates.find((t) => t.templateKey === "viewer");
		expect(orgAdmin?.roleId).toBe("22527ba9-7a74-4217-8b2e-986f36e0b444");
		expect(viewer?.roleId).toBe("d9305ced-bbd5-493b-9b78-80ebb78c6450");
	});
});
