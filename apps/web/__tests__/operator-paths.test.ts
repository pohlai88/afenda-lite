import { describe, expect, it } from "vitest";

import {
	OPERATOR_ADMIN_PATH,
	OPERATOR_SHELL_PATHS,
} from "../features/auth/operator-paths";

describe("operator-paths", () => {
	it("exports Living shell paths under the operator route group", () => {
		expect(OPERATOR_ADMIN_PATH).toBe("/admin");
		expect(OPERATOR_SHELL_PATHS).toEqual(["/admin"]);
	});
});
