import {
	cleanup,
	render,
	screen,
	waitFor,
	within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CommandMenu } from "../src/app-shell/command-menu";

afterEach(cleanup);

const groups = [
	{
		id: "workspace",
		label: "Workspace",
		commands: [
			{
				id: " open-payables ",
				label: " Open payables ",
				keywords: [" supplier ", "supplier", " "],
				shortcut: " P ",
			},
			{
				id: "restricted-close",
				label: "Restricted close",
				disabled: true,
			},
		],
	},
	{
		id: "invalid",
		label: "Invalid",
		commands: [
			{ id: "", label: "Missing identifier" },
			{ id: "missing-label", label: " " },
		],
	},
	{
		id: "duplicate-command",
		label: "Duplicate command",
		commands: [{ id: "open-payables", label: "Duplicate payables" }],
	},
	{
		id: "workspace",
		label: "Duplicate group",
		commands: [{ id: "duplicate-group-command", label: "Duplicate group" }],
	},
] as const;

describe("CommandMenu", () => {
	it("opens with the global shortcut and runs a normalized keyword match", async () => {
		const user = userEvent.setup();
		const onCommand = vi.fn();
		render(<CommandMenu groups={groups} onCommand={onCommand} />);

		await user.keyboard("{Control>}k{/Control}");
		const dialog = await screen.findByRole("dialog", { name: "Command menu" });
		const search = within(dialog).getByRole("combobox", {
			name: "Search workspace commands",
		});

		await user.type(search, "supplier");
		await user.click(
			within(dialog).getByRole("option", { name: "Open payables" }),
		);

		expect(onCommand).toHaveBeenCalledOnce();
		expect(onCommand).toHaveBeenCalledWith("open-payables");
		expect(
			screen.queryByRole("dialog", { name: "Command menu" }),
		).not.toBeInTheDocument();
	});

	it("ignores slash and modified shortcuts while an editable target owns input", async () => {
		const user = userEvent.setup();
		render(
			<>
				<label htmlFor="workspace-note">Workspace note</label>
				<input id="workspace-note" />
				<CommandMenu groups={groups} onCommand={() => undefined} />
			</>,
		);

		const input = screen.getByRole("textbox", { name: "Workspace note" });
		await user.click(input);
		await user.keyboard("/");
		await user.keyboard("{Alt>}{Control>}k{/Control}{/Alt}");

		expect(input).toHaveValue("/");
		expect(
			screen.queryByRole("dialog", { name: "Command menu" }),
		).not.toBeInTheDocument();
	});

	it("removes invalid commands and never executes a disabled command", async () => {
		const user = userEvent.setup();
		const onCommand = vi.fn();
		render(<CommandMenu groups={groups} onCommand={onCommand} />);

		const trigger = screen.getByRole("button", {
			name: "Open command menu",
		});
		await user.click(trigger);
		const dialog = await screen.findByRole("dialog", { name: "Command menu" });

		expect(within(dialog).queryByText("Invalid")).not.toBeInTheDocument();
		expect(
			within(dialog).queryByText("Missing identifier"),
		).not.toBeInTheDocument();
		expect(
			within(dialog).queryByText("Duplicate payables"),
		).not.toBeInTheDocument();
		expect(
			within(dialog).queryByText("Duplicate group"),
		).not.toBeInTheDocument();

		const disabled = within(dialog).getByRole("option", {
			name: "Restricted close",
		});
		expect(disabled).toHaveAttribute("aria-disabled", "true");
		await user.click(disabled);

		expect(onCommand).not.toHaveBeenCalled();
		expect(dialog).toBeVisible();
	});

	it("ignores repeated, composing, and shifted global shortcuts", async () => {
		render(<CommandMenu groups={groups} onCommand={() => undefined} />);

		document.dispatchEvent(
			new KeyboardEvent("keydown", {
				bubbles: true,
				ctrlKey: true,
				isComposing: true,
				key: "k",
			}),
		);
		document.dispatchEvent(
			new KeyboardEvent("keydown", {
				bubbles: true,
				ctrlKey: true,
				key: "k",
				repeat: true,
			}),
		);
		document.dispatchEvent(
			new KeyboardEvent("keydown", {
				bubbles: true,
				ctrlKey: true,
				key: "K",
				shiftKey: true,
			}),
		);

		expect(
			screen.queryByRole("dialog", { name: "Command menu" }),
		).not.toBeInTheDocument();
	});

	it("supports disabling the slash shortcut", async () => {
		const user = userEvent.setup();
		render(
			<CommandMenu
				groups={groups}
				onCommand={() => undefined}
				enableSlashShortcut={false}
			/>,
		);

		await user.keyboard("/");

		expect(
			screen.queryByRole("dialog", { name: "Command menu" }),
		).not.toBeInTheDocument();
	});

	it("reports trigger state and restores focus after keyboard dismissal", async () => {
		const user = userEvent.setup();
		render(<CommandMenu groups={groups} onCommand={() => undefined} />);

		const trigger = screen.getByRole("button", {
			name: "Open command menu",
		});

		await user.click(trigger);
		expect(trigger).toHaveAttribute("aria-expanded", "true");
		await screen.findByRole("dialog", { name: "Command menu" });

		await user.keyboard("{Escape}");
		await waitFor(() => expect(trigger).toHaveFocus());
		expect(trigger).toHaveAttribute("aria-expanded", "false");
	});
});
