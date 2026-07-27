import { describe } from "vitest";
import { defineFoundationHistorySuite } from "./human-resources.foundation.history.test";

describe("@afenda/human-resources foundation history (drizzle parity)", () => {
	defineFoundationHistorySuite("drizzle");
});
