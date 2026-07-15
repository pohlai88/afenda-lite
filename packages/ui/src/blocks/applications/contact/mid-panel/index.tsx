"use client";

// Third-party imports
import {
	ArrowDownAZIcon,
	ArrowDownZAIcon,
	FunnelIcon,
	LayoutGridIcon,
	ListIcon,
	MenuIcon,
	SearchIcon,
} from "lucide-react";
// React imports
import { useMemo, useState } from "react";

// Component imports
import { Button } from "../../../../components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuRadioGroup,
	DropdownMenuRadioItem,
	DropdownMenuTrigger,
} from "../../../../components/ui/dropdown-menu";
import {
	InputGroup,
	InputGroupAddon,
	InputGroupInput,
} from "../../../../components/ui/input-group";
import { Label } from "../../../../components/ui/label";
import { ScrollArea } from "../../../../components/ui/scroll-area";
import {
	Sheet,
	SheetContent,
	SheetTrigger,
} from "../../../../components/ui/sheet";
import {
	type ContactFilter,
	getVisibleContacts,
	groupContactsByLetter,
	sortContacts,
} from "../../../../lib/contact-utils";
// Utils imports
import { cn } from "../../../../lib/utils";
// Store imports
import { useContactStore } from "../../../../stores/contact";
import LeftPanel from "../left-panel";
import GridView from "./grid-view";
import ListView from "./list-view";

const MidPanel = () => {
	const [searchQuery, setSearchQuery] = useState("");
	const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
	const [isNavSheetOpen, setIsNavSheetOpen] = useState(false);
	const contacts = useContactStore((state) => state.contacts);
	const activeNav = useContactStore((state) => state.activeNav);
	const activeLabel = useContactStore((state) => state.activeLabel);
	const statusFilter = useContactStore((state) => state.statusFilter);
	const view = useContactStore((state) => state.view);
	const setStatusFilter = useContactStore((state) => state.setStatusFilter);
	const setView = useContactStore((state) => state.setView);

	const visibleContacts = useMemo(
		() =>
			getVisibleContacts(
				contacts,
				activeNav,
				activeLabel,
				statusFilter,
				searchQuery,
			),
		[contacts, activeNav, activeLabel, statusFilter, searchQuery],
	);

	const sortedContacts = useMemo(
		() => sortContacts(visibleContacts, sortOrder),
		[visibleContacts, sortOrder],
	);

	const groupedContacts = useMemo(
		() => groupContactsByLetter(visibleContacts, sortOrder),
		[visibleContacts, sortOrder],
	);

	return (
		<div className="flex h-full min-h-0 flex-col gap-4 py-4">
			<div className="flex items-center gap-2 px-4">
				<Sheet open={isNavSheetOpen} onOpenChange={setIsNavSheetOpen}>
					<SheetTrigger
						render={
							<Button
								variant="outline"
								size="icon"
								className="shrink-0 rounded-full md:hidden"
								aria-label="Open navigation"
							/>
						}
					>
						<MenuIcon className="size-4" />
					</SheetTrigger>
					<SheetContent side="left" className="max-w-80! gap-0 p-0">
						<LeftPanel onNavigate={() => setIsNavSheetOpen(false)} />
					</SheetContent>
				</Sheet>

				<div className="flex-1 shrink-0 space-y-2">
					<Label htmlFor="searchContact" className="sr-only">
						Input with start icon
					</Label>
					<InputGroup>
						<InputGroupAddon>
							<SearchIcon className="size-4" />
						</InputGroupAddon>
						<InputGroupInput
							id="searchContact"
							placeholder="Search Contact"
							value={searchQuery}
							onChange={(event) => setSearchQuery(event.target.value)}
						/>
					</InputGroup>
				</div>

				<Button
					variant="outline"
					size="icon"
					className="shrink-0 rounded-full"
					title={sortOrder === "asc" ? "Sorted A-Z" : "Sorted Z-A"}
					onClick={() =>
						setSortOrder((current) => (current === "asc" ? "desc" : "asc"))
					}
				>
					{sortOrder === "asc" ? (
						<ArrowDownAZIcon className="size-4" />
					) : (
						<ArrowDownZAIcon className="size-4" />
					)}
				</Button>

				<DropdownMenu>
					<DropdownMenuTrigger
						render={
							<Button
								variant="outline"
								size="icon"
								className="shrink-0 rounded-full"
								title={`Filter: ${statusFilter === "all" ? "All statuses" : statusFilter}`}
							/>
						}
					>
						<FunnelIcon className="size-4" />
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end">
						<DropdownMenuRadioGroup
							value={statusFilter}
							onValueChange={(value) => setStatusFilter(value as ContactFilter)}
						>
							<DropdownMenuRadioItem value="all">All</DropdownMenuRadioItem>
							<DropdownMenuRadioItem value="active">
								Active
							</DropdownMenuRadioItem>
							<DropdownMenuRadioItem value="inactive">
								Inactive
							</DropdownMenuRadioItem>
							<DropdownMenuRadioItem value="prospect">
								Prospect
							</DropdownMenuRadioItem>
						</DropdownMenuRadioGroup>
					</DropdownMenuContent>
				</DropdownMenu>

				<Button
					variant="outline"
					size="icon"
					className="hidden shrink-0 rounded-full sm:inline-flex"
					onClick={() => setView(view === "grid" ? "list" : "grid")}
				>
					{view === "grid" ? <LayoutGridIcon /> : <ListIcon />}
				</Button>
			</div>

			<ScrollArea className="min-h-0 flex-1 px-4">
				{view === "grid" && <GridView contacts={sortedContacts} />}
				{(view === "list" || view === "grid") && (
					<ListView
						groupedContacts={groupedContacts}
						className={cn(view === "grid" && "sm:hidden")}
					/>
				)}
			</ScrollArea>
		</div>
	);
};

export default MidPanel;
