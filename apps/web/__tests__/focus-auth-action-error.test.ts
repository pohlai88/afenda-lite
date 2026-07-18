/**
 * @vitest-environment jsdom
 * PL-S12 — focus moves to the first invalid field or summary live region.
 */

import { afterEach, describe, expect, it, vi } from "vitest";

import { focusAuthActionError } from "../features/auth/focus-auth-action-error";

describe("focusAuthActionError", () => {
	afterEach(() => {
		document.body.innerHTML = "";
		vi.restoreAllMocks();
	});

	it("focuses the first aria-invalid field", () => {
		document.body.innerHTML = `
			<input id="email" aria-invalid="true" />
			<input id="password" />
			<div id="summary" tabindex="-1"></div>
		`;
		const email = document.getElementById("email");
		const summary = document.getElementById("summary");
		const focusEmail = vi.spyOn(email as HTMLElement, "focus");
		const focusSummary = vi.spyOn(summary as HTMLElement, "focus");

		focusAuthActionError({
			fieldIds: ["email", "password"],
			summaryEl: summary,
		});

		expect(focusEmail).toHaveBeenCalledOnce();
		expect(focusSummary).not.toHaveBeenCalled();
	});

	it("falls back to the summary region when no field is invalid", () => {
		document.body.innerHTML = `
			<input id="email" />
			<div id="summary" tabindex="-1"></div>
		`;
		const summary = document.getElementById("summary");
		const focusSummary = vi.spyOn(summary as HTMLElement, "focus");

		focusAuthActionError({
			fieldIds: ["email"],
			summaryEl: summary,
		});

		expect(focusSummary).toHaveBeenCalledOnce();
	});
});
