import { describe, expect, it } from "vitest";

import { openapi } from "../src/index";

describe("@afenda/openapi zod", () => {
	it("extends Zod with .openapi() on the shared prototype", () => {
		const schema = openapi.schema.z.string().openapi({ description: "probe" });
		expect(typeof schema.openapi).toBe("function");
		expect(schema.parse("ok")).toBe("ok");
	});

	it("exposes one frozen root capability", () => {
		expect(Object.keys(openapi)).toEqual([
			"document",
			"envelope",
			"registry",
			"schema",
		]);
		expect(Object.isFrozen(openapi)).toBe(true);
		expect(Object.isFrozen(openapi.registry)).toBe(true);
	});
});
