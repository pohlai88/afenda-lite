import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { SidebarMenuSkeleton } from "../src/components/ui/sidebar";

describe("SidebarMenuSkeleton", () => {
	it("uses a hydration-stable skeleton width across remounts", () => {
		const { container, unmount } = render(<SidebarMenuSkeleton />);
		const first = container
			.querySelector('[data-sidebar="menu-skeleton-text"]')
			?.getAttribute("style");
		unmount();

		const secondRender = render(<SidebarMenuSkeleton />);
		const second = secondRender.container
			.querySelector('[data-sidebar="menu-skeleton-text"]')
			?.getAttribute("style");

		expect(first).toContain("--skeleton-width: 70%");
		expect(second).toBe(first);
	});

	it("accepts an explicit width without randomizing", () => {
		const { container } = render(<SidebarMenuSkeleton width="55%" />);
		const style = container
			.querySelector('[data-sidebar="menu-skeleton-text"]')
			?.getAttribute("style");
		expect(style).toContain("--skeleton-width: 55%");
	});
});
