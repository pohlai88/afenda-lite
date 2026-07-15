import { describe, expect, it } from "vitest";

import { cn } from "../src/lib/utils";

describe("@afenda/ui (design-system) utils", () => {
	it("merges class names via cn", () => {
		expect(cn("a", "b")).toContain("a");
		expect(cn("a", false && "b", "c")).toBe("a c");
	});
});
