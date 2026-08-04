/**
 * @afenda/errors
 * Contract: afenda.errors/v1
 * Sealed: root capabilities only; obey docs/CONTRACT.md and package gates.
 */

import { describe, expect, it } from "vitest";
import { errorIngress, errorProject } from "../../src/index";

describe("errorProject.result", () => {
	it("projects the canonical public payload without private context", () => {
		const failure = errorIngress.code("CONFLICT", {
			correlationId: "trace-private",
			operation: "invoice.update",
			publicMessage: "The invoice changed before the update completed.",
		});

		const projected = errorProject.result(failure);

		expect(projected).toEqual({
			code: "CONFLICT",
			message: "The invoice changed before the update completed.",
			messageKey: "errors.conflict",
			ok: false,
		});
		expect(Object.isFrozen(projected)).toBe(true);
		expect(JSON.stringify(projected)).not.toContain("invoice.update");
		expect(JSON.stringify(projected)).not.toContain("trace-private");
	});

	it("rejects forged Failure values", () => {
		expect(() =>
			Reflect.apply(errorProject.result, undefined, [Object.freeze({})]),
		).toThrow("Result projection requires a trusted failure.");
	});
});
