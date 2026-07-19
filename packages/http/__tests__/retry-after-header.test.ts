import { describe, expect, it } from "vitest";

import {
	applyRetryAfterHeader,
	RETRY_AFTER_HEADER,
} from "../src/retry-after-header";

describe("@afenda/http applyRetryAfterHeader", () => {
	it("sets floored positive Retry-After seconds", () => {
		const headers = new Headers();
		applyRetryAfterHeader(headers, 12.9);
		expect(headers.get(RETRY_AFTER_HEADER)).toBe("12");
	});

	it("ignores sub-second and non-finite values", () => {
		const headers = new Headers();
		applyRetryAfterHeader(headers, 0.2);
		applyRetryAfterHeader(headers, 0);
		applyRetryAfterHeader(headers, Number.NaN);
		expect(headers.has(RETRY_AFTER_HEADER)).toBe(false);
	});
});
