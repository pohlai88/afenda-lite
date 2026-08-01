import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { NotificationDropdown } from "../src/app-shell/notification-dropdown";
import { ProfileDropdown } from "../src/app-shell/profile-dropdown";
import { Button } from "../src/components/ui/button";

afterEach(cleanup);

describe("app-shell utilities", () => {
	it("renders semantic notification time and governed category empty states", async () => {
		const user = userEvent.setup();
		render(
			<NotificationDropdown
				emptyMessage="No category notifications"
				notifications={[
					{
						id: "close-ready",
						category: "inbox",
						actor: { name: "Finance Ops", initials: "FO" },
						title: "completed the close review.",
						occurredAt: "5 minutes ago",
						occurredAtDateTime: "2026-07-29T11:00:00+08:00",
						read: true,
					},
				]}
				trigger={<Button type="button">Open notifications</Button>}
			/>,
		);

		await user.click(
			screen.getByRole("button", { name: "Open notifications" }),
		);
		const dialog = await screen.findByRole("dialog", { name: "Notifications" });
		expect(within(dialog).getByText("5 minutes ago")).toHaveAttribute(
			"datetime",
			"2026-07-29T11:00:00+08:00",
		);

		await user.click(within(dialog).getByRole("tab", { name: "General" }));
		expect(
			within(dialog).getByRole("region", {
				name: "No category notifications",
			}),
		).toBeVisible();
	});

	it("does not expose profile actions without an implementation", () => {
		render(
			<ProfileDropdown
				actions={[{ id: "preferences", label: "Preferences" }]}
				initials="JT"
				name="John Tan"
			/>,
		);

		expect(screen.getByLabelText("Signed in as John Tan")).toBeVisible();
		expect(
			screen.queryByRole("button", { name: "Open profile menu for John Tan" }),
		).not.toBeInTheDocument();
		expect(
			screen.queryByRole("menuitem", { name: "Preferences" }),
		).not.toBeInTheDocument();
	});

	it("dispatches implemented profile actions by stable identifier", async () => {
		const user = userEvent.setup();
		const onAction = vi.fn();
		render(
			<ProfileDropdown
				actions={[{ id: "preferences", label: "Preferences" }]}
				initials="JT"
				name="John Tan"
				onAction={onAction}
			/>,
		);

		await user.click(
			screen.getByRole("button", { name: "Open profile menu for John Tan" }),
		);
		await user.click(screen.getByRole("menuitem", { name: "Preferences" }));
		expect(onAction).toHaveBeenCalledOnce();
		expect(onAction).toHaveBeenCalledWith("preferences");
	});
});
