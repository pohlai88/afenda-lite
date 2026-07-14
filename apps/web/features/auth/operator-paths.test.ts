import { describe, expect, it } from "vitest";

import {
	OPERATOR_ADMIN_PATH,
	OPERATOR_FFT_PATH,
	OPERATOR_SHELL_PATHS,
} from "./operator-paths";

describe("operator-paths", () => {
	it("exports Living shell paths under the operator route group", () => {
		expect(OPERATOR_ADMIN_PATH).toBe("/admin");
		expect(OPERATOR_FFT_PATH).toBe("/fft");
		expect(OPERATOR_SHELL_PATHS).toEqual(["/admin", "/fft"]);
	});
});
