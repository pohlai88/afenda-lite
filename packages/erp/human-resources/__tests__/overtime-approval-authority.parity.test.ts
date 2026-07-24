import { describe } from "vitest";

import { runDrizzleParity } from "./helpers/database-gate";
import { defineOvertimeApprovalAuthoritySuite } from "./helpers/overtime-approval-authority-suite";

describe.skipIf(!runDrizzleParity)(
	"overtime approval authority (drizzle)",
	() => {
		defineOvertimeApprovalAuthoritySuite("drizzle");
	},
);
