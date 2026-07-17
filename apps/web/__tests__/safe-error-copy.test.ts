/**
 * N12 — error boundaries must not render internal Error.message to users.
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
	GLOBAL_ERROR_PUBLIC_MESSAGE,
	publicErrorCopy,
} from "../features/auth/safe-error-copy";

const webRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

function source(relativePath: string): string {
	return readFileSync(path.join(webRoot, relativePath), "utf8");
}

describe("N12 safe error copy", () => {
	it("returns only the caller-supplied public fallback", () => {
		expect(publicErrorCopy("Sign-in unavailable. Try again.")).toBe(
			"Sign-in unavailable. Try again.",
		);
		expect(publicErrorCopy("   ")).toBe(GLOBAL_ERROR_PUBLIC_MESSAGE);
	});

	it("never echoes internal Error.message through the helper", () => {
		const internal =
			"@afenda/auth: active organization missing from session DATABASE_URL=postgres://secret";
		expect(publicErrorCopy("Something went wrong.")).not.toContain(
			"@afenda/auth",
		);
		expect(publicErrorCopy("Something went wrong.")).not.toContain(
			"DATABASE_URL",
		);
		expect(publicErrorCopy("Something went wrong.")).not.toBe(internal);
	});

	it("keeps global and segment error UI off Error.message", () => {
		const globalSource = source("app/global-error.tsx");
		const segmentSource = source("features/auth/segment-error.tsx");

		expect(globalSource).not.toMatch(/error\.message/);
		expect(globalSource).toContain("GLOBAL_ERROR_PUBLIC_MESSAGE");
		expect(segmentSource).not.toMatch(/error\.message/);
		expect(segmentSource).toContain("fallbackMessage");
		expect(segmentSource).toContain("publicErrorCopy");
		expect(segmentSource).toMatch(/error:\s*_error/);
	});

	it("routes segment error.tsx files through SegmentError", () => {
		for (const relativePath of [
			"app/(public)/auth/error.tsx",
			"app/(public)/join/error.tsx",
			"app/(operator)/error.tsx",
			"app/(client)/client/(workspace)/error.tsx",
			"app/(client)/client/(gate)/preview-unavailable/error.tsx",
		]) {
			const body = source(relativePath);
			expect(body, relativePath).toContain("SegmentError");
			expect(body, relativePath).not.toMatch(/error\.message/);
		}
	});
});
