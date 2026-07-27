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
			message: "Alias is required",
			details: {
				reason: "MASTER_VALIDATION_FAILED",
				field: "aliasValue",
			},
		});
	});

	it("uses governed extension parent types in not-found details", () => {
		const result = extensionParentNotFound("party");

		expect(result).toMatchObject({
			ok: false,
			code: "NOT_FOUND",
			message: "party not found",
			details: {
				reason: "MASTER_NOT_FOUND",
				parentType: "party",
			},
		});
	});

	it("uses governed parent type and status in invalid-state details", () => {
		const result = extensionParentStateFailure("item", "retired");

		expect(result).toMatchObject({
			ok: false,
			code: "CONFLICT",
			message: "item cannot accept new extensions",
			details: {
				reason: "MASTER_INVALID_STATE",
				parentType: "item",
				status: "retired",
			},
		});
	});
});
