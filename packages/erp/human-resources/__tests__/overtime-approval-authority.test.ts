import { describe } from "vitest";

import { defineOvertimeApprovalAuthoritySuite } from "./helpers/overtime-approval-authority-suite";

describe("overtime approval authority (memory)", () => {
	defineOvertimeApprovalAuthoritySuite("memory");
});
