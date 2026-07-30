import {
	ActivityDialog,
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
	AppShell,
	Button,
	Combobox,
	CommandMenu,
	DataTable,
	DatePicker,
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
	Drawer,
	DrawerContent,
	DrawerDescription,
	DrawerTitle,
	DrawerTrigger,
	FormError,
	FormField,
	Input,
	Menubar,
	MenubarContent,
	MenubarItem,
	MenubarMenu,
	MenubarTrigger,
	NotificationDropdown,
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
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axe from "axe-core";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(cleanup);

const noop = () => undefined;
const getNamedRowId = (row: { name: string }) => String(row.name);

async function expectNoA11yViolations(container: HTMLElement) {
	const results = await axe.run(container, {
		rules: {
			// jsdom lacks full color computation for contrast checks
			"color-contrast": { enabled: false },
		},
	});
	// biome-ignore lint/suspicious/noMisplacedAssertion: This helper is awaited only from test bodies.
	expect(
		results.violations,
		JSON.stringify(results.violations, null, 2),
	).toEqual([]);
}

describe("@afenda/ui-system — axe a11y suite", () => {
	it("AppShell exposes governed workspace landmarks without axe violations", async () => {
		function TestLink({
			children,
			href,
		}: Readonly<{ children: ReactNode; href: string }>) {
			return <a href={href}>{children}</a>;
		}

		const { container } = render(
			<AppShell
				header={{ title: "Dashboard" }}
				mainContentId="main-content"
				navConfig={{
					currentPath: "/dashboard",
					linkComponent: TestLink,
					sections: [
						{
							id: "workspace",
							label: "Workspace",
							items: [
								{
									kind: "link",
									id: "dashboard",
									label: "Dashboard",
									href: "/dashboard",
								},
							],
						},
					],
				}}
				showScrollToTop={false}
				themeConfig={{ brand: { name: "Afenda", homeHref: "/" } }}
			>
				<h1>Dashboard workspace</h1>
			</AppShell>,
		);

		const main = screen.getByRole("main");
		expect(main).toHaveAttribute("id", "main-content");
		expect(main).toHaveAttribute("tabindex", "-1");
		expect(main).toContainElement(
			screen.getByRole("heading", { level: 1, name: "Dashboard workspace" }),
		);
		await expectNoA11yViolations(container);
	});

	it("CommandMenu opens from the keyboard and runs a consumer command", async () => {
		const user = userEvent.setup();
		const onCommand = vi.fn();
		render(
			<CommandMenu
				groups={[
					{
						id: "finance",
						label: "Finance",
						commands: [{ id: "open-payables", label: "Open payables" }],
					},
				]}
				onCommand={onCommand}
			/>,
		);

		await user.keyboard("{Control>}k{/Control}");
		const dialog = await screen.findByRole("dialog", { name: "Command menu" });
		await expectNoA11yViolations(dialog);
		await user.click(screen.getByRole("option", { name: "Open payables" }));
		expect(onCommand).toHaveBeenCalledWith("open-payables");
	});

	it("NotificationDropdown supports explicit decisions without axe violations", async () => {
		const user = userEvent.setup();
		const onDecision = vi.fn();
		render(
			<NotificationDropdown
				notifications={[
					{
						id: "notification-1",
						category: "inbox",
						actor: { name: "Aisha Rahman", initials: "AR" },
						title: "requested approval for payment batch PAY-2048",
						occurredAt: "12 minutes ago",
						read: false,
						detail: { kind: "decision" },
					},
				]}
				onDecision={onDecision}
				trigger={<Button type="button">Open notifications</Button>}
			/>,
		);
		await user.click(
			screen.getByRole("button", { name: "Open notifications" }),
		);
		const dialog = await screen.findByRole("dialog", { name: "Notifications" });
		await expectNoA11yViolations(dialog);
		await user.click(screen.getByRole("button", { name: "Accept" }));
		expect(onDecision).toHaveBeenCalledWith("notification-1", "accept");
	});

	it("open ActivityDialog exposes named ERP activity without axe violations", async () => {
		const user = userEvent.setup();
		render(
			<ActivityDialog
				activities={[
					{
						kind: "attachment",
						id: "activity-1",
						actor: { name: "Aisha Rahman", initials: "AR" },
						summary: "attached the reconciliation evidence",
						occurredAt: "18 minutes ago",
						fileName: "bank-reconciliation.pdf",
					},
				]}
				trigger={<Button type="button">Open activity</Button>}
			/>,
		);

		await user.click(screen.getByRole("button", { name: "Open activity" }));
		const dialog = await screen.findByRole("dialog", { name: "Activity" });
		expect(dialog).toHaveTextContent("Aisha Rahman");
		expect(dialog).toHaveTextContent("bank-reconciliation.pdf");
		await expectNoA11yViolations(dialog);
	});

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

	it("open Drawer portal has no serious violations", async () => {
		const user = userEvent.setup();
		render(
			<Drawer>
				<DrawerTrigger asChild>
					<Button type="button">Open quick filters</Button>
				</DrawerTrigger>
				<DrawerContent>
					<DrawerTitle>Quick filters</DrawerTitle>
					<DrawerDescription>Narrow the record set.</DrawerDescription>
				</DrawerContent>
			</Drawer>,
		);
		await user.click(
			screen.getByRole("button", { name: "Open quick filters" }),
		);
		const dialog = await screen.findByRole("dialog", { name: "Quick filters" });
		expect(dialog).toBeInTheDocument();
		await expectNoA11yViolations(dialog);
	});

	it("open Menubar portal has no serious violations", async () => {
		render(
			<Menubar defaultValue="file">
				<MenubarMenu value="file">
					<MenubarTrigger>File</MenubarTrigger>
					<MenubarContent>
						<MenubarItem>Open record</MenubarItem>
						<MenubarItem disabled>Restricted command</MenubarItem>
					</MenubarContent>
				</MenubarMenu>
			</Menubar>,
		);
		const menu = await screen.findByRole("menu");
		expect(menu).toBeInTheDocument();
		await expectNoA11yViolations(menu);
	});

	it("FormField with Input has no serious violations", async () => {
		const { container } = render(
			<FormField
				description="Work email address"
				error="Email is required"
				label="Email"
				required
			>
				<Input defaultValue="" type="email" />
			</FormField>,
		);
		await expectNoA11yViolations(container);
	});

	it("FormError variants have no serious violations", async () => {
		const { container } = render(
			<div>
				<FormError message="Email is required" />
				<FormError message="Password should be stronger" variant="warning" />
				<FormError message="Check your connection" variant="info" />
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
				onValueChange={noop}
				options={[
					{ value: "a", label: "Alpha" },
					{ value: "b", label: "Beta" },
				]}
				placeholder="Pick one"
				value=""
			/>,
		);
		await expectNoA11yViolations(container);
	});

	it("Combobox with stable aria-label has no serious violations", async () => {
		const { container } = render(
			<Combobox
				aria-label="Organization member"
				onValueChange={noop}
				options={[
					{ value: "a", label: "Alpha" },
					{ value: "b", label: "Beta" },
				]}
				placeholder="Pick one"
				value="a"
			/>,
		);
		await expectNoA11yViolations(container);
	});

	it("DatePicker closed tree has no serious violations", async () => {
		const { container } = render(
			<DatePicker onChange={noop} placeholder="Pick a date" />,
		);
		await expectNoA11yViolations(container);
	});

	it("DataTable with selection has no serious violations", async () => {
		const { container } = render(
			<DataTable
				columns={[{ key: "name", title: "Name" }]}
				data={[{ name: "Row 1" }, { name: "Row 2" }]}
				getRowId={getNamedRowId}
				onSelectionChange={noop}
				selectable
				selectedRowIds={new Set(["Row 1"])}
			/>,
		);
		await expectNoA11yViolations(container);
	});
});
