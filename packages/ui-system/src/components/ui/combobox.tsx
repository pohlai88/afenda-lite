"use client";

import { CheckIcon, ChevronDownIcon } from "lucide-react";
import * as React from "react";
import { cn } from "../../lib/utils";
import { Button } from "./button";
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from "./command";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";

interface ComboboxOption {
	value: string;
	label: string;
	disabled?: boolean;
}

interface ComboboxProps {
	options: ComboboxOption[];
	value?: string;
	onValueChange?: (value: string) => void;
	placeholder?: string;
	searchPlaceholder?: string;
	emptyMessage?: string;
	disabled?: boolean;
	className?: string;
}

function Combobox({
	options,
	value,
	onValueChange,
	placeholder = "Select option...",
	searchPlaceholder = "Search options...",
	emptyMessage = "No options found.",
	disabled = false,
	className,
}: ComboboxProps) {
	const [open, setOpen] = React.useState(false);
	const [searchValue, setSearchValue] = React.useState("");

	const selectedOption = options.find((option) => option.value === value);

	const handleSelect = (optionValue: string) => {
		if (optionValue === value) {
			onValueChange?.("");
		} else {
			onValueChange?.(optionValue);
		}
		setOpen(false);
		setSearchValue("");
	};

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<Button
					variant="outline"
					role="combobox"
					aria-expanded={open}
					aria-haspopup="listbox"
					disabled={disabled}
					className={cn(
						"w-full justify-between",
						!selectedOption && "text-muted-foreground",
						className,
					)}
				>
					{selectedOption?.label ?? placeholder}
					<ChevronDownIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
				</Button>
			</PopoverTrigger>
			<PopoverContent
				className="w-[var(--radix-popover-trigger-width)] p-0"
				align="start"
			>
				<Command shouldFilter={false}>
					<CommandInput
						placeholder={searchPlaceholder}
						value={searchValue}
						onValueChange={setSearchValue}
					/>
					<CommandList>
						<CommandEmpty>{emptyMessage}</CommandEmpty>
						<CommandGroup>
							{options
								.filter((option) =>
									option.label
										.toLowerCase()
										.includes(searchValue.toLowerCase()),
								)
								.map((option) => (
									<CommandItem
										key={option.value}
										value={option.value}
										disabled={option.disabled}
										onSelect={() => handleSelect(option.value)}
									>
										<CheckIcon
											className={cn(
												"mr-2 h-4 w-4",
												value === option.value ? "opacity-100" : "opacity-0",
											)}
										/>
										{option.label}
									</CommandItem>
								))}
						</CommandGroup>
					</CommandList>
				</Command>
			</PopoverContent>
		</Popover>
	);
}

export { Combobox, type ComboboxOption };
