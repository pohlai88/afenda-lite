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
import * as React from "react";
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
const options = [
	{ value: "accounting", label: "Accounting" },
	{ value: "inventory", label: "Inventory" },
	{ value: "payroll", label: "Payroll" },
];

function Frame({
	children,
	wide = false,
}: {
	children: React.ReactNode;
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

function Matrix({ children }: { children: React.ReactNode }) {
	return <div className="flex flex-wrap items-center gap-3">{children}</div>;
}

function ComboboxDemo() {
	const [value, setValue] = React.useState("accounting");
	return (
		<Combobox
			aria-label="Module"
			options={options}
			value={value}
			onValueChange={setValue}
		/>
	);
}

function DatePickerDemo() {
	const [date, setDate] = React.useState<Date | undefined>(fixedDate);
	return <DatePicker value={date} onChange={setDate} />;
}

function DataTableDemo() {
	const rows: Array<Record<string, unknown>> = [
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
							status={value === "Approved" ? "success" : "pending"}
							label={String(value)}
						/>
					),
				},
			]}
			data={rows}
			getRowId={(row) => String(row.id)}
			selectable
			selectedRowIds={new Set(["INV-1042"])}
			onSelectionChange={() => undefined}
			onSort={() => undefined}
			onFilterChange={() => undefined}
			showPagination
			totalPages={4}
			onPageChange={() => undefined}
		/>
	);
}

export function ComponentShowcase({ component }: { component: ComponentKey }) {
	switch (component) {
		case "accordion":
			return (
				<Frame>
					<Accordion type="single" defaultValue="item-1" collapsible>
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
						mode="single"
						defaultMonth={fixedDate}
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
								<Button variant="outline" size="sm">
									Review
								</Button>
							</CardAction>
						</CardHeader>
						<CardContent>18 of 24 controls completed.</CardContent>
						<CardFooter>
							<Progress value={75} aria-label="Period close completion" />
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
							options={options}
							value={["accounting", "payroll"]}
							onValueChange={() => undefined}
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
							value={{
								from: fixedDate,
								to: new Date("2026-08-04T00:00:00.000Z"),
							}}
							onChange={() => undefined}
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
										type="email"
										defaultValue="finance@northwind.example"
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
								key={size}
								size={size}
								icon={<InboxIcon />}
								title={`No ${size} results`}
								description="Adjust filters or create a new record."
								action={<Button size="sm">Create record</Button>}
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
										<Input id={`field-${orientation}`} defaultValue="Afenda" />
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
										variant={variant}
										size={size}
										message={`${variant} message (${size})`}
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
							label="Legal name"
							description="Use the registered entity name."
							required
						>
							<FormInput defaultValue="Afenda Holdings" />
						</FormField>
						<FormField
							label="Notes"
							error="Notes must be under 500 characters."
						>
							<FormTextarea defaultValue="A deliberately invalid example." />
						</FormField>
					</div>
				</Frame>
			);
		case "hover-card":
			return (
				<Frame>
					<HoverCard openDelay={0} closeDelay={0}>
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
									<p className="text-sm text-muted-foreground">
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
								<InputGroupButton key={size} size={size} aria-label={size}>
									{size.startsWith("icon") ? <SearchIcon /> : size}
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
							aria-label="Invalid input"
							aria-invalid
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
								key={orientation}
								className="grid gap-2 rounded-md border p-3"
							>
								{CVA_COVERAGE["key-value"].size.map((size) => (
									<KeyValue
										key={size}
										orientation={orientation}
										size={size}
										label={`${orientation} ${size}`}
										value="INV-1042"
										copyable
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
						<Input id="label-demo" defaultValue="Afenda" />
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
								<Progress value={value} aria-label={`Completion ${value}%`} />
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
							<RadioGroupItem value="annual" disabled />
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
							{Array.from({ length: 20 }, (_, index) => (
								<div key={index}>
									Audit event {String(index + 1).padStart(2, "0")} —
									deterministic content
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
													value="MYR 18,420.00"
													orientation="horizontal"
													size="sm"
												/>
												<KeyValue
													label="Due date"
													value="15 Aug 2026"
													orientation="horizontal"
													size="sm"
												/>
												<StatusBadge
													status="pending"
													label="Awaiting approval"
												/>
											</>
										) : (
											<p className="text-sm text-muted-foreground">
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
															variant={variant}
															size={size}
															isActive={variant === "default"}
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
							defaultValue={[35]}
							max={100}
							step={1}
							aria-label="Completion"
						/>
						<Slider
							defaultValue={[25, 75]}
							max={100}
							step={5}
							aria-label="Range"
						/>
						<Slider defaultValue={[50]} disabled aria-label="Disabled" />
					</div>
				</Frame>
			);
		case "sonner":
			return (
				<Frame>
					<div className="rounded-md border p-6">
						<strong>Toast viewport</strong>
						<p className="text-sm text-muted-foreground">
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
										variant={variant}
										size={size}
										label={`${variant} ${size}`}
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
						<StatusBadge status="success" label="Posted" />
						<StatusBadge status="pending" label="Awaiting approval" />
						<StatusBadge status="error" label="Posting failed" />
						<StatusBadge status="warning" label="Evidence incomplete" />
						<StatusBadge status="inactive" label="Archived" />
						<StatusBadge status="active" label="Active" />
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
							<Tabs key={variant} defaultValue="overview">
								<TabsList variant={variant}>
									<TabsTrigger value="overview">Overview</TabsTrigger>
									<TabsTrigger value="activity">Activity</TabsTrigger>
									<TabsTrigger value="disabled" disabled>
										Disabled
									</TabsTrigger>
								</TabsList>
								<TabsContent value="overview" className="rounded-md border p-4">
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
							aria-label="Invalid note"
							aria-invalid
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
						<ToggleGroup type="multiple" defaultValue={["bold"]}>
							<ToggleGroupItem value="bold">Bold</ToggleGroupItem>
							<ToggleGroupItem value="italic">Italic</ToggleGroupItem>
							<ToggleGroupItem value="underline">Underline</ToggleGroupItem>
						</ToggleGroup>
						<ToggleGroup
							type="single"
							variant="outline"
							size="sm"
							defaultValue="left"
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
										key={`${variant}-${size}`}
										variant={variant}
										size={size}
										defaultPressed={size === "default"}
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
									<Button variant="outline" size="icon">
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
	}
}

export function titleFor(component: ComponentKey): string {
	return component
		.split("-")
		.map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
		.join(" ");
}
