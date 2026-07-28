import { describe } from "vitest";

import { definePersonManagementParity } from "./helpers/person-management-parity";

describe("@afenda/human-resources person management parity (drizzle)", () => {
	definePersonManagementParity("drizzle");
});
