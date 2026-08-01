"use client";

import { Search } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "../components/ui/button";
import {
	CommandDialog,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
	CommandSeparator,
	CommandShortcut,
} from "../components/ui/command";

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

	const handleOpenChange = useCallback((nextOpen: boolean) => {
		setOpen(nextOpen);
		if (!nextOpen) {
			queueMicrotask(() => triggerRef.current?.focus());
		}
	}, []);
	const openMenu = useCallback(() => setOpen(true), []);
	const selectCommand = useCallback(
		(id: string) => {
			const command = normalizedGroups
				.flatMap((group) => group.commands)
				.find((candidate) => candidate.id === id);
			if (command === undefined || command.disabled) {
				return;
			}
			onCommand?.(command.id);
			handleOpenChange(false);
		},
		[handleOpenChange, normalizedGroups, onCommand],
	);

	useEffect(() => {
		const handleKeyDown = (event: KeyboardEvent) => {
			if (
				event.repeat ||
				event.isComposing ||
				event.shiftKey ||
				event.altKey ||
				isEditableTarget(event.target)
			) {
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

	return (
		<>
			<Button
				aria-expanded={open}
				aria-haspopup="dialog"
				aria-label="Open command menu"
				onClick={openMenu}
				ref={triggerRef}
				size="icon-sm"
				type="button"
				variant="ghost"
			>
				<Search />
			</Button>
			<CommandDialog
				commandLabel="Search workspace commands"
				description="Search workspace destinations and actions."
				onOpenChange={handleOpenChange}
				open={open}
				title="Command menu"
			>
				<CommandInput placeholder="Search workspace commands..." />
				<CommandList>
					<CommandEmpty>No commands match this search.</CommandEmpty>
					{normalizedGroups.map((group, index) => (
						<div key={group.id}>
							{index > 0 ? <CommandSeparator /> : null}
							<CommandGroup heading={group.label}>
								{group.commands.map((command) => (
									<CommandItem
										key={command.id}
										keywords={[command.label, ...(command.keywords ?? [])]}
										onSelect={selectCommand}
										value={command.id}
										{...(command.disabled === undefined
											? {}
											: { disabled: command.disabled })}
									>
										<span>{command.label}</span>
										{command.shortcut ? (
											<CommandShortcut aria-hidden="true">
												{command.shortcut}
											</CommandShortcut>
										) : null}
									</CommandItem>
								))}
							</CommandGroup>
						</div>
					))}
				</CommandList>
			</CommandDialog>
		</>
	);
}
