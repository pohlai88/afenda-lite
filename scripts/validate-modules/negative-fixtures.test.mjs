import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { runNegativeFixtures } from "./negative-fixtures.mjs";

describe("validate:modules negative fixtures", () => {
	it("proves each Phase 2 stop gate fails intentionally", () => {
		const result = runNegativeFixtures();
		assert.equal(result.ok, true, result.message);
		assert.ok(result.matrix.length >= 19);
	});
});
