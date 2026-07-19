import { describe, expect, it } from "vitest";

import { z } from "../src/zod";

describe("@afenda/openapi zod", () => {
	it("extends Zod with .openapi() on the shared prototype", () => {
		const schema = z.string().openapi({ description: "probe" });
		expect(typeof schema.openapi).toBe("function");
		expect(schema.parse("ok")).toBe("ok");
	});
});
