import { describe, expect, it } from "vitest";

import {
	CORRELATION_HEADER,
	createCorrelationId,
	isCorrelationId,
	resolveCorrelationId,
} from "../src/correlation";

describe("@afenda/http correlation", () => {
	it("exports the living header name", () => {
		expect(CORRELATION_HEADER).toBe("x-correlation-id");
	});

	it("mints and validates UUID correlation ids", () => {
		const id = createCorrelationId();
		expect(isCorrelationId(id)).toBe(true);
		expect(resolveCorrelationId(id)).toBe(id);
	});

	it("mints when inbound is missing or invalid", () => {
		expect(isCorrelationId(null)).toBe(false);
		expect(isCorrelationId("not-a-uuid")).toBe(false);
		const minted = resolveCorrelationId("not-a-uuid");
		expect(isCorrelationId(minted)).toBe(true);
	});
});
