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
	Button,
	Combobox,
	DataTable,
	DatePicker,
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
	FormError,
	FormField,
	Input,
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
} from "@afenda/ui-system";
import { render } from "@testing-library/react";
import axe from "axe-core";
import { describe, expect, it } from "vitest";

async function expectNoA11yViolations(container: HTMLElement) {
	const results = await axe.run(container, {
		rules: {
			// jsdom lacks full color computation for contrast checks
			"color-contrast": { enabled: false },
		},
	});
	expect(
		results.violations,
		JSON.stringify(results.violations, null, 2),
	).toEqual([]);
}

describe("@afenda/ui-system — axe a11y suite", () => {
	it("Dialog trigger and closed tree have no serious violations", async () => {
		const { container } = render(
			<Dialog>
				<DialogTrigger asChild>
					<Button type="button">Open dialog</Button>
				</DialogTrigger>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Edit record</DialogTitle>
						<DialogDescription>Update the selected entity.</DialogDescription>
					</DialogHeader>
				</DialogContent>
			</Dialog>,
		);
		await expectNoA11yViolations(container);
	});

	it("AlertDialog trigger tree has no serious violations", async () => {
		const { container } = render(
			<AlertDialog>
				<AlertDialogTrigger asChild>
					<Button type="button" variant="destructive">
						Delete
					</Button>
				</AlertDialogTrigger>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Confirm delete</AlertDialogTitle>
						<AlertDialogDescription>
							This action cannot be undone.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction>Continue</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>,
		);
		await expectNoA11yViolations(container);
	});

	it("Sheet trigger tree has no serious violations", async () => {
		const { container } = render(
			<Sheet>
				<SheetTrigger asChild>
					<Button type="button">Open filters</Button>
				</SheetTrigger>
				<SheetContent>
					<SheetHeader>
						<SheetTitle>Filters</SheetTitle>
						<SheetDescription>Narrow the result set.</SheetDescription>
					</SheetHeader>
				</SheetContent>
			</Sheet>,
		);
		await expectNoA11yViolations(container);
	});

	it("FormField with Input has no serious violations", async () => {
		const { container } = render(
			<FormField
				label="Email"
				description="Work email address"
				error="Email is required"
				required
			>
				<Input type="email" defaultValue="" />
			</FormField>,
		);
		await expectNoA11yViolations(container);
	});

	it("FormError variants have no serious violations", async () => {
		const { container } = render(
			<div>
				<FormError message="Email is required" />
				<FormError variant="warning" message="Password should be stronger" />
				<FormError variant="info" message="Check your connection" />
			</div>,
		);
		await expectNoA11yViolations(container);
	});

	it("Select trigger tree has no serious violations", async () => {
		const { container } = render(
			<Select>
				<SelectTrigger aria-label="Status">
					<SelectValue placeholder="Status" />
				</SelectTrigger>
				<SelectContent>
					<SelectItem value="open">Open</SelectItem>
					<SelectItem value="closed">Closed</SelectItem>
				</SelectContent>
			</Select>,
		);
		await expectNoA11yViolations(container);
	});

	it("Combobox closed tree has no serious violations", async () => {
		const { container } = render(
			<Combobox
				options={[
					{ value: "a", label: "Alpha" },
					{ value: "b", label: "Beta" },
				]}
				value=""
				onValueChange={() => undefined}
				placeholder="Pick one"
			/>,
		);
		await expectNoA11yViolations(container);
	});

	it("Combobox with stable aria-label has no serious violations", async () => {
		const { container } = render(
			<Combobox
				options={[
					{ value: "a", label: "Alpha" },
					{ value: "b", label: "Beta" },
				]}
				value="a"
				onValueChange={() => undefined}
				placeholder="Pick one"
				aria-label="Organization member"
			/>,
		);
		await expectNoA11yViolations(container);
	});

	it("DatePicker closed tree has no serious violations", async () => {
		const { container } = render(
			<DatePicker placeholder="Pick a date" onChange={() => undefined} />,
		);
		await expectNoA11yViolations(container);
	});

	it("DataTable with selection has no serious violations", async () => {
		const { container } = render(
			<DataTable
				columns={[{ key: "name", title: "Name" }]}
				data={[{ name: "Row 1" }, { name: "Row 2" }]}
				getRowId={(row) => String(row.name)}
				selectable
				selectedRowIds={new Set(["Row 1"])}
				onSelectionChange={() => undefined}
			/>,
		);
		await expectNoA11yViolations(container);
	});
});
