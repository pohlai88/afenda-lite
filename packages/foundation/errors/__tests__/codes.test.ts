/**
 * @afenda/errors
 * Contract: afenda.errors/v1
 * Protected: changes require local pre-edit token and compatibility checks.
 */
import { describe, expect, it } from "vitest";

import {
	API_ERROR_CODES,
	asApiErrorCode,
	asErrorCode,
	ERROR_CODES,
	isApiErrorCode,
	isErrorCode,
} from "../src/core/codes";

describe("error codes", () => {
	it("accepts every declared code", () => {
		for (const code of ERROR_CODES) {
			expect(isErrorCode(code)).toBe(true);
		}
	});

	it("keeps historical API code aliases as exact references", () => {
		expect(API_ERROR_CODES).toBe(ERROR_CODES);
		expect(isApiErrorCode).toBe(isErrorCode);
	});

	it("validates unknown input against the closed vocabulary", () => {
		expect(isErrorCode("UNKNOWN_ERROR")).toBe(false);
		expect(isErrorCode(404)).toBe(false);
		expect(isErrorCode(null)).toBe(false);
		expect(isErrorCode(undefined)).toBe(false);
		expect(isErrorCode({})).toBe(false);
	});

	it("keeps deprecated brand helpers as identity compatibility functions", () => {
		expect(asErrorCode("NOT_FOUND")).toBe("NOT_FOUND");
		expect(asApiErrorCode("CONFLICT")).toBe("CONFLICT");
	});
});
