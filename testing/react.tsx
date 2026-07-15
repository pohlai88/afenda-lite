import { render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

/**
 * L2 helper — use for Radix / options-popout interaction tests
 * (`*.interaction.test.tsx`). Prefer this over `fireEvent`.
 */
export function setupUser(ui: Parameters<typeof render>[0]) {
	const user = userEvent.setup();
	const view = render(ui);
	return { user, ...view };
}

export { render };
export { screen, waitFor, within } from "@testing-library/react";
