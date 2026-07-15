"use client";

import {
	CalendarDaysIcon,
	FileTextIcon,
	LayoutDashboardIcon,
	SearchIcon,
	UserRoundIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { Fragment, useCallback, useEffect, useState } from "react";

import { searchData } from "../../assets/data/search";
import { Button } from "../../components/ui/button";
import {
	Command,
	CommandDialog,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
	CommandSeparator,
	CommandShortcut,
} from "../../components/ui/command";
import { Kbd } from "../../components/ui/kbd";

const CommandMenu = () => {
	const [open, setOpen] = useState(false);
	const [search, setSearch] = useState("");
	const router = useRouter();

	const runCommand = useCallback((command: () => unknown) => {
		setOpen(false);
		command();
	}, []);

	useEffect(() => {
		const down = (e: KeyboardEvent) => {
			if ((e.key === "k" && (e.metaKey || e.ctrlKey)) || e.key === "/") {
				if (
					(e.target instanceof HTMLElement && e.target.isContentEditable) ||
					e.target instanceof HTMLInputElement ||
					e.target instanceof HTMLTextAreaElement ||
					e.target instanceof HTMLSelectElement
				) {
					return;
				}

				e.preventDefault();
				setOpen((prev) => !prev);
			}
		};

		document.addEventListener("keydown", down);

		return () => document.removeEventListener("keydown", down);
	}, []);

	return (
		<>
			<Button
				variant="ghost"
				className="hidden px-2.5 font-normal hover:bg-transparent sm:block dark:hover:bg-transparent"
				onClick={() => setOpen(true)}
			>
				<div className="text-muted-foreground hidden items-center gap-1.5 text-sm sm:flex">
					<SearchIcon />
					<span>Type to search...</span>
					<Kbd>⌘K</Kbd>
				</div>
			</Button>
			<Button
				variant="ghost"
				size="icon"
				className="sm:hidden"
				onClick={() => setOpen(true)}
			>
				<SearchIcon />
				<span className="sr-only">Search</span>
			</Button>
			<CommandDialog open={open} onOpenChange={setOpen}>
				<Command
					className="**[[cmdk-group-heading]]:text-muted-foreground **:data-[slot=command-input-wrapper]:h-10 [&_[cmdk-item]_svg]:h-5 [&_[cmdk-item]_svg]:w-5 **:[[cmdk-group-heading]]:px-2 **:[[cmdk-group-heading]]:font-medium **:[[cmdk-group]]:px-2 **:[[cmdk-group]:not([hidden])_~[cmdk-group]]:pt-0 **:[[cmdk-input-wrapper]_svg]:h-5 **:[[cmdk-input-wrapper]_svg]:w-5 **:[[cmdk-input]]:h-12 **:[[cmdk-item]]:px-2 **:[[cmdk-item]]:py-3"
					filter={(value: string, query: string, keywords?: string[]) => {
						const normalizedQuery = query.toLowerCase();
						const normalizedValue = value.toLowerCase();

						if (normalizedValue === normalizedQuery) return 2;
						if (normalizedValue.includes(normalizedQuery)) return 1.5;

						if (keywords && keywords.length > 0) {
							if (
								keywords.some(
									(keyword) => keyword.toLowerCase() === normalizedQuery,
								)
							) {
								return 1.25;
							}

							const extendedValue = `${normalizedValue} ${keywords.join(" ").toLowerCase()}`;

							if (extendedValue.includes(normalizedQuery)) return 1;
						}

						return 0;
					}}
				>
					<CommandInput
						placeholder="Type a command or search..."
						value={search}
						onValueChange={setSearch}
					/>
					<CommandList>
						<CommandEmpty>No results found.</CommandEmpty>
						{search ? (
							searchData.map((searchGroup, index) => (
								<Fragment key={searchGroup.title}>
									<CommandGroup heading={searchGroup.title}>
										{searchGroup.data.map((item) => (
											<CommandItem
												key={`${item.href}:${item.name}`}
												keywords={item.tags}
												onSelect={() =>
													runCommand(() => {
														if (item.openInNewTab) {
															window.open(
																item.href,
																"_blank",
																"noopener,noreferrer",
															);
														} else {
															router.push(item.href);
														}
													})
												}
											>
												<item.icon />
												<span>{item.name}</span>
												{item.shortcut ? (
													<CommandShortcut>{item.shortcut}</CommandShortcut>
												) : null}
											</CommandItem>
										))}
									</CommandGroup>
									{index !== searchData.length - 1 ? (
										<CommandSeparator />
									) : null}
								</Fragment>
							))
						) : (
							<CommandGroup heading="Suggestions">
								<CommandItem
									onSelect={() =>
										runCommand(() => router.push("/client/dashboard"))
									}
								>
									<LayoutDashboardIcon />
									<span>Client dashboard</span>
								</CommandItem>
								<CommandItem
									onSelect={() => runCommand(() => router.push("/dashboard"))}
								>
									<FileTextIcon />
									<span>Declarations</span>
								</CommandItem>
								<CommandItem
									onSelect={() => runCommand(() => router.push("/fft/events"))}
								>
									<CalendarDaysIcon />
									<span>FFT events</span>
								</CommandItem>
								<CommandItem
									onSelect={() =>
										runCommand(() => router.push("/account/settings"))
									}
								>
									<UserRoundIcon />
									<span>Account settings</span>
								</CommandItem>
							</CommandGroup>
						)}
					</CommandList>
				</Command>
			</CommandDialog>
		</>
	);
};

export default CommandMenu;
