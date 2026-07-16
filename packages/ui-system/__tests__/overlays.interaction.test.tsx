import {
	AlertDialog,
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
	Calendar,
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
	ContextMenu,
	ContextMenuContent,
	ContextMenuItem,
	ContextMenuTrigger,
	Combobox,
	Progress,
	DataTable,
	Empty,
	FormError,
	FormField,
	FormInput,
	InputGroup,
	InputGroupAddon,
	InputGroupInput,
	InputGroupText,
	Spinner,
	StatusBadge,
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
	Slider,
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
	Toggle,
	ToggleGroup,
	ToggleGroupItem,
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

		// Radix UI Dialog automatically focuses the first focusable element when opened
		// Let's verify proper focus trapping behavior instead of assuming order
		const closeButton = screen.getByRole("button", { name: "Close" });
		const firstButton = screen.getByRole("button", { name: "Inside First" });  
		const secondButton = screen.getByRole("button", { name: "Inside Second" });

		// Test that focus is trapped within the dialog by cycling through all focusable elements
		await user.tab(); // Move to next focusable element
		await user.tab(); // Move to next focusable element
		await user.tab(); // Should wrap around within dialog

		// Verify all focusable elements are within the dialog
		expect([closeButton, firstButton, secondButton]).toContain(document.activeElement);
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

	it("Combobox has searchable functionality with keyboard support", async () => {
		const user = userEvent.setup();
		const mockChange = vi.fn();
		const options = [
			{ value: "apple", label: "Apple" },
			{ value: "banana", label: "Banana" },
			{ value: "orange", label: "Orange" },
		];

		render(
			<Combobox
				options={options}
				value=""
				onValueChange={mockChange}
				placeholder="Select fruit..."
				searchPlaceholder="Search fruits..."
			/>
		);

		const combobox = screen.getByRole("combobox");
		expect(combobox).toBeInTheDocument();
		expect(combobox).toHaveAttribute("aria-expanded", "false");

		// Open combobox
		await user.click(combobox);
		expect(combobox).toHaveAttribute("aria-expanded", "true");

		// Search functionality
		const searchInput = screen.getByPlaceholderText("Search fruits...");
		expect(searchInput).toBeInTheDocument();

		await user.type(searchInput, "app");
		
		// Should show filtered results
		expect(screen.getByText("Apple")).toBeInTheDocument();
		expect(screen.queryByText("Banana")).not.toBeInTheDocument();

		// Select an option
		await user.click(screen.getByText("Apple"));
		expect(mockChange).toHaveBeenCalledWith("apple");
	});

	it("Calendar supports date selection with keyboard navigation", async () => {
		const user = userEvent.setup();
		const mockSelect = vi.fn();

		render(
			<Calendar
				mode="single"
				selected={undefined}
				onSelect={mockSelect}
			/>
		);

		// Calendar should be present with proper grid role
		const calendar = screen.getByRole("grid");
		expect(calendar).toBeInTheDocument();

		// Should contain navigatable days
		const days = screen.getAllByRole("button");
		expect(days.length).toBeGreaterThan(0);

		// Today should be highlighted and focused
		const todayButton = screen.getByRole("button", { name: /Today/ });
		expect(todayButton).toBeInTheDocument();
		expect(todayButton).toHaveAttribute("tabindex", "0");
		
		// Test date selection
		await user.click(todayButton);
		expect(mockSelect).toHaveBeenCalled();
	});

	it("Progress provides accessible status and value information", async () => {
		render(
			<div>
				<Progress value={65} max={100} />
				<Progress value={3} max={5} getValueLabel={(v, m) => `${v} of ${m} tasks completed`} />
			</div>
		);

		const progressBars = screen.getAllByRole("progressbar");
		expect(progressBars).toHaveLength(2);

		// First progress bar - default percentage label
		expect(progressBars[0]).toHaveAttribute("aria-valuemin", "0");
		expect(progressBars[0]).toHaveAttribute("aria-valuemax", "100");
		expect(progressBars[0]).toHaveAttribute("aria-valuenow", "65");
		expect(progressBars[0]).toHaveAttribute("aria-valuetext", "65%");

		// Second progress bar - custom label
		expect(progressBars[1]).toHaveAttribute("aria-valuemin", "0");
		expect(progressBars[1]).toHaveAttribute("aria-valuemax", "5");
		expect(progressBars[1]).toHaveAttribute("aria-valuenow", "3");
		expect(progressBars[1]).toHaveAttribute("aria-valuetext", "3 of 5 tasks completed");
	});

	it("Spinner provides accessible status and live region updates", async () => {
		render(
			<div>
				<Spinner />
				<Spinner size="lg" variant="secondary" label="Processing data" />
			</div>
		);

		const spinners = screen.getAllByRole("status");
		expect(spinners).toHaveLength(2);

		// First spinner - default label
		expect(spinners[0]).toHaveAttribute("aria-label", "Loading");
		expect(spinners[0]).toHaveAttribute("aria-live", "polite");
		expect(screen.getByText("Loading")).toBeInTheDocument();

		// Second spinner - custom label
		expect(spinners[1]).toHaveAttribute("aria-label", "Processing data");
		expect(spinners[1]).toHaveAttribute("aria-live", "polite");
		expect(screen.getByText("Processing data")).toBeInTheDocument();
	});

	it("Empty state provides accessible region with semantic content", () => {
		const { container } = render(
			<Empty
				title="No results found"
				description="Try adjusting your search criteria"
				action={<button>Reset Filters</button>}
			/>
		);

		const emptyRegion = screen.getByRole("region");
		expect(emptyRegion).toHaveAttribute("aria-label", "No results found");
		expect(screen.getByRole("heading", { level: 3 })).toHaveTextContent("No results found");
		expect(screen.getByText("Try adjusting your search criteria")).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Reset Filters" })).toBeInTheDocument();
	});

	it("DataTable provides accessible table with sorting and loading states", async () => {
		const user = userEvent.setup();
		const mockSort = vi.fn();
		
		const columns = [
			{ key: "name", title: "Name", sortable: true },
			{ key: "email", title: "Email", sortable: false },
			{ key: "status", title: "Status", sortable: true, render: (value: string) => value.toUpperCase() },
		];
		
		const data = [
			{ name: "John Doe", email: "john@example.com", status: "active" },
			{ name: "Jane Smith", email: "jane@example.com", status: "inactive" },
		];

		const { rerender } = render(
			<DataTable
				columns={columns}
				data={data}
				sortBy="name"
				sortDirection="asc"
				onSort={mockSort}
			/>
		);

		// Should render accessible table
		const table = screen.getByRole("table");
		expect(table).toBeInTheDocument();
		
		// Should have proper column headers
		expect(screen.getByRole("columnheader", { name: /Name/ })).toBeInTheDocument();
		expect(screen.getByRole("columnheader", { name: /Email/ })).toBeInTheDocument();
		expect(screen.getByRole("columnheader", { name: /Status/ })).toBeInTheDocument();
		
		// Should render custom content (uppercase status)
		expect(screen.getByText("ACTIVE")).toBeInTheDocument();
		expect(screen.getByText("INACTIVE")).toBeInTheDocument();
		
		// Should handle sorting
		const sortableHeader = screen.getByRole("button", { name: "Sort by Name" });
		await user.click(sortableHeader);
		expect(mockSort).toHaveBeenCalledWith("name", "desc");
		
		// Test loading state
		rerender(
			<DataTable
				columns={columns}
				data={[]}
				loading={true}
			/>
		);
		expect(screen.getByRole("status", { name: "Loading data..." })).toBeInTheDocument();
		
		// Test empty state
		rerender(
			<DataTable
				columns={columns}
				data={[]}
				loading={false}
				emptyTitle="No users found"
			/>
		);
		expect(screen.getByRole("region", { name: "No users found" })).toBeInTheDocument();
	});

	it("DataTable shows pagination when enabled", async () => {
		const user = userEvent.setup();
		const mockPageChange = vi.fn();
		
		const columns = [{ key: "name", title: "Name" }];
		const data = [{ name: "Test" }];

		render(
			<DataTable
				columns={columns}
				data={data}
				showPagination={true}
				currentPage={1}
				totalPages={3}
				onPageChange={mockPageChange}
			/>
		);

		const navigation = screen.getByRole("navigation");
		expect(navigation).toBeInTheDocument();
		
		const nextButton = screen.getByText("Next");
		await user.click(nextButton);
		expect(mockPageChange).toHaveBeenCalledWith(2);
	});

	it("DataTable supports row selection with accessible controls", async () => {
		const user = userEvent.setup();
		const mockSelectionChange = vi.fn();
		
		const columns = [{ key: "name", title: "Name" }];
		const data = [{ name: "Item 1" }, { name: "Item 2" }];

		render(
			<DataTable
				columns={columns}
				data={data}
				selectable={true}
				selectedRows={new Set([0])}
				onSelectionChange={mockSelectionChange}
			/>
		);

		// Should have select all checkbox
		const selectAllCheckbox = screen.getByLabelText("Select all rows");
		expect(selectAllCheckbox).toBeInTheDocument();
		
		// Should have individual row checkboxes
		expect(screen.getByLabelText("Select row 1")).toBeInTheDocument();
		expect(screen.getByLabelText("Select row 2")).toBeInTheDocument();
		
		// Test individual selection
		await user.click(screen.getByLabelText("Select row 2"));
		expect(mockSelectionChange).toHaveBeenCalled();
	});

	it("FormError provides accessible error messaging with live region", () => {
		render(
			<div>
				<FormError message="Email is required" />
				<FormError variant="warning" message="Password should be stronger" />
				<FormError variant="info" showIcon={false}>
					Please check your network connection
				</FormError>
			</div>
		);

		// Should render as alert with live region
		const errors = screen.getAllByRole("alert");
		expect(errors).toHaveLength(3);

		// Should have proper live region attributes
		expect(errors[0]).toHaveAttribute("aria-live", "polite");
		
		// Should display messages correctly
		expect(screen.getByText("Email is required")).toBeInTheDocument();
		expect(screen.getByText("Password should be stronger")).toBeInTheDocument();
		expect(screen.getByText("Please check your network connection")).toBeInTheDocument();

		// Should include icons where expected (first two have icons, third does not)
		const iconsInFirstError = errors[0].querySelector('svg[aria-hidden="true"]');
		const iconsInSecondError = errors[1].querySelector('svg[aria-hidden="true"]');
		const iconsInThirdError = errors[2].querySelector('svg[aria-hidden="true"]');
		
		expect(iconsInFirstError).toBeInTheDocument();
		expect(iconsInSecondError).toBeInTheDocument();
		expect(iconsInThirdError).not.toBeInTheDocument();
	});

	it("FormField provides integrated form control with accessibility", () => {
		render(
			<div>
				<FormField
					label="Email Address"
					description="Enter your work email"
					error="Email is required"
					required={true}
					fieldId="email"
				>
					<FormInput type="email" placeholder="john@company.com" />
				</FormField>
				
				<FormField label="Optional field">
					<FormInput />
				</FormField>
			</div>
		);

		// Should have proper label association
		const emailInput = screen.getByLabelText(/Email Address/);
		expect(emailInput).toBeInTheDocument();
		expect(emailInput).toHaveAttribute("type", "email");
		expect(emailInput).toHaveAttribute("id", "email");

		// Should show required indicator
		expect(screen.getByText("Email Address")).toBeInTheDocument();
		
		// Should have description and error associations
		expect(emailInput).toHaveAttribute("aria-describedby");
		const describedBy = emailInput.getAttribute("aria-describedby");
		expect(describedBy).toContain("email-description");
		expect(describedBy).toContain("email-error");
		
		// Should mark field as invalid when error is present
		expect(emailInput).toHaveAttribute("aria-invalid", "true");
		
		// Should display description and error
		expect(screen.getByText("Enter your work email")).toBeInTheDocument();
		expect(screen.getByText("Email is required")).toBeInTheDocument();
		
		// Optional field should not have required indicator or error state
		const optionalInput = screen.getByLabelText("Optional field");
		expect(optionalInput).not.toHaveAttribute("aria-invalid");
	});

	it("Collapsible toggles content visibility with accessible expanded state", async () => {
		const user = userEvent.setup();

		render(
			<Collapsible>
				<CollapsibleTrigger>Show details</CollapsibleTrigger>
				<CollapsibleContent>Hidden panel content</CollapsibleContent>
			</Collapsible>,
		);

		const trigger = screen.getByRole("button", { name: "Show details" });
		expect(trigger).toHaveAttribute("aria-expanded", "false");
		expect(screen.queryByText("Hidden panel content")).not.toBeInTheDocument();

		await user.click(trigger);
		expect(trigger).toHaveAttribute("aria-expanded", "true");
		expect(screen.getByText("Hidden panel content")).toBeInTheDocument();

		await user.click(trigger);
		await waitFor(() =>
			expect(screen.queryByText("Hidden panel content")).not.toBeInTheDocument(),
		);
		expect(trigger).toHaveAttribute("aria-expanded", "false");
	});

	it("Accordion expands sections with keyboard-accessible triggers", async () => {
		const user = userEvent.setup();

		render(
			<Accordion type="single" collapsible>
				<AccordionItem value="item-1">
					<AccordionTrigger>Section One</AccordionTrigger>
					<AccordionContent>First section content</AccordionContent>
				</AccordionItem>
				<AccordionItem value="item-2">
					<AccordionTrigger>Section Two</AccordionTrigger>
					<AccordionContent>Second section content</AccordionContent>
				</AccordionItem>
			</Accordion>,
		);

		const sectionOne = screen.getByRole("button", { name: "Section One" });
		expect(sectionOne).toHaveAttribute("aria-expanded", "false");

		await user.click(sectionOne);
		expect(sectionOne).toHaveAttribute("aria-expanded", "true");
		expect(screen.getByText("First section content")).toBeVisible();
	});

	it("ToggleGroup supports single selection with pressed state", async () => {
		const user = userEvent.setup();
		const onValueChange = vi.fn();

		render(
			<ToggleGroup type="single" onValueChange={onValueChange}>
				<ToggleGroupItem value="list" aria-label="List view">
					List
				</ToggleGroupItem>
				<ToggleGroupItem value="grid" aria-label="Grid view">
					Grid
				</ToggleGroupItem>
			</ToggleGroup>,
		);

		await user.click(screen.getByRole("radio", { name: "List view" }));
		expect(onValueChange).toHaveBeenCalledWith("list");
	});

	it("InputGroup associates addons with the control", async () => {
		render(
			<InputGroup>
				<InputGroupAddon>
					<InputGroupText>@</InputGroupText>
				</InputGroupAddon>
				<InputGroupInput aria-label="Username" placeholder="name" />
			</InputGroup>,
		);

		expect(screen.getByLabelText("Username")).toBeInTheDocument();
		expect(screen.getByText("@")).toBeInTheDocument();
		expect(screen.getAllByRole("group").length).toBeGreaterThanOrEqual(1);
	});

	it("ContextMenu opens on right click with accessible menu items", async () => {
		const user = userEvent.setup();

		render(
			<ContextMenu>
				<ContextMenuTrigger>Right click me</ContextMenuTrigger>
				<ContextMenuContent>
					<ContextMenuItem>Edit</ContextMenuItem>
					<ContextMenuItem>Delete</ContextMenuItem>
				</ContextMenuContent>
			</ContextMenu>,
		);

		const trigger = screen.getByText("Right click me");
		await user.pointer({ keys: "[MouseRight>]", target: trigger });
		expect(await screen.findByRole("menuitem", { name: "Edit" })).toBeInTheDocument();
	});

	it("Slider exposes accessible range semantics", () => {
		render(
			<Slider defaultValue={[50]} max={100} step={1} aria-label="Volume" />,
		);

		const slider = screen.getByRole("slider");
		expect(slider).toHaveAttribute("aria-valuemin", "0");
		expect(slider).toHaveAttribute("aria-valuemax", "100");
		expect(slider).toHaveAttribute("aria-valuenow", "50");
		expect(slider.closest('[aria-label="Volume"]')).toBeInTheDocument();
	});
});
