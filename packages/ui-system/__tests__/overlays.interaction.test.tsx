import {
	Dialog,
	DialogContent,
	DialogTitle,
	DialogTrigger,
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
	Sheet,
	SheetContent,
	SheetTitle,
	SheetTrigger,
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@afenda/ui-system";
import {
	cleanup,
	render,
	screen,
	waitFor,
	within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";

afterEach(cleanup);

describe("Dialog — keyboard/focus smoke", () => {
	it("opens on trigger and closes on Escape", async () => {
		const user = userEvent.setup();
		render(
			<Dialog>
				<DialogTrigger>Open dialog</DialogTrigger>
				<DialogContent>
					<DialogTitle>Profile</DialogTitle>
				</DialogContent>
			</Dialog>,
		);

		await user.click(screen.getByRole("button", { name: "Open dialog" }));
		const dialog = await screen.findByRole("dialog");
		expect(dialog).toBeInTheDocument();

		await user.keyboard("{Escape}");
		await waitFor(() =>
			expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
		);
	});
});

describe("Sheet — keyboard/focus smoke", () => {
	it("opens on trigger and closes on Escape", async () => {
		const user = userEvent.setup();
		render(
			<Sheet>
				<SheetTrigger>Open sheet</SheetTrigger>
				<SheetContent>
					<SheetTitle>Filters</SheetTitle>
				</SheetContent>
			</Sheet>,
		);

		await user.click(screen.getByRole("button", { name: "Open sheet" }));
		expect(await screen.findByRole("dialog")).toBeInTheDocument();

		await user.keyboard("{Escape}");
		await waitFor(() =>
			expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
		);
	});
});

describe("DropdownMenu — keyboard/focus smoke", () => {
	it("opens, focuses an item, and closes on Escape", async () => {
		const user = userEvent.setup();
		render(
			<DropdownMenu>
				<DropdownMenuTrigger>Menu</DropdownMenuTrigger>
				<DropdownMenuContent>
					<DropdownMenuItem>Edit</DropdownMenuItem>
					<DropdownMenuItem>Delete</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>,
		);

		await user.click(screen.getByRole("button", { name: "Menu" }));
		const edit = await screen.findByRole("menuitem", { name: "Edit" });
		expect(edit).toBeInTheDocument();

		await user.keyboard("{Escape}");
		await waitFor(() =>
			expect(screen.queryByRole("menu")).not.toBeInTheDocument(),
		);
	});
});

describe("Select — keyboard/focus smoke", () => {
	it("opens and selects an option with the keyboard", async () => {
		const user = userEvent.setup();
		render(
			<Select>
				<SelectTrigger aria-label="Fruit">
					<SelectValue placeholder="Pick one" />
				</SelectTrigger>
				<SelectContent>
					<SelectItem value="apple">Apple</SelectItem>
					<SelectItem value="banana">Banana</SelectItem>
				</SelectContent>
			</Select>,
		);

		const trigger = screen.getByRole("combobox", { name: "Fruit" });
		await user.click(trigger);
		const apple = await screen.findByRole("option", { name: "Apple" });
		await user.click(apple);

		await waitFor(() =>
			expect(within(trigger).queryByText("Apple")).toBeInTheDocument(),
		);
	});
});

describe("Tooltip — focus smoke", () => {
	it("shows content when the trigger receives focus", async () => {
		const user = userEvent.setup();
		render(
			<TooltipProvider delayDuration={0}>
				<Tooltip>
					<TooltipTrigger>Info</TooltipTrigger>
					<TooltipContent>Helpful hint</TooltipContent>
				</Tooltip>
			</TooltipProvider>,
		);

		await user.tab();
		expect(screen.getByRole("button", { name: "Info" })).toHaveFocus();
		await waitFor(() =>
			expect(screen.getAllByText("Helpful hint").length).toBeGreaterThan(0),
		);
	});
});
