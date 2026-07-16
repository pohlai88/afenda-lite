/**
 * DOM helpers for Neon Auth UI login autofill (RHF-compatible native events).
 * Kept free of React / UI imports so node Vitest can cover them.
 */

/**
 * Sets a controlled React input value so Neon Auth / RHF pick up the change.
 */
export function setNativeInputValue(input: HTMLInputElement, value: string) {
	const descriptor = Object.getOwnPropertyDescriptor(
		HTMLInputElement.prototype,
		"value",
	);
	descriptor?.set?.call(input, value);
	input.dispatchEvent(new Event("input", { bubbles: true }));
	input.dispatchEvent(new Event("change", { bubbles: true }));
}

/**
 * Fills the Neon Auth UI sign-in form (email + password fields).
 * Returns false when the form is not mounted yet.
 */
export function fillNeonAuthLoginForm(
	email: string,
	password: string,
): boolean {
	const root =
		document.querySelector<HTMLElement>("[data-slot='auth-view'], form") ??
		document.body;
	const emailInput = root.querySelector<HTMLInputElement>(
		'input[name="email"], input[type="email"]',
	);
	const passwordInput = root.querySelector<HTMLInputElement>(
		'input[name="password"], input[autocomplete="current-password"], input[type="password"]',
	);
	if (!emailInput || !passwordInput) {
		return false;
	}
	setNativeInputValue(emailInput, email);
	setNativeInputValue(passwordInput, password);
	passwordInput.focus();
	return true;
}
