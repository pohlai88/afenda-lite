"use client";

import { Search } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "../components/ui/button";

export type CommandMenuCommand = Readonly<{
	id: string;
	label: string;
	keywords?: readonly string[];
	shortcut?: string;
	disabled?: boolean;
}>;

export type CommandMenuGroup = Readonly<{
	id: string;
	label: string;
	commands: readonly CommandMenuCommand[];
}>;

export type CommandMenuProps = Readonly<{
	groups: readonly CommandMenuGroup[];
	onCommand?: (id: string) => void;
	enableSlashShortcut?: boolean;
}>;

function normalize(value: string): string {
	return value.trim();
}

function isEditableTarget(target: EventTarget | null): boolean {
	return (
		target instanceof HTMLInputElement ||
		target instanceof HTMLTextAreaElement ||
		target instanceof HTMLSelectElement ||
		(target instanceof HTMLElement && target.isContentEditable)
	);
}

export function CommandMenu({
	enableSlashShortcut = true,
	groups,
	onCommand,
}: CommandMenuProps) {
	const [open, setOpen] = useState(false);
	const [query, setQuery] = useState("");
	const searchRef = useRef<HTMLInputElement>(null);
	const triggerRef = useRef<HTMLButtonElement>(null);

	const normalizedGroups = useMemo(() => {
		const seenGroups = new Set<string>();
		const seenCommands = new Set<string>();
		return groups.flatMap((group) => {
			const groupId = normalize(group.id);
			const groupLabel = normalize(group.label);
			if (!groupId || !groupLabel || seenGroups.has(groupId)) {
				return [];
			}
			seenGroups.add(groupId);
			const commands = group.commands.flatMap((command) => {
				const id = normalize(command.id);
				const label = normalize(command.label);
				if (!id || !label || seenCommands.has(id)) {
					return [];
				}
				seenCommands.add(id);
				return [
					{
						...command,
						id,
						label,
						keywords: command.keywords?.map(normalize).filter(Boolean) ?? [],
						shortcut:
							command.shortcut === undefined
								? undefined
								: normalize(command.shortcut),
					},
				];
			});
			return commands.length === 0
				? []
				: [{ id: groupId, label: groupLabel, commands }];
		});
	}, [groups]);

	const close = useCallback(() => {
		setOpen(false);
		triggerRef.current?.focus();
	}, []);

	useEffect(() => {
		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.repeat || event.isComposing || event.shiftKey || event.altKey) {
				return;
			}
			if (isEditableTarget(event.target)) {
				return;
			}
			const commandShortcut =
				(event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k";
			const slashShortcut =
				enableSlashShortcut &&
				!event.ctrlKey &&
				!event.metaKey &&
				event.key === "/";
			if (!commandShortcut && !slashShortcut) {
				return;
			}
			event.preventDefault();
			setOpen(true);
		};
		document.addEventListener("keydown", handleKeyDown);
		return () => document.removeEventListener("keydown", handleKeyDown);
	}, [enableSlashShortcut]);

	useEffect(() => {
		if (open) {
			searchRef.current?.focus();
		}
	}, [open]);

	const filteredGroups = normalizedGroups.flatMap((group) => {
		const search = query.trim().toLowerCase();
		const commands =
			search === ""
				? group.commands
				: group.commands.filter((command) => {
						const haystack = [
							command.label,
							command.id,
							...(command.keywords ?? []),
						]
							.join(" ")
							.toLowerCase();
						return haystack.includes(search);
					});
		return commands.length === 0 ? [] : [{ ...group, commands }];
	});

	return (
		<>
			<Button
				ref={triggerRef}
				type="button"
				variant="ghost"
				size="icon-sm"
				aria-label="Open command menu"
				aria-expanded={open}
				onClick={() => setOpen(true)}
			>
				<Search />
			</Button>
			{open ? (
				<div
					role="dialog"
					aria-label="Command menu"
					className="fixed inset-0 z-50 bg-background/80 p-6"
					onKeyDown={(event) => {
						if (event.key === "Escape") {
							close();
						}
					}}
				>
					<div className="mx-auto max-w-lg rounded-lg border bg-popover p-3 shadow-lg">
						<label className="sr-only" htmlFor="app-shell-command-search">
							Search workspace commands
						</label>
						<input
							ref={searchRef}
							id="app-shell-command-search"
							role="combobox"
							aria-label="Search workspace commands"
							aria-controls="app-shell-command-options"
							aria-expanded="true"
							value={query}
							onChange={(event) => setQuery(event.target.value)}
							className="mb-3 w-full rounded-md border bg-background px-3 py-2 text-sm"
						/>
						{filteredGroups.map((group) => (
							<section key={group.id} aria-label={group.label}>
								<h2 className="px-2 py-1 text-xs font-medium text-muted-foreground">
									{group.label}
								</h2>
								<div
									id="app-shell-command-options"
									role="listbox"
									aria-label={group.label}
								>
									{group.commands.map((command) => (
										<button
											key={command.id}
											type="button"
											role="option"
											aria-selected="false"
											aria-disabled={command.disabled ? "true" : undefined}
											className="flex w-full items-center justify-between rounded-md px-2 py-2 text-left text-sm hover:bg-accent disabled:opacity-50"
											onClick={() => {
												if (command.disabled) {
													return;
												}
												onCommand?.(command.id);
												close();
											}}
										>
											<span>{command.label}</span>
											{command.shortcut ? (
												<span aria-hidden="true">
													<kbd>{command.shortcut}</kbd>
												</span>
											) : null}
										</button>
									))}
								</div>
							</section>
						))}
					</div>
				</div>
			) : null}
		</>
	);
}
