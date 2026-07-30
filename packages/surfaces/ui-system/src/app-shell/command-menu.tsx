"use client";

import { Search } from "lucide-react";
import {
	type ChangeEvent,
	type MouseEvent,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
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
			if (!(groupId && groupLabel) || seenGroups.has(groupId)) {
				return [];
			}
			seenGroups.add(groupId);
			const commands = group.commands.flatMap((command) => {
				const id = normalize(command.id);
				const label = normalize(command.label);
				if (!(id && label) || seenCommands.has(id)) {
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
	const openMenu = useCallback(() => setOpen(true), []);
	const handleQueryChange = useCallback(
		(event: ChangeEvent<HTMLInputElement>) => setQuery(event.target.value),
		[],
	);
	const handleCommand = useCallback(
		(event: MouseEvent<HTMLButtonElement>) => {
			const commandId = event.currentTarget.value;
			const command = normalizedGroups
				.flatMap((group) => group.commands)
				.find((candidate) => candidate.id === commandId);
			if (command?.disabled !== false && command?.disabled !== undefined) {
				return;
			}
			if (command !== undefined) {
				onCommand?.(command.id);
				close();
			}
		},
		[close, normalizedGroups, onCommand],
	);

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
			if (!(commandShortcut || slashShortcut)) {
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

	useEffect(() => {
		if (!open) {
			return;
		}
		const handleEscape = (event: KeyboardEvent) => {
			if (event.key === "Escape") {
				close();
			}
		};
		document.addEventListener("keydown", handleEscape);
		return () => document.removeEventListener("keydown", handleEscape);
	}, [close, open]);

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
				aria-expanded={open}
				aria-label="Open command menu"
				onClick={openMenu}
				ref={triggerRef}
				size="icon-sm"
				type="button"
				variant="ghost"
			>
				<Search />
			</Button>
			{open ? (
				<dialog
					aria-label="Command menu"
					className="fixed inset-0 z-50 bg-background/80 p-6"
					open
				>
					<div className="mx-auto max-w-lg rounded-lg border bg-popover p-3 shadow-lg">
						<label className="sr-only" htmlFor="app-shell-command-search">
							Search workspace commands
						</label>
						<input
							aria-controls="app-shell-command-options"
							aria-expanded="true"
							aria-label="Search workspace commands"
							className="mb-3 w-full rounded-md border bg-background px-3 py-2 text-sm"
							id="app-shell-command-search"
							onChange={handleQueryChange}
							ref={searchRef}
							role="combobox"
							value={query}
						/>
						{filteredGroups.map((group) => (
							<section aria-label={group.label} key={group.id}>
								<h2 className="px-2 py-1 font-medium text-muted-foreground text-xs">
									{group.label}
								</h2>
								<div
									aria-label={group.label}
									id="app-shell-command-options"
									role="listbox"
								>
									{group.commands.map((command) => (
										<button
											aria-disabled={command.disabled ? "true" : undefined}
											aria-selected="false"
											className="flex w-full items-center justify-between rounded-md px-2 py-2 text-left text-sm hover:bg-accent disabled:opacity-50"
											key={command.id}
											onClick={handleCommand}
											role="option"
											type="button"
											value={command.id}
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
				</dialog>
			) : null}
		</>
	);
}
