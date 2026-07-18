/**
 * Sets a controlled React input value so RHF / controlled inputs pick up the change.
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
 * Fills the Afenda Path A (or Neon residual) sign-in form email + password fields.
 * Returns false when the form is not mounted yet.
 */
export function fillNeonAuthLoginForm(
	email: string,
	password: string,
): boolean {
	const root = document.querySelector<HTMLElement>("form") ?? document.body;
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
