/**
 * S5.1 boundary — proves `@afenda/ui` resolves from the web workspace.
 */

import { Button, buttonVariants } from "@afenda/ui/components/button";
import { cn } from "@afenda/ui";
import { describe, expect, it } from "vitest";

describe("@afenda/web ui boundary", () => {
	it("imports Button via components subpath and cn from @afenda/ui root", () => {
		expect(Button).toBeTypeOf("function");
		expect(buttonVariants).toBeTypeOf("function");
		expect(cn("a", "b")).toContain("a");
	});
});
