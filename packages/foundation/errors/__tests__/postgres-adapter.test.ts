import { describe, expect, it } from "vitest";

import { fromPostgresUnknown } from "../src/adapters/postgres";
import { serializeAppError } from "../src/core/serialize";

describe("fromPostgresUnknown", () => {
	it("maps 23505 to CONFLICT without SQL text in serialize", () => {
		const error = fromPostgresUnknown({
			code: "23505",
			detail: "Key (email)=(a@b.com) already exists.",
			message: "duplicate key value violates unique constraint",
		});
		expect(error).toBeDefined();
		if (error === undefined) {
			throw new Error("expected AppError");
		}
		expect(error.code).toBe("CONFLICT");
		const serialized = serializeAppError(error);
		expect(serialized.message).toBe("A conflicting record already exists");
		expect(JSON.stringify(serialized)).not.toMatch(/duplicate key/i);
		expect(JSON.stringify(serialized)).not.toMatch(/Key \(email\)/i);
		expect(JSON.stringify(serialized)).not.toMatch(/a@b\.com/i);
		expect(serialized.details).toEqual({ sqlState: "23505" });
	});

	it("reads SQLSTATE from nested cause", () => {
		const error = fromPostgresUnknown({
			message: "wrapper",
			cause: { code: "23503" },
		});
		expect(error?.code).toBe("BAD_REQUEST");
	});

	it("returns undefined when not a SQLSTATE shape", () => {
		expect(fromPostgresUnknown(new Error("boom"))).toBeUndefined();
		expect(fromPostgresUnknown({ code: "ENOENT" })).toBeUndefined();
	});
});
