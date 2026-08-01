import {
	cleanup,
	render,
	screen,
	waitFor,
	within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { NotificationDropdown } from "../src/app-shell/notification-dropdown";
import { ProfileDropdown } from "../src/app-shell/profile-dropdown";
import { AppShell } from "../src/blocks/app-shell-block/app-shell";
import { resolveAppShellUtilityPolicy } from "../src/blocks/app-shell-block/header-utility-policy";
import { Button } from "../src/components/ui/button";

afterEach(cleanup);

describe("app-shell utilities", () => {
	it("derives placement from the canonical utility order rather than declaration order", () => {
		expect(
			resolveAppShellUtilityPolicy(
				["profile", "notifications", "command-menu"],
				{
					profile: "primary",
					notifications: "primary",
					"command-menu": "secondary",
				},
			),
		).toEqual({
			primaryId: "notifications",
			secondaryIds: ["command-menu", "profile"],
		});
	});

	it("prioritizes one mobile utility and keeps secondary utilities operable in overflow", async () => {
		const user = userEvent.setup();
		const onCommand = vi.fn();
		const onProfileAction = vi.fn();
		const { container } = render(
			<AppShell
				commandMenu={{
					groups: [
						{
							id: "workspace",
							label: "Workspace",
							commands: [{ id: "open-payables", label: "Open payables" }],
						},
					],
					onCommand,
				}}
				header={{
					title: "Payment operations",
					utilityPriorities: {
						"command-menu": "secondary",
						notifications: "primary",
						"color-mode": "secondary",
						appearance: "secondary",
						profile: "secondary",
					},
				}}
				notifications={{
					notifications: [
						{
							id: "approval",
							title: "Payment batch requires review.",
							occurredAt: "5 minutes ago",
							read: false,
						},
					],
				}}
				profile={{
					name: "Aisha Rahman",
					initials: "AR",
					actions: [{ id: "sign-out", label: "Sign out" }],
					onAction: onProfileAction,
				}}
			>
				<h1>Payment operations workspace</h1>
			</AppShell>,
		);

		const desktopUtilities = container.querySelector(
			'[data-slot="app-shell-command-area"]',
		);
		const mobileUtilities = container.querySelector(
			'[data-slot="app-shell-mobile-utilities"]',
		);
		expect(desktopUtilities).toHaveClass("hidden", "sm:flex");
		expect(mobileUtilities).toHaveClass("sm:hidden");
		expect(
			within(mobileUtilities as HTMLElement).getByRole("button", {
				name: "Open notifications (1 unread)",
			}),
		).toBeInTheDocument();

		const overflowTrigger = within(mobileUtilities as HTMLElement).getByRole(
			"button",
			{ name: "Open workspace utilities (4 secondary)" },
		);
		await user.click(overflowTrigger);
		const menu = await screen.findByRole("menu");
		expect(menu).toHaveAccessibleName("Open workspace utilities (4 secondary)");
		expect(
			within(menu).getByRole("menuitem", { name: "Command menu" }),
		).toBeVisible();
		expect(
			within(menu).getByRole("menuitem", { name: "Use dark color mode" }),
		).toBeVisible();
		expect(
			within(menu).getByRole("menuitem", { name: "Customize appearance" }),
		).toBeVisible();

		await user.click(
			within(menu).getByRole("menuitem", { name: "Command menu" }),
		);
		const commandDialog = await screen.findByRole("dialog", {
			name: "Command menu",
		});
		await user.click(
			within(commandDialog).getByRole("option", { name: "Open payables" }),
		);
		expect(onCommand).toHaveBeenCalledWith("open-payables");
		await waitFor(() => expect(overflowTrigger).toHaveFocus());

		await user.click(overflowTrigger);
		expect(await screen.findByText("Aisha Rahman")).toBeVisible();
		const signOutActions = await screen.findAllByRole("menuitem", {
			name: "Sign out",
		});
		expect(signOutActions).toHaveLength(1);
		await user.click(signOutActions[0] as HTMLElement);
		expect(onProfileAction).toHaveBeenCalledWith("sign-out");
	});

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
