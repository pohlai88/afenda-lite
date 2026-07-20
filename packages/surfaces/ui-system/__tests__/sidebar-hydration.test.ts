import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import {
	SIDEBAR_COOKIE_MAX_AGE,
	SIDEBAR_COOKIE_NAME,
} from "../src/components/ui/sidebar-cookie";

const pkgRoot = path.resolve(
	path.dirname(fileURLToPath(import.meta.url)),
	"..",
);

describe("@afenda/ui-system — sidebar hydration discipline", () => {
	it("SidebarMenuSkeleton does not use Math.random", () => {
		const src = readFileSync(
			path.join(pkgRoot, "src/components/ui/sidebar.tsx"),
			"utf8",
		);
		const skeletonStart = src.indexOf("function SidebarMenuSkeleton");
		expect(skeletonStart).toBeGreaterThanOrEqual(0);
		const skeletonEnd = src.indexOf("\nfunction ", skeletonStart + 1);
		const skeletonBody = src.slice(
			skeletonStart,
			skeletonEnd === -1 ? undefined : skeletonEnd,
		);
		expect(skeletonBody).not.toContain("Math.random");
		expect(skeletonBody).toContain("SIDEBAR_MENU_SKELETON_WIDTH");
	});

	it("exposes SIDEBAR_COOKIE_NAME from a non-client module", () => {
		const cookieSrc = readFileSync(
			path.join(pkgRoot, "src/components/ui/sidebar-cookie.ts"),
			"utf8",
		);
		expect(cookieSrc).not.toMatch(/^["']use client["']/m);
		expect(SIDEBAR_COOKIE_NAME).toBe("sidebar_state");
		expect(SIDEBAR_COOKIE_MAX_AGE).toBe(60 * 60 * 24 * 7);
	});
});
