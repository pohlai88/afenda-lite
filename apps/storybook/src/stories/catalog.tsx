import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
	Alert,
	AlertDescription,
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
	AlertTitle,
	Avatar,
	AvatarBadge,
	AvatarFallback,
	AvatarGroup,
	AvatarGroupCount,
	Badge,
	Breadcrumb,
	BreadcrumbEllipsis,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
	Button,
	ButtonGroup,
	ButtonGroupSeparator,
	ButtonGroupText,
	Calendar,
	Card,
	CardAction,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
	Checkbox,
	Code,
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
	Combobox,
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
	CommandShortcut,
	ContextMenu,
	ContextMenuCheckboxItem,
	ContextMenuContent,
	ContextMenuItem,
	ContextMenuLabel,
	ContextMenuRadioGroup,
	ContextMenuRadioItem,
	ContextMenuSeparator,
	ContextMenuShortcut,
	ContextMenuSub,
	ContextMenuSubContent,
	ContextMenuSubTrigger,
	ContextMenuTrigger,
	DataTable,
	DatePicker,
	DateRangePicker,
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuRadioGroup,
	DropdownMenuRadioItem,
	DropdownMenuSeparator,
	DropdownMenuShortcut,
	DropdownMenuSub,
	DropdownMenuSubContent,
	DropdownMenuSubTrigger,
	DropdownMenuTrigger,
	Empty,
	Field,
	FieldContent,
	FieldDescription,
	FieldError,
	FieldGroup,
	FieldLabel,
	FieldLegend,
	FieldSeparator,
	FieldSet,
	FieldTitle,
	FormError,
	FormField,
	FormInput,
	FormTextarea,
	HoverCard,
	HoverCardContent,
	HoverCardTrigger,
	Input,
	InputGroup,
	InputGroupAddon,
	InputGroupButton,
	InputGroupInput,
	InputGroupText,
	InputGroupTextarea,
	Kbd,
	KbdGroup,
	KeyValue,
	Label,
	MetricGrid,
	NativeSelect,
	NativeSelectOptGroup,
	NativeSelectOption,
	Pagination,
	PaginationContent,
	PaginationEllipsis,
	PaginationItem,
	PaginationLink,
	PaginationNext,
	PaginationPrevious,
	Popover,
	PopoverContent,
	PopoverDescription,
	PopoverHeader,
	PopoverTitle,
	PopoverTrigger,
	Progress,
	RadioGroup,
	RadioGroupItem,
	ScrollArea,
	ScrollBar,
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectLabel,
	SelectSeparator,
	SelectTrigger,
	SelectValue,
	Separator,
	Sheet,
	SheetClose,
	SheetContent,
	SheetDescription,
	SheetFooter,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarGroup,
	SidebarGroupContent,
	SidebarGroupLabel,
	SidebarHeader,
	SidebarInset,
	SidebarMenu,
	SidebarMenuBadge,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarMenuSkeleton,
	SidebarProvider,
	SidebarSeparator,
	SidebarTrigger,
	Skeleton,
	Slider,
	Spinner,
	StatusBadge,
	Switch,
	Table,
	TableBody,
	TableCaption,
	TableCell,
	TableFooter,
	TableHead,
	TableHeader,
	TableRow,
	Tabs,
	TabsContent,
	TabsList,
	TabsTrigger,
	Textarea,
	Toaster,
	Toggle,
	ToggleGroup,
	ToggleGroupItem,
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@afenda/ui-system";
import {
	BellIcon,
	CheckIcon,
	InboxIcon,
	SearchIcon,
	SettingsIcon,
	UserIcon,
} from "lucide-react";
import { type ReactNode, useState } from "react";
import { CVA_COVERAGE } from "./coverage";

export const COMPONENT_KEYS = [
	"accordion",
	"alert-dialog",
	"alert",
	"avatar",
	"badge",
	"breadcrumb",
	"button-group",
	"button",
	"calendar",
	"card",
	"checkbox",
	"code",
	"collapsible",
	"combobox",
	"command",
	"context-menu",
	"data-table",
	"date-picker",
	"dialog",
	"dropdown-menu",
	"empty",
	"field",
	"form-error",
	"form-field",
	"hover-card",
	"input-group",
	"input",
	"kbd",
	"key-value",
	"label",
	"metric-card",
	"native-select",
	"pagination",
	"popover",
	"progress",
	"radio-group",
	"scroll-area",
	"select",
	"separator",
	"sheet",
	"sidebar",
	"skeleton",
	"slider",
	"sonner",
	"spinner",
	"status-badge",
	"switch",
	"table",
	"tabs",
	"textarea",
	"toggle-group",
	"toggle",
	"tooltip",
] as const;

export type ComponentKey = (typeof COMPONENT_KEYS)[number];

const fixedDate = new Date("2026-07-28T00:00:00.000Z");
const auditEvents = Array.from({ length: 20 }, (_, index) => {
	const sequence = String(index + 1).padStart(2, "0");
	return { id: `audit-event-${sequence}`, sequence };
});
const ignoreCatalogAction = () => undefined;

function recordRowId(row: Record<string, unknown>): string {
	return String(row.id);
}
const options = [
	{ value: "accounting", label: "Accounting" },
	{ value: "inventory", label: "Inventory" },
	{ value: "payroll", label: "Payroll" },
];

function Frame({
	children,
	wide = false,
}: {
	children: ReactNode;
	wide?: boolean;
}) {
	return (
		<div
			className={
				wide
					? "w-[min(1200px,calc(100vw-4rem))]"
					: "w-[min(720px,calc(100vw-4rem))]"
			}
		>
			{children}
		</div>
	);
}

function Matrix({ children }: { children: ReactNode }) {
	return <div className="flex flex-wrap items-center gap-3">{children}</div>;
}

function ComboboxDemo() {
	const [value, setValue] = useState("accounting");
	return (
		<Combobox
			aria-label="Module"
			onValueChange={setValue}
			options={options}
			value={value}
		/>
	);
}

function DatePickerDemo() {
	const [date, setDate] = useState<Date | undefined>(fixedDate);
	return (
		<DatePicker
			{...(date === undefined ? {} : { value: date })}
			onChange={setDate}
		/>
	);
}

function DataTableDemo() {
	const rows: Record<string, unknown>[] = [
		{
			id: "INV-1042",
			supplier: "Northwind Trading",
			amount: "MYR 18,420",
			status: "Approved",
		},
		{
			id: "INV-1043",
			supplier: "Contoso Logistics",
			amount: "MYR 7,900",
			status: "Pending",
		},
	];
	return (
		<DataTable
			columns={[
				{ key: "id", title: "Invoice", sortable: true },
				{ key: "supplier", title: "Supplier", filterable: true },
				{ key: "amount", title: "Amount" },
				{
					key: "status",
					title: "Status",
					render: (value) => (
						<StatusBadge
							label={String(value)}
							status={value === "Approved" ? "success" : "pending"}
						/>
					),
				},
			]}
			data={rows}
			getRowId={recordRowId}
			onFilterChange={ignoreCatalogAction}
			onPageChange={ignoreCatalogAction}
			onSelectionChange={ignoreCatalogAction}
			onSort={ignoreCatalogAction}
			selectable
			selectedRowIds={new Set(["INV-1042"])}
			showPagination
			totalPages={4}
		/>
	);
}

export function ComponentShowcase({ component }: { component: ComponentKey }) {
	switch (component) {
		case "accordion":
			return (
				<Frame>
					<Accordion collapsible defaultValue="item-1" type="single">
						<AccordionItem value="item-1">
							<AccordionTrigger>What is Afenda?</AccordionTrigger>
							<AccordionContent>
								An enterprise operations platform with owned UI primitives.
							</AccordionContent>
						</AccordionItem>
						<AccordionItem value="item-2">
							<AccordionTrigger>Is it accessible?</AccordionTrigger>
							<AccordionContent>
								Keyboard and screen-reader behavior is verified in browser
								tests.
							</AccordionContent>
						</AccordionItem>
					</Accordion>
				</Frame>
			);
		case "alert-dialog":
			return (
				<Frame>
					<AlertDialog>
						<AlertDialogTrigger asChild>
							<Button variant="destructive">Delete record</Button>
						</AlertDialogTrigger>
						<AlertDialogContent>
							<AlertDialogHeader>
								<AlertDialogTitle>Delete this record?</AlertDialogTitle>
								<AlertDialogDescription>
									This action cannot be undone.
								</AlertDialogDescription>
							</AlertDialogHeader>
							<AlertDialogFooter>
								<AlertDialogCancel>Cancel</AlertDialogCancel>
								<AlertDialogAction>Delete</AlertDialogAction>
							</AlertDialogFooter>
						</AlertDialogContent>
					</AlertDialog>
				</Frame>
			);
		case "alert":
			return (
				<Frame>
					<div className="grid gap-3">
						<Alert>
							<CheckIcon />
							<AlertTitle>Ledger ready for review</AlertTitle>
							<AlertDescription>
								All July 2026 journals passed validation. Posting can proceed
								after approval.
							</AlertDescription>
						</Alert>
						<Alert variant="destructive">
							<BellIcon />
							<AlertTitle>Period locked</AlertTitle>
							<AlertDescription>
								July 2026 is closed. Resolve the out-of-balance journal before
								posting to August.
							</AlertDescription>
						</Alert>
					</div>
				</Frame>
			);
		case "avatar":
			return (
				<Frame>
					<AvatarGroup>
						<Avatar>
							<AvatarFallback>AP</AvatarFallback>
							<AvatarBadge />
						</Avatar>
						<Avatar>
							<AvatarFallback>JD</AvatarFallback>
						</Avatar>
						<AvatarGroupCount>+8</AvatarGroupCount>
					</AvatarGroup>
				</Frame>
			);
		case "badge":
			return (
				<Frame>
					<Matrix>
						{CVA_COVERAGE.badge.variant.map((variant) => (
							<Badge key={variant} variant={variant}>
								{variant}
							</Badge>
						))}
					</Matrix>
				</Frame>
			);
		case "breadcrumb":
			return (
				<Frame>
					<Breadcrumb>
						<BreadcrumbList>
							<BreadcrumbItem>
								<BreadcrumbLink href="#">Finance</BreadcrumbLink>
							</BreadcrumbItem>
							<BreadcrumbSeparator />
							<BreadcrumbItem>
								<BreadcrumbLink href="#">Invoices</BreadcrumbLink>
							</BreadcrumbItem>
							<BreadcrumbSeparator />
							<BreadcrumbItem>
								<BreadcrumbEllipsis />
							</BreadcrumbItem>
							<BreadcrumbSeparator />
							<BreadcrumbItem>
								<BreadcrumbPage>INV-1042</BreadcrumbPage>
							</BreadcrumbItem>
						</BreadcrumbList>
					</Breadcrumb>
				</Frame>
			);
		case "button":
			return (
				<Frame>
					<Matrix>
						{CVA_COVERAGE.button.variant.map((variant) => (
							<Button key={variant} variant={variant}>
								{variant}
							</Button>
						))}
					</Matrix>
				</Frame>
			);
		case "button-group":
			return (
				<Frame>
					<div className="grid gap-4">
						<ButtonGroup>
							<Button variant="outline">Approve</Button>
							<ButtonGroupSeparator />
							<Button variant="outline">Reject</Button>
							<ButtonGroupText>2 selected</ButtonGroupText>
						</ButtonGroup>
						<ButtonGroup orientation="vertical">
							<Button variant="outline">Top</Button>
							<Button variant="outline">Middle</Button>
							<Button variant="outline">Bottom</Button>
						</ButtonGroup>
					</div>
				</Frame>
			);
		case "calendar":
			return (
				<Frame>
					<Calendar
						defaultMonth={fixedDate}
						mode="single"
						selected={fixedDate}
					/>
				</Frame>
			);
		case "card":
			return (
				<Frame>
					<Card>
						<CardHeader>
							<CardTitle>Period close</CardTitle>
							<CardDescription>
								Complete all controls before posting.
							</CardDescription>
							<CardAction>
								<Button size="sm" variant="outline">
									Review
								</Button>
							</CardAction>
						</CardHeader>
						<CardContent>18 of 24 controls completed.</CardContent>
						<CardFooter>
							<Progress aria-label="Period close completion" value={75} />
						</CardFooter>
					</Card>
				</Frame>
			);
		case "checkbox":
			return (
				<Frame>
					<div className="grid gap-3">
						<Label className="flex items-center gap-2">
							<Checkbox defaultChecked /> Include archived records
						</Label>
						<Label className="flex items-center gap-2">
							<Checkbox checked="indeterminate" /> Select current page
						</Label>
						<Label className="flex items-center gap-2">
							<Checkbox disabled /> Disabled option
						</Label>
					</div>
				</Frame>
			);
		case "code":
			return (
				<Frame>
					<Matrix>
						<Code>pnpm check:storybook</Code>
						<Code className="text-destructive">VALIDATION_ERROR</Code>
					</Matrix>
				</Frame>
			);
		case "collapsible":
			return (
				<Frame>
					<Collapsible defaultOpen>
						<CollapsibleTrigger asChild>
							<Button variant="outline">Toggle details</Button>
						</CollapsibleTrigger>
						<CollapsibleContent className="mt-3 rounded-md border p-4">
							Additional audit evidence appears here.
						</CollapsibleContent>
					</Collapsible>
				</Frame>
			);
		case "combobox":
			return (
				<Frame>
					<div className="grid gap-3">
						<ComboboxDemo />
						<Combobox
							aria-label="Multiple modules"
							multiple
							onValueChange={ignoreCatalogAction}
							options={options}
							value={["accounting", "payroll"]}
						/>
						<Combobox aria-label="Disabled module" disabled options={options} />
					</div>
				</Frame>
			);
		case "command":
			return (
				<Frame>
					<Command className="rounded-lg border shadow-sm">
						<CommandInput placeholder="Search commands" />
						<CommandList>
							<CommandEmpty>No commands found.</CommandEmpty>
							<CommandGroup heading="Navigation">
								<CommandItem>
									<SearchIcon />
									Search<CommandShortcut>⌘K</CommandShortcut>
								</CommandItem>
								<CommandItem>
									<SettingsIcon />
									Settings<CommandShortcut>⌘,</CommandShortcut>
								</CommandItem>
							</CommandGroup>
							<CommandGroup heading="Account">
								<CommandItem>
									<UserIcon />
									Profile
								</CommandItem>
							</CommandGroup>
						</CommandList>
					</Command>
				</Frame>
			);
		case "context-menu":
			return (
				<Frame>
					<ContextMenu>
						<ContextMenuTrigger className="flex h-40 items-center justify-center rounded-md border border-dashed">
							Right-click this region
						</ContextMenuTrigger>
						<ContextMenuContent>
							<ContextMenuLabel>Record</ContextMenuLabel>
							<ContextMenuItem>
								Open<ContextMenuShortcut>↵</ContextMenuShortcut>
							</ContextMenuItem>
							<ContextMenuCheckboxItem checked>Pin</ContextMenuCheckboxItem>
							<ContextMenuSeparator />
							<ContextMenuRadioGroup value="team">
								<ContextMenuRadioItem value="team">Team</ContextMenuRadioItem>
								<ContextMenuRadioItem value="private">
									Private
								</ContextMenuRadioItem>
							</ContextMenuRadioGroup>
							<ContextMenuSub>
								<ContextMenuSubTrigger>More</ContextMenuSubTrigger>
								<ContextMenuSubContent>
									<ContextMenuItem>Archive</ContextMenuItem>
								</ContextMenuSubContent>
							</ContextMenuSub>
						</ContextMenuContent>
					</ContextMenu>
				</Frame>
			);
		case "data-table":
			return (
				<Frame wide>
					<DataTableDemo />
				</Frame>
			);
		case "date-picker":
			return (
				<Frame>
					<div className="grid gap-3 sm:grid-cols-2">
						<DatePickerDemo />
						<DateRangePicker
							onChange={ignoreCatalogAction}
							value={{
								from: fixedDate,
								to: new Date("2026-08-04T00:00:00.000Z"),
							}}
						/>
						<DatePicker disabled />
						<DatePicker aria-invalid />
					</div>
				</Frame>
			);
		case "dialog":
			return (
				<Frame>
					<Dialog>
						<DialogTrigger asChild>
							<Button>Edit supplier contact</Button>
						</DialogTrigger>
						<DialogContent>
							<DialogHeader>
								<DialogTitle>Edit supplier contact</DialogTitle>
								<DialogDescription>
									Update the finance contact for Northwind Trading Sdn. Bhd.
								</DialogDescription>
							</DialogHeader>
							<div className="grid gap-4">
								<FormField label="Contact name" required>
									<Input defaultValue="Aisha Rahman" />
								</FormField>
								<FormField label="Email address" required>
									<Input
										defaultValue="finance@northwind.example"
										type="email"
									/>
								</FormField>
							</div>
							<DialogFooter>
								<DialogClose asChild>
									<Button variant="outline">Cancel</Button>
								</DialogClose>
								<Button>Save contact</Button>
							</DialogFooter>
						</DialogContent>
					</Dialog>
				</Frame>
			);
		case "dropdown-menu":
			return (
				<Frame>
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button variant="outline">Open menu</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent>
							<DropdownMenuLabel>Workspace</DropdownMenuLabel>
							<DropdownMenuItem>
								Profile<DropdownMenuShortcut>⇧P</DropdownMenuShortcut>
							</DropdownMenuItem>
							<DropdownMenuCheckboxItem checked>
								Notifications
							</DropdownMenuCheckboxItem>
							<DropdownMenuSeparator />
							<DropdownMenuRadioGroup value="comfortable">
								<DropdownMenuRadioItem value="comfortable">
									Comfortable
								</DropdownMenuRadioItem>
								<DropdownMenuRadioItem value="compact">
									Compact
								</DropdownMenuRadioItem>
							</DropdownMenuRadioGroup>
							<DropdownMenuSub>
								<DropdownMenuSubTrigger>More</DropdownMenuSubTrigger>
								<DropdownMenuSubContent>
									<DropdownMenuItem>Archive</DropdownMenuItem>
								</DropdownMenuSubContent>
							</DropdownMenuSub>
						</DropdownMenuContent>
					</DropdownMenu>
				</Frame>
			);
		case "empty":
			return (
				<Frame>
					<div className="grid gap-3">
						{CVA_COVERAGE.empty.size.map((size) => (
							<Empty
								action={<Button size="sm">Create record</Button>}
								description="Adjust filters or create a new record."
								icon={<InboxIcon />}
								key={size}
								size={size}
								title={`No ${size} results`}
							/>
						))}
					</div>
				</Frame>
			);
		case "field":
			return (
				<Frame>
					<FieldSet>
						<FieldLegend>Organization details</FieldLegend>
						<FieldDescription>
							Fields demonstrate every supported orientation.
						</FieldDescription>
						<FieldGroup>
							{CVA_COVERAGE.field.orientation.map((orientation) => (
								<Field key={orientation} orientation={orientation}>
									<FieldLabel htmlFor={`field-${orientation}`}>
										{orientation}
									</FieldLabel>
									<FieldContent>
										<Input defaultValue="Afenda" id={`field-${orientation}`} />
										<FieldDescription>Supporting guidance</FieldDescription>
									</FieldContent>
								</Field>
							))}
							<FieldSeparator>Validation</FieldSeparator>
							<Field data-invalid>
								<FieldTitle>Legal name</FieldTitle>
								<FieldError errors={[{ message: "Legal name is required." }]} />
							</Field>
						</FieldGroup>
					</FieldSet>
				</Frame>
			);
		case "form-error":
			return (
				<Frame>
					<div className="grid gap-3">
						{CVA_COVERAGE["form-error"].variant.map((variant) => (
							<Matrix key={variant}>
								{CVA_COVERAGE["form-error"].size.map((size) => (
									<FormError
										key={`${variant}-${size}`}
										message={`${variant} message (${size})`}
										size={size}
										variant={variant}
									/>
								))}
							</Matrix>
						))}
					</div>
				</Frame>
			);
		case "form-field":
			return (
				<Frame>
					<div className="grid gap-4">
						<FormField
							description="Use the registered entity name."
							label="Legal name"
							required
						>
							<FormInput defaultValue="Afenda Holdings" />
						</FormField>
						<FormField
							error="Notes must be under 500 characters."
							label="Notes"
						>
							<FormTextarea defaultValue="A deliberately invalid example." />
						</FormField>
					</div>
				</Frame>
			);
		case "hover-card":
			return (
				<Frame>
					<HoverCard closeDelay={0} openDelay={0}>
						<HoverCardTrigger asChild>
							<Button variant="link">@afenda</Button>
						</HoverCardTrigger>
						<HoverCardContent>
							<div className="flex gap-3">
								<Avatar>
									<AvatarFallback>AF</AvatarFallback>
								</Avatar>
								<div>
									<strong>Afenda</strong>
									<p className="text-muted-foreground text-sm">
										Enterprise operations workspace.
									</p>
								</div>
							</div>
						</HoverCardContent>
					</HoverCard>
				</Frame>
			);
		case "input-group":
			return (
				<Frame>
					<div className="grid gap-3">
						<InputGroup>
							<InputGroupAddon align="inline-start">$</InputGroupAddon>
							<InputGroupInput aria-label="Amount" defaultValue="1250.00" />
							<InputGroupAddon align="inline-end">USD</InputGroupAddon>
						</InputGroup>
						<InputGroup>
							<InputGroupAddon align="block-start">Description</InputGroupAddon>
							<InputGroupTextarea
								aria-label="Description"
								defaultValue="Quarterly service fee"
							/>
							<InputGroupAddon align="block-end">
								<InputGroupText>Autosaved</InputGroupText>
								<InputGroupButton size="xs">Clear</InputGroupButton>
							</InputGroupAddon>
						</InputGroup>
						<Matrix>
							{CVA_COVERAGE["input-group"].size.map((size) => (
								<InputGroupButton aria-label={size} key={size} size={size}>
									{size.startsWith("icon") ? (
										<SearchIcon />
									) : (
										<span>{size}</span>
									)}
								</InputGroupButton>
							))}
						</Matrix>
					</div>
				</Frame>
			);
		case "input":
			return (
				<Frame>
					<div className="grid gap-3">
						<Input placeholder="Default input" />
						<Input
							aria-label="Read-only input"
							defaultValue="Read-only value"
							readOnly
						/>
						<Input
							aria-invalid
							aria-label="Invalid input"
							defaultValue="Invalid value"
						/>
						<Input disabled placeholder="Disabled input" />
					</div>
				</Frame>
			);
		case "kbd":
			return (
				<Frame>
					<Matrix>
						<KbdGroup>
							<Kbd>Ctrl</Kbd>
							<span>+</span>
							<Kbd>K</Kbd>
						</KbdGroup>
						<KbdGroup>
							<Kbd>⌘</Kbd>
							<span>+</span>
							<Kbd>Enter</Kbd>
						</KbdGroup>
					</Matrix>
				</Frame>
			);
		case "key-value":
			return (
				<Frame>
					<div className="grid gap-3">
						{CVA_COVERAGE["key-value"].orientation.map((orientation) => (
							<div
								className="grid gap-2 rounded-md border p-3"
								key={orientation}
							>
								{CVA_COVERAGE["key-value"].size.map((size) => (
									<KeyValue
										copyable
										key={size}
										label={`${orientation} ${size}`}
										orientation={orientation}
										size={size}
										value="INV-1042"
									/>
								))}
							</div>
						))}
						<KeyValue label="Loading" loading />
					</div>
				</Frame>
			);
		case "label":
			return (
				<Frame>
					<div className="grid gap-2">
						<Label htmlFor="label-demo">Organization name</Label>
						<Input defaultValue="Afenda" id="label-demo" />
						<Label className="text-destructive">Required field</Label>
					</div>
				</Frame>
			);
		case "metric-card":
			return (
				<Frame wide>
					<MetricGrid
						columns={3}
						metrics={[
							{
								title: "Revenue",
								value: "$2.4M",
								change: 12,
								trend: "up",
								description: "vs prior period",
							},
							{ title: "Expenses", value: "$1.1M", change: 4, trend: "down" },
							{ title: "Open items", value: 128, change: 0, trend: "neutral" },
							{ title: "Loading", loading: true },
						]}
					/>
				</Frame>
			);
		case "native-select":
			return (
				<Frame>
					<div className="grid gap-3">
						<NativeSelect aria-label="Module" defaultValue="accounting">
							<NativeSelectOption value="accounting">
								Accounting
							</NativeSelectOption>
							<NativeSelectOptGroup label="Operations">
								<NativeSelectOption value="inventory">
									Inventory
								</NativeSelectOption>
								<NativeSelectOption value="payroll">Payroll</NativeSelectOption>
							</NativeSelectOptGroup>
						</NativeSelect>
						<NativeSelect aria-label="Disabled module" disabled>
							<NativeSelectOption>Disabled</NativeSelectOption>
						</NativeSelect>
					</div>
				</Frame>
			);
		case "pagination":
			return (
				<Frame>
					<Pagination>
						<PaginationContent>
							<PaginationItem>
								<PaginationPrevious href="#" />
							</PaginationItem>
							<PaginationItem>
								<PaginationLink href="#">1</PaginationLink>
							</PaginationItem>
							<PaginationItem>
								<PaginationLink href="#" isActive>
									2
								</PaginationLink>
							</PaginationItem>
							<PaginationItem>
								<PaginationEllipsis />
							</PaginationItem>
							<PaginationItem>
								<PaginationNext href="#" />
							</PaginationItem>
						</PaginationContent>
					</Pagination>
				</Frame>
			);
		case "popover":
			return (
				<Frame>
					<Popover>
						<PopoverTrigger asChild>
							<Button variant="outline">Open details</Button>
						</PopoverTrigger>
						<PopoverContent aria-label="Posting details">
							<PopoverHeader>
								<PopoverTitle>Posting details</PopoverTitle>
								<PopoverDescription>
									Review the target period before continuing.
								</PopoverDescription>
							</PopoverHeader>
							<Input aria-label="Posting period" defaultValue="2026-07" />
						</PopoverContent>
					</Popover>
				</Frame>
			);
		case "progress":
			return (
				<Frame>
					<div className="grid gap-4">
						{[0, 25, 50, 75, 100].map((value) => (
							<div key={value}>
								<Label>{value}%</Label>
								<Progress aria-label={`Completion ${value}%`} value={value} />
							</div>
						))}
					</div>
				</Frame>
			);
		case "radio-group":
			return (
				<Frame>
					<RadioGroup defaultValue="monthly">
						<Label className="flex items-center gap-2">
							<RadioGroupItem value="monthly" />
							Monthly
						</Label>
						<Label className="flex items-center gap-2">
							<RadioGroupItem value="quarterly" />
							Quarterly
						</Label>
						<Label className="flex items-center gap-2">
							<RadioGroupItem disabled value="annual" />
							Annual (disabled)
						</Label>
					</RadioGroup>
				</Frame>
			);
		case "scroll-area":
			return (
				<Frame>
					<ScrollArea className="h-56 rounded-md border">
						<div className="w-[900px] space-y-2 p-4">
							{auditEvents.map((event) => (
								<div key={event.id}>
									Audit event {event.sequence} — deterministic content
								</div>
							))}
						</div>
						<ScrollBar orientation="horizontal" />
					</ScrollArea>
				</Frame>
			);
		case "select":
			return (
				<Frame>
					<Select defaultValue="accounting">
						<SelectTrigger aria-label="Module">
							<SelectValue placeholder="Select a module" />
						</SelectTrigger>
						<SelectContent>
							<SelectGroup>
								<SelectLabel>Modules</SelectLabel>
								<SelectItem value="accounting">Accounting</SelectItem>
								<SelectItem value="inventory">Inventory</SelectItem>
								<SelectSeparator />
								<SelectItem value="payroll">Payroll</SelectItem>
							</SelectGroup>
						</SelectContent>
					</Select>
				</Frame>
			);
		case "separator":
			return (
				<Frame>
					<div className="grid gap-4">
						<div>Above</div>
						<Separator />
						<div>Below</div>
						<div className="flex h-10 items-center gap-3">
							<span>Sales</span>
							<Separator orientation="vertical" />
							<span>Inventory</span>
							<Separator orientation="vertical" />
							<span>Accounting</span>
						</div>
					</div>
				</Frame>
			);
		case "sheet":
			return (
				<Frame>
					<Matrix>
						{(["top", "right", "bottom", "left"] as const).map((side) => (
							<Sheet key={side}>
								<SheetTrigger asChild>
									<Button variant="outline">{side}</Button>
								</SheetTrigger>
								<SheetContent side={side}>
									<SheetHeader>
										<SheetTitle>
											{side === "right" ? "Invoice INV-1048" : `${side} sheet`}
										</SheetTitle>
										<SheetDescription>
											{side === "right"
												? "Northwind Trading · awaiting finance approval."
												: "Supporting ERP panel layout."}
										</SheetDescription>
									</SheetHeader>
									<div className="grid gap-3 p-4">
										{side === "right" ? (
											<>
												<KeyValue
													label="Amount"
													orientation="horizontal"
													size="sm"
													value="MYR 18,420.00"
												/>
												<KeyValue
													label="Due date"
													orientation="horizontal"
													size="sm"
													value="15 Aug 2026"
												/>
												<StatusBadge
													label="Awaiting approval"
													status="pending"
												/>
											</>
										) : (
											<p className="text-muted-foreground text-sm">
												Use the right-side inspector for record detail. Other
												sides remain available for rare layout needs.
											</p>
										)}
									</div>
									<SheetFooter>
										<SheetClose asChild>
											<Button variant="outline">Close</Button>
										</SheetClose>
										{side === "right" ? <Button>Approve invoice</Button> : null}
									</SheetFooter>
								</SheetContent>
							</Sheet>
						))}
					</Matrix>
				</Frame>
			);
		case "sidebar":
			return (
				<Frame wide>
					<SidebarProvider defaultOpen>
						<Sidebar>
							<SidebarHeader>
								<strong className="p-2">Afenda</strong>
							</SidebarHeader>
							<SidebarSeparator />
							<SidebarContent>
								<SidebarGroup>
									<SidebarGroupLabel>Workspace</SidebarGroupLabel>
									<SidebarGroupContent>
										<SidebarMenu>
											{CVA_COVERAGE.sidebar.variant.flatMap((variant) =>
												CVA_COVERAGE.sidebar.size.map((size) => (
													<SidebarMenuItem key={`${variant}-${size}`}>
														<SidebarMenuButton
															isActive={variant === "default"}
															size={size}
															variant={variant}
														>
															<SettingsIcon />
															<span>
																{variant} {size}
															</span>
														</SidebarMenuButton>
														<SidebarMenuBadge>4</SidebarMenuBadge>
													</SidebarMenuItem>
												)),
											)}
											<SidebarMenuItem>
												<SidebarMenuSkeleton showIcon />
											</SidebarMenuItem>
										</SidebarMenu>
									</SidebarGroupContent>
								</SidebarGroup>
							</SidebarContent>
							<SidebarFooter>
								<SidebarMenu>
									<SidebarMenuItem>
										<SidebarMenuButton>
											<UserIcon />
											<span>Operator</span>
										</SidebarMenuButton>
									</SidebarMenuItem>
								</SidebarMenu>
							</SidebarFooter>
						</Sidebar>
						<SidebarInset>
							<header className="flex h-14 items-center gap-2 border-b px-4">
								<SidebarTrigger />
								Workspace
							</header>
							<div className="p-6">Main content inset</div>
						</SidebarInset>
					</SidebarProvider>
				</Frame>
			);
		case "skeleton":
			return (
				<Frame>
					<div className="flex items-center gap-4">
						<Skeleton className="size-12 rounded-full" />
						<div className="grid flex-1 gap-2">
							<Skeleton className="h-4 w-1/3" />
							<Skeleton className="h-4 w-full" />
							<Skeleton className="h-4 w-2/3" />
						</div>
					</div>
				</Frame>
			);
		case "slider":
			return (
				<Frame>
					<div className="grid gap-6">
						<Slider
							aria-label="Completion"
							defaultValue={[35]}
							max={100}
							step={1}
						/>
						<Slider
							aria-label="Range"
							defaultValue={[25, 75]}
							max={100}
							step={5}
						/>
						<Slider aria-label="Disabled" defaultValue={[50]} disabled />
					</div>
				</Frame>
			);
		case "sonner":
			return (
				<Frame>
					<div className="rounded-md border p-6">
						<strong>Toast viewport</strong>
						<p className="text-muted-foreground text-sm">
							The product Toaster uses Afenda semantic tokens and theme state.
						</p>
						<Toaster position="top-right" />
					</div>
				</Frame>
			);
		case "spinner":
			return (
				<Frame>
					<div className="grid gap-3">
						{CVA_COVERAGE.spinner.variant.map((variant) => (
							<Matrix key={variant}>
								{CVA_COVERAGE.spinner.size.map((size) => (
									<Spinner
										key={`${variant}-${size}`}
										label={`${variant} ${size}`}
										size={size}
										variant={variant}
									/>
								))}
							</Matrix>
						))}
					</div>
				</Frame>
			);
		case "status-badge":
			return (
				<Frame>
					<div className="flex flex-wrap gap-3">
						<StatusBadge label="Posted" status="success" />
						<StatusBadge label="Awaiting approval" status="pending" />
						<StatusBadge label="Posting failed" status="error" />
						<StatusBadge label="Evidence incomplete" status="warning" />
						<StatusBadge label="Archived" status="inactive" />
						<StatusBadge label="Active" status="active" />
					</div>
				</Frame>
			);
		case "switch":
			return (
				<Frame>
					<div className="grid gap-3">
						<Label className="flex items-center gap-2">
							<Switch defaultChecked />
							Notifications enabled
						</Label>
						<Label className="flex items-center gap-2">
							<Switch />
							Notifications disabled
						</Label>
						<Label className="flex items-center gap-2">
							<Switch disabled />
							Unavailable
						</Label>
					</div>
				</Frame>
			);
		case "table":
			return (
				<Frame>
					<Table>
						<TableCaption>July 2026 invoices</TableCaption>
						<TableHeader>
							<TableRow>
								<TableHead>Invoice</TableHead>
								<TableHead>Customer</TableHead>
								<TableHead className="text-right">Amount</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							<TableRow>
								<TableCell>INV-1042</TableCell>
								<TableCell>Northwind</TableCell>
								<TableCell className="text-right">$4,800</TableCell>
							</TableRow>
							<TableRow>
								<TableCell>INV-1043</TableCell>
								<TableCell>Contoso</TableCell>
								<TableCell className="text-right">$2,150</TableCell>
							</TableRow>
						</TableBody>
						<TableFooter>
							<TableRow>
								<TableCell colSpan={2}>Total</TableCell>
								<TableCell className="text-right">$6,950</TableCell>
							</TableRow>
						</TableFooter>
					</Table>
				</Frame>
			);
		case "tabs":
			return (
				<Frame>
					<div className="grid gap-6">
						{CVA_COVERAGE.tabs.variant.map((variant) => (
							<Tabs defaultValue="overview" key={variant}>
								<TabsList variant={variant}>
									<TabsTrigger value="overview">Overview</TabsTrigger>
									<TabsTrigger value="activity">Activity</TabsTrigger>
									<TabsTrigger disabled value="disabled">
										Disabled
									</TabsTrigger>
								</TabsList>
								<TabsContent className="rounded-md border p-4" value="overview">
									{variant} tab content
								</TabsContent>
								<TabsContent value="activity">Recent activity</TabsContent>
							</Tabs>
						))}
					</div>
				</Frame>
			);
		case "textarea":
			return (
				<Frame>
					<div className="grid gap-3">
						<Textarea placeholder="Add notes" />
						<Textarea
							aria-label="Long note"
							defaultValue="A longer deterministic note demonstrates wrapping and vertical rhythm across multiple lines."
						/>
						<Textarea
							aria-invalid
							aria-label="Invalid note"
							defaultValue="Invalid note"
						/>
						<Textarea disabled placeholder="Disabled" />
					</div>
				</Frame>
			);
		case "toggle-group":
			return (
				<Frame>
					<div className="grid gap-3">
						<ToggleGroup defaultValue={["bold"]} type="multiple">
							<ToggleGroupItem value="bold">Bold</ToggleGroupItem>
							<ToggleGroupItem value="italic">Italic</ToggleGroupItem>
							<ToggleGroupItem value="underline">Underline</ToggleGroupItem>
						</ToggleGroup>
						<ToggleGroup
							defaultValue="left"
							size="sm"
							type="single"
							variant="outline"
						>
							<ToggleGroupItem value="left">Left</ToggleGroupItem>
							<ToggleGroupItem value="center">Center</ToggleGroupItem>
							<ToggleGroupItem value="right">Right</ToggleGroupItem>
						</ToggleGroup>
					</div>
				</Frame>
			);
		case "toggle":
			return (
				<Frame>
					<div className="grid gap-3">
						{CVA_COVERAGE.toggle.variant.map((variant) => (
							<Matrix key={variant}>
								{CVA_COVERAGE.toggle.size.map((size) => (
									<Toggle
										defaultPressed={size === "default"}
										key={`${variant}-${size}`}
										size={size}
										variant={variant}
									>
										{variant} {size}
									</Toggle>
								))}
							</Matrix>
						))}
					</div>
				</Frame>
			);
		case "tooltip":
			return (
				<Frame>
					<TooltipProvider delayDuration={0}>
						<Matrix>
							<Tooltip>
								<TooltipTrigger asChild>
									<Button size="icon" variant="outline">
										<BellIcon />
										<span className="sr-only">Notifications</span>
									</Button>
								</TooltipTrigger>
								<TooltipContent>Notifications</TooltipContent>
							</Tooltip>
							<Tooltip defaultOpen>
								<TooltipTrigger asChild>
									<Button variant="outline">Pinned open</Button>
								</TooltipTrigger>
								<TooltipContent side="right">
									Always visible in this story
								</TooltipContent>
							</Tooltip>
						</Matrix>
					</TooltipProvider>
				</Frame>
			);
		default: {
			const exhaustiveComponent: never = component;
			throw new Error(`Unsupported component showcase: ${exhaustiveComponent}`);
		}
	}
}

export function titleFor(component: ComponentKey): string {
	return component
		.split("-")
		.map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
		.join(" ");
}
