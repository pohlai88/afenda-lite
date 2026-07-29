import {
	cleanup,
	render,
	screen,
	waitFor,
	within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ActivityDialog } from "../src/blocks/app-shell-block/shared/dialog-activity";
import { Button } from "../src/components/ui/button";

afterEach(cleanup);

const activities = [
	{
		id: "message",
		kind: "message",
		actor: { name: "Aisha Rahman", initials: "AR" },
		summary: "commented on the close checklist.",
		occurredAt: "5 minutes ago",
		occurredAtDateTime: "2026-07-29T04:25:00+08:00",
		message: "Reconciliation evidence is ready for review.",
	},
	{
		id: "attachment",
		kind: "attachment",
		actor: { name: "Daniel Ong", initials: "DO" },
		summary: "uploaded supporting evidence.",
		occurredAt: "18 minutes ago",
		fileName: "bank-reconciliation.pdf",
	},
	{
		id: "tags",
		kind: "tags",
		actor: { name: "Finance Ops", initials: "FO" },
		summary: "updated the review classification.",
		occurredAt: "30 minutes ago",
		tags: [" Close ", "Review", "Close", " "],
	},
	{
		id: "plain",
		kind: "plain",
		actor: { name: "System", initials: "SY" },
		summary: "recorded the workflow event.",
		occurredAt: "1 hour ago",
	},
] as const;

describe("ActivityDialog", () => {
	it("renders every supported activity kind as an ordered, scrollable history", async () => {
		const user = userEvent.setup();
		render(
			<ActivityDialog
				trigger={<Button type="button">Open activity</Button>}
				activities={activities}
			/>,
		);

		await user.click(screen.getByRole("button", { name: "Open activity" }));
		const dialog = await screen.findByRole("dialog", { name: "Activity" });
		const history = within(dialog).getByRole("list", {
			name: "Recent activity",
		});

		expect(within(history).getAllByRole("listitem")).toHaveLength(4);
		expect(dialog.querySelector("[data-slot=scroll-area]")).not.toBeNull();
		expect(within(dialog).getByText("5 minutes ago")).toHaveAttribute(
			"datetime",
			"2026-07-29T04:25:00+08:00",
		);
		expect(dialog).toHaveTextContent("Reconciliation evidence is ready");
		expect(dialog).toHaveTextContent("bank-reconciliation.pdf");
		expect(dialog).toHaveTextContent("Close");
		expect(
			Array.from(dialog.querySelectorAll("[data-slot=badge]")).filter(
				(badge) => badge.textContent === "Close",
			),
		).toHaveLength(1);
		expect(dialog).toHaveTextContent("recorded the workflow event");
	});

	it("uses the governed empty state with a consumer label", async () => {
		const user = userEvent.setup();
		render(
			<ActivityDialog
				trigger={<Button type="button">Open empty activity</Button>}
				activities={[]}
				emptyMessage="No close activity yet"
			/>,
		);

		await user.click(
			screen.getByRole("button", { name: "Open empty activity" }),
		);
		const dialog = await screen.findByRole("dialog", { name: "Activity" });
		expect(
			within(dialog).getByRole("region", { name: "No close activity yet" }),
		).toBeVisible();
	});

	it("reports state changes and restores focus after keyboard dismissal", async () => {
		const user = userEvent.setup();
		const onOpenChange = vi.fn();
		render(
			<ActivityDialog
				trigger={<Button type="button">Open tracked activity</Button>}
				activities={activities}
				onOpenChange={onOpenChange}
			/>,
		);

		const trigger = screen.getByRole("button", {
			name: "Open tracked activity",
		});
		await user.click(trigger);
		await screen.findByRole("dialog", { name: "Activity" });
		expect(onOpenChange).toHaveBeenCalledWith(true);

		await user.keyboard("{Escape}");
		await waitFor(() => expect(trigger).toHaveFocus());
		expect(onOpenChange).toHaveBeenLastCalledWith(false);
	});
});
