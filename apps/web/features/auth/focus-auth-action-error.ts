/**
 * After a Path A auth ActionResult failure, move keyboard focus to the first
 * invalid field, else the summary live region (WCAG 3.3.1 / 3.3.3).
 */
export function focusAuthActionError(options: {
	fieldIds: readonly string[];
	summaryEl: HTMLElement | null;
}): void {
	for (const fieldId of options.fieldIds) {
		const field = document.getElementById(fieldId);
		if (
			field instanceof HTMLElement &&
			field.getAttribute("aria-invalid") === "true"
		) {
			field.focus();
			return;
		}
	}
	options.summaryEl?.focus();
}
