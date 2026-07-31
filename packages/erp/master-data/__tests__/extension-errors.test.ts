import { describe, expect, it } from "vitest";

import {
	extensionParentNotFound,
	extensionParentStateFailure,
	extensionValidationFailure,
} from "../src/capabilities/extensions";

describe("extension error helpers", () => {
	it("returns package-standard validation failures", () => {
		const result = extensionValidationFailure(
			"Alias is required",
			"aliasValue",
		);

		expect(result).toMatchObject({
			ok: false,
			code: "BAD_REQUEST",
		});
	});

	it("uses governed extension parent types in not-found details", () => {
		const result = extensionParentNotFound("party");

		expect(result).toMatchObject({
			ok: false,
			code: "NOT_FOUND",
		});
	});

	it("uses governed parent type and status in invalid-state details", () => {
		const result = extensionParentStateFailure("item", "retired");

		expect(result).toMatchObject({
			ok: false,
			code: "CONFLICT",
		});
	});
});
