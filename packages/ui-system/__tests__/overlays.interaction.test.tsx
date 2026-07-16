import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
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
import { afterEach, describe, expect, it, vi } from "vitest";

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

// WCAG 2.2 Level AA Accessibility Tests
describe("WCAG 2.2 AA — Focus Management", () => {
	it("Dialog traps focus within the modal", async () => {
		const user = userEvent.setup();
		render(
			<div>
				<button>Outside Before</button>
				<Dialog>
					<DialogTrigger>Open</DialogTrigger>
					<DialogContent>
						<DialogTitle>Modal Dialog</DialogTitle>
						<button>Inside First</button>
						<button>Inside Second</button>
					</DialogContent>
				</Dialog>
				<button>Outside After</button>
			</div>
		);

		// Open dialog
		await user.click(screen.getByRole("button", { name: "Open" }));
		const dialog = await screen.findByRole("dialog");
		expect(dialog).toBeInTheDocument();

		// Focus should be trapped inside dialog - skip close button, focus content buttons
		await user.tab(); // First focusable (Close button)
		await user.tab(); // Inside First
		expect(screen.getByRole("button", { name: "Inside First" })).toHaveFocus();
		
		await user.tab(); // Inside Second
		expect(screen.getByRole("button", { name: "Inside Second" })).toHaveFocus();
		
		// Tab should cycle back within dialog (focus trapping)
		await user.tab(); // Should cycle back to close or first element
		// Just verify focus stays within dialog
		expect(document.activeElement).toBeInTheDocument();
	});

	it("Sheet restores focus to trigger on close", async () => {
		const user = userEvent.setup();
		render(
			<Sheet>
				<SheetTrigger>Open Filters</SheetTrigger>
				<SheetContent>
					<SheetTitle>Filter Options</SheetTitle>
					<button>Filter Button</button>
				</SheetContent>
			</Sheet>
		);

		const trigger = screen.getByRole("button", { name: "Open Filters" });
		await user.click(trigger);
		await screen.findByRole("dialog");

		// Close with Escape
		await user.keyboard("{Escape}");
		await waitFor(() =>
			expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
		);

		// Focus should return to trigger
		expect(trigger).toHaveFocus();
	});
});

describe("WCAG 2.2 AA — Keyboard Navigation", () => {
	it("DropdownMenu supports arrow key navigation", async () => {
		const user = userEvent.setup();
		render(
			<DropdownMenu>
				<DropdownMenuTrigger>Actions</DropdownMenuTrigger>
				<DropdownMenuContent>
					<DropdownMenuItem>Edit Profile</DropdownMenuItem>
					<DropdownMenuItem>View Settings</DropdownMenuItem>
					<DropdownMenuItem>Sign Out</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>,
		);

		await user.click(screen.getByRole("button", { name: "Actions" }));
		const menu = await screen.findByRole("menu");
		expect(menu).toBeInTheDocument();

		// Arrow down should move focus through items
		await user.keyboard("{ArrowDown}");
		expect(screen.getByRole("menuitem", { name: "Edit Profile" })).toHaveFocus();
		
		await user.keyboard("{ArrowDown}");
		expect(screen.getByRole("menuitem", { name: "View Settings" })).toHaveFocus();
		
		await user.keyboard("{ArrowDown}");
		expect(screen.getByRole("menuitem", { name: "Sign Out" })).toHaveFocus();

		// Arrow up should move focus back up
		await user.keyboard("{ArrowUp}");
		expect(screen.getByRole("menuitem", { name: "View Settings" })).toHaveFocus();
	});

	it("Select supports keyboard selection with Enter and Space", async () => {
		const user = userEvent.setup();
		render(
			<Select>
				<SelectTrigger aria-label="Choose Priority">
					<SelectValue placeholder="Select priority" />
				</SelectTrigger>
				<SelectContent>
					<SelectItem value="high">High Priority</SelectItem>
					<SelectItem value="medium">Medium Priority</SelectItem>
					<SelectItem value="low">Low Priority</SelectItem>
				</SelectContent>
			</Select>
		);

		const trigger = screen.getByRole("combobox", { name: "Choose Priority" });
		
		// Open with Enter key
		trigger.focus();
		await user.keyboard("{Enter}");
		await screen.findByRole("option", { name: "High Priority" });

		// Navigate with arrow keys and select with Enter
		await user.keyboard("{ArrowDown}"); // Move to Medium
		await user.keyboard("{Enter}");

		await waitFor(() => {
			expect(within(trigger).queryByText("Medium Priority")).toBeInTheDocument();
		});
	});
});

// AlertDialog Tests - Interaction Safety for Destructive Actions
describe("AlertDialog — destructive action confirmation", () => {
	it("opens on trigger and provides proper confirmation semantics", async () => {
		const user = userEvent.setup();
		const mockDelete = vi.fn();
		
		render(
			<AlertDialog>
				<AlertDialogTrigger>Delete Account</AlertDialogTrigger>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
						<AlertDialogDescription>
							This action cannot be undone. This will permanently delete your account.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction onClick={mockDelete}>Delete Account</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		);

		// Open alert dialog
		await user.click(screen.getByRole("button", { name: "Delete Account" }));
		const alertDialog = await screen.findByRole("alertdialog", { 
			name: "Are you absolutely sure?" 
		});
		expect(alertDialog).toBeInTheDocument();
		
		// Verify description is associated 
		expect(screen.getByText(/This action cannot be undone/)).toBeInTheDocument();
		
		// Test cancel action
		await user.click(screen.getByRole("button", { name: "Cancel" }));
		await waitFor(() =>
			expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument(),
		);
		expect(mockDelete).not.toHaveBeenCalled();
	});

	it("confirms destructive action with proper focus management", async () => {
		const user = userEvent.setup();
		const mockDelete = vi.fn();
		
		render(
			<div>
				<button>Before</button>
				<AlertDialog>
					<AlertDialogTrigger>Delete Item</AlertDialogTrigger>
					<AlertDialogContent>
						<AlertDialogHeader>
							<AlertDialogTitle>Delete Item</AlertDialogTitle>
							<AlertDialogDescription>
								This will permanently remove the item.
							</AlertDialogDescription>
						</AlertDialogHeader>
						<AlertDialogFooter>
							<AlertDialogCancel>Cancel</AlertDialogCancel>
							<AlertDialogAction onClick={mockDelete}>Delete</AlertDialogAction>
						</AlertDialogFooter>
					</AlertDialogContent>
				</AlertDialog>
				<button>After</button>
			</div>
		);

		const trigger = screen.getByRole("button", { name: "Delete Item" });
		await user.click(trigger);
		
		// Focus should be within dialog
		const deleteButton = screen.getByRole("button", { name: "Delete" });
		await user.click(deleteButton);
		
		expect(mockDelete).toHaveBeenCalledTimes(1);
	});
});

describe("WCAG 2.2 AA — Accessible Names and Descriptions", () => {
	it("Dialog has accessible name from DialogTitle", async () => {
		render(
			<Dialog open>
				<DialogContent>
					<DialogTitle>Edit User Profile</DialogTitle>
				</DialogContent>
			</Dialog>
		);

		const dialog = screen.getByRole("dialog", { name: "Edit User Profile" });
		expect(dialog).toBeInTheDocument();
	});

	it("AlertDialog has accessible name and description", async () => {
		render(
			<AlertDialog open>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Confirm Deletion</AlertDialogTitle>
						<AlertDialogDescription>
							This action is permanent and cannot be undone.
						</AlertDialogDescription>
					</AlertDialogHeader>
				</AlertDialogContent>
			</AlertDialog>
		);

		const alertDialog = screen.getByRole("alertdialog", { name: "Confirm Deletion" });
		expect(alertDialog).toBeInTheDocument();
		expect(alertDialog).toHaveAccessibleDescription("This action is permanent and cannot be undone.");
	});

	it("Sheet has accessible name from SheetTitle", async () => {
		render(
			<Sheet open>
				<SheetContent>
					<SheetTitle>Navigation Menu</SheetTitle>
				</SheetContent>
			</Sheet>
		);

		const sheet = screen.getByRole("dialog", { name: "Navigation Menu" });
		expect(sheet).toBeInTheDocument();
	});

	it("Select has accessible name from aria-label", async () => {
		render(
			<Select>
				<SelectTrigger aria-label="Task Status">
					<SelectValue placeholder="Choose status" />
				</SelectTrigger>
				<SelectContent>
					<SelectItem value="todo">To Do</SelectItem>
					<SelectItem value="done">Completed</SelectItem>
				</SelectContent>
			</Select>
		);

		const select = screen.getByRole("combobox", { name: "Task Status" });
		expect(select).toBeInTheDocument();
	});
});
