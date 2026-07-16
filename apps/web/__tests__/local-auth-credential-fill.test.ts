/**
 * @vitest-environment jsdom
 */
import { describe, expect, it } from "vitest";

import {
	fillNeonAuthLoginForm,
	setNativeInputValue,
} from "../features/auth/local-auth-credential-fill-dom";

describe("local auth credential fill DOM", () => {
	it("setNativeInputValue writes value and dispatches input/change", () => {
		const input = document.createElement("input");
		const events: string[] = [];
		input.addEventListener("input", () => {
			events.push("input");
		});
		input.addEventListener("change", () => {
			events.push("change");
		});
		setNativeInputValue(input, "ops@example.com");
		expect(input.value).toBe("ops@example.com");
		expect(events).toEqual(["input", "change"]);
	});

	it("fillNeonAuthLoginForm fills email and password fields", () => {
		document.body.innerHTML = `
      <form>
        <input name="email" type="email" />
        <input name="password" type="password" autocomplete="current-password" />
      </form>
    `;
		const ok = fillNeonAuthLoginForm("afenda@admin.com", "secret-pass");
		expect(ok).toBe(true);
		const email = document.querySelector<HTMLInputElement>(
			'input[name="email"]',
		);
		const password = document.querySelector<HTMLInputElement>(
			'input[name="password"]',
		);
		expect(email?.value).toBe("afenda@admin.com");
		expect(password?.value).toBe("secret-pass");
	});

	it("fillNeonAuthLoginForm returns false when form fields are missing", () => {
		document.body.innerHTML = "<div>no form</div>";
		expect(fillNeonAuthLoginForm("a@b.c", "x")).toBe(false);
	});
});
