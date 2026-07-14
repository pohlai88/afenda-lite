import { describe, expect, it } from "vitest";

import { roleSatisfies } from "./roles";

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
